// Canadian statutory holidays, computed per year (client + server safe).
// Used by the booking quote (src/lib/quote.ts) to apply a service's holiday rate.
//
// Each province has its own list. Launch city is Toronto, so Ontario's list is complete; other provinces
// use the national core plus Family Day where it applies. Dates are the holidays themselves (no
// "observed on Monday" shifting for weekend holidays).

import { bookingT } from "./booking-messages";

type HolidayKey = "newYear" | "familyDay" | "goodFriday" | "victoriaDay" | "canadaDay" | "civicHoliday" | "labourDay" | "thanksgiving" | "christmas" | "boxingDay";
type Rule = { key: HolidayKey; name: string; date: (year: number) => string };

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** n-th (1-based) `weekday` (0 = Sunday) of `month` (1-12). */
function nthWeekday(year: number, month: number, weekday: number, n: number) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return iso(year, month, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7);
}

/** Victoria Day: the last Monday before May 25. */
function victoriaDay(year: number) {
  const may24 = new Date(Date.UTC(year, 4, 24)).getUTCDay();
  return iso(year, 5, 24 - ((may24 - 1 + 7) % 7));
}

/** Easter Sunday (anonymous Gregorian computus). */
function easter(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(year, month - 1, day, 12);
}

const goodFriday = (year: number) => new Date(easter(year) - 2 * 86_400_000).toISOString().slice(0, 10);

const NEW_YEAR: Rule = { key: "newYear", name: "New Year's Day", date: (y) => iso(y, 1, 1) };
const FAMILY_DAY: Rule = { key: "familyDay", name: "Family Day", date: (y) => nthWeekday(y, 2, 1, 3) };
const GOOD_FRIDAY: Rule = { key: "goodFriday", name: "Good Friday", date: goodFriday };
const VICTORIA: Rule = { key: "victoriaDay", name: "Victoria Day", date: victoriaDay };
const CANADA_DAY: Rule = { key: "canadaDay", name: "Canada Day", date: (y) => iso(y, 7, 1) };
const CIVIC: Rule = { key: "civicHoliday", name: "Civic Holiday", date: (y) => nthWeekday(y, 8, 1, 1) };
const LABOUR: Rule = { key: "labourDay", name: "Labour Day", date: (y) => nthWeekday(y, 9, 1, 1) };
const THANKSGIVING: Rule = { key: "thanksgiving", name: "Thanksgiving", date: (y) => nthWeekday(y, 10, 1, 2) };
const CHRISTMAS: Rule = { key: "christmas", name: "Christmas Day", date: (y) => iso(y, 12, 25) };
const BOXING: Rule = { key: "boxingDay", name: "Boxing Day", date: (y) => iso(y, 12, 26) };

/** National fallback for provinces without a specific list. */
const NATIONAL: Rule[] = [NEW_YEAR, GOOD_FRIDAY, VICTORIA, CANADA_DAY, LABOUR, THANKSGIVING, CHRISTMAS];

const PROVINCES: Record<string, Rule[]> = {
  ON: [NEW_YEAR, FAMILY_DAY, GOOD_FRIDAY, VICTORIA, CANADA_DAY, CIVIC, LABOUR, THANKSGIVING, CHRISTMAS, BOXING],
  AB: [...NATIONAL, FAMILY_DAY],
  BC: [...NATIONAL, FAMILY_DAY],
  SK: [...NATIONAL, FAMILY_DAY],
  NB: [...NATIONAL, FAMILY_DAY],
};

const ALL: Rule[] = [NEW_YEAR, FAMILY_DAY, GOOD_FRIDAY, VICTORIA, CANADA_DAY, CIVIC, LABOUR, THANKSGIVING, CHRISTMAS, BOXING];

/**
 * A holiday's name in the UI language. Accepts the English name (as stored in price lines) and returns
 * it unchanged for English or when it isn't a known holiday.
 */
export function holidayName(name: string, locale = "en") {
  if (locale === "en") return name;
  const rule = ALL.find((r) => r.name === name);
  return rule ? bookingT(locale)(`holidays.${rule.key}`) : name;
}

/**
 * Statutory holidays of `year` in a province (`City.provinceCode`), as { "YYYY-MM-DD": name }.
 * Names are English by default — keep it that way for quoteBooking(), whose labels are stored.
 */
export function holidaysForYear(year: number, provinceCode?: string | null, locale = "en"): Record<string, string> {
  const rules = PROVINCES[(provinceCode ?? "").toUpperCase()] ?? NATIONAL;
  return Object.fromEntries(rules.map((r) => [r.date(year), holidayName(r.name, locale)]));
}

/** Holidays covering every year touched by `dates` (YYYY-MM-DD). English names by default (see above). */
export function holidaysForDates(dates: readonly string[], provinceCode?: string | null, locale = "en"): Record<string, string> {
  const years = [...new Set(dates.map((d) => Number(d.slice(0, 4))).filter((y) => Number.isInteger(y) && y > 1900))];
  return Object.assign({}, ...years.map((y) => holidaysForYear(y, provinceCode, locale)));
}
