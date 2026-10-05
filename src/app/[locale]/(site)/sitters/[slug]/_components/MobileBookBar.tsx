"use client";

import { useEffect, useState } from "react";

/**
 * Mobile-only sticky bar at the bottom of the sitter profile: price, rating and a "Book now" button that
 * scrolls to the booking widget (#book). Hides itself while the widget is on screen.
 */
export function MobileBookBar({ priceLabel, unitLabel, rating, reviewCount }: { priceLabel: string; unitLabel: string; rating: string; reviewCount: number }) {
  const [widgetVisible, setWidgetVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("book");
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setWidgetVisible(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      aria-hidden={widgetVisible}
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 px-margin-mobile pb-[max(12px,env(safe-area-inset-bottom))] pt-3 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-[#EFE7DE] shadow-[0_-8px_24px_-6px_rgba(83,72,62,0.12)] transition-transform duration-300 ${
        widgetVisible ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex items-center justify-between gap-space-md max-w-xl mx-auto">
        <div className="flex flex-col min-w-0">
          <span className="font-headline-sm text-headline-sm text-primary leading-tight">
            {priceLabel}
            {unitLabel && <span className="font-label-md text-label-md text-on-surface-variant"> / {unitLabel.toLowerCase()}</span>}
          </span>
          <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-sm text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
              star
            </span>
            {rating} · {reviewCount} reviews
          </span>
        </div>
        <button
          className="h-12 px-space-lg rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg flex items-center gap-space-xs shadow-[0_6px_16px_rgba(162,62,36,0.3)] active:scale-[0.98] transition-transform"
          onClick={() => document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          tabIndex={widgetVisible ? -1 : 0}
          type="button"
        >
          <span className="material-symbols-outlined text-lg">pets</span>
          Book Now
        </button>
      </div>
    </div>
  );
}
