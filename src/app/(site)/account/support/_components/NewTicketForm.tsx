"use client";

import { useActionState, useState } from "react";
import { createTicket, type SupportFormState } from "@/app/actions/support";
import { Select } from "@/components/forms/Select";
import { BTN, Field, INPUT, TEXTAREA } from "@/components/ui";
import { keepValuesOnSubmit } from "@/app/admin/_components/form-utils";
import { BODY_MAX, CATEGORY_LABELS, SUBJECT_MAX, TICKET_CATEGORIES } from "@/lib/support";
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

  return (
    <form className="flex flex-col gap-space-lg" noValidate onSubmit={keepValuesOnSubmit(dispatch)}>
      {state?.error && !Object.keys(fe).length && (
        <p className="flex items-center gap-space-xs p-space-sm px-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm" role="alert">
          <span className="material-symbols-outlined text-base">error</span>
          {state.error}
        </p>
      )}

      <Field error={fe.category} label="What is this about?">
        <Select
          aria-invalid={!!fe.category}
          aria-label="Category"
          name="category"
          onChange={setCategory}
          options={TICKET_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c].label, hint: CATEGORY_LABELS[c].hint, icon: CATEGORY_LABELS[c].icon }))}
          placeholder="Choose a category"
          value={category}
        />
      </Field>

      {category === "SAFETY" && <SafetyBanner phone={supportPhone} />}

      <Field error={fe.bookingId} hint={bookings.length ? "Optional — pick the booking this is about." : "You don't have any bookings yet."} label="Related booking">
        <Select
          aria-label="Related booking"
          disabled={!bookings.length}
          name="bookingId"
          onChange={setBooking}
          options={[{ value: "", label: "No specific booking", icon: "block" }, ...bookings.map((b) => ({ ...b, icon: "event_note" }))]}
          panelMinWidth={300}
          value={booking}
        />
      </Field>

      <Field error={fe.subject} label="Subject">
        <input aria-invalid={!!fe.subject} className={INPUT} maxLength={SUBJECT_MAX} name="subject" placeholder="e.g. Sitter arrived an hour late" required type="text" />
      </Field>

      <Field error={fe.body} hint="Include times, what you expected and what happened. Please don't share card numbers." label="Describe the problem">
        <textarea aria-invalid={!!fe.body} className={`${TEXTAREA} min-h-[160px]`} maxLength={BODY_MAX} name="body" required />
      </Field>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-space-sm">
        <button className={`${BTN.primary} w-full sm:w-auto`} disabled={pending} type="submit">
          {pending ? <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-xl">send</span>}
          {pending ? "Sending…" : "Send request"}
        </button>
      </div>
    </form>
  );
}
