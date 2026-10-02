"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Floating panel anchored to an element, rendered in a portal so `overflow-hidden` ancestors
 * (hero sections, cards) never clip it. Flips above the anchor when there isn't room below and
 * follows the anchor on scroll/resize. Closes on outside click and Escape.
 */
export function Popover({
  anchor,
  open,
  onClose,
  children,
  align = "start",
  matchWidth = false,
  minWidth,
  className = "",
  label,
}: {
  anchor: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: "start" | "end";
  matchWidth?: boolean;
  minWidth?: number;
  className?: string;
  label?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width?: number; placement: "below" | "above" } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      if (!a) return;
      const p = panel.current;
      const ph = p?.offsetHeight ?? 0;
      const pw = Math.max(p?.offsetWidth ?? 0, matchWidth ? a.width : 0, minWidth ?? 0);
      const gap = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const below = vh - a.bottom - gap;
      const placement = ph > below && a.top - gap > below ? "above" : "below";
      const top = placement === "below" ? a.bottom + gap : Math.max(gap, a.top - gap - ph);
      let left = align === "end" ? a.right - pw : a.left;
      left = Math.min(Math.max(12, left), vw - pw - 12);
      setPos({ top, left, width: matchWidth ? Math.max(a.width, minWidth ?? 0) : undefined, placement });
    };
    place();
    // second pass once the panel has measured itself
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, align, matchWidth, minWidth]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        anchor.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchor]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-label={label}
      className={`fixed z-[100] bg-surface-container-lowest rounded-2xl border border-[#EFE7DE] shadow-[0_20px_36px_-6px_rgba(83,72,62,0.12)] font-body-md transition-[opacity,transform] duration-150 ${
        pos ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
      } ${className}`}
      ref={panel}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width, minWidth }}
    >
      {children}
    </div>,
    document.body,
  );
}
