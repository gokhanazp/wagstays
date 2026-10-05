"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { subscribe } from "@/app/actions/newsletter";

export function NewsletterForm() {
  const t = useTranslations("common.newsletter");
  const [state, action, pending] = useActionState(subscribe, undefined);
  return (
    <form action={action} className="flex flex-col gap-space-xs">
      <input
        aria-label={t("label")}
        className="w-full h-11 px-space-md rounded-full bg-surface-container-lowest font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none ring-1 ring-outline-variant focus:ring-2 focus:ring-primary"
        name="email"
        placeholder={t("placeholder")}
        required
        type="email"
      />
      <button
        className="w-full h-11 rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container transition-all flex items-center justify-center gap-space-xs disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        <span className="material-symbols-outlined text-sm">{state?.ok ? "check" : "send"}</span>
        {state?.ok ? t("subscribed") : t("submit")}
      </button>
      {state?.error && <p className="font-body-sm text-body-sm text-error px-space-sm">{state.error}</p>}
    </form>
  );
}
