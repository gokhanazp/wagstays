"use client";

import { usePathname } from "@/i18n/navigation";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Header account dropdown. Opens on hover for mouse users (with a short close delay so the pointer can travel
 * into the panel) and on tap/click for touch & keyboard. Closes on outside click, Escape and navigation.
 */
export function AccountMenu({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const panelId = useId();
  const pathname = usePathname();

  // Close after navigating (adjust state during render instead of in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const hoverOpen = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  return (
    <div className="relative" onPointerEnter={hoverOpen} onPointerLeave={hoverClose} ref={root}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-space-sm pl-space-sm cursor-pointer rounded-full focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-container/25"
        onClick={() => setOpen((o) => !o)}
        ref={button}
        type="button"
      >
        {trigger}
      </button>
      {/* pt-3 is an invisible hover bridge between the trigger and the panel */}
      <div
        className={`absolute right-0 top-full pt-3 z-50 transition-[opacity,transform] duration-150 ${
          open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
        id={panelId}
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
      >
        <div className="w-64 p-space-sm rounded-2xl bg-surface-container-lowest shadow-[0_20px_36px_-6px_rgba(83,72,62,0.12)] border border-surface-container-high flex flex-col gap-space-xs">
          {children}
        </div>
      </div>
    </div>
  );
}
