// Shared (client-safe) constants for the sitter dashboard: price bounds, units, curated tag icons.
import type { ServiceType } from "./constants";

/** Allowed price range per service, in cents. Enforced by src/app/actions/sitter.ts. */
export const SERVICE_PRICE_BOUNDS: Record<ServiceType, { min: number; max: number }> = {
  DOG_WALKING: { min: 1500, max: 8000 },
  BOARDING: { min: 3500, max: 20000 },
  DAY_CARE: { min: 2500, max: 12000 },
  DROP_IN: { min: 1500, max: 6000 },
};

export const SERVICE_UNITS: Record<ServiceType, string> = {
  DOG_WALKING: "WALK",
  BOARDING: "NIGHT",
  DAY_CARE: "DAY",
  DROP_IN: "VISIT",
};

/** Visit length options (minutes) for services billed per visit; null = no duration. */
export const SERVICE_DURATIONS: Record<ServiceType, number[] | null> = {
  DOG_WALKING: [30, 45, 60, 90, 120],
  BOARDING: null,
  DAY_CARE: null,
  DROP_IN: [15, 30, 45, 60],
};

/**
 * Add-on rate limits (cents) for the sitter + admin service editors (src/app/actions/sitter.ts,
 * admin-sitters.ts). Additional pet / puppy are per pet per night/day/visit; the holiday rate replaces the
 * base price and must be at least the base price (and at most twice it).
 */
export const ADDON_BOUNDS = {
  additionalPet: { min: 0, max: 10000 },
  puppy: { min: 100, max: 5000 },
  holidayMaxFactor: 2,
  maxPets: { min: 1, max: 6 },
} as const;

/** Parses an optional dollar amount from a form ("" / missing = null). Returns NaN for junk. */
export function dollarsToCents(v: FormDataEntryValue | string | null | undefined): number | null {
  const t = typeof v === "string" ? v.trim().replace(/^\$/, "") : "";
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return Number.NaN;
  return Math.round(n * 100);
}

export const SERVICE_DEFAULT_PRICE: Record<ServiceType, number> = {
  DOG_WALKING: 3000,
  BOARDING: 6500,
  DAY_CARE: 4500,
  DROP_IN: 2200,
};

/** Material Symbols a sitter may choose for search-card tags. */
export const TAG_ICONS: { icon: string; label: string }[] = [
  { icon: "yard", label: "Yard" },
  { icon: "location_searching", label: "GPS" },
  { icon: "photo_camera", label: "Photos" },
  { icon: "videocam", label: "Video" },
  { icon: "medical_services", label: "Medical" },
  { icon: "smoke_free", label: "Smoke-free" },
  { icon: "child_care", label: "Children" },
  { icon: "schedule", label: "Hours" },
  { icon: "directions_run", label: "Exercise" },
  { icon: "route", label: "Route" },
  { icon: "water_drop", label: "Hydration" },
  { icon: "monitor_heart", label: "Health" },
  { icon: "pets", label: "Pets" },
  { icon: "diversity_1", label: "Social" },
  { icon: "home", label: "Home" },
  { icon: "school", label: "Training" },
];

export const MAX_TAGS = 4;
export const MAX_SKILLS = 12;
export const MAX_PHOTOS = 12;
export const BIO_MAX = 220;

export const HOME_TYPES = [
  { value: "HOUSE_WITH_YARD", label: "House with yard" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "CONDO_BALCONY", label: "Condo with balcony" },
] as const;
