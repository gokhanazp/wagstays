"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState } from "react";
import { updateEmailPrefs, type EmailPrefsState } from "@/app/actions/email-prefs";
import { BTN, Card, CardHeader, Toggle } from "@/components/ui";

type Prefs = { emailBookings: boolean; emailMessages: boolean; emailReminders: boolean };

/** "Email notifications" card in Account Settings (anchor: #email — linked from every notification email). */
export function EmailPrefsCard({ prefs }: { prefs: Prefs }) {
  const t = useTranslations("account.emailPrefs");
  const tc = useTranslations("common.actions");
  const [state, action, pending] = useActionState<EmailPrefsState, FormData>(updateEmailPrefs, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
  return (
    <div className="scroll-mt-28" id="email">
      <Card className="pb-space-lg">
        <CardHeader icon="mail" title={t("title")} />
        <form className="px-space-lg pt-space-md flex flex-col gap-space-md" onSubmit={onSubmit}>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{t("intro")}</p>
          <div className="flex flex-col gap-space-sm">
            <Toggle defaultChecked={prefs.emailBookings} description={t("bookingsHint")} label={t("bookings")} name="emailBookings" />
            <Toggle defaultChecked={prefs.emailMessages} description={t("messagesHint")} label={t("messages")} name="emailMessages" />
            <Toggle defaultChecked={prefs.emailReminders} description={t("remindersHint")} label={t("reminders")} name="emailReminders" />
          </div>
          <p className="flex items-start gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-lg text-primary shrink-0">verified_user</span>
            {t("always")}
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-space-sm">
            {state?.ok ? (
              <p className="flex items-center gap-1 font-label-lg text-label-lg text-primary" role="status">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                {state.message}
              </p>
            ) : state?.error ? (
              <p className="flex items-center gap-1 font-body-sm text-body-sm text-error" role="alert">
                <span className="material-symbols-outlined text-base">error</span>
                {state.error}
              </p>
            ) : (
              <span />
            )}
            <button className={`${BTN.primary} sm:ml-auto`} disabled={pending} type="submit">
              <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "autorenew" : "save"}</span>
              {pending ? tc("saving") : t("save")}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
