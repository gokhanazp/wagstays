// Plain-words pricing copy shared by search cards, the profile "Price details" list, the sitter's
// "What pet parents will see" preview, the booking widget / checkout explanations and /pricing.
// Client + server safe. Numbers always come from the service row and src/lib/quote.ts — never hard-coded.

import { intlLocale } from "@/i18n/routing";
import { bookingT } from "./booking-messages";
import { formatMoney } from "./format";
import { holidayName, holidaysForYear } from "./holidays";
import { quantityLabel } from "./availability-core";
import { petLimit, type PriceLine, type QuoteService } from "./quote";
import type { Fees } from "./pricing";

export type DetailService = QuoteService & { unit: string; durationMins?: number | null; maxPetsPerBooking: number };

const UNIT_WORD = { WALK: "walk", NIGHT: "night", DAY: "day", VISIT: "visit" } as const;
/** "walk" / "night" / "day" / "visit" (fr: "promenade" / "nuit" / "jour" / "visite"). */
export const unitWord = (unit: string, locale = "en") => bookingT(locale)(`nouns.${UNIT_WORD[unit as keyof typeof UNIT_WORD] ?? "visit"}`);

/** "dog" / "dogs" for dog walking, "pet" / "pets" otherwise. */
export const petWord = (type: string, n = 1, locale = "en") =>
  bookingT(locale)(`nouns.${type === "DOG_WALKING" ? "dog" : "pet"}${n === 1 ? "" : "s"}` as "nouns.dog");

/** "dogs per walk", "pets per stay", "pets per day", "pets per visit" */
export function perBookingPhrase(type: string, n = 2, locale = "en") {
  const per = type === "DOG_WALKING" ? "walk" : type === "BOARDING" ? "stay" : type === "DAY_CARE" ? "day" : "visit";
  const t = bookingT(locale);
  return t("price.perBooking", { pets: petWord(type, n, locale), per: t(`nouns.${per}`) });
}

/** Whether one booking of `service` may include `count` pets. */
export const takesPets = (service: Pick<QuoteService, "maxPetsPerBooking" | "additionalPetPriceCents">, count: number) => petLimit(service) >= count;

/** Search-card badge: "Up to 2 dogs · +$12 each", "Up to 3 pets · extra pets free" or "1 pet per booking". */
export function petLimitBadge(service: Pick<QuoteService, "type" | "maxPetsPerBooking" | "additionalPetPriceCents">, locale = "en") {
  const t = bookingT(locale);
  const max = petLimit(service);
  if (max <= 1) return t("price.badgeOne");
  const each = service.additionalPetPriceCents ?? 0;
  const pets = petWord(service.type, max, locale);
  return each ? t("price.badgeEach", { max, pets, each: formatMoney(each, { locale }) }) : t("price.badgeFree", { max, pets });
}

export type DetailItem = { key: "base" | "extraPet" | "holiday" | "puppy"; icon: string; text: string; muted?: boolean };

/** The profile service card's "Price details" list — one scannable line each. */
export function priceDetailItems(s: DetailService, locale = "en"): DetailItem[] {
  const t = bookingT(locale);
  const money = (c: number) => formatMoney(c, { locale });
  const per = unitWord(s.unit, locale);
  const pet = petWord(s.type, 1, locale);
  const mins = s.type === "DOG_WALKING" || s.type === "DROP_IN" ? (s.durationMins ?? (s.type === "DOG_WALKING" ? 60 : 30)) : null;
  const price = money(s.priceCents);
  const items: DetailItem[] = [
    { key: "base", icon: "payments", text: mins ? t("price.detailBaseMins", { price, per, mins, pet }) : t("price.detailBase", { price, per, pet }) },
  ];
  const max = petLimit(s);
  if (max > 1) {
    const each = s.additionalPetPriceCents ?? 0;
    const pets = petWord(s.type, max, locale);
    items.push({
      key: "extraPet",
      icon: "pets",
      text: each
        ? t("price.detailExtraEach", { pet, each: money(each), per, max, pets })
        : t("price.detailExtraFree", { dog: s.type === "DOG_WALKING" ? "yes" : "no", max, pets }),
    });
  } else {
    items.push({ key: "extraPet", icon: "pets", text: t("price.detailOnePet"), muted: true });
  }
  if (s.holidayPriceCents != null && s.holidayPriceCents > s.priceCents) {
    items.push({ key: "holiday", icon: "celebration", text: t("price.detailHoliday", { price: money(s.holidayPriceCents), per }) });
  }
  if (s.puppyPriceCents != null && s.puppyPriceCents > 0) {
    items.push({ key: "puppy", icon: "child_care", text: t("price.detailPuppy", { price: money(s.puppyPriceCents), per }) });
  }
  return items;
}

/** The next `count` statutory holidays on or after `fromIso` (YYYY-MM-DD) in a province. */
export function upcomingHolidays(provinceCode: string | null | undefined, fromIso: string, count = 4, locale = "en") {
  const year = Number(fromIso.slice(0, 4));
  const all = { ...holidaysForYear(year, provinceCode, locale), ...holidaysForYear(year + 1, provinceCode, locale) };
  return Object.entries(all)
    .filter(([d]) => d >= fromIso)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, count)
    .map(([date, name]) => ({ date, name }));
}

/** "Fri, Dec 25, 2026" */
export function holidayDateLabel(iso: string, locale = "en") {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(intlLocale(locale), { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const PROVINCES = ["ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE"] as const;
type Province = (typeof PROVINCES)[number];
const provinceKey = (code?: string | null) => {
  const c = (code ?? "").toUpperCase();
  return (PROVINCES as readonly string[]).includes(c) ? (c as Province) : null;
};
/** "Ontario" (fr: "Ontario", "Québec"…), or "your province" for unknown codes. */
export const provinceName = (code?: string | null, locale = "en") => {
  const k = provinceKey(code);
  return k ? bookingT(locale)(`provinces.${k}`) : bookingT(locale)("price.yourProvince");
};
/** "in Ontario" / fr "en Ontario", "au Québec" (the preposition depends on the province). */
export const provinceIn = (code: string | null | undefined, locale = "en") => bookingT(locale)(`provincesIn.${provinceKey(code) ?? "other"}`);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const UNIT_TYPES: Record<string, string> = { night: "BOARDING", day: "DAY_CARE", walk: "DOG_WALKING", visit: "DROP_IN" };
/** "$1,234.50" → 123450 (labels are stored with English money formatting). */
const parseMoney = (s: string) => Math.round(Number(s.replace(/[$,\s]/g, "")) * 100);
/** "3 nights" → "3 nuits" */
function relabelQty(s: string, locale: string) {
  const m = /^(\d+) (night|day|walk|visit)s?$/.exec(s.trim());
  return m ? quantityLabel(UNIT_TYPES[m[2]], Number(m[1]), locale) : null;
}

/**
 * The label of a quote / stored price line in the UI language. `Booking.priceLines` keeps the English
 * labels written at booking time; English returns them untouched, other languages rebuild them from the
 * line's kind and the numbers in the stored label (falling back to the stored label if it can't be read).
 */
export function priceLineLabel(line: PriceLine, index: number, locale = "en"): string {
  if (locale === "en") return line.label;
  const t = bookingT(locale);
  const money = (s: string) => formatMoney(parseMoney(s), { locale });
  const label = line.label;
  if (label === "Subtotal") return t("lines.subtotal");
  switch (lineKind(line, index)) {
    case "base": {
      const m = /^(\d+ \w+) × (\$[\d.,]+)$/.exec(label);
      const qty = m && relabelQty(m[1], locale);
      return m && qty ? t("lines.base", { qty, price: money(m[2]) }) : label;
    }
    case "extraPet": {
      const each = /^Extra (dog|pet) × (\d+) · (\$[\d.,]+) each$/.exec(label);
      if (each) return t("lines.extraEach", { dog: each[1] === "dog" ? "yes" : "no", count: Number(each[2]), price: money(each[3]) });
      const units = /^Extra (dog|pet) × (\d+) · (\d+ \w+) × (\$[\d.,]+)$/.exec(label);
      const qty = units && relabelQty(units[3], locale);
      return units && qty ? t("lines.extraUnits", { dog: units[1] === "dog" ? "yes" : "no", count: Number(units[2]), qty, price: money(units[4]) }) : label;
    }
    case "holiday": {
      const m = /^Holiday rate · (.+), ([A-Z][a-z]{2}) (\d{1,2}) \(\+(\$[\d.,]+)\)$/.exec(label);
      const month = m ? MONTHS.indexOf(m[2]) : -1;
      if (!m || month < 0) return label;
      const date = new Date(Date.UTC(2000, month, Number(m[3]), 12)).toLocaleDateString(intlLocale(locale), { month: "short", day: "numeric", timeZone: "UTC" });
      return t("lines.holiday", { holiday: holidayName(line.holiday ?? m[1], locale), date, price: money(m[4]) });
    }
    case "puppy": {
      const m = /^Puppy surcharge(?: · (.+?))??(?: · (\d+ \w+) × (\$[\d.,]+))?$/.exec(label);
      if (!m) return label;
      const qty = m[2] ? relabelQty(m[2], locale) : null;
      if (m[2] && !qty) return label;
      if (qty) return m[1] ? t("lines.puppyNameUnits", { name: m[1], qty, price: money(m[3]) }) : t("lines.puppyUnits", { qty, price: money(m[3]) });
      return m[1] ? t("lines.puppyName", { name: m[1] }) : t("lines.puppy");
    }
  }
  return label;
}

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
  locale = "en",
): Explanation {
  const t = bookingT(locale);
  const money = (c: number) => formatMoney(c, { locale });
  const s = ctx.service;
  const per = unitWord(s.unit, locale);
  const pet = petWord(s.type, 1, locale);
  const name = ctx.firstName;
  switch (lineKind(line, index)) {
    case "extraPet":
      return {
        title: t("price.extraTitle", { dog: s.type === "DOG_WALKING" ? "yes" : "no" }),
        body: t("price.extraBody", { pet, name, each: money(s.additionalPetPriceCents ?? 0), per, max: petLimit(s) }),
      };
    case "holiday": {
      const holiday = line.holiday ? holidayName(line.holiday, locale) : null;
      return {
        title: holiday ? t("price.holidayNamedTitle", { holiday }) : t("price.holidayTitle"),
        body: t("price.holidayBody", {
          day: holiday ?? t("price.thisDay"),
          inProvince: provinceIn(ctx.provinceCode, locale),
          name,
          holidayPrice: money(s.holidayPriceCents ?? s.priceCents),
          price: money(s.priceCents),
          unit: s.unit,
        }),
      };
    }
    case "puppy":
      return { title: t("price.puppyTitle"), body: t("price.puppyBody", { name, price: money(s.puppyPriceCents ?? 0), per }) };
    default:
      return {
        title: t("price.baseTitle"),
        body:
          ctx.units && ctx.units > 1
            ? t("price.baseBodyTimes", { name, price: money(s.priceCents), per, pet, units: ctx.units })
            : t("price.baseBody", { name, price: money(s.priceCents), per, pet }),
      };
  }
}

/** "HST" → "TVH", "GST" → "TPS" in French. */
export const taxName = (taxLabel: string, locale = "en") =>
  locale === "fr" ? ({ HST: "TVH", GST: "TPS", PST: "TVP", QST: "TVQ" } as Record<string, string>)[taxLabel] ?? taxLabel : taxLabel;

/** Explanations for the platform lines under the sitter's price. */
export function feeExplanations(fees: Fees, taxRateBps: number, taxLabel = "HST", provinceCode?: string | null, locale = "en") {
  const t = bookingT(locale);
  const pct = (taxRateBps / 100).toLocaleString(intlLocale(locale), { maximumFractionDigits: 3 });
  const ontario = provinceCode?.toUpperCase() === "ON";
  const hst = taxLabel === "HST";
  return {
    wagShield: {
      title: t("price.wagShieldTitle"),
      body: t("price.wagShieldBody", { fee: formatMoney(fees.wagShieldFeeCents, { exact: true, locale }), cover: formatMoney(fees.vetCoverageCents, { locale }) }),
    },
    serviceFee: {
      title: t("price.serviceFeeTitle"),
      body: t("price.serviceFeeBody", { fee: formatMoney(fees.serviceFeeCents, { exact: true, locale }) }),
    },
    tax: {
      title: t("price.taxTitle", { label: taxName(taxLabel, locale), pct }),
      body: t(ontario ? (hst ? "price.taxBodyOntarioHst" : "price.taxBodyOntario") : hst ? "price.taxBodyHst" : "price.taxBody", { pct }),
    },
    wagPoints: {
      title: t("price.wagPointsTitle"),
      body: t("price.wagPointsBody", { max: formatMoney(fees.wagPointsDiscountCents, { locale }) }),
    },
  } satisfies Record<string, Explanation>;
}
