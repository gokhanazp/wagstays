import type { ServiceType } from "./constants";

/** Allowed base-rate range (whole CAD dollars) and the suggested default per service on the sitter application. */
export const SERVICE_PRICE_RULES: Record<ServiceType, { min: number; max: number; suggested: number }> = {
  DOG_WALKING: { min: 15, max: 100, suggested: 32 },
  BOARDING: { min: 30, max: 300, suggested: 70 },
  DROP_IN: { min: 15, max: 90, suggested: 24 },
  DAY_CARE: { min: 20, max: 150, suggested: 48 },
};

/** Average net earning per completed service, used by the earnings estimator (CAD dollars). */
export const ESTIMATOR_NET_PER_SERVICE = 33.5;
export const ESTIMATOR_WEEKS_PER_MONTH = 4.2;
