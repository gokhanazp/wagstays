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

// Launch-city time zone. Per-city zones live in City.timeZone; date helpers default to this until
// multiple cities are active and callers pass city.timeZone through.
export const DEFAULT_TIME_ZONE = "America/Toronto";

export const ROLES = ["OWNER", "SITTER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const BOOKING_STATUSES = ["DRAFT", "PENDING", "CONFIRMED", "DECLINED", "COMPLETED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, { label: string; tone: "neutral" | "primary" | "warning" | "danger" | "success" }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING: { label: "Awaiting sitter", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "primary" },
  DECLINED: { label: "Declined", tone: "danger" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};
export const APPLICATION_STATUSES = ["IN_REVIEW", "MEET_GREET", "APPROVED", "REJECTED"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, { label: string; tone: "neutral" | "primary" | "warning" | "danger" | "success" }> = {
  IN_REVIEW: { label: "In review", tone: "warning" },
  MEET_GREET: { label: "Meet & Greet", tone: "primary" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

// Fallback platform fees (cents). Live values come from PlatformSettings via getPlatformSettings().
export const WAGSHIELD_FEE_CENTS = 350;
export const SERVICE_FEE_CENTS = 225;
export const WAGPOINTS_DISCOUNT_CENTS = 300;
export const VET_COVERAGE_CENTS = 500_000;
