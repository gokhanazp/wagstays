import { formatRating } from "@/lib/format";
import { getOwnerReputation } from "@/lib/owner-reputation";

/**
 * "★ 4.8 · 6 stays with WagStays sitters" — the pet parent's aggregate reputation for sitters.
 * Only the average and counts are shown; individual private notes never leave the admin area.
 */
export async function OwnerReputation({ ownerId, className = "" }: { ownerId: string; className?: string }) {
  const rep = await getOwnerReputation(ownerId);
  const stays = `${rep.completedStays} stay${rep.completedStays === 1 ? "" : "s"} with WagStays sitters`;
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1 font-body-sm text-body-sm text-on-surface-variant ${className}`}
      title={rep.ratingCount ? `Average of ${rep.ratingCount} private sitter rating${rep.ratingCount === 1 ? "" : "s"}` : undefined}
    >
      {rep.rating != null ? (
        <span className="inline-flex items-center gap-0.5 font-semibold text-on-surface">
          <span className="material-symbols-outlined text-base text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
            star
          </span>
          {formatRating(rep.rating)}
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5 font-semibold text-on-surface">
          <span className="material-symbols-outlined text-base text-primary">fiber_new</span>
          No sitter ratings yet
        </span>
      )}
      <span aria-hidden>·</span>
      <span>{rep.completedStays ? stays : "First stay on WagStays"}</span>
    </span>
  );
}
