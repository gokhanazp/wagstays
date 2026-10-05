import { createTranslator } from "next-intl";
import { SERVICE_LABELS, type ServiceType } from "@/lib/constants";
import { bookingT } from "@/lib/booking-messages";
import { unitWord } from "@/lib/price-details";
import { petCountBlockReason, type QuoteService } from "@/lib/quote";
import commonEn from "../../../../../../messages/en/common.json";
import commonFr from "../../../../../../messages/fr/common.json";

export const SERVICE_ICONS: Record<string, string> = {
  DOG_WALKING: "directions_walk",
  BOARDING: "night_shelter",
  DAY_CARE: "wb_sunny",
  DROP_IN: "home",
};

const enumsT = (locale: string) =>
  createTranslator({ locale: locale === "fr" ? "fr" : "en", messages: { common: locale === "fr" ? commonFr : commonEn }, namespace: "common.enums" });

export function serviceLabel(type: string, locale = "en") {
  if (!(type in SERVICE_LABELS)) return type;
  return enumsT(locale)(`service.${type as ServiceType}`);
}

/** "Dog Walking (60 min)" / "Overnight Boarding (per night)" */
export function serviceLine(s: { type: string; unit: string; durationMins: number | null }, locale = "en") {
  const t = bookingT(locale);
  const service = serviceLabel(s.type, locale);
  if (s.durationMins) return t("service.lineMins", { service, mins: s.durationMins });
  return t("service.linePer", { service, unit: ["WALK", "NIGHT", "DAY", "VISIT"].includes(s.unit) ? unitWord(s.unit, locale) : s.unit.toLowerCase() });
}

export function durationLabel(mins: number | null | undefined, locale = "en") {
  if (!mins) return "";
  const t = bookingT(locale);
  if (mins % 60 === 0) return t("service.hours", { count: mins / 60 });
  return t("service.mins", { count: mins });
}

/** Why `count` pets can't be booked together for `service`, or null (petCountBlockReason in the UI language). */
export const petCountNote = (
  service: Pick<QuoteService, "type" | "maxPetsPerBooking" | "additionalPetPriceCents">,
  count: number,
  name: string,
  locale = "en",
) => petCountBlockReason(service, count, name, locale);

/** Strips a leading emoji from a trait label: "⚠️ Chicken Allergy" -> "Chicken Allergy" */
export function plainTrait(label: string) {
  return label.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}
