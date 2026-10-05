"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { signup } from "@/app/actions/auth";
import { FieldError, INPUT, LABEL, PRIMARY_BTN } from "../AuthShell";

const ROLES = [
  { value: "OWNER", icon: "pets", title: "ownerTitle", text: "ownerText" },
  { value: "SITTER", icon: "volunteer_activism", title: "sitterTitle", text: "sitterText" },
] as const;

export function SignupForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(signup, undefined);
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("OWNER");
  if (state?.checkEmail) {
    return (
      <div className="flex flex-col gap-space-md">
        <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-[#EBF3EF] text-primary font-body-md text-body-md">
          <span className="material-symbols-outlined text-xl">mark_email_read</span>
          <span>
            {t.rich("signup.checkEmail", { email: state.checkEmail, b: (c) => <strong>{c}</strong> })}
          </span>
        </div>
        <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/login">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      <input name="next" type="hidden" value={role === "SITTER" && next === "/" ? "/become-a-sitter" : next} />
      <input name="role" type="hidden" value={role} />
      <div className="grid grid-cols-2 gap-space-sm">
        {ROLES.map((r) => (
          <button
            key={r.value}
            aria-pressed={role === r.value}
            className={`p-space-md rounded-2xl text-left flex flex-col gap-1 border transition-all ${
              role === r.value
                ? "bg-primary text-on-primary border-primary shadow-sm"
                : "bg-surface-container-low text-on-surface border-surface-container-high hover:bg-surface-container"
            }`}
            onClick={() => setRole(r.value)}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">{r.icon}</span>
            <span className="font-label-lg text-label-lg">{t(`signup.roles.${r.title}`)}</span>
            <span className={`font-body-sm text-body-sm ${role === r.value ? "text-on-primary/80" : "text-on-surface-variant"}`}>{t(`signup.roles.${r.text}`)}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
        <label className="flex flex-col gap-space-xs">
          <span className={LABEL}>{t("fields.firstName")}</span>
          <input autoComplete="given-name" className={INPUT} name="firstName" placeholder={t("fields.firstNamePlaceholder")} />
          <FieldError messages={state?.fieldErrors?.firstName} />
        </label>
        <label className="flex flex-col gap-space-xs">
          <span className={LABEL}>{t("fields.lastName")}</span>
          <input autoComplete="family-name" className={INPUT} name="lastName" placeholder={t("fields.lastNamePlaceholder")} />
          <FieldError messages={state?.fieldErrors?.lastName} />
        </label>
      </div>
      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>{t("fields.email")}</span>
        <input autoComplete="email" className={INPUT} name="email" placeholder={t("fields.emailPlaceholder")} type="email" />
        <FieldError messages={state?.fieldErrors?.email} />
      </label>
      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>{t("fields.password")}</span>
        <input autoComplete="new-password" className={INPUT} name="password" placeholder={t("fields.newPasswordPlaceholder")} type="password" />
        <FieldError messages={state?.fieldErrors?.password} />
      </label>
      {state?.error && <p className="font-body-sm text-body-sm text-error">{state.error}</p>}
      <button className={PRIMARY_BTN} disabled={pending} type="submit">
        <span className="material-symbols-outlined text-lg">pets</span>
        {pending ? t("signup.submitting") : t("signup.submit")}
      </button>
      <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
        {t("signup.haveAccount")}{" "}
        <Link className="font-label-lg text-label-lg text-primary hover:underline" href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
          {t("signup.logIn")}
        </Link>
      </p>
      <p className="font-body-sm text-body-sm text-outline text-center">
        {t("signup.terms")}
      </p>
    </form>
  );
}
