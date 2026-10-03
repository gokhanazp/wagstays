import { formatMoney } from "@/lib/format";

/** "You'll earn ~$X in WagPoints" — read-only hint on checkout and the booking confirmation page. */
export function EarnPointsNote({ subtotalCents, earnRateBps, className = "" }: { subtotalCents: number; earnRateBps?: number; className?: string }) {
  const cents = earnRateBps ? Math.round((subtotalCents * earnRateBps) / 10000) : 0;
  if (cents <= 0) return null;
  return (
    <p className={`flex items-center gap-1.5 font-body-sm text-body-sm text-primary ${className}`} data-testid="earn-points-note">
      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
        toll
      </span>
      <span>
        You&apos;ll earn <strong className="font-semibold">~{formatMoney(cents, { exact: true })}</strong> in WagPoints once this booking is completed.
      </span>
    </p>
  );
}
