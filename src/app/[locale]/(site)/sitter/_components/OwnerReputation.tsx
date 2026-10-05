import { getLocale, getTranslations } from "next-intl/server";
import { formatRating } from "@/lib/format";
import { getOwnerReputation } from "@/lib/owner-reputation";

/**
 * "★ 4.8 · 6 stays with WagStays sitters" — the pet parent's aggregate reputation for sitters.
 * Only the average and counts are shown; individual private notes never leave the admin area.
 */
export async function OwnerReputation({ ownerId, className = "" }: { ownerId: string; className?: string }) {
  const [rep, t, locale] = await Promise.all([getOwnerReputation(ownerId), getTranslations("sitter.ownerReputation"), getLocale()]);
  const stays = t("stays", { count: rep.completedStays });
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1 font-body-sm text-body-sm text-on-surface-variant ${className}`}
      title={rep.ratingCount ? t("average", { count: rep.ratingCount }) : undefined}
    >
      {rep.rating != null ? (
        <span className="inline-flex items-center gap-0.5 font-semibold text-on-surface">
          <span className="material-symbols-outlined text-base text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
            star
          </span>
          {formatRating(rep.rating, locale)}
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5 font-semibold text-on-surface">
          <span className="material-symbols-outlined text-base text-primary">fiber_new</span>
          {t("noRatings")}
        </span>
      )}
      <span aria-hidden>·</span>
      <span>{rep.completedStays ? stays : t("firstStay")}</span>
    </span>
  );
}
