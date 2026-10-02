import { SERVICE_FEE_CENTS, WAGPOINTS_DISCOUNT_CENTS, WAGSHIELD_FEE_CENTS } from "./constants";

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
}): PriceBreakdown {
  const subtotalCents = opts.unitPriceCents * (opts.quantity ?? 1);
  const protectionFeeCents = WAGSHIELD_FEE_CENTS;
  const serviceFeeCents = SERVICE_FEE_CENTS;
  const discountCents = opts.applyWagPoints
    ? Math.min(WAGPOINTS_DISCOUNT_CENTS, opts.wagPointsBalanceCents ?? WAGPOINTS_DISCOUNT_CENTS)
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
