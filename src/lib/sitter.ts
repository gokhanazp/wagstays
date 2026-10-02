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
