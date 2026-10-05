// The booking quote: base rate × units plus the sitter's add-on rates (extra pets, holiday rate, puppy
// surcharge). Client + server safe. Shared by the profile widget, checkout, the booking server action
// (authoritative — it recomputes from DB prices) and the booking detail pages (via Booking.priceLines).
// Fees and tax are added on top of `subtotalCents` by priceBooking() in src/lib/pricing.ts.

import { formatDay, quantityLabel } from "./availability-core";
import { formatMoney } from "./format";

export type PriceLine = {
  label: string;
  amountCents: number;
  /** what the line is for — drives the plain-words explanation popovers (src/lib/price-details.ts) */
  kind?: "base" | "extraPet" | "holiday" | "puppy";
  /** holiday lines: the holiday's name ("Christmas Day") */
  holiday?: string;
};

export type QuoteService = {
  type: string;
  priceCents: number;
  maxPetsPerBooking?: number | null;
  additionalPetPriceCents?: number | null;
  holidayPriceCents?: number | null;
  puppyPriceCents?: number | null;
};

export type QuotePet = { name?: string | null; ageYears?: number | null; isPuppy?: boolean };

export type Quote = {
  lines: PriceLine[];
  /** units × base price */
  baseCents: number;
  /** extra pets + holiday + puppy surcharges */
  extrasCents: number;
  subtotalCents: number;
  units: number;
};

/** Hard ceiling for any service (the sitter editor allows 1–6). */
export const MAX_PETS_LIMIT = 6;

/** A pet under one year old. Unknown age = not a puppy. */
export const isPuppy = (p: QuotePet) => p.isPuppy ?? (p.ageYears != null && p.ageYears < 1);

/** Most pets one booking of `service` may include (1 when the sitter has no additional-pet rate). */
export function petLimit(service: Pick<QuoteService, "maxPetsPerBooking" | "additionalPetPriceCents">) {
  if (service.additionalPetPriceCents == null) return 1;
  return Math.max(1, Math.min(MAX_PETS_LIMIT, service.maxPetsPerBooking ?? 3));
}

/** Why `count` pets can't be booked together for `service`, or null. */
export function petCountBlockReason(
  service: Pick<QuoteService, "type" | "maxPetsPerBooking" | "additionalPetPriceCents">,
  count: number,
  firstName: string,
): string | null {
  if (count <= 1) return null;
  if (service.additionalPetPriceCents == null) return `${firstName} takes one pet per booking for this service`;
  const max = petLimit(service);
  if (count > max) {
    return service.type === "DOG_WALKING" ? `${firstName} walks at most ${max} dogs at a time` : `${firstName} takes at most ${max} pets per booking for this service`;
  }
  return null;
}

/**
 * Prices one booking. `dates` are the local dates of each night (boarding), day (day care) or visit;
 * `holidays` maps "YYYY-MM-DD" → holiday name (src/lib/holidays.ts). When `dates` is empty, `quantity`
 * units are priced without holiday rates.
 */
export function quoteBooking(opts: {
  service: QuoteService;
  pets: QuotePet[];
  dates: readonly string[];
  holidays?: Record<string, string>;
  quantity?: number;
}): Quote {
  const { service } = opts;
  const units = Math.max(1, opts.dates.length || opts.quantity || 1);
  const unitsLabel = quantityLabel(service.type, units);
  const lines: PriceLine[] = [];

  const baseCents = units * service.priceCents;
  lines.push({ label: `${unitsLabel} × ${formatMoney(service.priceCents)}`, amountCents: baseCents, kind: "base" });

  let extrasCents = 0;
  const add = (label: string, amountCents: number, kind: PriceLine["kind"], holiday?: string) => {
    if (amountCents <= 0) return;
    lines.push({ label, amountCents, kind, ...(holiday && { holiday }) });
    extrasCents += amountCents;
  };

  // Extra pets: every pet after the first, per unit.
  const extraPets = Math.max(0, opts.pets.length - 1);
  if (extraPets > 0 && service.additionalPetPriceCents != null) {
    const each = service.additionalPetPriceCents;
    const word = service.type === "DOG_WALKING" ? "dog" : "pet";
    add(
      units === 1 ? `Extra ${word} × ${extraPets} · ${formatMoney(each)} each` : `Extra ${word} × ${extraPets} · ${unitsLabel} × ${formatMoney(each)}`,
      extraPets * units * each,
      "extraPet",
    );
  }

  // Holiday rate replaces the base price on statutory holidays.
  const holidayPrice = service.holidayPriceCents;
  if (holidayPrice != null && holidayPrice > service.priceCents && opts.holidays) {
    const diff = holidayPrice - service.priceCents;
    for (const d of opts.dates) {
      if (opts.holidays[d]) add(`Holiday rate · ${opts.holidays[d]}, ${formatDay(d)} (+${formatMoney(diff)})`, diff, "holiday", opts.holidays[d]);
    }
  }

  // Puppy surcharge per puppy, per unit.
  const puppy = service.puppyPriceCents;
  if (puppy != null && puppy > 0) {
    for (const p of opts.pets) {
      if (!isPuppy(p)) continue;
      const who = p.name ? ` · ${p.name}` : "";
      add(units === 1 ? `Puppy surcharge${who}` : `Puppy surcharge${who} · ${unitsLabel} × ${formatMoney(puppy)}`, units * puppy, "puppy");
    }
  }

  return { lines, baseCents, extrasCents, subtotalCents: baseCents + extrasCents, units };
}

/** Reads `Booking.priceLines` (Json) defensively; null when absent or malformed. */
export function parsePriceLines(json: unknown): PriceLine[] | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const out: PriceLine[] = [];
  for (const l of json) {
    if (!l || typeof l !== "object") return null;
    const { label, amountCents, kind, holiday } = l as Record<string, unknown>;
    if (typeof label !== "string" || typeof amountCents !== "number") return null;
    out.push({
      label,
      amountCents,
      ...(kind === "base" || kind === "extraPet" || kind === "holiday" || kind === "puppy" ? { kind } : {}),
      ...(typeof holiday === "string" && { holiday }),
    });
  }
  return out;
}

/**
 * Lines to show for a stored booking: `priceLines` as quoted at booking time, or — for bookings made
 * before add-on rates — one "3 nights × $68" line (or "Subtotal" when the service price has changed since).
 */
export function bookingPriceLines(b: {
  priceLines?: unknown;
  subtotalCents: number;
  quantity: number;
  service: { type: string; priceCents: number };
}): PriceLine[] {
  const stored = parsePriceLines(b.priceLines);
  if (stored) return stored;
  const q = Math.max(1, b.quantity);
  const matches = q * b.service.priceCents === b.subtotalCents;
  return [{ label: matches ? `${quantityLabel(b.service.type, q)} × ${formatMoney(b.service.priceCents)}` : "Subtotal", amountCents: b.subtotalCents }];
}
