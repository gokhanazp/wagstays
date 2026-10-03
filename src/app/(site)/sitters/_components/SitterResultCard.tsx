import Link from "next/link";
import { FavoriteButton } from "@/components/FavoriteButton";
import { formatDistance, formatMoney, formatRating } from "@/lib/format";
import type { SitterCard } from "@/lib/queries";
import { UNIT_LONG } from "./search-url";

const SECONDARY_ICONS = new Set(["photo_camera", "videocam", "favorite", "monitor_heart"]);

export function SitterResultCard({ sitter }: { sitter: SitterCard }) {
  const href = `/sitters/${sitter.slug}`;
  const price = sitter.price!;
  return (
    <article className="bg-surface-container-lowest rounded-3xl p-space-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row gap-space-lg group">
      {/* Photo Gallery Column */}
      <div className="relative sm:w-56 h-60 sm:h-auto sm:min-h-[240px] rounded-2xl overflow-hidden shrink-0">
        <Link aria-label={`View ${sitter.displayName}'s profile`} className="absolute inset-0 block" href={href}>
          {/* eslint-disable-next-line @next/next/no-img-element -- keeps the design's fill/crop behaviour */}
          <img
            alt={`${sitter.displayName}, ${sitter.headline}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            src={sitter.cardPhotoUrl ?? sitter.avatarUrl}
          />
        </Link>
        <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary font-label-sm text-label-sm font-bold flex items-center gap-1 shadow-sm">
            <span className="material-symbols-outlined text-sm text-secondary">star</span>
            <span>
              {formatRating(sitter.rating)} ({sitter.reviewCount})
            </span>
          </span>
        </div>
        <FavoriteButton
          activeClassName="!text-secondary"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-center text-outline hover:text-secondary hover:scale-110 active:scale-95 transition-all shadow-sm"
          initial={sitter.isFavorite}
          label={`Save ${sitter.displayName} to favourites`}
          sitterId={sitter.id}
        />
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-surface-container-lowest shadow" />
          <span className="w-1.5 h-1.5 rounded-full bg-surface-container-lowest/60" />
          <span className="w-1.5 h-1.5 rounded-full bg-surface-container-lowest/60" />
        </div>
      </div>
      {/* Card Content Info */}
      <div className="flex-1 flex flex-col justify-between gap-space-sm min-w-0">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-start justify-between gap-space-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-space-xs flex-wrap">
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  <Link className="hover:text-primary transition-colors" href={href}>
                    {sitter.displayName}
                  </Link>
                </h2>
                {sitter.idVerified && (
                  <span className="material-symbols-outlined text-primary text-xl" title="ID & background verified">
                    verified
                  </span>
                )}
                {sitter.isSuperSitter && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">award_star</span>
                    Super Sitter
                  </span>
                )}
                {sitter.highlight && (
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold flex items-center gap-1">
                    {sitter.highlightIcon && <span className="material-symbols-outlined text-xs">{sitter.highlightIcon}</span>}
                    {sitter.highlight}
                  </span>
                )}
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {sitter.headline} •{" "}
                <span className="text-primary font-semibold">
                  {sitter.locationNote ?? sitter.neighbourhood.name} ({formatDistance(sitter.distanceKm)} away)
                </span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-headline-md text-headline-md text-primary font-extrabold">{formatMoney(price.priceCents)}</div>
              <span className="font-label-sm text-label-sm text-outline">/ per {UNIT_LONG[price.unit] ?? "visit"}</span>
            </div>
          </div>
          {sitter.availableLabel && (
            <span className="self-start px-2.5 py-1 rounded-full bg-[#EBF3EF] text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">event_available</span>
              {sitter.availableLabel}
            </span>
          )}
          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mt-1">{sitter.bio}</p>
          {/* Badges and Traits */}
          {sitter.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-space-xs">
              {sitter.tags.map((t) =>
                t.tone === "primary" ? (
                  <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold flex items-center gap-1" key={t.id}>
                    {t.icon && <span className="material-symbols-outlined text-xs">{t.icon}</span>}
                    {t.label}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface flex items-center gap-1" key={t.id}>
                    {t.icon && (
                      <span className={`material-symbols-outlined text-xs ${SECONDARY_ICONS.has(t.icon) ? "text-secondary" : "text-primary"}`}>{t.icon}</span>
                    )}
                    {t.label}
                  </span>
                ),
              )}
            </div>
          )}
        </div>
        {/* Footer Action Buttons */}
        <div className="flex items-center gap-space-sm pt-space-sm">
          <Link
            className="flex-1 h-11 px-space-md rounded-full bg-surface-container-high text-primary hover:bg-primary-container hover:text-on-primary-container font-label-lg text-label-lg transition-all flex items-center justify-center gap-space-xs"
            href={`/messages/new?sitter=${sitter.id}`}
          >
            <span className="material-symbols-outlined text-lg">chat_bubble</span>
            <span>Message</span>
          </Link>
          <Link
            className="flex-1 h-11 px-space-md rounded-full bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container font-label-lg text-label-lg transition-all flex items-center justify-center gap-space-xs shadow-sm"
            href={href}
          >
            <span>View Profile</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
