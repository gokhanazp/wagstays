"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { revalidatePath } from "@/i18n/revalidate";
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
import { parseServiceAddons } from "@/lib/service-addons";
import { formatMoney } from "@/lib/format";

// Every action re-loads the signed-in sitter (requireSitter) and only touches rows that belong to
// that sitter's profile — ids posted by the client are never trusted on their own.

export type SitterActionState =
  | { ok?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

type Profile = Awaited<ReturnType<typeof requireSitter>>["profile"];
const tActions = () => getTranslations("sitter.actions");
type T = Awaited<ReturnType<typeof tActions>>;

function revalidateSitter(profile: Pick<Profile, "slug">) {
  revalidatePath("/sitter", "layout");
  revalidatePath("/sitters");
  revalidatePath(`/sitters/${profile.slug}`);
  revalidatePath("/");
}

function fail(error: z.ZodError, t: T): SitterActionState {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  return { error: Object.values(fieldErrors).flat()[0] ?? t("checkForm"), fieldErrors };
}

const optText = (t: T, max: number, msg?: string) =>
  z
    .string()
    .trim()
    .max(max, msg ?? t("maxChars", { max }))
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
  const t = await tActions();
  const parsed = z.object({ status: z.enum(["ACTIVE", "PAUSED"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t("unknownStatus") };
  await db.sitterProfile.update({ where: { id: profile.id }, data: { status: parsed.data.status } });
  revalidateSitter(profile);
  return { ok: parsed.data.status === "ACTIVE" ? t("visibleAgain") : t("pausedHidden") };
}

/* ─────────────────────────────── Bookings ─────────────────────────────── */

const bookingActionSchema = (t: T) =>
  z.discriminatedUnion("intent", [
    z.object({ intent: z.literal("accept"), bookingId: id, note: optText(t, 500) }),
    z.object({
      intent: z.literal("decline"),
      bookingId: id,
      reason: z.string().trim().min(5, t("declineReason")).max(500),
    }),
    z.object({ intent: z.literal("complete"), bookingId: id }),
    z.object({
      intent: z.literal("cancel"),
      bookingId: id,
      reason: z.string().trim().min(5, t("cancelReason")).max(500),
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
  const t = await tActions();
  const parsed = bookingActionSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error, t);
  const d = parsed.data;

  const booking = await db.booking.findFirst({
    where: { id: d.bookingId, sitterId: profile.id },
    select: { id: true, status: true, startAt: true },
  });
  if (!booking) return { error: t("bookingNotFound") };

  const to = INTENT_TO_STATUS[d.intent];
  if (!allowedTransitions(booking.status, "SITTER").includes(to)) {
    return { error: t("cantChange") };
  }
  if (d.intent === "complete" && booking.startAt.getTime() > Date.now()) {
    return { error: t("notStarted") };
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
      accept: t("accepted"),
      decline: t("declined"),
      complete: t("completed"),
      cancel: t("cancelled"),
    }[d.intent],
  };
}

/* ─────────────────────────────── Profile ─────────────────────────────── */

const profileSchema = (t: T) =>
  z
    .object({
      headline: z.string().trim().min(3, t("headlineMin")).max(80, t("headlineMax")),
      bio: z
        .string()
        .trim()
        .min(20, t("bioMin"))
        .max(BIO_MAX, t("bioMax", { max: BIO_MAX })),
      about: optText(t, 4000, t("aboutMax")),
      residentPetName: optText(t, 40),
      locationNote: optText(t, 80),
      serviceAreaNote: optText(t, 200),
      serviceRadiusKm: z.coerce.number(t("radiusNumber")).min(0.5, t("radiusMin")).max(25, t("radiusMax")),
      yearsExperience: z.coerce.number(t("yearsNumber")).int(t("yearsInt")).min(0, t("yearsMin")).max(60, t("yearsMax")),
      homeType: z.enum(HOME_TYPES.map((h) => h.value) as [string, ...string[]], t("homeType")),
      homeTitle: optText(t, 60),
      homeNote: optText(t, 200),
      hasYard: checkbox,
      smokeFree: checkbox,
      hasChildren: checkbox,
      hasOtherPets: checkbox,
      otherPetsNote: optText(t, 200),
      acceptsSmall: checkbox,
      acceptsMedium: checkbox,
      acceptsLarge: checkbox,
      acceptsGiant: checkbox,
      kinds: z
        .array(z.enum(PET_KINDS, t("unknownPetType")))
        .min(1, t("kindsMin"))
        .transform((v) => normalizeKinds(v)),
    })
    .refine((d) => !d.kinds.includes("DOG") || d.acceptsSmall || d.acceptsMedium || d.acceptsLarge || d.acceptsGiant, {
      message: t("dogSize"),
      path: ["acceptsSmall"],
    });

export async function updateProfile(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const t = await tActions();
  const parsed = profileSchema(t).safeParse({ ...Object.fromEntries(formData), kinds: formData.getAll("kinds") });
  if (!parsed.success) return fail(parsed.error, t);
  const { kinds, ...d } = parsed.data;
  // Dog walking only makes sense for dogs — keep DOG while that service is on.
  if (!kinds.includes("DOG") && (await db.service.count({ where: { sitterId: profile.id, type: "DOG_WALKING", active: true } }))) {
    return {
      error: t("checkPets"),
      fieldErrors: { kinds: [t("dogsRequired")] },
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
  return { ok: t("profileSaved") };
}

export async function uploadProfileImage(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { user, profile } = await requireSitter();
  const t = await tActions();
  const kind = z.enum(["avatar", "card"]).safeParse(formData.get("kind"));
  const file = formData.get("file");
  if (!kind.success) return { error: t("unknownImage") };
  if (!(file instanceof File)) return { error: t("chooseFile") };
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
  return { ok: kind.data === "avatar" ? t("avatarUpdated") : t("cardUpdated") };
}

/* ─────────────────────────────── Gallery ─────────────────────────────── */

export async function addPhoto(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const t = await tActions();
  const caption = optText(t, 80).safeParse(formData.get("caption") ?? undefined);
  if (!caption.success) return fail(caption.error, t);
  const count = await db.sitterPhoto.count({ where: { sitterId: profile.id } });
  if (count >= MAX_PHOTOS) return { error: t("maxPhotos", { max: MAX_PHOTOS }) };
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: t("chooseFile") };
  const saved = await saveUpload(file, "sitters");
  if ("error" in saved) return { error: saved.error };
  const last = await db.sitterPhoto.aggregate({ where: { sitterId: profile.id }, _max: { sortOrder: true } });
  await db.sitterPhoto.create({
    data: { sitterId: profile.id, url: saved.url, caption: caption.data, sortOrder: (last._max.sortOrder ?? -1) + 1 },
  });
  revalidateSitter(profile);
  return { ok: t("photoAdded") };
}

export async function updatePhotoCaption(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const t = await tActions();
  const parsed = z.object({ photoId: id, caption: optText(t, 80) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error, t);
  const res = await db.sitterPhoto.updateMany({
    where: { id: parsed.data.photoId, sitterId: profile.id },
    data: { caption: parsed.data.caption },
  });
  if (!res.count) return { error: t("photoNotFound") };
  revalidateSitter(profile);
  return { ok: t("captionSaved") };
}

export async function movePhoto(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const t = await tActions();
  const parsed = z.object({ photoId: id, direction: z.enum(["up", "down"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t("invalidMove") };
  const photos = await db.sitterPhoto.findMany({
    where: { sitterId: profile.id },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const i = photos.findIndex((p) => p.id === parsed.data.photoId);
  if (i < 0) return { error: t("photoNotFound") };
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
  const t = await tActions();
  const photoId = id.safeParse(formData.get("photoId"));
  if (!photoId.success) return { error: t("photoNotFound") };
  const res = await db.sitterPhoto.deleteMany({ where: { id: photoId.data, sitterId: profile.id } });
  if (!res.count) return { error: t("photoNotFound") };
  revalidateSitter(profile);
  return { ok: t("photoRemoved") };
}

/* ───────────────────────────── Skills & tags ───────────────────────────── */

export async function addSkill(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const t = await tActions();
  const parsed = z
    .object({
      label: z.string().trim().min(2, t("skillMin")).max(40, t("skillMax")),
      emoji: z
        .string()
        .trim()
        .max(8, t("singleEmoji"))
        .refine((v) => !v || !/[\p{L}\p{N}]/u.test(v), t("emojiOnly"))
        .optional()
        .transform((v) => (v ? v : null)),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error, t);
  const count = await db.sitterSkill.count({ where: { sitterId: profile.id } });
  if (count >= MAX_SKILLS) return { error: t("maxSkills", { max: MAX_SKILLS }) };
  await db.sitterSkill.create({ data: { sitterId: profile.id, ...parsed.data, sortOrder: count } });
  revalidateSitter(profile);
  return { ok: t("skillAdded") };
}

export async function removeSkill(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const t = await tActions();
  const skillId = id.safeParse(formData.get("skillId"));
  if (!skillId.success) return { error: t("skillNotFound") };
  const res = await db.sitterSkill.deleteMany({ where: { id: skillId.data, sitterId: profile.id } });
  if (!res.count) return { error: t("skillNotFound") };
  revalidateSitter(profile);
  return { ok: t("skillRemoved") };
}

export async function addTag(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const t = await tActions();
  const parsed = z
    .object({
      label: z.string().trim().min(2, t("tagMin")).max(28, t("tagMax")),
      icon: z.enum(TAG_ICONS.map((x) => x.icon) as [string, ...string[]], t("tagIcon")),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error, t);
  const count = await db.sitterTag.count({ where: { sitterId: profile.id } });
  if (count >= MAX_TAGS) return { error: t("maxTags", { max: MAX_TAGS }) };
  await db.sitterTag.create({ data: { sitterId: profile.id, ...parsed.data, sortOrder: count } });
  revalidateSitter(profile);
  return { ok: t("tagAdded") };
}

export async function removeTag(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const t = await tActions();
  const tagId = id.safeParse(formData.get("tagId"));
  if (!tagId.success) return { error: t("tagNotFound") };
  const res = await db.sitterTag.deleteMany({ where: { id: tagId.data, sitterId: profile.id } });
  if (!res.count) return { error: t("tagNotFound") };
  revalidateSitter(profile);
  return { ok: t("tagRemoved") };
}

/* ─────────────────────────────── Services ─────────────────────────────── */

export async function updateService(_: SitterActionState, formData: FormData): Promise<SitterActionState> {
  const { profile } = await requireSitter();
  const [tr, locale] = await Promise.all([tActions(), getLocale()]);
  const type = z.enum(SERVICE_TYPES).safeParse(formData.get("type"));
  if (!type.success) return { error: tr("unknownService") };
  const t: ServiceType = type.data;
  const bounds = SERVICE_PRICE_BOUNDS[t];
  const durations = SERVICE_DURATIONS[t];

  const parsed = z
    .object({
      active: checkbox,
      price: z.coerce
        .number(tr("priceNumber"))
        .min(bounds.min / 100, tr("priceMin", { amount: formatMoney(bounds.min, { locale }) }))
        .max(bounds.max / 100, tr("priceMax", { amount: formatMoney(bounds.max, { locale }) }))
        .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, tr("priceCents")),
      durationMins: durations
        ? z.coerce.number().refine((v) => durations.includes(v), tr("visitLength"))
        : z.any().transform(() => null),
      description: optText(tr, 300),
      extraNote: optText(tr, 40),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error, tr);
  const d = parsed.data;
  // Add-on rates: additional pet (+ max pets), holiday rate (≥ base price), puppy surcharge.
  const addons = parseServiceAddons(Object.fromEntries(formData) as Record<string, FormDataEntryValue>, Math.round(d.price * 100), t, locale);
  if (!addons.ok) return { error: Object.values(addons.fieldErrors).flat()[0] ?? tr("checkAddons"), fieldErrors: addons.fieldErrors };
  if (t === "DOG_WALKING" && d.active && !(await db.sitterSpecies.findFirst({ where: { sitterId: profile.id, kind: "DOG" } }))) {
    return { error: tr("dogWalkingNeedsDogs") };
  }

  const data = {
    active: d.active,
    priceCents: Math.round(d.price * 100),
    durationMins: d.durationMins as number | null,
    description: d.description,
    extraNote: d.extraNote,
    unit: SERVICE_UNITS[t],
    ...addons.data,
  };
  // Look up by sitter + type so a forged service id can never reach another sitter's row.
  const existing = await db.service.findFirst({ where: { sitterId: profile.id, type: t }, select: { id: true } });
  if (existing) await db.service.update({ where: { id: existing.id }, data });
  else await db.service.create({ data: { sitterId: profile.id, type: t, ...data } });

  revalidateSitter(profile);
  return { ok: d.active ? tr("serviceSaved") : tr("serviceHidden") };
}
