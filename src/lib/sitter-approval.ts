import "server-only";
import type { Prisma } from "@prisma/client";
import { DEFAULT_TIME_ZONE, type ServiceType } from "./constants";

// Turns an approved SitterApplication into a live SitterProfile (+ User + Service rows).
// Called by the admin "Approve" action inside a single transaction.

export const SERVICE_UNIT_FOR: Record<ServiceType, { unit: string; durationMins: number | null }> = {
  DOG_WALKING: { unit: "WALK", durationMins: 60 },
  BOARDING: { unit: "NIGHT", durationMins: null },
  DAY_CARE: { unit: "DAY", durationMins: null },
  DROP_IN: { unit: "VISIT", durationMins: 30 },
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  "1-3": "1–3 years",
  "3-6": "3–6 years",
  "6+": "6+ years",
  VET: "Veterinary professional",
};

const EXPERIENCE_YEARS: Record<string, number> = { "1-3": 2, "3-6": 4, "6+": 6, VET: 5 };
const EXPERIENCE_HEADLINE: Record<string, string> = {
  "1-3": "Caring Pet Sitter",
  "3-6": "Experienced Pet Sitter",
  "6+": "Seasoned Pet Care Pro",
  VET: "Veterinary Professional",
};

export const HOME_TYPE_LABELS: Record<string, string> = {
  HOUSE_WITH_YARD: "House with yard",
  APARTMENT: "Apartment",
  CONDO_BALCONY: "Condo with balcony",
};

export const FALLBACK_AVATAR = "/images/img-22.jpg";

export function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "sitter";
}

/** Milliseconds `tz` is ahead of UTC at `date`. */
function tzOffsetMs(date: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-10-05T14:30" wall-clock in `tz` → UTC Date. */
export function fromZonedInput(value: string, tz = DEFAULT_TIME_ZONE) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const first = guess - tzOffsetMs(new Date(guess), tz);
  return new Date(guess - tzOffsetMs(new Date(first), tz));
}

/** UTC Date → "2026-10-05T14:30" wall-clock in `tz`, for <input type="datetime-local">. */
export function toZonedInput(date: Date, tz = DEFAULT_TIME_ZONE) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export class ApprovalError extends Error {}

type Tx = Prisma.TransactionClient;

/**
 * Approves an application: finds or creates the user, creates the SitterProfile + services and marks the
 * application APPROVED. Must run inside `db.$transaction`. Throws ApprovalError for business-rule failures.
 */
/** `defaultCityId` is used only for legacy applications without a neighbourhood reference. */
/** `newAuthUserId` must be a freshly created Supabase auth user when no WagStays account exists for the applicant. */
export async function approveApplicationTx(tx: Tx, applicationId: string, defaultCityId: string, newAuthUserId?: string) {
  const app = await tx.sitterApplication.findUnique({ where: { id: applicationId }, include: { services: true } });
  if (!app) throw new ApprovalError("Application not found.");
  if (app.status === "APPROVED" || app.sitterProfileId) throw new ApprovalError("This application has already been approved.");
  if (app.status === "REJECTED") throw new ApprovalError("This application was rejected. Move it back to review before approving.");
  if (app.services.length === 0) throw new ApprovalError("The application has no services to publish.");

  // 1. User
  const email = app.email.trim().toLowerCase();
  let user = app.userId ? await tx.user.findUnique({ where: { id: app.userId } }) : null;
  user ??= await tx.user.findUnique({ where: { email } });
  let createdUser = false;
  if (!user) {
    if (!newAuthUserId) throw new ApprovalError("NEEDS_AUTH_USER");
    user = await tx.user.create({
      data: {
        id: newAuthUserId,
        email,
        firstName: app.firstName,
        lastName: app.lastName,
        phone: app.phone,
        role: "SITTER",
      },
    });
    createdUser = true;
  } else if (user.role !== "ADMIN" && user.role !== "SITTER") {
    user = await tx.user.update({ where: { id: user.id }, data: { role: "SITTER" } });
  }
  if (await tx.sitterProfile.findUnique({ where: { userId: user.id }, select: { id: true } })) {
    throw new ApprovalError(`${user.email} already has a sitter profile.`);
  }

  // 2. Neighbourhood (applications store the slug or the display name)
  const ref = app.neighbourhoodId ? await tx.neighbourhood.findUnique({ where: { id: app.neighbourhoodId } }) : null;
  const cityId = ref?.cityId ?? defaultCityId;
  const hoods = await tx.neighbourhood.findMany({ where: { cityId }, orderBy: { name: "asc" } });
  const key = app.neighbourhood?.trim().toLowerCase();
  const hood = ref ?? hoods.find((n) => n.slug === key || n.name.toLowerCase() === key) ?? hoods[0];
  if (!hood) throw new ApprovalError("The active city has no neighbourhoods.");

  // 3. Unique slug
  const base = slugify(`${app.firstName} ${app.lastName}`);
  let slug = base;
  for (let i = 2; await tx.sitterProfile.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`;

  // Small deterministic offset so new sitters don't stack exactly on the neighbourhood centre pin.
  const h = [...app.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const jitter = (n: number) => (((h >> n) % 100) / 100 - 0.5) * 0.008;

  const homeTitle = HOME_TYPE_LABELS[app.homeType];
  const profile = await tx.sitterProfile.create({
    data: {
      userId: user.id,
      slug,
      displayName: `${app.firstName} ${app.lastName}`.trim(),
      headline: EXPERIENCE_HEADLINE[app.experience] ?? "Pet Sitter",
      bio: app.bio.length > 160 ? `${app.bio.slice(0, 157).trimEnd()}…` : app.bio,
      about: app.bio,
      cityId,
      neighbourhoodId: hood.id,
      locationNote: hood.name,
      lat: hood.lat + jitter(0),
      lng: hood.lng + jitter(8),
      avatarUrl: user.avatarUrl ?? FALLBACK_AVATAR,
      yearsExperience: EXPERIENCE_YEARS[app.experience] ?? 0,
      idVerified: !!app.idDocumentName,
      backgroundChecked: !!app.backgroundCheckName,
      firstAidCertified: app.certFirstAid,
      vetKnowledge: app.experience === "VET",
      professionalTrainer: app.certBehaviour,
      homeType: app.homeType,
      homeTitle,
      smokeFree: app.smokeFree,
      hasChildren: !app.noChildren,
      hasOtherPets: app.ownPets,
      hasYard: app.fencedYard,
      acceptsSmall: app.acceptsSmall,
      acceptsMedium: app.acceptsMedium,
      acceptsLarge: app.acceptsLarge,
      acceptsGiant: app.acceptsGiant,
      status: "ACTIVE",
      rating: 0,
      reviewCount: 0,
      services: {
        create: app.services.map((s) => ({
          type: s.type,
          priceCents: s.priceCents,
          unit: SERVICE_UNIT_FOR[s.type as ServiceType]?.unit ?? "VISIT",
          durationMins: SERVICE_UNIT_FOR[s.type as ServiceType]?.durationMins ?? null,
        })),
      },
    },
  });

  const reviewedAt = new Date();
  await tx.sitterApplication.update({
    where: { id: app.id },
    data: { status: "APPROVED", reviewedAt, sitterProfileId: profile.id, userId: user.id },
  });

  return {
    before: { status: app.status, userId: app.userId },
    profile,
    user: { id: user.id, email: user.email, role: user.role },
    createdUser,
  };
}
