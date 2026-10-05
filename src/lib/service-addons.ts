// Validation of a service's add-on rates (additional pet, max pets, holiday rate, puppy surcharge).
// Shared by the sitter editor (src/app/actions/sitter.ts updateService) and the admin service rows
// (src/app/actions/admin-sitters.ts). Form fields: multiPets (checkbox), additionalPet, maxPets, holiday, puppy.

import { createTranslator } from "next-intl";
import { z } from "zod";
import en from "../../messages/en/sitter.json";
import fr from "../../messages/fr/sitter.json";
import { formatMoney } from "./format";
import { ADDON_BOUNDS, dollarsToCents } from "./sitter";

const tr = (locale = "en") => createTranslator({ locale: locale === "fr" ? "fr" : "en", messages: { sitter: locale === "fr" ? fr : en }, namespace: "sitter.lib.addons" });
type T = ReturnType<typeof tr>;

export type ServiceAddons = {
  additionalPetPriceCents: number | null;
  /** undefined = leave the stored value unchanged */
  maxPetsPerBooking?: number;
  holidayPriceCents: number | null;
  puppyPriceCents: number | null;
};

const money = (t: T) =>
  z
    .string()
    .nullish()
    .transform((v) => dollarsToCents(v))
    .refine((v) => v === null || Number.isFinite(v), t("money"));

const schema = (t: T) =>
  z.object({
    multiPets: z
      .string()
      .optional()
      .transform((v) => v === "on" || v === "1" || v === "true"),
    additionalPet: money(t),
    maxPets: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() ? Number(v) : undefined))
      .refine((v) => v === undefined || Number.isInteger(v), t("wholeNumber")),
    holiday: money(t),
    puppy: money(t),
  });

/** Validates the add-on fields against the (new) base price. Error messages are in `locale` (default English). */
export function parseServiceAddons(
  input: Record<string, FormDataEntryValue | undefined>,
  basePriceCents: number,
  type: string,
  locale = "en",
): { ok: true; data: ServiceAddons } | { ok: false; fieldErrors: Record<string, string[]> } {
  const t = tr(locale);
  const fm = (c: number) => formatMoney(c, { locale });
  const parsed = schema(t).safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  const d = parsed.data;
  const errors: Record<string, string[]> = {};
  const B = ADDON_BOUNDS;

  let additional: number | null = null;
  if (d.multiPets) {
    if (d.additionalPet === null) errors.additionalPet = [t("additionalRequired")];
    else if (d.additionalPet < B.additionalPet.min || d.additionalPet > B.additionalPet.max) {
      errors.additionalPet = [t("additionalRange", { min: fm(B.additionalPet.min), max: fm(B.additionalPet.max) })];
    } else additional = d.additionalPet;
  }

  let maxPets: number | undefined;
  if (typeof d.maxPets === "number") {
    if (d.maxPets < B.maxPets.min || d.maxPets > B.maxPets.max) {
      errors.maxPets = [t("maxPetsRange", { walk: type === "DOG_WALKING" ? "yes" : "no", min: B.maxPets.min, max: B.maxPets.max })];
    } else maxPets = d.maxPets;
  }

  const holidayMax = basePriceCents * B.holidayMaxFactor;
  if (d.holiday !== null && (d.holiday < basePriceCents || d.holiday > holidayMax)) {
    errors.holiday = [t("holidayRange", { base: fm(basePriceCents), max: fm(holidayMax) })];
  }
  if (d.puppy !== null && (d.puppy < B.puppy.min || d.puppy > B.puppy.max)) {
    errors.puppy = [t("puppyRange", { min: fm(B.puppy.min), max: fm(B.puppy.max) })];
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
