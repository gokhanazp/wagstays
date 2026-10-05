"use server";

import { randomUUID } from "node:crypto";
import { changePoints } from "@/lib/wagpoints";
import { emit } from "@/lib/events";
import { revalidatePath } from "@/i18n/revalidate";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { priceBooking } from "@/lib/pricing";
import { petBlockReason } from "@/lib/pets";
import { MAX_PETS_LIMIT, petCountBlockReason, quoteBooking } from "@/lib/quote";
import { holidaysForDates } from "@/lib/holidays";
import { getFees } from "@/lib/settings";
import { getOwnerReadiness, readinessMessage } from "@/lib/owner-readiness";
import { loadSnapshot } from "@/lib/availability";
import {
  DEFAULT_WEEKS,
  MAX_STAY_DAYS,
  MAX_WEEKS,
  MIN_WEEKS,
  addDays,
  canRecur,
  checkSeries,
  formatDayLong,
  isIsoDay,
  isStayService,
  parseSlot,
  type BookingRequest,
} from "@/lib/availability-core";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";

export type BookingState = { error?: string; conflicts?: string[]; fieldErrors?: Record<string, string[] | undefined> } | undefined;

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "1" || v === "true");

const BookingSchema = z.object({
  serviceId: z.string().min(1, "Please choose a service."),
  // every pet in the booking, comma-separated, primary first (the legacy single `petId` is still accepted)
  petIds: z
    .string()
    .optional()
    .transform((v) => [...new Set((v ?? "").split(",").map((x) => x.trim()).filter(Boolean))])
    .pipe(z.array(z.string().max(64)).max(MAX_PETS_LIMIT, `You can book at most ${MAX_PETS_LIMIT} pets at once.`)),
  petId: z.string().max(64).optional(),
  date: z.string().refine(isIsoDay, "Please choose a valid date."),
  // check-out (boarding) / last day (day care)
  endDate: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || isIsoDay(v), "Please choose a valid end date."),
  // "HH:MM" start / drop-off time (legacy slot keys like "midday" still accepted)
  slot: z.string().refine((v) => parseSlot(v) !== null, "Please choose a time."),
  recurring: checkbox,
  weeks: z.coerce.number().int().min(MIN_WEEKS).max(MAX_WEEKS).optional().catch(undefined),
  meet: checkbox,
  meetingAddress: z.string().trim().min(5, "Please enter a meeting address.").max(200),
  leashPreference: optText(120),
  otherAnimalsReaction: optText(120),
  feedingRules: optText(500),
  notes: optText(1000),
  gpsUpdates: checkbox,
  emergencyName: optText(120),
  emergencyPhone: optText(40),
  vetClinic: optText(120),
  vetPhone: optText(120),
  applyWagPoints: checkbox,
  cardholderName: z.string().trim().min(2, "Please enter the cardholder name.").max(80),
  // Local dev: the full card number / CVC never leave the browser — only brand + last 4.
  cardBrand: z.enum(["Visa", "Mastercard", "Amex"], "Please enter a Visa, Mastercard or Amex card."),
  cardLast4: z.string().regex(/^\d{4}$/, "Please enter a valid card number."),
});

class BookingConflict extends Error {
  constructor(
    message: string,
    readonly conflicts: string[] = [],
  ) {
    super(message);
  }
}

function conflictMessage(rows: { req: BookingRequest; check: { ok: boolean; error?: string } }[]) {
  const bad = rows.filter((r) => !r.check.ok);
  if (rows.length === 1) return { error: bad[0].check.error ?? "That time isn't available.", conflicts: [] };
  return {
    error: `${bad.length} of ${rows.length} weekly dates aren't available — change the day or time, or book fewer weeks.`,
    conflicts: bad.map((r) => `${formatDayLong(r.req.date)}: ${r.check.error}`),
  };
}

export async function createBooking(slug: string, _: BookingState, formData: FormData): Promise<BookingState> {
  const user = await getCurrentUser();
  if (!user) redirect(await localizedPath(`/login?next=${encodeURIComponent(`/book/${slug}`)}`));
  if (user.suspended) return { error: "Your account is suspended." };
  // Trust steps (phone, a pet, admin approval when required) — also covers weekly series, which are created here.
  const readiness = await getOwnerReadiness(user.id);
  if (!readiness.ready) return { error: readinessMessage(readiness) };

  const parsed = BookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return { error: Object.values(fieldErrors).flat()[0] ?? "Please check the form.", fieldErrors };
  }
  const d = parsed.data;
  const petIds = d.petIds.length ? d.petIds : d.petId ? [d.petId] : [];
  if (!petIds.length) return { error: "Please choose a pet.", fieldErrors: { petIds: ["Please choose a pet."] } };

  const sitter = await db.sitterProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      displayName: true,
      acceptsSmall: true,
      acceptsMedium: true,
      acceptsLarge: true,
      acceptsGiant: true,
      species: { select: { kind: true } },
      city: { select: { taxRateBps: true, provinceCode: true } },
    },
  });
  if (!sitter || sitter.status !== "ACTIVE") return { error: "This sitter isn't taking bookings right now." };

  const [service, ownPets] = await Promise.all([
    db.service.findFirst({ where: { id: d.serviceId, sitterId: sitter.id, active: true } }),
    db.pet.findMany({
      where: { id: { in: petIds }, ownerId: user.id, archivedAt: null },
      select: { id: true, name: true, species: true, speciesOther: true, size: true, ageYears: true },
    }),
  ]);
  if (!service) return { error: "That service isn't offered by this sitter." };
  // Every pet must be the owner's own (and not archived); keep the order the owner picked them in.
  const pets = petIds.map((id) => ownPets.find((p) => p.id === id));
  if (pets.some((p) => !p)) return { error: "Please choose your own pets." };
  const chosen = pets as (typeof ownPets)[number][];

  // The sitter must care for each kind of pet (and, for dogs, its size); dog walking is for dogs only.
  const firstName = sitter.displayName.includes("&") ? sitter.displayName : sitter.displayName.split(" ")[0];
  const acceptance = { ...sitter, firstName, kinds: sitter.species.map((s) => s.kind) };
  for (const p of chosen) {
    const blocked = petBlockReason(acceptance, p, service.type);
    if (blocked) return { error: `${p.name}: ${blocked} — please choose another pet, service or sitter.`, fieldErrors: { petIds: [blocked] } };
  }
  // More than one pet only when the sitter has an additional-pet rate, up to the service's limit.
  const countBlocked = petCountBlockReason(service, chosen.length, firstName);
  if (countBlocked) return { error: `${countBlocked}.`, fieldErrors: { petIds: [countBlocked] } };

  const stay = isStayService(service.type);
  if (stay && !d.endDate) return { error: service.type === "BOARDING" ? "Please choose a check-out date." : "Please choose the last day." };
  const weeks = d.recurring && canRecur(service.type) ? (d.weeks ?? DEFAULT_WEEKS) : 1;
  const req: BookingRequest = {
    type: service.type,
    date: d.date,
    endDate: stay ? d.endDate : null,
    minute: parseSlot(d.slot)!,
    durationMins: service.durationMins,
    petCount: chosen.length,
  };
  const lastDate = addDays(stay ? d.endDate! : d.date, 7 * (weeks - 1));
  if (stay && d.endDate! > addDays(d.date, MAX_STAY_DAYS)) return { error: `Stays can be at most ${MAX_STAY_DAYS} days.` };

  const fees = await getFees();
  const seriesId = weeks > 1 ? randomUUID() : null;

  let bookingIds: string[];
  try {
    bookingIds = await db.$transaction(
      async (tx) => {
        // Serialise bookings per sitter: concurrent requests wait here, then see each other's rows.
        await tx.$queryRaw`SELECT id FROM "SitterProfile" WHERE id = ${sitter.id} FOR UPDATE`;
        const snap = await loadSnapshot(sitter.id, d.date, lastDate, tx);
        if (!snap) throw new BookingConflict("This sitter isn't taking bookings right now.");
        const rows = checkSeries(snap, req, weeks, Date.now());
        if (rows.some((r) => !r.check.ok)) {
          const m = conflictMessage(rows);
          throw new BookingConflict(m.error, m.conflicts);
        }

        // Never trust client totals: recompute from DB prices and the user's real WagPoints balance.
        // The WagPoints discount applies once, to the first occurrence.
        const owner = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { wagPointsCents: true } });
        const ids: string[] = [];
        for (const [i, r] of rows.entries()) {
          if (!r.check.ok) continue;
          // Base rate + extra pets + holiday rate + puppy surcharge, per occurrence (holidays differ by week).
          const quote = quoteBooking({
            service,
            pets: chosen,
            dates: r.check.days,
            holidays: holidaysForDates(r.check.days, sitter.city.provinceCode),
          });
          const price = priceBooking({
            subtotalCents: quote.subtotalCents,
            taxRateBps: sitter.city.taxRateBps,
            fees,
            applyWagPoints: i === 0 && d.applyWagPoints && owner.wagPointsCents > 0,
            wagPointsBalanceCents: owner.wagPointsCents,
          });
          const booking = await tx.booking.create({
            data: {
              ownerId: user.id,
              sitterId: sitter.id,
              serviceId: service.id,
              petId: chosen[0].id,
              petCount: chosen.length,
              pets: { create: chosen.map((p) => ({ petId: p.id })) },
              startAt: new Date(r.check.startAt),
              endAt: new Date(r.check.endAt),
              quantity: r.check.quantity,
              seriesId,
              recurringWeekly: weeks > 1,
              status: "PENDING",
              meetingAddress: d.meetingAddress,
              leashPreference: d.leashPreference,
              otherAnimalsReaction: d.otherAnimalsReaction,
              feedingRules: d.feedingRules,
              notes: d.notes,
              meetAndGreet: d.meet,
              gpsUpdates: d.gpsUpdates,
              emergencyName: d.emergencyName,
              emergencyPhone: d.emergencyPhone,
              vetClinic: d.vetClinic,
              vetPhone: d.vetPhone,
              ...price,
              extrasCents: quote.extrasCents,
              priceLines: quote.lines,
              cardBrand: d.cardBrand,
              cardLast4: d.cardLast4,
            },
            select: { id: true },
          });
          if (price.discountCents > 0) {
            const ok = await changePoints(tx, { userId: user.id, amountCents: -price.discountCents, reason: "BOOKING_SPEND", bookingId: booking.id });
            if (!ok) throw new Error("WAGPOINTS");
          }
          ids.push(booking.id);
        }
        return ids;
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
  } catch (e) {
    if (e instanceof BookingConflict) return { error: e.message, conflicts: e.conflicts };
    if (e instanceof Error && e.message === "WAGPOINTS") {
      return { error: "Your WagPoints balance changed — please review the total and try again." };
    }
    throw e;
  }

  // One "new request" event per request (the first occurrence stands for a weekly series).
  emit({ type: "booking.created", bookingId: bookingIds[0] });
  revalidatePath(`/sitters/${slug}`);
  revalidatePath("/sitter", "layout");
  revalidatePath("/account/bookings");
  redirect(await localizedPath(`/book/${slug}/confirmed?id=${bookingIds[0]}`));
}
