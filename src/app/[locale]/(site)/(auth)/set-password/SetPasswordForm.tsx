"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { setPassword } from "@/app/actions/password";
import { FieldError, INPUT, LABEL, PRIMARY_BTN } from "../AuthShell";

export function SetPasswordForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common.actions");
  const [state, action, pending] = useActionState(setPassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      {state?.error && (
        <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm">
          <span className="material-symbols-outlined text-lg">info</span>
          {state.error}
        </div>
      )}
      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>{t("fields.newPassword")}</span>
        <input autoComplete="new-password" className={INPUT} name="password" placeholder={t("fields.newPasswordPlaceholder")} type="password" />
        <FieldError messages={state?.fieldErrors?.password} />
      </label>
      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>{t("fields.confirmPassword")}</span>
        <input autoComplete="new-password" className={INPUT} name="confirm" type="password" />
        <FieldError messages={state?.fieldErrors?.confirm} />
      </label>
      <button className={PRIMARY_BTN} disabled={pending} type="submit">
        <span className="material-symbols-outlined text-lg">lock_reset</span>
        {pending ? tc("saving") : t("setPassword.submit")}
      </button>
    </form>
  );
}
