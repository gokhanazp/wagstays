"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { ResendConfirmation } from "./ResendConfirmation";
import { FieldError, INPUT, LABEL, PRIMARY_BTN } from "../AuthShell";

export function LoginForm({ next, linkError }: { next: string; linkError?: boolean }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <>
      <form action={action} className="flex flex-col gap-space-md" noValidate>
        <input name="next" type="hidden" value={next} />
        {linkError && !state?.error && (
          <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-lg">link_off</span>
            {t("login.linkError")}
          </div>
        )}
        {state?.error && (
          <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-lg">info</span>
            {state.error}
          </div>
        )}
        <label className="flex flex-col gap-space-xs">
          <span className={LABEL}>{t("fields.email")}</span>
          <input autoComplete="email" className={INPUT} name="email" placeholder={t("fields.emailPlaceholder")} type="email" />
          <FieldError messages={state?.fieldErrors?.email} />
        </label>
        <label className="flex flex-col gap-space-xs">
          <span className={LABEL}>{t("fields.password")}</span>
          <input autoComplete="current-password" className={INPUT} name="password" placeholder="••••••••" type="password" />
          <FieldError messages={state?.fieldErrors?.password} />
        </label>
        <Link className="-mt-space-xs self-end font-label-md text-label-md text-primary hover:underline" href="/forgot-password">
          {t("login.forgot")}
        </Link>
        <button className={PRIMARY_BTN} disabled={pending} type="submit">
          <span className="material-symbols-outlined text-lg">login</span>
          {pending ? t("login.submitting") : t("login.submit")}
        </button>
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
          {t("login.newHere")}{" "}
          <Link className="font-label-lg text-label-lg text-primary hover:underline" href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
            {t("login.createAccount")}
          </Link>
        </p>
      </form>
      {state?.unconfirmedEmail && <ResendConfirmation email={state.unconfirmedEmail} />}
    </>
  );
}
