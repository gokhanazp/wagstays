import { SERVICE_FEE_CENTS, VET_COVERAGE_CENTS, WAGPOINTS_DISCOUNT_CENTS, WAGSHIELD_FEE_CENTS } from "./constants";

export type Fees = {
  wagShieldFeeCents: number;
  serviceFeeCents: number;
  wagPointsDiscountCents: number;
  vetCoverageCents: number;
};

/** Used only when no live settings are passed (tests, seed). Pages should pass getFees(). */
export const DEFAULT_FEES: Fees = {
  wagShieldFeeCents: WAGSHIELD_FEE_CENTS,
  serviceFeeCents: SERVICE_FEE_CENTS,
  wagPointsDiscountCents: WAGPOINTS_DISCOUNT_CENTS,
  vetCoverageCents: VET_COVERAGE_CENTS,
};

export type PriceBreakdown = {
  subtotalCents: number;
  protectionFeeCents: number;
  serviceFeeCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
};

/** Shared by the profile booking widget, the checkout page and the booking server action. */
export function priceBooking(opts: {
  unitPriceCents: number;
  quantity?: number;
  taxRateBps: number;
  applyWagPoints?: boolean;
  wagPointsBalanceCents?: number;
  fees?: Fees;
}): PriceBreakdown {
  const fees = opts.fees ?? DEFAULT_FEES;
  const subtotalCents = opts.unitPriceCents * (opts.quantity ?? 1);
  const protectionFeeCents = fees.wagShieldFeeCents;
  const serviceFeeCents = fees.serviceFeeCents;
  const discountCents = opts.applyWagPoints
    ? Math.min(fees.wagPointsDiscountCents, opts.wagPointsBalanceCents ?? fees.wagPointsDiscountCents)
    : 0;
  const taxable = subtotalCents + protectionFeeCents + serviceFeeCents - discountCents;
  const taxCents = Math.round((taxable * opts.taxRateBps) / 10_000);
  return {
    subtotalCents,
    protectionFeeCents,
    serviceFeeCents,
    discountCents,
    taxCents,
    totalCents: taxable + taxCents,
  };
}
