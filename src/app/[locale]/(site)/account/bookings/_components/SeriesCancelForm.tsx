"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { cancelSeriesAsOwner, type SeriesState } from "@/app/actions/booking-series";
import { BTN, Field, TEXTAREA } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { CANCEL_REASONS, CANCEL_REASON_KEYS } from "../../_lib";

/** "Cancel all future in series": this occurrence and every later pending / confirmed one. */
export function SeriesCancelForm({ bookingId, count }: { bookingId: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SeriesState, FormData>(cancelSeriesAsOwner.bind(null, bookingId), undefined);
  const t = useTranslations("account");

  if (!open) {
    return (
      <button className={`${BTN.ghost} w-full text-error`} onClick={() => setOpen(true)} type="button">
        <span className="material-symbols-outlined text-xl">event_repeat</span>
        {t("seriesCancel.open", { count })}
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-space-md border-t border-[#EFE7DE] pt-space-md mt-space-xs">
      <div className="flex flex-col gap-1">
        <h3 className="font-title-md text-title-md text-on-surface">{t("seriesCancel.title")}</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t("seriesCancel.text", { later: count - 1 })}</p>
      </div>
      <Field error={state?.fieldErrors?.reason} label={t("shared.reason")}>
        <Select
          aria-label={t("shared.reason")}
          defaultValue=""
          name="reason"
          options={CANCEL_REASONS.map((r, i) => ({ value: r, label: t(`shared.cancelReasons.${CANCEL_REASON_KEYS[i]}`) }))}
          placeholder={t("shared.chooseReason")}
        />
      </Field>
      <Field error={state?.fieldErrors?.details} hint={t("shared.sharedWithSitter")} label={t("shared.anythingElse")}>
        <textarea className={TEXTAREA} maxLength={500} name="details" placeholder={t("seriesCancel.detailsPlaceholder")} />
      </Field>
      {state?.error && (
        <p className="flex items-center gap-1 font-body-sm text-body-sm text-error" role="alert">
          <span className="material-symbols-outlined text-base">error</span>
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-space-xs">
        <button className={`${BTN.danger} w-full`} disabled={pending} type="submit">
          <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "autorenew" : "event_repeat"}</span>
          {pending ? t("shared.cancelling") : t("seriesCancel.confirm", { count })}
        </button>
        <button className={`${BTN.ghost} w-full`} disabled={pending} onClick={() => setOpen(false)} type="button">
          {t("seriesCancel.keep")}
        </button>
      </div>
    </form>
  );
}
