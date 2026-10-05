"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { sitterSeriesAction, type SeriesState } from "@/app/actions/booking-series";
import { BTN, TEXTAREA } from "@/components/ui";
import { Feedback } from "./Feedback";

/** Weekly series controls on the sitter's booking page: accept all pending, cancel this & later weeks. */
export function SeriesActions({ bookingId, pendingCount, laterCount }: { bookingId: string; pendingCount: number; laterCount: number }) {
  const t = useTranslations("sitter.seriesActions");
  const tc = useTranslations("common.actions");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SeriesState, FormData>(async (prev, fd) => {
    const res = await sitterSeriesAction(prev, fd);
    if (res?.ok) setOpen(false);
    return res;
  }, undefined);
  if (!pendingCount && !laterCount && !state) return null;

  return (
    <div className="flex flex-col gap-space-sm">
      {!open && (
        <div className="flex flex-wrap gap-space-sm">
          {pendingCount > 1 && (
            <form action={action}>
              <input name="bookingId" type="hidden" value={bookingId} />
              <input name="intent" type="hidden" value="accept-all" />
              <button className={BTN.sage} disabled={pending} type="submit">
                <span className="material-symbols-outlined text-lg">done_all</span>
                {t("acceptAll", { count: pendingCount })}
              </button>
            </form>
          )}
          {laterCount > 1 && (
            <button className={`${BTN.ghost} border border-[#EFE7DE] text-error`} disabled={pending} onClick={() => setOpen(true)} type="button">
              <span className="material-symbols-outlined text-lg">event_repeat</span>
              {t("cancelFuture", { count: laterCount })}
            </button>
          )}
        </div>
      )}
      {open && (
        <form action={action} className="flex flex-col gap-space-sm rounded-2xl bg-surface-container-low p-space-lg">
          <input name="bookingId" type="hidden" value={bookingId} />
          <input name="intent" type="hidden" value="cancel-later" />
          <label className="flex flex-col gap-space-xs">
            <span className="font-label-lg text-label-lg text-on-surface">
              {t("whyCancel")} <span className="text-error">*</span>
            </span>
            <textarea className={`${TEXTAREA} min-h-[88px]`} maxLength={500} minLength={5} name="reason" placeholder={t("placeholder")} required />
            {state?.fieldErrors?.reason && <span className="font-body-sm text-body-sm text-error">{state.fieldErrors.reason[0]}</span>}
          </label>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t("explain", { count: laterCount })}
          </p>
          <div className="flex flex-wrap gap-space-sm">
            <button className={BTN.danger} disabled={pending} type="submit">
              {pending ? tc("saving") : t("submit", { count: laterCount })}
            </button>
            <button className={BTN.ghost} disabled={pending} onClick={() => setOpen(false)} type="button">
              {tc("back")}
            </button>
          </div>
        </form>
      )}
      <Feedback state={state} />
    </div>
  );
}
