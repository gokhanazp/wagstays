"use server";

import { getTranslations } from "next-intl/server";
import { getOrigin } from "@/lib/origin";
import { verifyPassword } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "@/i18n/revalidate";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { allowedTransitions, refreshSitterRating, transitionBooking } from "@/lib/booking-lifecycle";
import { saveUpload } from "@/lib/uploads";
import { emit } from "@/lib/events";
import { PET_SIZES } from "@/lib/constants";
import { CANCEL_REASONS } from "@/app/[locale]/(site)/account/_lib";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";

export type FormState =
  | { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

type T = Awaited<ReturnType<typeof getTranslations<"account.errors">>>;
const errors = () => getTranslations("account.errors");

/** Signed-in, non-suspended user or null. Every action re-checks this itself. */
async function currentUser() {
  const user = await getCurrentUser();
  return user && !user.suspended ? user : null;
}

const optText = (t: T, max: number, msg?: string) =>
  z
    .string()
    .trim()
    .max(max, msg ?? t("tooLong", { max }))
    .optional()
    .transform((v) => (v ? v : null));

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "1" || v === "true");

function fileFrom(formData: FormData, key: string) {
  const f = formData.get(key);
  return f instanceof File && f.size > 0 ? f : null;
}

function revalidateBookingPages(bookingId: string, sitterSlug?: string) {
  revalidatePath("/account/bookings");
  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath("/sitter", "layout");
  revalidatePath("/admin/bookings");
  if (sitterSlug) revalidatePath(`/sitters/${sitterSlug}`);
}

// ---------------------------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------------------------

const cancelSchema = (t: T) =>
  z.object({
    reason: z.enum(CANCEL_REASONS, t("cancel.reason")),
    details: optText(t, 500),
  });

/** Owner cancels one of their own PENDING / CONFIRMED bookings. WagPoints are refunded by transitionBooking. */
export async function cancelBooking(bookingId: string, _: FormState, formData: FormData): Promise<FormState> {
  const t = await errors();
  const user = await currentUser();
  if (!user) return { error: t("logInAgain") };
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { sitter: { select: { slug: true } } } });
  if (!booking || booking.ownerId !== user.id) return { error: t("notFound") };
  if (!allowedTransitions(booking.status, "OWNER").includes("CANCELLED")) {
    return { error: t("cancel.notCancellable") };
  }
  const parsed = cancelSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { reason, details } = parsed.data;

  const res = await transitionBooking({
    bookingId: booking.id,
    to: "CANCELLED",
    actor: "OWNER",
    reason: details ? `${reason} — ${details}` : reason,
  });
  if ("error" in res) return { error: res.error };
  revalidateBookingPages(booking.id, booking.sitter.slug);
  redirect(await localizedPath(`/account/bookings/${booking.id}?notice=cancelled`));
}

const reviewSchema = (t: T) =>
  z.object({
    rating: z.coerce.number(t("starRating")).int().min(1, t("starRating")).max(5, t("starRating")),
    body: z.string().trim().min(20, t("review.minLength")).max(1000, t("review.maxLength")),
  });

/** Owner reviews a COMPLETED booking of theirs (one review per booking). */
export async function createReview(bookingId: string, _: FormState, formData: FormData): Promise<FormState> {
  const t = await errors();
  const user = await currentUser();
  if (!user) return { error: t("logInAgain") };
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { review: { select: { id: true } }, pet: true, sitter: { select: { id: true, slug: true } } },
  });
  if (!booking || booking.ownerId !== user.id) return { error: t("notFound") };
  if (booking.status !== "COMPLETED") return { error: t("review.notCompleted") };
  if (booking.review) return { error: t("review.already") };

  const parsed = reviewSchema(t).safeParse({ rating: formData.get("rating") ?? undefined, body: formData.get("body") ?? "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const pet = booking.pet;
  let reviewId: string;
  try {
    const [created] = await db.$transaction([
      db.review.create({
        data: {
          sitterId: booking.sitterId,
          authorId: user.id,
          authorName: `${user.firstName} ${user.lastName.charAt(0).toUpperCase()}.`.trim(),
          authorAvatar: user.avatarUrl,
          petLabel: `${pet.name}${pet.breed ? ` (${pet.breed})` : ""} Parent`,
          rating: parsed.data.rating,
          body: parsed.data.body,
          bookingId: booking.id,
          verifiedBooking: true,
        },
      }),
    ]);
    reviewId = created.id;
  } catch {
    return { error: t("review.already") }; // unique bookingId race
  }
  await refreshSitterRating(booking.sitterId);
  emit({ type: "review.created", reviewId, bookingId: booking.id });

  revalidateBookingPages(booking.id, booking.sitter.slug);
  revalidatePath("/sitters");
  revalidatePath("/");
  redirect(await localizedPath(`/account/bookings/${booking.id}?notice=reviewed#review`));
}

// ---------------------------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------------------------

const traitSchema = (t: T) =>
  z.object({
    label: z.string().trim().min(1).max(40, t("pet.traitLength")),
    tone: z.enum(["neutral", "warning"]).default("neutral"),
  });

const petSchema = (t: T) =>
  z.object({
    name: z.string().trim().min(1, t("pet.name")).max(40, t("pet.nameLength")),
    species: z.enum(["DOG", "CAT", "OTHER"], t("pet.species")),
    speciesOther: optText(t, 40),
    breed: optText(t, 60),
    ageYears: z
      .string()
      .trim()
      .optional()
      .transform((v, ctx) => {
        if (!v) return null;
        const n = Number(v.replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || n > 40) {
          ctx.addIssue({ code: "custom", message: t("pet.age") });
          return z.NEVER;
        }
        return Math.round(n * 10) / 10;
      }),
    size: z
      .union([z.enum(PET_SIZES), z.literal("")], t("pet.size"))
      .optional()
      .transform((v) => v || null),
    sex: z
      .union([z.enum(["MALE", "FEMALE"]), z.literal("")], t("pet.sex"))
      .optional()
      .transform((v) => v || null),
    neutered: checkbox,
    rabiesVaccinated: checkbox,
    microchip: z
      .string()
      .trim()
      .optional()
      .transform((v) => v?.replace(/\s+/g, "") || null)
      .refine((v) => v === null || /^[A-Za-z0-9]{9,15}$/.test(v), t("pet.microchip")),
    removePhoto: checkbox,
    traits: z
      .string()
      .optional()
      .transform((v, ctx) => {
        try {
          const arr = z.array(traitSchema(t)).max(12, t("pet.maxTraits")).parse(v ? JSON.parse(v) : []);
          return arr;
        } catch (e) {
          ctx.addIssue({ code: "custom", message: e instanceof z.ZodError ? (e.issues[0]?.message ?? t("pet.invalidTraits")) : t("pet.invalidTraits") });
          return z.NEVER;
        }
      }),
  });

/** Only same-origin relative paths are allowed as a post-save destination. */
function safeNext(raw: FormDataEntryValue | null): URL | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  try {
    const url = new URL(raw, "http://wagstays.local");
    return url.origin === "http://wagstays.local" ? url : null;
  } catch {
    return null;
  }
}

/** Creates (petId = null) or updates one of the owner's pets, including photo + traits. */
export async function savePet(petId: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const t = await errors();
  const user = await currentUser();
  if (!user) return { error: t("logInAgain") };
  if (petId) {
    const existing = await db.pet.findUnique({ where: { id: petId }, select: { ownerId: true } });
    if (!existing || existing.ownerId !== user.id) return { error: t("notFound") };
  }

  const parsed = petSchema(t).safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { traits, removePhoto, ...data } = parsed.data;
  if (data.species === "OTHER" && !data.speciesOther) {
    return { fieldErrors: { speciesOther: [t("pet.otherKind")] } };
  }
  if (data.species !== "OTHER") data.speciesOther = null;

  let photoUrl: string | null | undefined = removePhoto ? null : undefined;
  const photo = fileFrom(formData, "photo");
  if (photo) {
    const up = await saveUpload(photo, "pets");
    if ("error" in up) return { fieldErrors: { photo: [up.error] } };
    photoUrl = up.url;
  }

  const traitRows = traits.map((t) => ({ label: t.label, tone: t.tone }));
  let id = petId;
  if (petId) {
    await db.$transaction([
      db.pet.update({ where: { id: petId, ownerId: user.id }, data: { ...data, ...(photoUrl !== undefined && { photoUrl }) } }),
      db.petTrait.deleteMany({ where: { petId } }),
      db.petTrait.createMany({ data: traitRows.map((t) => ({ ...t, petId })) }),
    ]);
  } else {
    const pet = await db.pet.create({
      data: { ...data, ownerId: user.id, photoUrl: photoUrl ?? null, traits: { create: traitRows } },
    });
    id = pet.id;
  }

  revalidatePath("/account/pets");
  revalidatePath("/", "layout"); // header pet count, booking widget pet list

  const next = petId ? null : safeNext(formData.get("next"));
  if (next) {
    next.searchParams.set("pet", id!);
    redirect(await localizedPath(`${next.pathname}${next.search}${next.hash}`));
  }
  if (!petId) redirect(await localizedPath(`/account/pets?saved=${id}`));
  return { ok: true, message: t("pet.saved") };
}

/** Deletes an owner's pet; pets with booking history are archived instead so records stay intact. */
export async function deletePet(petId: string): Promise<FormState> {
  const t = await errors();
  const user = await currentUser();
  if (!user) return { error: t("logInAgain") };
  const pet = await db.pet.findUnique({ where: { id: petId }, select: { ownerId: true, name: true } });
  if (!pet || pet.ownerId !== user.id) return { error: t("notFound") };

  const upcoming = await db.booking.count({
    where: { petId, status: { in: ["PENDING", "CONFIRMED"] }, endAt: { gte: new Date() } },
  });
  if (upcoming > 0) {
    return { error: t("pet.upcoming", { name: pet.name, count: upcoming }) };
  }
  const history = await db.booking.count({ where: { petId } });
  if (history > 0) await db.pet.update({ where: { id: petId, ownerId: user.id }, data: { archivedAt: new Date() } });
  else await db.pet.delete({ where: { id: petId, ownerId: user.id } });
  revalidatePath("/account/pets");
  revalidatePath("/", "layout");
  redirect(await localizedPath("/account/pets?deleted=1"));
}

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------

const profileSchema = (t: T) =>
  z.object({
    firstName: z.string().trim().min(1, t("profile.firstName")).max(40),
    lastName: z.string().trim().min(1, t("profile.lastName")).max(40),
    phone: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || null)
      .refine((v) => v === null || (/^[+()\d\s.-]{7,25}$/.test(v) && v.replace(/\D/g, "").length >= 10), t("profile.phone")),
    removeAvatar: checkbox,
  });

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const t = await errors();
  const user = await currentUser();
  if (!user) return { error: t("logInAgain") };
  const parsed = profileSchema(t).safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { removeAvatar, ...data } = parsed.data;

  let avatarUrl: string | null | undefined = removeAvatar ? null : undefined;
  const avatar = fileFrom(formData, "avatar");
  if (avatar) {
    const up = await saveUpload(avatar, "avatars");
    if ("error" in up) return { fieldErrors: { avatar: [up.error] } };
    avatarUrl = up.url;
  }
  await db.user.update({ where: { id: user.id }, data: { ...data, ...(avatarUrl !== undefined && { avatarUrl }) } });
  revalidatePath("/", "layout");
  return { ok: true, message: t("profile.updated") };
}

const emailSchema = (t: T) =>
  z.object({
    email: z.string().trim().toLowerCase().pipe(z.email(t("email.invalid"))),
    currentPassword: z.string().min(1, t("currentPassword")),
  });

export async function changeEmail(_: FormState, formData: FormData): Promise<FormState> {
  const t = await errors();
  const user = await currentUser();
  if (!user) return { error: t("logInAgain") };
  const parsed = emailSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { email, currentPassword } = parsed.data;

  if (!(await verifyPassword(user.email, currentPassword))) {
    return { fieldErrors: { currentPassword: [t("wrongPassword")] } };
  }
  if (email === user.email) return { fieldErrors: { email: [t("email.same")] } };
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { fieldErrors: { email: [t("email.taken")] } };
  }
  // Supabase emails a confirmation link to the new address; the profile email syncs once it's confirmed.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${await getOrigin()}/auth/callback?next=/account/settings` },
  );
  if (error) return { error: error.message };
  return { ok: true, message: t("email.check", { email }) };
}

const passwordSchema = (t: T) =>
  z
    .object({
      currentPassword: z.string().min(1, t("currentPassword")),
      newPassword: z.string().min(8, t("password.min")).max(200),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: t("password.mismatch") });

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const t = await errors();
  const user = await currentUser();
  if (!user) return { error: t("logInAgain") };
  const parsed = passwordSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  if (!(await verifyPassword(user.email, parsed.data.currentPassword))) {
    return { fieldErrors: { currentPassword: [t("wrongPassword")] } };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    return error.code === "same_password"
      ? { fieldErrors: { newPassword: [t("password.reused")] } }
      : { error: error.message };
  }
  return { ok: true, message: t("password.changed") };
}
