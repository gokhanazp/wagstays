"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSitter } from "@/lib/auth";
import { allowedTransitions, transitionBooking } from "@/lib/booking-lifecycle";
import { SERVICE_TYPES, type BookingStatus, type ServiceType } from "@/lib/constants";
import { saveUpload } from "@/lib/uploads";
import {
  BIO_MAX,
  HOME_TYPES,
  MAX_PHOTOS,
  MAX_SKILLS,
  MAX_TAGS,
  SERVICE_DURATIONS,
  SERVICE_PRICE_BOUNDS,
  SERVICE_UNITS,
  TAG_ICONS,
} from "@/lib/sitter";
import { PET_KINDS, normalizeKinds } from "@/lib/pets";

// Every action re-loads the signed-in sitter (requireSitter) and only touches rows that belong to
// that sitter's profile — ids posted by the client are never trusted on their own.

export type SitterActionState =
  | { ok?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

type Profile = Awaited<ReturnType<typeof requireSitter>>["profile"];

function revalidateSitter(profile: Pick<Profile, "slug">) {
  revalidatePath("/sitter", "layout");
  revalidatePath("/sitters");
  revalidatePath(`/sitters/${profile.slug}`);
  revalidatePath("/");
}

function fail(error: z.ZodError): SitterActionState {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  return { error: Object.values(fieldErrors).flat()[0] ?? "Please check the form.", fieldErrors };
}

const optText = (max: number, msg?: string) =>
  z
    .string()
    .trim()
    .max(max, msg ?? `Please keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "1" || v === "true");

const id = z.string().trim().min(1).max(64);

/* ───────────────────────────── Availability ───────────────────────────── */

export async function setAvailability(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const parsed = z.object({ status: z.enum(["ACTIVE", "PAUSED"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Unknown availability status." };
  await db.sitterProfile.update({ where: { id: profile.id }, data: { status: parsed.data.status } });
  revalidateSitter(profile);
  return { ok: parsed.data.status === "ACTIVE" ? "You're visible in search again." : "Bookings paused — you're hidden from search." };
}

/* ─────────────────────────────── Bookings ─────────────────────────────── */

const BookingActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("accept"), bookingId: id, note: optText(500) }),
  z.object({
    intent: z.literal("decline"),
    bookingId: id,
    reason: z.string().trim().min(5, "Please give the owner a short reason (at least 5 characters).").max(500),
  }),
  z.object({ intent: z.literal("complete"), bookingId: id }),
  z.object({
    intent: z.literal("cancel"),
    bookingId: id,
    reason: z.string().trim().min(5, "Please explain why you're cancelling (at least 5 characters).").max(500),
  }),
]);

const INTENT_TO_STATUS: Record<string, BookingStatus> = {
  accept: "CONFIRMED",
  decline: "DECLINED",
  complete: "COMPLETED",
  cancel: "CANCELLED",
};

export async function respondToBooking(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const parsed = BookingActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;

  const booking = await db.booking.findFirst({
    where: { id: d.bookingId, sitterId: profile.id },
    select: { id: true, status: true, startAt: true },
  });
  if (!booking) return { error: "Booking not found." };

  const to = INTENT_TO_STATUS[d.intent];
  if (!allowedTransitions(booking.status, "SITTER").includes(to)) {
    return { error: "This booking can no longer be changed that way — refresh to see its latest status." };
  }
  if (d.intent === "complete" && booking.startAt.getTime() > Date.now()) {
    return { error: "You can mark a booking completed once it has started." };
  }

  const res = await transitionBooking({
    bookingId: booking.id,
    to,
    actor: "SITTER",
    reason: d.intent === "decline" || d.intent === "cancel" ? d.reason : undefined,
    sitterNote: d.intent === "accept" ? d.note : d.intent === "decline" ? d.reason : undefined,
  });
  if ("error" in res) return { error: res.error };

  revalidateSitter(profile);
  revalidatePath("/account", "layout");
  return {
    ok: {
      accept: "Request accepted — the owner has been notified.",
      decline: "Request declined.",
      complete: "Marked as completed. Nice work!",
      cancel: "Booking cancelled.",
    }[d.intent],
  };
}

/* ─────────────────────────────── Profile ─────────────────────────────── */

const ProfileSchema = z
  .object({
    headline: z.string().trim().min(3, "Please add a headline.").max(80, "Keep your headline under 80 characters."),
    bio: z
      .string()
      .trim()
      .min(20, "Your card blurb should be at least 20 characters.")
      .max(BIO_MAX, `Your card blurb must be ${BIO_MAX} characters or fewer.`),
    about: optText(4000, "Please keep your About section under 4,000 characters."),
    residentPetName: optText(40),
    locationNote: optText(80),
    serviceAreaNote: optText(200),
    serviceRadiusKm: z.coerce.number("Enter a radius in km.").min(0.5, "Radius must be at least 0.5 km.").max(25, "Radius can be at most 25 km."),
    yearsExperience: z.coerce.number("Enter a number of years.").int("Use whole years.").min(0, "Can't be negative.").max(60, "Please enter 60 or fewer."),
    homeType: z.enum(HOME_TYPES.map((h) => h.value) as [string, ...string[]], "Please choose a home type."),
    homeTitle: optText(60),
    homeNote: optText(200),
    hasYard: checkbox,
    smokeFree: checkbox,
    hasChildren: checkbox,
    hasOtherPets: checkbox,
    otherPetsNote: optText(200),
    acceptsSmall: checkbox,
    acceptsMedium: checkbox,
    acceptsLarge: checkbox,
    acceptsGiant: checkbox,
    kinds: z
      .array(z.enum(PET_KINDS, "Unknown pet type."))
      .min(1, "Choose at least one kind of pet you care for.")
      .transform((v) => normalizeKinds(v)),
  })
  .refine((d) => !d.kinds.includes("DOG") || d.acceptsSmall || d.acceptsMedium || d.acceptsLarge || d.acceptsGiant, {
    message: "Choose at least one dog size you accept.",
    path: ["acceptsSmall"],
  });

export async function updateProfile(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const parsed = ProfileSchema.safeParse({ ...Object.fromEntries(formData), kinds: formData.getAll("kinds") });
  if (!parsed.success) return fail(parsed.error);
  const { kinds, ...d } = parsed.data;
  // Dog walking only makes sense for dogs — keep DOG while that service is on.
  if (!kinds.includes("DOG") && (await db.service.count({ where: { sitterId: profile.id, type: "DOG_WALKING", active: true } }))) {
    return {
      error: "Please check “Pets I care for”.",
      fieldErrors: { kinds: ["You offer Dog Walking, so dogs must stay selected. Turn off Dog Walking in Services first."] },
    };
  }
  await db.$transaction([
    db.sitterProfile.update({
      where: { id: profile.id },
      data: { ...d, otherPetsNote: d.hasOtherPets ? d.otherPetsNote : null },
    }),
    db.sitterSpecies.deleteMany({ where: { sitterId: profile.id, kind: { notIn: kinds } } }),
    db.sitterSpecies.createMany({ data: kinds.map((kind) => ({ sitterId: profile.id, kind })), skipDuplicates: true }),
  ]);
  revalidateSitter(profile);
  return { ok: "Profile saved." };
}

export async function uploadProfileImage(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { user, profile } = await requireSitter();
  const kind = z.enum(["avatar", "card"]).safeParse(formData.get("kind"));
  const file = formData.get("file");
  if (!kind.success) return { error: "Unknown image type." };
  if (!(file instanceof File)) return { error: "Please choose a file." };
  const saved = await saveUpload(file, "sitters");
  if ("error" in saved) return { error: saved.error };
  if (kind.data === "avatar") {
    await db.$transaction([
      db.sitterProfile.update({ where: { id: profile.id }, data: { avatarUrl: saved.url } }),
      db.user.update({ where: { id: user.id }, data: { avatarUrl: saved.url } }),
    ]);
  } else {
    await db.sitterProfile.update({ where: { id: profile.id }, data: { cardPhotoUrl: saved.url } });
  }
  revalidateSitter(profile);
  return { ok: kind.data === "avatar" ? "Profile photo updated." : "Card photo updated." };
}

/* ─────────────────────────────── Gallery ─────────────────────────────── */

export async function addPhoto(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const caption = optText(80).safeParse(formData.get("caption") ?? undefined);
  if (!caption.success) return fail(caption.error);
  const count = await db.sitterPhoto.count({ where: { sitterId: profile.id } });
  if (count >= MAX_PHOTOS) return { error: `You can show up to ${MAX_PHOTOS} photos — remove one first.` };
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Please choose a file." };
  const saved = await saveUpload(file, "sitters");
  if ("error" in saved) return { error: saved.error };
  const last = await db.sitterPhoto.aggregate({ where: { sitterId: profile.id }, _max: { sortOrder: true } });
  await db.sitterPhoto.create({
    data: { sitterId: profile.id, url: saved.url, caption: caption.data, sortOrder: (last._max.sortOrder ?? -1) + 1 },
  });
  revalidateSitter(profile);
  return { ok: "Photo added to your gallery." };
}

export async function updatePhotoCaption(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const parsed = z.object({ photoId: id, caption: optText(80) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const res = await db.sitterPhoto.updateMany({
    where: { id: parsed.data.photoId, sitterId: profile.id },
    data: { caption: parsed.data.caption },
  });
  if (!res.count) return { error: "Photo not found." };
  revalidateSitter(profile);
  return { ok: "Caption saved." };
}

export async function movePhoto(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const parsed = z.object({ photoId: id, direction: z.enum(["up", "down"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid move." };
  const photos = await db.sitterPhoto.findMany({
    where: { sitterId: profile.id },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const i = photos.findIndex((p) => p.id === parsed.data.photoId);
  if (i < 0) return { error: "Photo not found." };
  const j = parsed.data.direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= photos.length) return undefined;
  [photos[i], photos[j]] = [photos[j], photos[i]];
  // Re-number everything so legacy duplicate sort orders can't make the move a no-op.
  await db.$transaction(photos.map((p, n) => db.sitterPhoto.update({ where: { id: p.id }, data: { sortOrder: n } })));
  revalidateSitter(profile);
  return undefined;
}

export async function deletePhoto(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const photoId = id.safeParse(formData.get("photoId"));
  if (!photoId.success) return { error: "Photo not found." };
  const res = await db.sitterPhoto.deleteMany({ where: { id: photoId.data, sitterId: profile.id } });
  if (!res.count) return { error: "Photo not found." };
  revalidateSitter(profile);
  return { ok: "Photo removed." };
}

/* ───────────────────────────── Skills & tags ───────────────────────────── */

export async function addSkill(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const parsed = z
    .object({
      label: z.string().trim().min(2, "Enter a skill (at least 2 characters).").max(40, "Keep skills under 40 characters."),
      emoji: z
        .string()
        .trim()
        .max(8, "Use a single emoji.")
        .refine((v) => !v || !/[\p{L}\p{N}]/u.test(v), "Use an emoji, not letters.")
        .optional()
        .transform((v) => (v ? v : null)),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const count = await db.sitterSkill.count({ where: { sitterId: profile.id } });
  if (count >= MAX_SKILLS) return { error: `You can list up to ${MAX_SKILLS} skills.` };
  await db.sitterSkill.create({ data: { sitterId: profile.id, ...parsed.data, sortOrder: count } });
  revalidateSitter(profile);
  return { ok: "Skill added." };
}

export async function removeSkill(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const skillId = id.safeParse(formData.get("skillId"));
  if (!skillId.success) return { error: "Skill not found." };
  const res = await db.sitterSkill.deleteMany({ where: { id: skillId.data, sitterId: profile.id } });
  if (!res.count) return { error: "Skill not found." };
  revalidateSitter(profile);
  return { ok: "Skill removed." };
}

export async function addTag(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const parsed = z
    .object({
      label: z.string().trim().min(2, "Enter a tag (at least 2 characters).").max(28, "Keep tags under 28 characters."),
      icon: z.enum(TAG_ICONS.map((t) => t.icon) as [string, ...string[]], "Choose an icon from the list."),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const count = await db.sitterTag.count({ where: { sitterId: profile.id } });
  if (count >= MAX_TAGS) return { error: `Cards show up to ${MAX_TAGS} tags — remove one first.` };
  await db.sitterTag.create({ data: { sitterId: profile.id, ...parsed.data, sortOrder: count } });
  revalidateSitter(profile);
  return { ok: "Tag added." };
}

export async function removeTag(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const tagId = id.safeParse(formData.get("tagId"));
  if (!tagId.success) return { error: "Tag not found." };
  const res = await db.sitterTag.deleteMany({ where: { id: tagId.data, sitterId: profile.id } });
  if (!res.count) return { error: "Tag not found." };
  revalidateSitter(profile);
  return { ok: "Tag removed." };
}

/* ─────────────────────────────── Services ─────────────────────────────── */

export async function updateService(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const type = z.enum(SERVICE_TYPES).safeParse(formData.get("type"));
  if (!type.success) return { error: "Unknown service." };
  const t: ServiceType = type.data;
  const bounds = SERVICE_PRICE_BOUNDS[t];
  const durations = SERVICE_DURATIONS[t];

  const parsed = z
    .object({
      active: checkbox,
      price: z.coerce
        .number("Enter a price in dollars.")
        .min(bounds.min / 100, `Price must be at least $${bounds.min / 100}.`)
        .max(bounds.max / 100, `Price can be at most $${bounds.max / 100}.`)
        .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use dollars and cents only."),
      durationMins: durations
        ? z.coerce.number().refine((v) => durations.includes(v), "Choose a visit length.")
        : z.any().transform(() => null),
      description: optText(300),
      extraNote: optText(40),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  if (t === "DOG_WALKING" && d.active && !(await db.sitterSpecies.findFirst({ where: { sitterId: profile.id, kind: "DOG" } }))) {
    return { error: "Dog Walking needs dogs in “Pets I care for” — add dogs on your profile first." };
  }

  const data = {
    active: d.active,
    priceCents: Math.round(d.price * 100),
    durationMins: d.durationMins as number | null,
    description: d.description,
    extraNote: d.extraNote,
    unit: SERVICE_UNITS[t],
  };
  // Look up by sitter + type so a forged service id can never reach another sitter's row.
  const existing = await db.service.findFirst({ where: { sitterId: profile.id, type: t }, select: { id: true } });
  if (existing) await db.service.update({ where: { id: existing.id }, data });
  else await db.service.create({ data: { sitterId: profile.id, type: t, ...data } });

  revalidateSitter(profile);
  return { ok: d.active ? "Service saved." : "Saved — this service is hidden from owners." };
}
