"use client";

import { useActionState } from "react";
import { resendConfirmation } from "@/app/actions/auth";

/** Shown under the login form when the account exists but the email isn't confirmed yet. */
export function ResendConfirmation({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, undefined);
  if (state?.checkEmail) {
    return (
      <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-[#EBF3EF] text-primary font-body-sm text-body-sm">
        <span className="material-symbols-outlined text-lg">mark_email_read</span>
        A new confirmation link is on its way to {state.checkEmail}.
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm p-space-md rounded-xl bg-surface-container-low">
      <input name="email" type="hidden" value={email} />
      <span className="font-body-sm text-body-sm text-on-surface-variant">
        {state?.error ?? "Didn't get the email, or the link didn't work?"}
      </span>
      <button
        className="h-10 px-space-md rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-1 hover:bg-primary-container disabled:opacity-60 shrink-0"
        disabled={pending}
        type="submit"
      >
        <span className="material-symbols-outlined text-base">forward_to_inbox</span>
        {pending ? "Sending…" : "Resend confirmation"}
      </button>
    </form>
  );
}
