"use client";

import { useActionState, useState } from "react";
import { cancelSeriesAsOwner, type SeriesState } from "@/app/actions/booking-series";
import { BTN, Field, TEXTAREA } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { CANCEL_REASONS } from "../../_lib";

/** "Cancel all future in series": this occurrence and every later pending / confirmed one. */
export function SeriesCancelForm({ bookingId, count }: { bookingId: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SeriesState, FormData>(cancelSeriesAsOwner.bind(null, bookingId), undefined);

  if (!open) {
    return (
      <button className={`${BTN.ghost} w-full text-error`} onClick={() => setOpen(true)} type="button">
        <span className="material-symbols-outlined text-xl">event_repeat</span>
        Cancel this &amp; all later weeks ({count})
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-space-md border-t border-[#EFE7DE] pt-space-md mt-space-xs">
      <div className="flex flex-col gap-1">
        <h3 className="font-title-md text-title-md text-on-surface">Cancel the rest of this series?</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          This cancels this booking and the {count - 1} later weekly booking{count - 1 === 1 ? "" : "s"}. Earlier weeks aren&apos;t affected. Any WagPoints you used go back
          to your wallet.
        </p>
      </div>
      <Field error={state?.fieldErrors?.reason} label="Reason">
        <Select aria-label="Reason" defaultValue="" name="reason" options={CANCEL_REASONS.map((r) => ({ value: r, label: r }))} placeholder="Choose a reason…" />
      </Field>
      <Field error={state?.fieldErrors?.details} hint="Optional — shared with your sitter." label="Anything else?">
        <textarea className={TEXTAREA} maxLength={500} name="details" placeholder="e.g. We're moving at the end of the month." />
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
          {pending ? "Cancelling…" : `Yes, cancel ${count} bookings`}
        </button>
        <button className={`${BTN.ghost} w-full`} disabled={pending} onClick={() => setOpen(false)} type="button">
          Keep them
        </button>
      </div>
    </form>
  );
}
