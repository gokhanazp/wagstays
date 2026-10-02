"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setCityActive } from "@/app/actions/admin-core";
import { BTN } from "@/components/ui";

export function CityActiveToggle({
  cityId,
  cityName,
  active,
  activeSitters,
  neighbourhoods,
  isLastActive,
  showHint = true,
}: {
  cityId: string;
  cityName: string;
  active: boolean;
  activeSitters: number;
  neighbourhoods: number;
  isLastActive: boolean;
  showHint?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(active);
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();

  const blocked = isLastActive ? "At least one city must stay active." : !active && neighbourhoods === 0 ? "Add a neighbourhood first." : undefined;

  const apply = (next: boolean) =>
    start(async () => {
      setError(undefined);
      setConfirming(false);
      setOptimistic(next);
      const res = await setCityActive(cityId, next);
      if (res.error) setError(res.error);
    });

  const onClick = () => {
    if (active && activeSitters > 0) setConfirming(true);
    else apply(!active);
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        aria-checked={optimistic}
        aria-label={`${cityName} active`}
        className="relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed aria-checked:bg-primary-container bg-outline-variant"
        disabled={pending || !!blocked}
        onClick={onClick}
        role="switch"
        title={blocked}
        type="button"
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${optimistic ? "translate-x-5" : ""}`} />
      </button>
      {blocked && showHint && <span className="font-body-sm text-body-sm text-on-surface-variant max-w-[160px]">{blocked}</span>}
      {error && (
        <span className="font-body-sm text-body-sm text-error max-w-[200px]" role="alert">
          {error}
        </span>
      )}
      {confirming && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-inverse-surface/40 p-space-md" onClick={() => setConfirming(false)}>
          <div
            aria-labelledby={`deact-${cityId}`}
            aria-modal="true"
            className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-[#EFE7DE] shadow-[0_12px_40px_-8px_rgba(83,72,62,0.25)] p-space-lg flex flex-col gap-space-md"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start gap-space-sm">
              <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-error-container text-on-error-container">
                <span className="material-symbols-outlined text-xl">warning</span>
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="font-title-md text-title-md text-on-surface" id={`deact-${cityId}`}>
                  Deactivate {cityName}?
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {cityName} has {activeSitters} active sitter{activeSitters === 1 ? "" : "s"}. While the city is inactive they stop appearing in search and on the home page. Existing bookings
                  are not cancelled.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-space-sm">
              <button autoFocus className={BTN.ghost} onClick={() => setConfirming(false)} type="button">
                Keep active
              </button>
              <button className={BTN.danger} onClick={() => apply(false)} type="button">
                Deactivate city
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
