import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LanguageChip } from "@/components/LanguageSwitcher";
import { LogoFull } from "@/components/Logo";
import { BTN } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localizedPath } from "@/i18n/server";
import { verifyUnsubscribe } from "@/lib/email/links";
import { applyUnsubscribe, unsubscribeTarget } from "@/lib/email/unsubscribe";

// Landing page for the unsubscribe link in every notification/newsletter email. Works without logging in (the
// signed token is the proof). Outside (site) — minimal layout like coming-soon — and reachable through the gate.

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "misc.unsubscribe" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

async function confirmUnsubscribe(formData: FormData) {
  "use server";
  const token = String(formData.get("t") ?? "");
  const payload = verifyUnsubscribe(token);
  if (payload) await applyUnsubscribe(payload);
  redirect(await localizedPath(`/unsubscribe?t=${encodeURIComponent(token)}`));
}

export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const payload = verifyUnsubscribe(token);
  const target = await unsubscribeTarget(payload);
  const t = await getTranslations("misc.unsubscribe");

  const isNewsletter = payload?.kind === "newsletter";
  const category = payload?.kind === "user" ? t(`categories.${payload.category}`) : "";
  const state = !payload || !target ? "invalid" : target.done ? "done" : "confirm";

  const icon = state === "invalid" ? "link_off" : state === "done" ? "mark_email_read" : "unsubscribe";
  const title = state === "invalid" ? t("invalidTitle") : state === "done" ? t("doneTitle") : t("title");
  const text =
    state === "invalid"
      ? t("invalid")
      : state === "done"
        ? isNewsletter
          ? t("newsletterDone")
          : t("done", { category })
        : isNewsletter
          ? t("newsletterConfirm")
          : t("confirm", { category });

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background flex flex-col">
      <div aria-hidden="true" className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary-fixed/40 blur-3xl pointer-events-none" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-24 w-[520px] h-[520px] rounded-full bg-secondary-fixed/50 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[1100px] mx-auto px-margin-mobile md:px-margin py-space-lg flex items-center justify-between gap-space-md">
        <LogoFull height={44} priority />
        <Suspense>
          <LanguageChip />
        </Suspense>
      </div>

      <div className="relative z-10 flex-1 w-full max-w-[560px] mx-auto px-margin-mobile md:px-margin pb-space-xl flex items-center">
        <section className="w-full bg-surface-container-lowest rounded-3xl p-space-lg md:p-space-xl shadow-[0_20px_48px_-12px_rgba(83,72,62,0.18)] flex flex-col gap-space-md">
          <span
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              state === "invalid" ? "bg-error-container text-on-error-container" : state === "done" ? "bg-primary-fixed text-primary" : "bg-secondary-fixed text-secondary"
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-3xl">
              {icon}
            </span>
          </span>
          <div className="flex flex-col gap-space-xs">
            <h1 className="font-headline-sm text-headline-sm text-on-surface">{title}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
            {state !== "invalid" && !isNewsletter && <p className="font-body-sm text-body-sm text-on-surface-variant">{t("always")}</p>}
          </div>

          {state === "confirm" && (
            <form action={confirmUnsubscribe}>
              <input name="t" type="hidden" value={token} />
              <button className={`${BTN.primary} w-full sm:w-auto`} type="submit">
                <span className="material-symbols-outlined text-xl">unsubscribe</span>
                {t("button")}
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-x-space-md gap-y-space-xs border-t border-[#EFE7DE] pt-space-md">
            {!isNewsletter && (
              <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/account/settings#email">
                {t("manage")}
              </Link>
            )}
            <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/">
              {t("home")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
