"use client";

import { useActionState } from "react";
import { setPasswordWithToken } from "@/app/actions/password";
import { FieldError, INPUT, LABEL, PRIMARY_BTN } from "../AuthShell";

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(setPasswordWithToken, undefined);
  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      <input name="token" type="hidden" value={token} />
      {state?.error && (
        <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm">
          <span className="material-symbols-outlined text-lg">info</span>
          {state.error}
        </div>
      )}
      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>New password</span>
        <input autoComplete="new-password" className={INPUT} name="password" placeholder="At least 8 characters" type="password" />
        <FieldError messages={state?.fieldErrors?.password} />
      </label>
      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>Confirm password</span>
        <input autoComplete="new-password" className={INPUT} name="confirm" type="password" />
        <FieldError messages={state?.fieldErrors?.confirm} />
      </label>
      <button className={PRIMARY_BTN} disabled={pending} type="submit">
        <span className="material-symbols-outlined text-lg">lock_reset</span>
        {pending ? "Saving…" : "Save password & log in"}
      </button>
    </form>
  );
}
