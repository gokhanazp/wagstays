"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localePrefix } from "@/i18n/routing";
import { startTransition, useActionState, useState } from "react";
import { closeAccount, type CloseAccountState } from "@/app/actions/privacy";
import { BTN, Card, CardHeader, Field, INPUT, StatusChip } from "@/components/ui";

export type Blocker = { id: string; status: string; when: string; service: string; asOwner: boolean; counterpart: string; pet: string };

/** "Download my data": fetches the export so a rate-limit message can be shown inline instead of a broken download. */
export function DataExportCard() {
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: boolean }>({});
  const t = useTranslations("account.privacy.export");
  const locale = useLocale();

  async function download() {
    setState({ busy: true });
    try {
      const res = await fetch(`${localePrefix(locale)}/account/data-export`, { cache: "no-store" });
      if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) {
        setState({ error: res.status === 429 ? await res.text() : t("failed") });
        return;
      }
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "wagstays-data.json";
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setState({ done: true });
    } catch {
      setState({ error: t("offline") });
    }
  }

  return (
    <Card className="pb-space-lg">
      <CardHeader icon="download" title={t("title")} />
      <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t("text")}</p>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-space-sm">
          {state.error ? (
            <p className="flex items-center gap-1 font-body-sm text-body-sm text-error" role="alert">
              <span className="material-symbols-outlined text-base">error</span>
              {state.error}
            </p>
          ) : state.done ? (
            <p className="flex items-center gap-1 font-label-lg text-label-lg text-primary" role="status">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              {t("started")}
            </p>
          ) : (
            <span />
          )}
          <button className={`${BTN.secondary} sm:ml-auto shrink-0 whitespace-nowrap`} disabled={state.busy} onClick={download} type="button">
            <span className={`material-symbols-outlined text-xl ${state.busy ? "animate-spin" : ""}`}>{state.busy ? "autorenew" : "download"}</span>
            {state.busy ? t("preparing") : t("download")}
          </button>
        </div>
      </div>
    </Card>
  );
}

export function CloseAccountCard({ blockers, hasSitterProfile }: { blockers: Blocker[]; hasSitterProfile: boolean }) {
  const [state, action, pending] = useActionState<CloseAccountState, FormData>(closeAccount, undefined);
  const [confirm, setConfirm] = useState("");
  const t = useTranslations("account.privacy.close");
  const fe = state?.fieldErrors ?? {};
  const blocked = blockers.length > 0;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  return (
    <Card className="pb-space-lg border-error/30">
      <div className="flex items-center gap-space-sm px-space-lg pt-space-lg">
        <span className="w-9 h-9 rounded-xl bg-error-container text-on-error-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-xl">warning</span>
        </span>
        <h2 className="font-title-md text-title-md text-on-surface">{t("title")}</h2>
      </div>
      <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t("intro")}</p>
        <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
          {[
            ["person_off", t("login")],
            ["pets", t("pets")],
            ["chat_bubble", t("messages")],
            ["rate_review", t("reviews")],
            ...(hasSitterProfile ? [["badge", t("sitter")]] : []),
            ["receipt_long", t("bookings")],
            ["auto_delete", t("retention")],
          ].map(([icon, text]) => (
            <li className="flex gap-space-sm" key={icon}>
              <span className="material-symbols-outlined text-lg text-on-surface-variant shrink-0">{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t("copyFirst")}</p>

        {blocked ? (
          <div className="flex flex-col gap-space-sm p-space-md rounded-xl bg-tertiary-fixed/40" role="status">
            <p className="flex items-start gap-space-xs font-label-lg text-label-lg text-on-surface">
              <span className="material-symbols-outlined text-xl text-tertiary shrink-0">event_busy</span>
              {t("blocked", { count: blockers.length })}
            </p>
            <ul className="flex flex-col gap-space-xs">
              {blockers.map((b) => (
                <li key={b.id}>
                  <Link
                    className="flex flex-wrap items-center gap-x-space-sm gap-y-1 p-space-sm rounded-lg bg-surface-container-lowest hover:bg-surface-container-low font-body-sm text-body-sm text-on-surface"
                    href={b.asOwner ? `/account/bookings/${b.id}` : `/sitter/bookings/${b.id}`}
                  >
                    <StatusChip tone={b.status === "CONFIRMED" ? "success" : "warning"}>{b.status === "CONFIRMED" ? t("confirmed") : t("pending")}</StatusChip>
                    <span className="font-label-lg text-label-lg">{b.service}</span>
                    <span className="text-on-surface-variant">
                      {b.when} · {b.pet} · {b.asOwner ? t("withName", { name: b.counterpart }) : t("forName", { name: b.counterpart })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <form className="flex flex-col gap-space-md" noValidate onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <Field error={fe.confirm} hint={t("confirmHint")} label={t("confirm")}>
                <input autoCapitalize="characters" autoComplete="off" className={INPUT} name="confirm" onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" spellCheck={false} />
              </Field>
              <Field error={fe.password} label={t("password")}>
                <input autoComplete="current-password" className={INPUT} name="password" type="password" />
              </Field>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-space-sm">
              {state?.error ? (
                <p className="flex items-center gap-1 font-body-sm text-body-sm text-error" role="alert">
                  <span className="material-symbols-outlined text-base">error</span>
                  {state.error}
                </p>
              ) : (
                <span />
              )}
              <button className={`${BTN.danger} sm:ml-auto shrink-0 whitespace-nowrap`} disabled={pending || confirm !== "DELETE"} type="submit">
                <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "autorenew" : "delete_forever"}</span>
                {pending ? t("closing") : t("submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
