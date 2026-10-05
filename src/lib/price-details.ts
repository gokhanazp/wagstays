// Plain-words pricing copy shared by search cards, the profile "Price details" list, the sitter's
// "What pet parents will see" preview, the booking widget / checkout explanations and /pricing.
// Client + server safe. Numbers always come from the service row and src/lib/quote.ts — never hard-coded.

import { formatMoney } from "./format";
import { holidaysForYear } from "./holidays";
import { petLimit, type PriceLine, type QuoteService } from "./quote";
import type { Fees } from "./pricing";

export type DetailService = QuoteService & { unit: string; durationMins?: number | null; maxPetsPerBooking: number };

const UNIT_WORD: Record<string, string> = { WALK: "walk", NIGHT: "night", DAY: "day", VISIT: "visit" };
export const unitWord = (unit: string) => UNIT_WORD[unit] ?? "visit";

/** "dog" / "dogs" for dog walking, "pet" / "pets" otherwise. */
export const petWord = (type: string, n = 1) => `${type === "DOG_WALKING" ? "dog" : "pet"}${n === 1 ? "" : "s"}`;

/** "dogs per walk", "pets per stay", "pets per day", "pets per visit" */
export function perBookingPhrase(type: string, n = 2) {
  const per = type === "DOG_WALKING" ? "walk" : type === "BOARDING" ? "stay" : type === "DAY_CARE" ? "day" : "visit";
  return `${petWord(type, n)} per ${per}`;
}

/** Whether one booking of `service` may include `count` pets. */
export const takesPets = (service: Pick<QuoteService, "maxPetsPerBooking" | "additionalPetPriceCents">, count: number) => petLimit(service) >= count;

/** Search-card badge: "Up to 2 dogs · +$12 each", "Up to 3 pets · extra pets free" or "1 pet per booking". */
export function petLimitBadge(service: Pick<QuoteService, "type" | "maxPetsPerBooking" | "additionalPetPriceCents">) {
  const max = petLimit(service);
  if (max <= 1) return "1 pet per booking";
  const each = service.additionalPetPriceCents ?? 0;
  return `Up to ${max} ${petWord(service.type, max)} · ${each ? `+${formatMoney(each)} each` : `extra ${petWord(service.type, 2)} free`}`;
}

export type DetailItem = { key: "base" | "extraPet" | "holiday" | "puppy"; icon: string; text: string; muted?: boolean };

/** The profile service card's "Price details" list — one scannable line each. */
export function priceDetailItems(s: DetailService): DetailItem[] {
  const per = unitWord(s.unit);
  const mins = s.type === "DOG_WALKING" || s.type === "DROP_IN" ? (s.durationMins ?? (s.type === "DOG_WALKING" ? 60 : 30)) : null;
  const items: DetailItem[] = [{ key: "base", icon: "payments", text: `${formatMoney(s.priceCents)} per ${per}${mins ? ` (${mins} min)` : ""} for one ${petWord(s.type)}` }];
  const max = petLimit(s);
  if (max > 1) {
    const each = s.additionalPetPriceCents ?? 0;
    items.push({
      key: "extraPet",
      icon: "pets",
      text: each
        ? `Each extra ${petWord(s.type)} +${formatMoney(each)} per ${per} (up to ${max} ${petWord(s.type, max)})`
        : `Extra ${petWord(s.type, 2)} at no charge (up to ${max} ${petWord(s.type, max)})`,
    });
  } else {
    items.push({ key: "extraPet", icon: "pets", text: "One pet per booking", muted: true });
  }
  if (s.holidayPriceCents != null && s.holidayPriceCents > s.priceCents) {
    items.push({ key: "holiday", icon: "celebration", text: `Statutory holidays: ${formatMoney(s.holidayPriceCents)} per ${per}` });
  }
  if (s.puppyPriceCents != null && s.puppyPriceCents > 0) {
    items.push({ key: "puppy", icon: "child_care", text: `Puppies under 1 year +${formatMoney(s.puppyPriceCents)} per ${per}` });
  }
  return items;
}

/** The next `count` statutory holidays on or after `fromIso` (YYYY-MM-DD) in a province. */
export function upcomingHolidays(provinceCode: string | null | undefined, fromIso: string, count = 4) {
  const year = Number(fromIso.slice(0, 4));
  const all = { ...holidaysForYear(year, provinceCode), ...holidaysForYear(year + 1, provinceCode) };
  return Object.entries(all)
    .filter(([d]) => d >= fromIso)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, count)
    .map(([date, name]) => ({ date, name }));
}

/** "Fri, Dec 25, 2026" */
export function holidayDateLabel(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const PROVINCE_NAMES: Record<string, string> = {
  ON: "Ontario", QC: "Quebec", BC: "British Columbia", AB: "Alberta", MB: "Manitoba", SK: "Saskatchewan",
  NS: "Nova Scotia", NB: "New Brunswick", NL: "Newfoundland and Labrador", PE: "Prince Edward Island",
};
export const provinceName = (code?: string | null) => PROVINCE_NAMES[(code ?? "").toUpperCase()] ?? "your province";

/** Older stored lines have no `kind`: infer it from the label (first line = base price). */
export function lineKind(line: PriceLine, index: number): NonNullable<PriceLine["kind"]> {
  if (line.kind) return line.kind;
  if (index === 0) return "base";
  if (line.label.startsWith("Extra")) return "extraPet";
  if (line.label.startsWith("Holiday")) return "holiday";
  if (line.label.startsWith("Puppy")) return "puppy";
  return "base";
}

export type Explanation = { title: string; body: string };

/** What a quote line means, in plain words. */
export function explainLine(
  line: PriceLine,
  index: number,
  ctx: { firstName: string; service: DetailService; provinceCode?: string | null; units?: number },
): Explanation {
  const s = ctx.service;
  const per = unitWord(s.unit);
  switch (lineKind(line, index)) {
    case "extraPet":
      return {
        title: `Extra ${petWord(s.type, 2)}`,
        body: `Your first ${petWord(s.type)} is included in the base price. ${ctx.firstName} adds ${formatMoney(s.additionalPetPriceCents ?? 0)} per ${per} for each additional ${petWord(s.type)}, up to ${petLimit(s)} in one booking.`,
      };
    case "holiday":
      return {
        title: line.holiday ? `${line.holiday} rate` : "Holiday rate",
        body: `${line.holiday ?? "This day"} is a statutory holiday in ${provinceName(ctx.provinceCode)}. ${ctx.firstName} charges ${formatMoney(s.holidayPriceCents ?? s.priceCents)} instead of ${formatMoney(s.priceCents)} that ${per}, so the difference is added here.`,
      };
    case "puppy":
      return {
        title: "Puppy surcharge",
        body: `Puppies under 1 year need extra attention. ${ctx.firstName} adds ${formatMoney(s.puppyPriceCents ?? 0)} per ${per} for each puppy, based on the age in your pet's profile.`,
      };
    default:
      return {
        title: "Sitter's price",
        body: `${ctx.firstName}'s own rate: ${formatMoney(s.priceCents)} per ${per} for one ${petWord(s.type)}${ctx.units && ctx.units > 1 ? `, times ${ctx.units}` : ""}. The sitter sets this price.`,
      };
  }
}

/** Explanations for the platform lines under the sitter's price. */
export function feeExplanations(fees: Fees, taxRateBps: number, taxLabel = "HST", provinceCode?: string | null) {
  const pct = (taxRateBps / 100).toLocaleString("en-CA", { maximumFractionDigits: 3 });
  return {
    wagShield: {
      title: "WagShield vet cover",
      body: `A flat ${formatMoney(fees.wagShieldFeeCents, { exact: true })} per booking. If your pet gets hurt or sick during the booking, emergency vet care is covered up to ${formatMoney(fees.vetCoverageCents)}.`,
    },
    serviceFee: {
      title: "WagStays service fee",
      body: `A flat ${formatMoney(fees.serviceFeeCents, { exact: true })} per booking — not a percentage. It pays for secure payments, sitter verification and support.`,
    },
    tax: {
      title: `${taxLabel} ${pct}%`,
      body: `${provinceCode?.toUpperCase() === "ON" ? "Ontario's" : "The"} ${pct}% ${taxLabel === "HST" ? "Harmonized Sales Tax" : "sales tax"}, charged on the sitter's price plus the fees above (after any WagPoints discount).`,
    },
    wagPoints: {
      title: "WagPoints",
      body: `Rewards you earn on completed bookings. Up to ${formatMoney(fees.wagPointsDiscountCents)} of your balance can come off each booking, before tax.`,
    },
  } satisfies Record<string, Explanation>;
}
