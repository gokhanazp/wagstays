"use server";

import { changePoints } from "@/lib/wagpoints";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ROLES } from "@/lib/constants";
import { CANADIAN_TIME_ZONES, kebab } from "@/lib/admin-core";

export type FormState =
  | { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;
export type SimpleResult = { ok?: boolean; error?: string };

const NOT_ALLOWED = "You don't have permission to do that.";

function raw(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
}

/** Revalidate everything public that reads cities, fees or sitters. */
function revalidatePublic() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------

const TZ_VALUES = CANADIAN_TIME_ZONES.map((t) => t.value) as [string, ...string[]];

const CitySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter the city name.").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Enter a URL slug.")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens (e.g. st-johns)."),
  province: z.string().trim().min(2, "Enter the province or territory.").max(60),
  provinceCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use the two-letter code (e.g. ON)."),
  taxRatePct: z
    .string()
    .trim()
    .regex(/^\d{1,2}(\.\d{1,3})?$/, "Enter a percentage with up to 3 decimals (e.g. 13 or 14.975).")
    .transform(Number)
    .refine((n) => n >= 0 && n <= 30, "Tax rate must be between 0% and 30%."),
  timeZone: z.enum(TZ_VALUES, { error: "Choose a Canadian time zone." }),
  lat: z.coerce.number({ error: "Enter a latitude." }).min(41, "Latitude must be within Canada (41–84).").max(84, "Latitude must be within Canada (41–84)."),
  lng: z.coerce.number({ error: "Enter a longitude." }).min(-142, "Longitude must be within Canada (−142 to −52).").max(-52, "Longitude must be within Canada (−142 to −52)."),
});

export async function saveCity(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: NOT_ALLOWED };
  const parsed = CitySchema.safeParse(raw(formData));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { id, taxRatePct, ...rest } = parsed.data;
  const data = { ...rest, taxRateBps: Math.round(taxRatePct * 100) };

  const clash = await db.city.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== id) return { error: "Please fix the highlighted fields.", fieldErrors: { slug: ["Another city already uses this slug."] } };

  if (id) {
    const before = await db.city.findUnique({ where: { id } });
    if (!before) return { error: "City not found." };
    const after = await db.city.update({ where: { id }, data });
    const changed = Object.fromEntries(
      (Object.keys(data) as (keyof typeof data)[]).filter((k) => before[k] !== after[k]).map((k) => [k, { from: before[k], to: after[k] }]),
    );
    await audit(admin.id, "city.update", "City", id, { changes: changed });
    revalidatePath("/admin/cities");
    revalidatePath(`/admin/cities/${id}`);
    revalidatePublic();
    return { ok: true, message: "City saved." };
  }

  const city = await db.city.create({ data: { ...data, isActive: false } });
  await audit(admin.id, "city.create", "City", city.id, { after: data });
  revalidatePath("/admin/cities");
  redirect(`/admin/cities/${city.id}?created=1`);
}

export async function setCityActive(cityId: string, active: boolean): Promise<SimpleResult> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: NOT_ALLOWED };
  const parsed = z.object({ cityId: z.string().min(1), active: z.boolean() }).safeParse({ cityId, active });
  if (!parsed.success) return { error: "Invalid request." };
  const city = await db.city.findUnique({ where: { id: parsed.data.cityId } });
  if (!city) return { error: "City not found." };
  if (city.isActive === parsed.data.active) return { ok: true };
  if (!parsed.data.active) {
    const otherActive = await db.city.count({ where: { isActive: true, id: { not: city.id } } });
    if (otherActive === 0) return { error: "At least one city must stay active — the public site needs a launch city." };
  } else {
    const hoods = await db.neighbourhood.count({ where: { cityId: city.id } });
    if (hoods === 0) return { error: "Add at least one neighbourhood before activating this city." };
  }
  await db.city.update({ where: { id: city.id }, data: { isActive: parsed.data.active } });
  const activeSitters = await db.sitterProfile.count({ where: { cityId: city.id, status: "ACTIVE" } });
  await audit(admin.id, parsed.data.active ? "city.activate" : "city.deactivate", "City", city.id, {
    name: city.name,
    before: { isActive: city.isActive },
    after: { isActive: parsed.data.active },
    activeSitters,
  });
  revalidatePath("/admin/cities");
  revalidatePath(`/admin/cities/${city.id}`);
  revalidatePath("/admin");
  revalidatePublic();
  return { ok: true };
}

const HoodSchema = z.object({
  cityId: z.string().min(1),
  name: z.string().trim().min(2, "Enter a neighbourhood name.").max(80),
  lat: z.string().trim().optional(),
  lng: z.string().trim().optional(),
});

const optCoord = (v: string | undefined, min: number, max: number) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : NaN;
};

export async function addNeighbourhood(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: NOT_ALLOWED };
  const parsed = HoodSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const city = await db.city.findUnique({ where: { id: parsed.data.cityId } });
  if (!city) return { error: "City not found." };
  const lat = optCoord(parsed.data.lat, 41, 84);
  const lng = optCoord(parsed.data.lng, -142, -52);
  const fieldErrors: Record<string, string[]> = {};
  if (Number.isNaN(lat)) fieldErrors.lat = ["Latitude must be within Canada (41–84)."];
  if (Number.isNaN(lng)) fieldErrors.lng = ["Longitude must be within Canada (−142 to −52)."];
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields.", fieldErrors };

  const existing = await db.neighbourhood.findMany({ where: { cityId: city.id }, select: { slug: true, name: true } });
  if (existing.some((h) => h.name.toLowerCase() === parsed.data.name.toLowerCase()))
    return { error: "Please fix the highlighted fields.", fieldErrors: { name: ["This neighbourhood already exists."] } };
  const base = kebab(parsed.data.name) || "neighbourhood";
  let slug = base;
  for (let i = 2; existing.some((h) => h.slug === slug); i++) slug = `${base}-${i}`;

  const hood = await db.neighbourhood.create({
    data: { cityId: city.id, name: parsed.data.name, slug, lat: lat ?? city.lat, lng: lng ?? city.lng },
  });
  await audit(admin.id, "neighbourhood.create", "Neighbourhood", hood.id, { cityId: city.id, name: hood.name, slug, lat: hood.lat, lng: hood.lng });
  revalidatePath(`/admin/cities/${city.id}`);
  revalidatePath("/admin/cities");
  revalidatePublic();
  return { ok: true, message: `${hood.name} added.` };
}

export async function renameNeighbourhood(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: NOT_ALLOWED };
  const parsed = z
    .object({ id: z.string().min(1), name: z.string().trim().min(2, "Enter a neighbourhood name.").max(80) })
    .safeParse(raw(formData));
  if (!parsed.success) return { error: z.flattenError(parsed.error).fieldErrors.name?.[0] ?? "Invalid request." };
  const hood = await db.neighbourhood.findUnique({ where: { id: parsed.data.id } });
  if (!hood) return { error: "Neighbourhood not found." };
  if (hood.name === parsed.data.name) return { ok: true, message: "No changes." };
  const dupe = await db.neighbourhood.findFirst({ where: { cityId: hood.cityId, name: parsed.data.name, id: { not: hood.id } } });
  if (dupe) return { error: "Another neighbourhood already has this name." };
  await db.neighbourhood.update({ where: { id: hood.id }, data: { name: parsed.data.name } });
  await audit(admin.id, "neighbourhood.rename", "Neighbourhood", hood.id, { cityId: hood.cityId, before: { name: hood.name }, after: { name: parsed.data.name } });
  revalidatePath(`/admin/cities/${hood.cityId}`);
  revalidatePublic();
  return { ok: true, message: "Renamed." };
}

export async function deleteNeighbourhood(id: string): Promise<SimpleResult> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: NOT_ALLOWED };
  if (typeof id !== "string" || !id) return { error: "Invalid request." };
  const hood = await db.neighbourhood.findUnique({ where: { id }, include: { _count: { select: { sitters: true } } } });
  if (!hood) return { error: "Neighbourhood not found." };
  if (hood._count.sitters > 0)
    return { error: `${hood._count.sitters} sitter${hood._count.sitters === 1 ? "" : "s"} still use${hood._count.sitters === 1 ? "s" : ""} ${hood.name}. Move them first.` };
  await db.neighbourhood.delete({ where: { id } });
  await audit(admin.id, "neighbourhood.delete", "Neighbourhood", id, { cityId: hood.cityId, name: hood.name, slug: hood.slug });
  revalidatePath(`/admin/cities/${hood.cityId}`);
  revalidatePath("/admin/cities");
  revalidatePublic();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Platform settings
// ---------------------------------------------------------------------------

const dollars = (label: string, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, `Enter ${label} in dollars (e.g. 3.50).`)
    .transform((v) => Math.round(Number(v) * 100))
    .refine((c) => c <= max * 100, `${label[0].toUpperCase()}${label.slice(1)} can't exceed $${max.toLocaleString("en-CA")}.`);

const SettingsSchema = z.object({
  wagShieldFee: dollars("the WagShield fee", 100),
  serviceFee: dollars("the service fee", 100),
  wagPointsDiscount: dollars("the WagPoints discount", 100),
  vetCoverage: dollars("vet coverage", 100_000),
  pointsEarnRate: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter the earn rate as a percentage (e.g. 5).")
    .transform((v) => Math.round(Number(v) * 100))
    .refine((bps) => bps <= 5000, "The earn rate can't exceed 50%."),
  referralReward: dollars("the referral reward", 500),
  supportEmail: z.string().trim().toLowerCase().pipe(z.email("Enter a valid support email.")),
  supportPhone: z
    .string()
    .trim()
    .refine((v) => /^\+?1?\D*(\d\D*){10}$/.test(v), "Enter a 10-digit Canadian phone number."),
});

export async function saveSettings(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: NOT_ALLOWED };
  const parsed = SettingsSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;
  const data = {
    wagShieldFeeCents: d.wagShieldFee,
    serviceFeeCents: d.serviceFee,
    wagPointsDiscountCents: d.wagPointsDiscount,
    vetCoverageCents: d.vetCoverage,
    pointsEarnRateBps: d.pointsEarnRate,
    referralRewardCents: d.referralReward,
    supportEmail: d.supportEmail,
    supportPhone: d.supportPhone,
  };
  const before = await db.platformSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
  await db.platformSettings.update({ where: { id: "default" }, data });
  const keys = Object.keys(data) as (keyof typeof data)[];
  const changed = keys.filter((k) => before[k] !== data[k]);
  if (changed.length) {
    await audit(admin.id, "settings.update", "PlatformSettings", "default", {
      before: Object.fromEntries(changed.map((k) => [k, before[k]])),
      after: Object.fromEntries(changed.map((k) => [k, data[k]])),
    });
  }
  revalidatePath("/admin/settings");
  revalidatePublic();
  return { ok: true, message: changed.length ? "Settings saved. New bookings use these fees right away." : "No changes to save." };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

async function activeAdminCount() {
  return db.user.count({ where: { role: "ADMIN", suspended: false } });
}

export async function setUserRole(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: NOT_ALLOWED };
  const parsed = z.object({ userId: z.string().min(1), role: z.enum(ROLES, { error: "Choose a role." }) }).safeParse(raw(formData));
  if (!parsed.success) return { error: "Choose a valid role." };
  const { userId, role } = parsed.data;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found." };
  if (user.role === role) return { ok: true, message: "No changes." };
  if (user.id === admin.id) return { error: "You can't change your own role. Ask another admin." };
  if (user.role === "ADMIN" && !user.suspended && (await activeAdminCount()) <= 1) return { error: "This is the last active admin — promote someone else first." };
  await db.user.update({ where: { id: userId }, data: { role } });
  await audit(admin.id, "user.role", "User", userId, { email: user.email, before: { role: user.role }, after: { role } });
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true, message: `Role changed to ${role.toLowerCase()}.` };
}

export async function setUserSuspended(userId: string, suspended: boolean): Promise<SimpleResult> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: NOT_ALLOWED };
  const parsed = z.object({ userId: z.string().min(1), suspended: z.boolean() }).safeParse({ userId, suspended });
  if (!parsed.success) return { error: "Invalid request." };
  const user = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) return { error: "User not found." };
  if (user.suspended === parsed.data.suspended) return { ok: true };
  if (user.id === admin.id) return { error: "You can't suspend your own account." };
  if (parsed.data.suspended && user.role === "ADMIN" && (await activeAdminCount()) <= 1) return { error: "This is the last active admin and can't be suspended." };
  // Ban in Supabase Auth too, so existing sessions stop refreshing and the user can't sign in.
  const { error: banError } = await createSupabaseAdminClient().auth.admin.updateUserById(user.id, {
    ban_duration: parsed.data.suspended ? "876000h" : "none",
  });
  if (banError) return { error: `Couldn't update the login: ${banError.message}` };
  await db.user.update({ where: { id: user.id }, data: { suspended: parsed.data.suspended } });
  await audit(admin.id, parsed.data.suspended ? "user.suspend" : "user.unsuspend", "User", user.id, {
    email: user.email,
    before: { suspended: user.suspended },
    after: { suspended: parsed.data.suspended },
  });
  revalidatePath(`/admin/users/${user.id}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

const PointsSchema = z.object({
  userId: z.string().min(1),
  direction: z.enum(["add", "remove"]),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount in dollars (e.g. 5 or 2.50).")
    .transform((v) => Math.round(Number(v) * 100))
    .refine((c) => c > 0 && c <= 100_000, "Amount must be between $0.01 and $1,000."),
  reason: z.string().trim().min(5, "Add a short reason (at least 5 characters).").max(200),
});

export async function adjustWagPoints(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: NOT_ALLOWED };
  const parsed = PointsSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { userId, direction, amount, reason } = parsed.data;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found." };
  const delta = direction === "add" ? amount : -amount;
  const next = user.wagPointsCents + delta;
  if (next < 0) return { error: "Please fix the highlighted fields.", fieldErrors: { amount: ["That would take the balance below $0."] } };
  if (!(await changePoints(db, { userId, amountCents: delta, reason: "ADMIN", note: reason }))) {
    return { error: "Please fix the highlighted fields.", fieldErrors: { amount: ["That would take the balance below $0."] } };
  }
  await audit(admin.id, "user.wagpoints", "User", userId, {
    email: user.email,
    deltaCents: delta,
    reason,
    before: { wagPointsCents: user.wagPointsCents },
    after: { wagPointsCents: next },
  });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: "WagPoints balance updated." };
}
