import "server-only";
import { cache } from "react";
import { db } from "./db";
import { SERVICE_FEE_CENTS, VET_COVERAGE_CENTS, WAGPOINTS_DISCOUNT_CENTS, WAGSHIELD_FEE_CENTS } from "./constants";
import type { Fees } from "./pricing";

const DEFAULTS = {
  id: "default",
  wagShieldFeeCents: WAGSHIELD_FEE_CENTS,
  serviceFeeCents: SERVICE_FEE_CENTS,
  wagPointsDiscountCents: WAGPOINTS_DISCOUNT_CENTS,
  vetCoverageCents: VET_COVERAGE_CENTS,
};

/** Platform settings row (created on first read). Edited from /admin/settings. */
export const getPlatformSettings = cache(async () => {
  // read first: this runs on many requests, so avoid a write unless the row is missing
  const existing = await db.platformSettings.findUnique({ where: { id: "default" } });
  return existing ?? db.platformSettings.upsert({ where: { id: "default" }, create: DEFAULTS, update: {} });
});

/** Fee subset passed to priceBooking() — safe to send to client components. */
export async function getFees(): Promise<Fees> {
  const s = await getPlatformSettings();
  return {
    wagShieldFeeCents: s.wagShieldFeeCents,
    serviceFeeCents: s.serviceFeeCents,
    wagPointsDiscountCents: s.wagPointsDiscountCents,
    vetCoverageCents: s.vetCoverageCents,
  };
}
