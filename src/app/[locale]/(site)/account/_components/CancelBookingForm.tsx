"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { cancelBooking, type FormState } from "@/app/actions/account";
import { BTN, Field, TEXTAREA } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { CANCEL_REASONS, CANCEL_REASON_KEYS } from "../_lib";

export function CancelBookingForm({ bookingId, withinFreeWindow, freeHours }: { bookingId: string; withinFreeWindow: boolean; freeHours: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(cancelBooking.bind(null, bookingId), undefined);
  const t = useTranslations("account");

  if (!open) {
    return (
      <button className={`${BTN.ghost} w-full text-error`} onClick={() => setOpen(true)} type="button">
        <span className="material-symbols-outlined text-xl">event_busy</span>
        {t("cancelForm.open")}
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-space-md border-t border-[#EFE7DE] pt-space-md mt-space-xs">
      <div className="flex flex-col gap-1">
        <h3 className="font-title-md text-title-md text-on-surface">{t("cancelForm.title")}</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {t("cancelForm.free", { hours: freeHours })}
        </p>
      </div>
      {!withinFreeWindow && (
        <div className="flex items-start gap-space-sm rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant p-space-sm px-space-md font-body-sm text-body-sm" role="alert">
          <span className="material-symbols-outlined text-lg">warning</span>
          <span>{t("cancelForm.late", { hours: freeHours })}</span>
        </div>
      )}
      <Field error={state?.fieldErrors?.reason} label={t("shared.reason")}>
        <Select
          aria-invalid={!!state?.fieldErrors?.reason}
          aria-label={t("shared.reason")}
          defaultValue=""
          name="reason"
          options={CANCEL_REASONS.map((r, i) => ({ value: r, label: t(`shared.cancelReasons.${CANCEL_REASON_KEYS[i]}`) }))}
          placeholder={t("shared.chooseReason")}
        />
      </Field>
      <Field error={state?.fieldErrors?.details} hint={t("shared.sharedWithSitter")} label={t("shared.anythingElse")}>
        <textarea className={TEXTAREA} maxLength={500} name="details" placeholder={t("cancelForm.detailsPlaceholder")} />
      </Field>
      {state?.error && (
        <p className="flex items-center gap-1 font-body-sm text-body-sm text-error" role="alert">
          <span className="material-symbols-outlined text-base">error</span>
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-space-xs">
        <button className={`${BTN.danger} w-full`} disabled={pending} type="submit">
          <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "autorenew" : "event_busy"}</span>
          {pending ? t("shared.cancelling") : t("cancelForm.confirm")}
        </button>
        <button className={`${BTN.ghost} w-full`} disabled={pending} onClick={() => setOpen(false)} type="button">
          {t("cancelForm.keep")}
        </button>
      </div>
    </form>
  );
}
