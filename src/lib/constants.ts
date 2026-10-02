export const SERVICE_TYPES = ["DOG_WALKING", "BOARDING", "DAY_CARE", "DROP_IN"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_LABELS: Record<ServiceType, string> = {
  DOG_WALKING: "Dog Walking",
  BOARDING: "Overnight Boarding",
  DAY_CARE: "Doggy Day Care",
  DROP_IN: "Drop-In Visits",
};

// URL slugs used in search params (?service=dog-walking)
export const SERVICE_SLUGS: Record<ServiceType, string> = {
  DOG_WALKING: "dog-walking",
  BOARDING: "boarding",
  DAY_CARE: "day-care",
  DROP_IN: "drop-in",
};

export const serviceFromSlug = (slug?: string | null): ServiceType | undefined =>
  (Object.entries(SERVICE_SLUGS).find(([, s]) => s === slug)?.[0] as ServiceType | undefined) ?? undefined;

export const UNIT_LABELS: Record<string, string> = {
  WALK: "walk",
  NIGHT: "night",
  DAY: "day",
  VISIT: "visit",
};

export const PET_SIZES = ["SMALL", "MEDIUM", "LARGE", "GIANT"] as const;
export type PetSize = (typeof PET_SIZES)[number];

export const PET_SIZE_LABELS: Record<PetSize, { label: string; range: string }> = {
  SMALL: { label: "Small", range: "0 – 7 kg" },
  MEDIUM: { label: "Medium", range: "8 – 18 kg" },
  LARGE: { label: "Large", range: "19 – 45 kg" },
  GIANT: { label: "Giant", range: "45+ kg" },
};

export const ROLES = ["OWNER", "SITTER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const BOOKING_STATUSES = ["DRAFT", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
export const APPLICATION_STATUSES = ["IN_REVIEW", "MEET_GREET", "APPROVED", "REJECTED"] as const;

// Platform-wide fees (cents). Kept here until an admin settings table exists.
export const WAGSHIELD_FEE_CENTS = 350;
export const SERVICE_FEE_CENTS = 225;
export const WAGPOINTS_DISCOUNT_CENTS = 300;
export const VET_COVERAGE_CENTS = 500_000;
