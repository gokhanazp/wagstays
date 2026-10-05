"use client";

import { Link } from "@/i18n/navigation";
import { useId, useRef, useState } from "react";
import { Popover } from "@/components/forms/Popover";

/**
 * Small (i) button that opens an accessible popover explaining a price line in plain words.
 * Keyboard: Enter / Space opens, Escape closes and returns focus (handled by Popover).
 */
export function InfoTip({
  title,
  body,
  label,
  children,
  icon = "info",
  className = "",
  showPricingLink = true,
  text,
}: {
  title: string;
  body?: string;
  /** accessible name of the button — defaults to "What is <title>?" */
  label?: string;
  /** extra content under the body */
  children?: React.ReactNode;
  icon?: string;
  className?: string;
  showPricingLink?: boolean;
  /** render a small text link ("Which days?") instead of the icon */
  text?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const id = useId();
  return (
    <>
      <button
        aria-controls={open ? id : undefined}
        aria-expanded={open}
        aria-label={label ?? (text ? undefined : `What is “${title}”?`)}
        className={
          text
            ? `inline font-label-sm text-label-sm text-primary font-bold underline decoration-dotted underline-offset-2 hover:decoration-solid focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded ${className}`
            : `inline-flex items-center justify-center w-6 h-6 -my-1 rounded-full text-primary/80 hover:text-primary hover:bg-primary-fixed/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 align-middle ${className}`
        }
        data-info-tip
        onClick={() => setOpen((o) => !o)}
        ref={ref}
        type="button"
      >
        {text ?? (
          <span aria-hidden className="material-symbols-outlined text-[16px]">
            {icon}
          </span>
        )}
      </button>
      <Popover anchor={ref} className="p-space-md max-w-[300px] w-[calc(100vw-24px)] sm:w-[300px]" label={title} onClose={() => setOpen(false)} open={open}>
        <div id={id} role="dialog" aria-label={title} className="flex flex-col gap-1.5">
          <span className="font-label-lg text-label-lg text-on-surface font-bold">{title}</span>
          {body && <p className="font-body-sm text-body-sm text-on-surface-variant">{body}</p>}
          {children}
          {showPricingLink && (
            <Link className="self-start mt-0.5 font-label-sm text-label-sm text-primary font-bold hover:underline" href="/pricing" rel="noopener" target="_blank">
              How pricing works →
            </Link>
          )}
        </div>
      </Popover>
    </>
  );
}
