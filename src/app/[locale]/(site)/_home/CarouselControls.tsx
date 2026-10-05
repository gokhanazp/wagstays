"use client";

import { useTranslations } from "next-intl";

/** Prev/next chevrons that scroll a horizontal row (by one card) identified by `targetId`. */
export function CarouselControls({ targetId }: { targetId: string }) {
  const t = useTranslations("home.featured");
  const scroll = (dir: 1 | -1) => {
    const row = document.getElementById(targetId);
    if (!row) return;
    const card = row.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const step = card ? card.offsetWidth + gap : row.clientWidth;
    const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
    const atStart = row.scrollLeft <= 4;
    // Wrap around at the ends so the buttons always do something.
    if (dir === 1 && atEnd) row.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir === -1 && atStart) row.scrollTo({ left: row.scrollWidth, behavior: "smooth" });
    else row.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className="flex items-center gap-space-sm">
      <button
        aria-controls={targetId}
        aria-label={t("previous")}
        className="w-11 h-11 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface-container flex items-center justify-center shadow-sm transition-all"
        onClick={() => scroll(-1)}
        type="button"
      >
        <span className="material-symbols-outlined">chevron_left</span>
      </button>
      <button
        aria-controls={targetId}
        aria-label={t("next")}
        className="w-11 h-11 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface-container flex items-center justify-center shadow-sm transition-all"
        onClick={() => scroll(1)}
        type="button"
      >
        <span className="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  );
}
