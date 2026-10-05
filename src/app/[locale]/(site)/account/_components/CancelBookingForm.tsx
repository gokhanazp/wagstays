"use client";

import { useActionState, useState } from "react";
import { cancelBooking, type FormState } from "@/app/actions/account";
import { BTN, Field, TEXTAREA } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { CANCEL_REASONS } from "../_lib";

export function CancelBookingForm({ bookingId, withinFreeWindow, freeHours }: { bookingId: string; withinFreeWindow: boolean; freeHours: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(cancelBooking.bind(null, bookingId), undefined);

  if (!open) {
    return (
      <button className={`${BTN.ghost} w-full text-error`} onClick={() => setOpen(true)} type="button">
        <span className="material-symbols-outlined text-xl">event_busy</span>
        Cancel booking
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-space-md border-t border-[#EFE7DE] pt-space-md mt-space-xs">
      <div className="flex flex-col gap-1">
        <h3 className="font-title-md text-title-md text-on-surface">Cancel this booking?</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Free cancellation up to {freeHours} hours before the start time. Any WagPoints you used go straight back to your wallet.
        </p>
      </div>
      {!withinFreeWindow && (
        <div className="flex items-start gap-space-sm rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant p-space-sm px-space-md font-body-sm text-body-sm" role="alert">
          <span className="material-symbols-outlined text-lg">warning</span>
          <span>
            This booking starts in less than {freeHours} hours. You can still cancel, but your sitter may have already set this time aside — a
            late-cancellation fee may apply once payments go live.
          </span>
        </div>
      )}
      <Field error={state?.fieldErrors?.reason} label="Reason">
        <Select
          aria-invalid={!!state?.fieldErrors?.reason}
          aria-label="Reason"
          defaultValue=""
          name="reason"
          options={CANCEL_REASONS.map((r) => ({ value: r, label: r }))}
          placeholder="Choose a reason…"
        />
      </Field>
      <Field error={state?.fieldErrors?.details} hint="Optional — shared with your sitter." label="Anything else?">
        <textarea className={TEXTAREA} maxLength={500} name="details" placeholder="e.g. We're heading to the cottage a day early." />
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
          {pending ? "Cancelling…" : "Yes, cancel booking"}
        </button>
        <button className={`${BTN.ghost} w-full`} disabled={pending} onClick={() => setOpen(false)} type="button">
          Keep my booking
        </button>
      </div>
    </form>
  );
}
