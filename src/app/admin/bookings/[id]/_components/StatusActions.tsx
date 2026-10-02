"use client";

import { useActionState, useState } from "react";
import { adminTransitionBooking } from "@/app/actions/admin-bookings";
import { BTN, Field, TEXTAREA } from "@/components/ui";
import { FormNotice } from "../../_components/FormNotice";

type To = "CONFIRMED" | "DECLINED" | "COMPLETED" | "CANCELLED";

const META: Record<To, { label: string; icon: string; btn: string; needsReason: boolean; reasonLabel: string; confirm: string }> = {
  CONFIRMED: { label: "Confirm booking", icon: "check_circle", btn: BTN.sage, needsReason: false, reasonLabel: "", confirm: "Confirm this booking on the sitter's behalf?" },
  COMPLETED: { label: "Mark completed", icon: "task_alt", btn: BTN.secondary, needsReason: false, reasonLabel: "", confirm: "Mark this booking as completed?" },
  DECLINED: { label: "Decline", icon: "block", btn: BTN.ghost, needsReason: true, reasonLabel: "Reason for declining (optional)", confirm: "" },
  CANCELLED: { label: "Cancel booking", icon: "cancel", btn: BTN.danger, needsReason: true, reasonLabel: "Reason for cancelling", confirm: "" },
};

export function StatusActions({ bookingId, allowed, hasDiscount }: { bookingId: string; allowed: To[]; hasDiscount: boolean }) {
  const [state, action, pending] = useActionState(adminTransitionBooking, undefined);
  const [open, setOpen] = useState<To | null>(null);

  if (allowed.length === 0) {
    return (
      <div className="flex flex-col gap-space-sm">
        <FormNotice state={state} />
        <p className="font-body-sm text-body-sm text-on-surface-variant">This booking is closed — no further status changes are possible.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md">
      <FormNotice state={state} />
      <div className="flex flex-wrap gap-space-sm">
        {allowed.map((to) => {
          const m = META[to];
          if (m.needsReason) {
            return (
              <button key={to} aria-expanded={open === to} className={m.btn} disabled={pending} onClick={() => setOpen(open === to ? null : to)} type="button">
                <span className="material-symbols-outlined text-xl">{m.icon}</span>
                {m.label}
              </button>
            );
          }
          return (
            <form key={to} action={action} onSubmit={(e) => !confirm(m.confirm) && e.preventDefault()}>
              <input name="bookingId" type="hidden" value={bookingId} />
              <input name="to" type="hidden" value={to} />
              <button className={m.btn} disabled={pending} type="submit">
                <span className="material-symbols-outlined text-xl">{m.icon}</span>
                {m.label}
              </button>
            </form>
          );
        })}
      </div>
      {open && allowed.includes(open) && (
        <form
          key={open}
          action={action}
          className="flex flex-col gap-space-md p-space-md rounded-xl bg-surface-container-low"
          onSubmit={(e) => !confirm(open === "CANCELLED" ? "Cancel this booking? The owner and sitter will see it as cancelled by WagStays." : "Decline this booking?") && e.preventDefault()}
        >
          <input name="bookingId" type="hidden" value={bookingId} />
          <input name="to" type="hidden" value={open} />
          <Field error={state?.fieldErrors?.reason} hint={hasDiscount ? "WagPoints used on this booking are refunded to the owner automatically." : undefined} label={META[open].reasonLabel}>
            <textarea
              className={TEXTAREA}
              maxLength={500}
              minLength={open === "CANCELLED" ? 5 : undefined}
              name="reason"
              placeholder={open === "CANCELLED" ? "e.g. Sitter unavailable due to an emergency; owner informed by phone." : "e.g. Outside the sitter's service area."}
              required={open === "CANCELLED"}
            />
          </Field>
          <div className="flex flex-wrap gap-space-sm justify-end">
            <button className={BTN.ghost} onClick={() => setOpen(null)} type="button">
              Keep booking
            </button>
            <button className={open === "CANCELLED" ? BTN.danger : BTN.primary} disabled={pending} type="submit">
              {pending ? "Saving…" : open === "CANCELLED" ? "Cancel booking" : "Decline booking"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
