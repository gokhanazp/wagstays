"use client";

import { Link } from "@/i18n/navigation";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { FieldError, INPUT, LABEL, PRIMARY_BTN } from "../AuthShell";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.checkEmail) {
    return (
      <div className="flex flex-col gap-space-md">
        <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-[#EBF3EF] text-primary font-body-md text-body-md">
          <span className="material-symbols-outlined text-xl">mark_email_read</span>
          If an account exists for {state.checkEmail}, a reset link is on its way. It expires in 1 hour.
        </div>
        <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/login">
          Back to log in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>Email</span>
        <input autoComplete="email" className={INPUT} name="email" placeholder="you@example.com" type="email" />
        <FieldError messages={state?.fieldErrors?.email} />
      </label>
      <button className={PRIMARY_BTN} disabled={pending} type="submit">
        <span className="material-symbols-outlined text-lg">send</span>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <Link className="font-label-lg text-label-lg text-primary hover:underline text-center" href="/login">
        Back to log in
      </Link>
    </form>
  );
}
