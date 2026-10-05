"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export type ReviewItem = {
  id: string;
  authorName: string;
  authorAvatar: string | null;
  petLabel: string | null;
  rating: number;
  body: string;
  verifiedBooking: boolean;
  walkSummary: string | null;
  walkPhotoUrl: string | null;
  timeAgo: string;
  /** Public reply from the sitter, if any. */
  reply?: { by: string; body: string; timeAgo: string | null } | null;
};

const INITIAL = 3;

export function ReviewList({ reviews, reviewCount }: { reviews: ReviewItem[]; reviewCount: number }) {
  const t = useTranslations("profile.reviews");
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? reviews : reviews.slice(0, INITIAL);
  const total = Math.max(reviewCount, reviews.length);

  if (reviews.length === 0) {
    return (
      <p className="p-space-lg rounded-2xl bg-surface-container-low font-body-md text-body-md text-on-surface-variant text-center">
        {reviewCount > 0 ? t("migrating", { count: reviewCount }) : t("none")}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-space-lg">
        {visible.map((r) => (
          <div className="p-space-lg rounded-2xl bg-surface-container-low flex flex-col gap-space-md" key={r.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-space-md min-w-0">
                {r.authorAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={r.authorName} className="w-12 h-12 rounded-full object-cover shrink-0" src={r.authorAvatar} />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-title-md text-title-md shrink-0">
                    {r.authorName.charAt(0)}
                  </span>
                )}
                <div className="min-w-0">
                  <h4 className="font-title-md text-title-md text-on-surface font-bold">{r.authorName}</h4>
                  <div className="flex flex-wrap items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                    {r.petLabel && (
                      <>
                        <span className="text-secondary font-medium">🐾 {r.petLabel}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{r.timeAgo}</span>
                    {r.verifiedBooking && (
                      <>
                        <span>·</span>
                        <span className="bg-surface-container-highest px-2 py-0.5 rounded text-[11px] text-on-surface font-semibold">{t("verifiedBooking")}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div aria-label={t("stars", { rating: r.rating })} className="flex text-tertiary-container shrink-0" role="img">
                {Array.from({ length: 5 }, (_, i) => (
                  <span className="material-symbols-outlined text-sm" key={i} style={{ fontVariationSettings: i < r.rating ? "'FILL' 1" : "'FILL' 0" }}>
                    star
                  </span>
                ))}
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">&ldquo;{r.body}&rdquo;</p>
            {(r.walkSummary || r.walkPhotoUrl) && (
              <div className="flex items-center gap-3">
                {r.walkPhotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={t("photoAlt", { name: r.authorName })} className="w-16 h-16 rounded-xl object-cover shadow-sm" src={r.walkPhotoUrl} />
                )}
                {r.walkSummary && (
                  <div className="p-2.5 rounded-xl bg-surface-container flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">route</span>
                    <div className="text-left font-label-sm text-label-sm">
                      <span className="font-bold text-on-surface block">{t("walkSummary")}</span>
                      <span className="text-on-surface-variant">{r.walkSummary}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {r.reply && (
              <div className="flex flex-col gap-1 ml-space-sm sm:ml-space-lg pl-space-md border-l-2 border-primary-fixed-dim">
                <span className="flex items-center gap-1 font-label-md text-label-md text-on-surface">
                  <span className="material-symbols-outlined text-base text-primary">reply</span>
                  {t("responseFrom", { name: r.reply.by })}
                  {r.reply.timeAgo && <span className="font-normal text-on-surface-variant">· {r.reply.timeAgo}</span>}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed whitespace-pre-line break-words">{r.reply.body}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      {total > INITIAL && (
        <button
          aria-expanded={expanded}
          className="w-full py-3 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-all flex items-center justify-center gap-2"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          <span>{expanded ? t("showFewer") : t("readAll", { count: total })}</span>
          <span className="material-symbols-outlined text-base">{expanded ? "expand_less" : "expand_more"}</span>
        </button>
      )}
    </>
  );
}
