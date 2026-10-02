"use client";

import { useActionState, useEffect, useRef } from "react";
import { issueWagPointsCredit } from "@/app/actions/admin-bookings";
import { BTN, Field, INPUT } from "@/components/ui";
import { FormNotice } from "../../_components/FormNotice";

export function CreditForm({ bookingId, ownerName }: { bookingId: string; ownerName: string }) {
  const [state, action, pending] = useActionState(issueWagPointsCredit, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form
      ref={ref}
      action={action}
      className="flex flex-col gap-space-md"
      onSubmit={(e) => {
        const amt = new FormData(e.currentTarget).get("amount");
        if (!confirm(`Credit $${amt} in WagPoints to ${ownerName}?`)) e.preventDefault();
      }}
    >
      <input name="bookingId" type="hidden" value={bookingId} />
      <FormNotice state={state} />
      <Field error={state?.fieldErrors?.amount} hint="Between $1 and $200. Applied to the owner's next booking." label="Amount (CAD)">
        <span className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">$</span>
          <input className={`${INPUT} pl-8`} inputMode="decimal" name="amount" placeholder="10.00" required type="text" />
        </span>
      </Field>
      <Field error={state?.fieldErrors?.reason} label="Reason">
        <input className={INPUT} maxLength={300} minLength={5} name="reason" placeholder="e.g. Sitter arrived 30 minutes late" required type="text" />
      </Field>
      <button className={BTN.sage} disabled={pending} type="submit">
        <span className="material-symbols-outlined text-xl">redeem</span>
        {pending ? "Issuing…" : "Issue credit"}
      </button>
    </form>
  );
}
