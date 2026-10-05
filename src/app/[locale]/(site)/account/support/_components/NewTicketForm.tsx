"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { createTicket, type SupportFormState } from "@/app/actions/support";
import { Select } from "@/components/forms/Select";
import { BTN, Field, INPUT, TEXTAREA } from "@/components/ui";
import { keepValuesOnSubmit } from "@/app/admin/_components/form-utils";
import { BODY_MAX, SUBJECT_MAX, TICKET_CATEGORIES, categoryLabel } from "@/lib/support";
import { SafetyBanner } from "./SafetyBanner";

export type BookingOption = { value: string; label: string; hint: string };

export function NewTicketForm({
  bookings,
  defaultBooking,
  defaultCategory,
  supportPhone,
}: {
  bookings: BookingOption[];
  defaultBooking?: string;
  defaultCategory?: string;
  supportPhone: string;
}) {
  const [state, dispatch, pending] = useActionState<SupportFormState, FormData>(createTicket, undefined);
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [booking, setBooking] = useState(defaultBooking ?? "");
  const fe = state?.fieldErrors ?? {};
  const t = useTranslations("account.support.form");
  const tc = useTranslations("common.actions");
  const locale = useLocale();

  return (
    <form className="flex flex-col gap-space-lg" noValidate onSubmit={keepValuesOnSubmit(dispatch)}>
      {state?.error && !Object.keys(fe).length && (
        <p className="flex items-center gap-space-xs p-space-sm px-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm" role="alert">
          <span className="material-symbols-outlined text-base">error</span>
          {state.error}
        </p>
      )}

      <Field error={fe.category} label={t("about")}>
        <Select
          aria-invalid={!!fe.category}
          aria-label={t("category")}
          name="category"
          onChange={setCategory}
          options={TICKET_CATEGORIES.map((c) => ({ value: c, ...categoryLabel(c, locale) }))}
          placeholder={t("chooseCategory")}
          value={category}
        />
      </Field>

      {category === "SAFETY" && <SafetyBanner phone={supportPhone} />}

      <Field error={fe.bookingId} hint={bookings.length ? t("bookingHint") : t("noBookings")} label={t("relatedBooking")}>
        <Select
          aria-label={t("relatedBooking")}
          disabled={!bookings.length}
          name="bookingId"
          onChange={setBooking}
          options={[{ value: "", label: t("noBooking"), icon: "block" }, ...bookings.map((b) => ({ ...b, icon: "event_note" }))]}
          panelMinWidth={300}
          value={booking}
        />
      </Field>

      <Field error={fe.subject} label={t("subject")}>
        <input aria-invalid={!!fe.subject} className={INPUT} maxLength={SUBJECT_MAX} name="subject" placeholder={t("subjectPlaceholder")} required type="text" />
      </Field>

      <Field error={fe.body} hint={t("bodyHint")} label={t("body")}>
        <textarea aria-invalid={!!fe.body} className={`${TEXTAREA} min-h-[160px]`} maxLength={BODY_MAX} name="body" required />
      </Field>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-space-sm">
        <button className={`${BTN.primary} w-full sm:w-auto`} disabled={pending} type="submit">
          {pending ? <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-xl">send</span>}
          {pending ? tc("sending") : t("send")}
        </button>
      </div>
    </form>
  );
}
