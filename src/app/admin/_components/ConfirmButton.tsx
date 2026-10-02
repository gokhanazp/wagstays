"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BTN } from "@/components/ui";

type Result = { ok?: boolean; error?: string } | void;

/**
 * Button that runs a (bound) server action, optionally after a confirmation dialog.
 * Shows pending state and any returned error inline.
 */
export function ConfirmButton({
  action,
  label,
  icon,
  className = `${BTN.small} bg-surface-container-high text-on-surface hover:brightness-95`,
  confirm,
  disabled,
  disabledReason,
}: {
  action: () => Promise<Result>;
  label: string;
  icon?: string;
  className?: string;
  confirm?: { title: string; body: React.ReactNode; confirmLabel: string; danger?: boolean };
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLButtonElement>("[data-cancel]")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const run = () =>
    start(async () => {
      setError(undefined);
      const res = await action();
      if (res && res.error) setError(res.error);
      setOpen(false);
    });

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        className={className}
        disabled={disabled || pending}
        onClick={() => (confirm ? setOpen(true) : run())}
        title={disabled ? disabledReason : undefined}
        type="button"
      >
        {pending ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span> : icon && <span className="material-symbols-outlined text-base">{icon}</span>}
        {label}
      </button>
      {error && (
        <span className="flex items-start gap-1 font-body-sm text-body-sm text-error max-w-xs" role="alert">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </span>
      )}
      {open && confirm && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-inverse-surface/40 p-space-md" onClick={() => !pending && setOpen(false)}>
          <div
            ref={dialogRef}
            aria-labelledby="confirm-title"
            aria-modal="true"
            className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-[#EFE7DE] shadow-[0_12px_40px_-8px_rgba(83,72,62,0.25)] p-space-lg flex flex-col gap-space-md text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start gap-space-sm">
              <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${confirm.danger ? "bg-error-container text-on-error-container" : "bg-tertiary-fixed text-tertiary"}`}>
                <span className="material-symbols-outlined text-xl">{confirm.danger ? "warning" : "help"}</span>
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="font-title-md text-title-md text-on-surface" id="confirm-title">
                  {confirm.title}
                </h2>
                <div className="font-body-md text-body-md text-on-surface-variant">{confirm.body}</div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-space-sm">
              <button className={BTN.ghost} data-cancel disabled={pending} onClick={() => setOpen(false)} type="button">
                Cancel
              </button>
              <button className={confirm.danger ? BTN.danger : BTN.sage} disabled={pending} onClick={run} type="button">
                {pending && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
