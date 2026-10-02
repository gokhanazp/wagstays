"use client";

import { useEffect, useState } from "react";

/**
 * Mobile-only bar pinned to the bottom of the screen (same look as the sitter profile's MobileBookBar).
 * It slides away once the element `#{targetId}` (the real call to action) is on screen or has been
 * scrolled past, so it never covers the content it points to or the footer below it.
 */
export function MobileStickyBar({ targetId, children }: { targetId: string; children: React.ReactNode }) {
  const [reached, setReached] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setReached(entry.isIntersecting || entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  return (
    <div
      aria-hidden={reached}
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 px-margin-mobile pb-[max(12px,env(safe-area-inset-bottom))] pt-3 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-[#EFE7DE] shadow-[0_-8px_24px_-6px_rgba(83,72,62,0.12)] transition-transform duration-300 ${
        reached ? "translate-y-full pointer-events-none" : "translate-y-0"
      }`}
      // Keep the hidden bar out of the tab order.
      inert={reached}
    >
      <div className="flex items-center justify-between gap-space-md max-w-xl mx-auto">{children}</div>
    </div>
  );
}

/** The bar's primary pill button (matches MobileBookBar's "Book Now"). */
export const STICKY_BAR_BTN =
  "h-12 px-space-lg rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg flex items-center justify-center gap-space-xs shadow-[0_6px_16px_rgba(162,62,36,0.3)] active:scale-[0.98] transition-transform whitespace-nowrap shrink-0";
