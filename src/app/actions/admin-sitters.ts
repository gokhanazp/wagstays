"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { createPasswordLink } from "@/lib/password-links";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { getActiveCity } from "@/lib/queries";
import { DEFAULT_TIME_ZONE } from "@/lib/constants";
import { ApprovalError, approveApplicationTx, fromZonedInput } from "@/lib/sitter-approval";

export type AdminFormState =
  | { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

const NOT_ALLOWED: AdminFormState = { error: "You don't have permission to do that." };
const id = z.string().trim().min(1).max(64);
const checkbox = z.preprocess((v) => v === "1" || v === "on" || v === "true", z.boolean());
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((v) => v || null);

function revalidateApplication(applicationId: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/become-a-sitter/submitted");
}

function revalidateSitter(sitterId: string, slug: string) {
  revalidatePath("/");
  revalidatePath("/sitters");
  revalidatePath(`/sitters/${slug}`);
  revalidatePath("/admin/sitters");
  revalidatePath(`/admin/sitters/${sitterId}`);
}

// ---------------------------------------------------------------- Applications

const MeetGreetSchema = z.object({
  applicationId: id,
  meetGreetAt: z.string().trim().min(1, "Choose a date and time."),
});

export async function scheduleMeetGreet(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = MeetGreetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const at = fromZonedInput(parsed.data.meetGreetAt);
  if (!at) return { fieldErrors: { meetGreetAt: ["Choose a valid date and time."] } };
  if (at.getTime() < Date.now() - 60_000) return { fieldErrors: { meetGreetAt: ["Pick a time in the future."] } };

  const app = await db.sitterApplication.findUnique({ where: { id: parsed.data.applicationId } });
  if (!app) return { error: "Application not found." };
  if (app.status === "APPROVED" || app.status === "REJECTED") {
    return { error: "This application has already been decided." };
  }
  await db.sitterApplication.update({ where: { id: app.id }, data: { meetGreetAt: at, status: "MEET_GREET" } });
  await audit(admin.id, "application.schedule_meet_greet", "SitterApplication", app.id, {
    before: { status: app.status, meetGreetAt: app.meetGreetAt },
    after: { status: "MEET_GREET", meetGreetAt: at },
  });
  revalidateApplication(app.id);
  return { ok: true, message: app.meetGreetAt ? "Meet & Greet rescheduled." : "Meet & Greet scheduled." };
}

const NotesSchema = z.object({ applicationId: id, reviewNotes: optionalText(4000) });

export async function saveReviewNotes(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = NotesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const app = await db.sitterApplication.findUnique({ where: { id: parsed.data.applicationId }, select: { id: true, reviewNotes: true } });
  if (!app) return { error: "Application not found." };
  await db.sitterApplication.update({ where: { id: app.id }, data: { reviewNotes: parsed.data.reviewNotes } });
  await audit(admin.id, "application.notes", "SitterApplication", app.id, {
    before: { reviewNotes: app.reviewNotes },
    after: { reviewNotes: parsed.data.reviewNotes },
  });
  revalidateApplication(app.id);
  return { ok: true, message: "Notes saved." };
}

export async function approveApplication(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = z.object({ applicationId: id }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid application." };

  const city = await getActiveCity();
  // Applicants without a WagStays account get a Supabase auth user first (confirmed, no password yet).
  const app = await db.sitterApplication.findUnique({ where: { id: parsed.data.applicationId }, select: { email: true, userId: true, firstName: true, lastName: true } });
  if (!app) return { error: "Application not found." };
  const email = app.email.trim().toLowerCase();
  const hasAccount = !!app.userId || !!(await db.user.findUnique({ where: { email }, select: { id: true } }));
  let newAuthUserId: string | undefined;
  const supabaseAdmin = createSupabaseAdminClient();
  if (!hasAccount) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { firstName: app.firstName, lastName: app.lastName },
    });
    if (error || !data.user) return { error: `Couldn't create the sitter's login: ${error?.message ?? "unknown error"}` };
    newAuthUserId = data.user.id;
  }
  let result: Awaited<ReturnType<typeof approveApplicationTx>>;
  try {
    result = await db.$transaction((tx) => approveApplicationTx(tx, parsed.data.applicationId, city.id, newAuthUserId), { timeout: 15_000 });
  } catch (e) {
    if (newAuthUserId) await supabaseAdmin.auth.admin.deleteUser(newAuthUserId); // roll back the auth user
    if (e instanceof ApprovalError) return { error: e.message };
    throw e;
  }
  const { profile, user, createdUser, before } = result;
  await audit(admin.id, "application.approve", "SitterApplication", parsed.data.applicationId, {
    before,
    after: { status: "APPROVED", sitterProfileId: profile.id, slug: profile.slug, userId: user.id, createdUser },
  });
  revalidateApplication(parsed.data.applicationId);
  revalidateSitter(profile.id, profile.slug);
  const setup = createdUser ? await createPasswordLink(user.email).catch(() => null) : null;
  return {
    ok: true,
    message: setup
      ? `Approved. A new sitter account was created for ${user.email}. Send them this one-time link (valid ${setup.expiresInHours} h) to set their password: ${setup.url}`
      : createdUser
        ? `Approved. A new sitter account was created for ${user.email} — create a password link for them from the Users page.`
      : `Approved. ${profile.displayName}'s profile is live at /sitters/${profile.slug}.`,
  };
}

const RejectSchema = z.object({
  applicationId: id,
  reason: z.string().trim().min(10, "Please give a reason (at least 10 characters).").max(2000),
});

export async function rejectApplication(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = RejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const app = await db.sitterApplication.findUnique({ where: { id: parsed.data.applicationId } });
  if (!app) return { error: "Application not found." };
  if (app.status === "APPROVED") return { error: "This application is already approved — pause the sitter profile instead." };
  if (app.status === "REJECTED") return { error: "This application has already been rejected." };

  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIME_ZONE, dateStyle: "medium" }).format(new Date());
  const reviewNotes = [`Rejected ${stamp} by ${admin.firstName} ${admin.lastName}: ${parsed.data.reason}`, app.reviewNotes]
    .filter(Boolean)
    .join("\n\n");
  await db.sitterApplication.update({
    where: { id: app.id },
    data: { status: "REJECTED", reviewedAt: new Date(), reviewNotes },
  });
  await audit(admin.id, "application.reject", "SitterApplication", app.id, {
    before: { status: app.status },
    after: { status: "REJECTED", reason: parsed.data.reason },
  });
  revalidateApplication(app.id);
  return { ok: true, message: "Application rejected." };
}

// ---------------------------------------------------------------- Sitters

const SitterSchema = z.object({
  sitterId: id,
  status: z.enum(["ACTIVE", "PAUSED"], { error: "Choose a status." }),
  neighbourhoodId: id,
  featured: checkbox,
  featuredBadge: optionalText(40),
  featuredBadgeIcon: z
    .string()
    .trim()
    .max(40)
    .regex(/^[a-z0-9_]*$/, "Use a Material Symbols name, e.g. workspace_premium.")
    .optional()
    .transform((v) => v || null),
  credential: optionalText(60),
  quote: optionalText(220),
  isSuperSitter: checkbox,
  instantBook: checkbox,
  idVerified: checkbox,
  backgroundChecked: checkbox,
  firstAidCertified: checkbox,
  vetKnowledge: checkbox,
  professionalTrainer: checkbox,
});

const SITTER_FIELDS = [
  "status",
  "neighbourhoodId",
  "featured",
  "featuredBadge",
  "featuredBadgeIcon",
  "credential",
  "quote",
  "isSuperSitter",
  "instantBook",
  "idVerified",
  "backgroundChecked",
  "firstAidCertified",
  "vetKnowledge",
  "professionalTrainer",
] as const;

export async function updateSitter(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = SitterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { sitterId, ...data } = parsed.data;

  const sitter = await db.sitterProfile.findUnique({ where: { id: sitterId } });
  if (!sitter) return { error: "Sitter not found." };
  const hood = await db.neighbourhood.findFirst({ where: { id: data.neighbourhoodId, cityId: sitter.cityId } });
  if (!hood) return { fieldErrors: { neighbourhoodId: ["Choose a neighbourhood in the sitter's city."] } };
  if (data.featured && !data.quote && !sitter.quote) {
    return { fieldErrors: { quote: ["Featured sitters need a short quote for the home page card."] } };
  }

  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const k of SITTER_FIELDS) {
    if (sitter[k] !== data[k]) {
      before[k] = sitter[k];
      after[k] = data[k];
    }
  }
  if (Object.keys(after).length === 0) return { ok: true, message: "No changes to save." };

  const hoodChanged = data.neighbourhoodId !== sitter.neighbourhoodId;
  await db.sitterProfile.update({
    where: { id: sitter.id },
    data: { ...data, ...(hoodChanged ? { lat: hood.lat, lng: hood.lng, locationNote: hood.name } : {}) },
  });
  await audit(admin.id, "sitter.update", "SitterProfile", sitter.id, { before, after });
  revalidateSitter(sitter.id, sitter.slug);
  return { ok: true, message: "Sitter updated." };
}

const ServiceSchema = z.object({
  serviceId: id,
  price: z.coerce
    .number({ error: "Enter a price." })
    .min(5, "Minimum $5.")
    .max(1000, "Maximum $1,000."),
  active: checkbox,
});

export async function updateService(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = ServiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const svc = await db.service.findUnique({ where: { id: parsed.data.serviceId }, include: { sitter: { select: { id: true, slug: true } } } });
  if (!svc) return { error: "Service not found." };

  const priceCents = Math.round(parsed.data.price * 100);
  const active = parsed.data.active;
  if (svc.priceCents === priceCents && svc.active === active) return { ok: true, message: "No changes." };
  if (!active && svc.active) {
    const others = await db.service.count({ where: { sitterId: svc.sitterId, active: true, id: { not: svc.id } } });
    if (others === 0) return { error: "A sitter needs at least one active service. Pause the sitter instead." };
  }
  await db.service.update({ where: { id: svc.id }, data: { priceCents, active } });
  await audit(admin.id, "service.update", "Service", svc.id, {
    sitterId: svc.sitterId,
    before: { priceCents: svc.priceCents, active: svc.active },
    after: { priceCents, active },
  });
  revalidateSitter(svc.sitter.id, svc.sitter.slug);
  return { ok: true, message: "Saved." };
}
