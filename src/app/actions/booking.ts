"use server";

import { changePoints } from "@/lib/wagpoints";
import { emit } from "@/lib/events";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { priceBooking } from "@/lib/pricing";
import { getFees } from "@/lib/settings";
import { TIME_SLOTS } from "@/lib/booking-slots";
import { isIsoDate, todayIso, zonedDateTime } from "@/lib/booking-time";

export type BookingState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

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
  petId: z.string().min(1, "Please choose a pet."),
  date: z.string().refine(isIsoDate, "Please choose a valid date."),
  slot: z.enum(TIME_SLOTS.map((s) => s.key) as [string, ...string[]], "Please choose a time slot."),
  recurring: checkbox,
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

export async function createBooking(slug: string, _: BookingState, formData: FormData): Promise<BookingState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/book/${slug}`)}`);

  const parsed = BookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return { error: Object.values(fieldErrors).flat()[0] ?? "Please check the form.", fieldErrors };
  }
  const d = parsed.data;

  if (d.date < todayIso()) return { error: "That date has already passed — please pick another day." };

  const sitter = await db.sitterProfile.findUnique({
    where: { slug },
    select: { id: true, status: true, city: { select: { taxRateBps: true } } },
  });
  if (!sitter || sitter.status !== "ACTIVE") return { error: "This sitter isn't taking bookings right now." };

  const [service, pet] = await Promise.all([
    db.service.findFirst({ where: { id: d.serviceId, sitterId: sitter.id, active: true } }),
    db.pet.findFirst({ where: { id: d.petId, ownerId: user.id, archivedAt: null }, select: { id: true } }),
  ]);
  if (!service) return { error: "That service isn't offered by this sitter." };
  if (!pet) return { error: "Please choose one of your own pets." };

  const slot = TIME_SLOTS.find((s) => s.key === d.slot)!;
  const startAt = zonedDateTime(d.date, slot.start);
  const endAt = zonedDateTime(d.date, slot.end);
  if (startAt.getTime() <= Date.now()) return { error: "That time slot has already started — please pick a later one." };

  const clash = await db.booking.findFirst({
    where: { sitterId: sitter.id, startAt, status: { in: ["PENDING", "CONFIRMED"] } },
    select: { id: true },
  });
  if (clash) return { error: "Sorry, that slot was just booked. Please choose another time." };

  // Never trust client totals: recompute from DB prices and the user's real WagPoints balance.
  const price = priceBooking({
    unitPriceCents: service.priceCents,
    taxRateBps: sitter.city.taxRateBps,
    fees: await getFees(),
    applyWagPoints: d.applyWagPoints && user.wagPointsCents > 0,
    wagPointsBalanceCents: user.wagPointsCents,
  });


  let bookingId: string;
  try {
    bookingId = await db.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          ownerId: user.id,
          sitterId: sitter.id,
          serviceId: service.id,
          petId: pet.id,
          startAt,
          endAt,
          recurringWeekly: d.recurring,
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
          cardBrand: d.cardBrand,
          cardLast4: d.cardLast4,
        },
        select: { id: true },
      });
      if (price.discountCents > 0) {
        const ok = await changePoints(tx, { userId: user.id, amountCents: -price.discountCents, reason: "BOOKING_SPEND", bookingId: booking.id });
        if (!ok) throw new Error("WAGPOINTS");
      }
      return booking.id;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "WAGPOINTS") {
      return { error: "Your WagPoints balance changed — please review the total and try again." };
    }
    throw e;
  }

  emit({ type: "booking.created", bookingId });
  redirect(`/book/${slug}/confirmed?id=${bookingId}`);
}
