"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { resendConfirmation } from "@/app/actions/auth";

/** Shown under the login form when the account exists but the email isn't confirmed yet. */
export function ResendConfirmation({ email }: { email: string }) {
  const t = useTranslations("auth.resend");
  const tc = useTranslations("common.actions");
  const [state, action, pending] = useActionState(resendConfirmation, undefined);
  if (state?.checkEmail) {
    return (
      <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-[#EBF3EF] text-primary font-body-sm text-body-sm">
        <span className="material-symbols-outlined text-lg">mark_email_read</span>
        {t("sent", { email: state.checkEmail })}
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm p-space-md rounded-xl bg-surface-container-low">
      <input name="email" type="hidden" value={email} />
      <span className="font-body-sm text-body-sm text-on-surface-variant">
        {state?.error ?? t("prompt")}
      </span>
      <button
        className="h-10 px-space-md rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-1 hover:bg-primary-container disabled:opacity-60 shrink-0"
        disabled={pending}
        type="submit"
      >
        <span className="material-symbols-outlined text-base">forward_to_inbox</span>
        {pending ? tc("sending") : t("submit")}
      </button>
    </form>
  );
}
