import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { LanguageChip } from "@/components/LanguageSwitcher";
import { LogoFull } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import type { Locale } from "@/i18n/routing";

// Pre-launch landing shown (via the proxy) to everyone without the team access link. Lives outside (site) so it
// has no header/footer and no links into the gated app.

// rendered per request: the proxy rewrites every gated URL here, so a cached copy could serve the wrong language
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "misc.comingSoon" });
  return { title: t("metaTitle"), description: t("text"), robots: { index: false, follow: false } };
}

const FEATURES = [
  { key: "verified", icon: "verified_user" },
  { key: "meet", icon: "handshake" },
  { key: "prices", icon: "sell" },
] as const;

export default async function ComingSoonPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("misc.comingSoon");
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

      <div className="relative z-10 flex-1 w-full max-w-[1100px] mx-auto px-margin-mobile md:px-margin pb-space-xl grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-space-xl items-center">
        <section className="flex flex-col gap-space-lg">
          <span className="self-start inline-flex items-center gap-2 px-space-md py-1.5 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md shadow-sm">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-primary" />
            </span>
            {t("badge")}
          </span>
          <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-surface">
            {t("title")} <span className="text-secondary">{t("titleAccent")}</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">{t("text")}</p>
          <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-space-sm">
            {FEATURES.map((f) => (
              <li className="inline-flex items-center gap-2 px-space-md py-2 rounded-full bg-surface-container-lowest/80 font-label-lg text-label-lg text-on-surface shadow-sm" key={f.key}>
                <span className="material-symbols-outlined text-xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {f.icon}
                </span>
                {t(`features.${f.key}`)}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-surface-container-lowest rounded-3xl p-space-lg md:p-space-xl shadow-[0_20px_48px_-12px_rgba(83,72,62,0.18)] flex flex-col gap-space-md">
          <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary-container to-secondary text-white flex items-center justify-center">
            <span aria-hidden="true" className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              notifications_active
            </span>
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{t("notifyTitle")}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">{t("notifyText")}</p>
          </div>
          <NewsletterForm />
          <p className="font-body-sm text-body-sm text-on-surface-variant border-t border-[#EFE7DE] pt-space-md flex items-start gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-lg text-primary">volunteer_activism</span>
            {t("becomeSitter")}
          </p>
        </section>
      </div>

      <footer className="relative z-10 py-space-md text-center font-body-sm text-body-sm text-on-surface-variant">{t("copyright")}</footer>
    </main>
  );
}
