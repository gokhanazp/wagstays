import { SERVICE_LABELS, UNIT_LABELS, type ServiceType } from "@/lib/constants";

export const SERVICE_ICONS: Record<string, string> = {
  DOG_WALKING: "directions_walk",
  BOARDING: "night_shelter",
  DAY_CARE: "wb_sunny",
  DROP_IN: "home",
};

export function serviceLabel(type: string) {
  return SERVICE_LABELS[type as ServiceType] ?? type;
}

/** "Dog Walking (60 min)" / "Overnight Boarding (per night)" */
export function serviceLine(s: { type: string; unit: string; durationMins: number | null }) {
  return `${serviceLabel(s.type)} (${s.durationMins ? `${s.durationMins} min` : `per ${UNIT_LABELS[s.unit] ?? s.unit.toLowerCase()}`})`;
}

export function durationLabel(mins: number | null | undefined) {
  if (!mins) return "";
  if (mins % 60 === 0) return `${mins / 60} hour${mins === 60 ? "" : "s"}`;
  return `${mins} min`;
}

/** Strips a leading emoji from a trait label: "⚠️ Chicken Allergy" -> "Chicken Allergy" */
export function plainTrait(label: string) {
  return label.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}
