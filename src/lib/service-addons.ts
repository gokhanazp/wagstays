// Validation of a service's add-on rates (additional pet, max pets, holiday rate, puppy surcharge).
// Shared by the sitter editor (src/app/actions/sitter.ts updateService) and the admin service rows
// (src/app/actions/admin-sitters.ts). Form fields: multiPets (checkbox), additionalPet, maxPets, holiday, puppy.

import { z } from "zod";
import { formatMoney } from "./format";
import { ADDON_BOUNDS, dollarsToCents } from "./sitter";

export type ServiceAddons = {
  additionalPetPriceCents: number | null;
  /** undefined = leave the stored value unchanged */
  maxPetsPerBooking?: number;
  holidayPriceCents: number | null;
  puppyPriceCents: number | null;
};

const money = z
  .string()
  .nullish()
  .transform((v) => dollarsToCents(v))
  .refine((v) => v === null || Number.isFinite(v), "Enter an amount in dollars and cents.");

const Schema = z.object({
  multiPets: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "1" || v === "true"),
  additionalPet: money,
  maxPets: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? Number(v) : undefined))
    .refine((v) => v === undefined || Number.isInteger(v), "Choose a whole number."),
  holiday: money,
  puppy: money,
});

/** Validates the add-on fields against the (new) base price. */
export function parseServiceAddons(
  input: Record<string, FormDataEntryValue | undefined>,
  basePriceCents: number,
  type: string,
): { ok: true; data: ServiceAddons } | { ok: false; fieldErrors: Record<string, string[]> } {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  const d = parsed.data;
  const errors: Record<string, string[]> = {};
  const B = ADDON_BOUNDS;

  let additional: number | null = null;
  if (d.multiPets) {
    if (d.additionalPet === null) errors.additionalPet = ["Enter the price for each additional pet (it can be $0)."];
    else if (d.additionalPet < B.additionalPet.min || d.additionalPet > B.additionalPet.max) {
      errors.additionalPet = [`Additional pet price must be between ${formatMoney(B.additionalPet.min)} and ${formatMoney(B.additionalPet.max)}.`];
    } else additional = d.additionalPet;
  }

  let maxPets: number | undefined;
  if (typeof d.maxPets === "number") {
    if (d.maxPets < B.maxPets.min || d.maxPets > B.maxPets.max) {
      errors.maxPets = [`${type === "DOG_WALKING" ? "Dogs per walk" : "Pets per booking"} must be between ${B.maxPets.min} and ${B.maxPets.max}.`];
    } else maxPets = d.maxPets;
  }

  const holidayMax = basePriceCents * B.holidayMaxFactor;
  if (d.holiday !== null && (d.holiday < basePriceCents || d.holiday > holidayMax)) {
    errors.holiday = [`Holiday rate must be at least your base price (${formatMoney(basePriceCents)}) and at most ${formatMoney(holidayMax)}.`];
  }
  if (d.puppy !== null && (d.puppy < B.puppy.min || d.puppy > B.puppy.max)) {
    errors.puppy = [`Puppy surcharge must be between ${formatMoney(B.puppy.min)} and ${formatMoney(B.puppy.max)}.`];
  }
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    data: {
      additionalPetPriceCents: additional,
      ...(maxPets !== undefined && { maxPetsPerBooking: maxPets }),
      // a holiday rate equal to the base price is the same as none
      holidayPriceCents: d.holiday !== null && d.holiday > basePriceCents ? d.holiday : null,
      puppyPriceCents: d.puppy,
    },
  };
}
