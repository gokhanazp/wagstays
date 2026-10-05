import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { VET_COVERAGE_CENTS } from "@/lib/constants";
import { LanguageChip } from "./LanguageSwitcher";
import { LogoMark, Wordmark } from "./Logo";
import { NewsletterForm } from "./NewsletterForm";
import { popularNeighbourhoods } from "@/lib/seo/landing";

const SOCIAL = [
  { label: "website", icon: "public" },
  { label: "share", icon: "share" },
  { label: "photos", icon: "photo_camera" },
] as const;

const SERVICES = [
  { label: "dogWalking", href: "/sitters?service=dog-walking" },
  { label: "catVisits", href: "/sitters?service=drop-in" },
  { label: "boarding", href: "/sitters?service=boarding" },
  { label: "dayCare", href: "/sitters?service=day-care" },
  { label: "petTaxi", href: "/sitters" },
  { label: "pricing", href: "/pricing" },
] as const;

const TRUST: { icon: string; label: "vetCover" | "verified" | "support" | "payments"; href?: string }[] = [
  { icon: "health_and_safety", label: "vetCover" },
  { icon: "verified_user", label: "verified" },
  { icon: "support_agent", label: "support", href: "/account/support/new" },
  { icon: "lock", label: "payments" },
];

export async function Footer() {
  const [hoods, t, locale] = await Promise.all([popularNeighbourhoods(), getTranslations("common.footer"), getLocale()]);
  return (
    <footer className="w-full bg-surface-container-low mt-space-xl pt-space-xl pb-space-lg">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-xl pb-space-xl">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm">
              <LogoMark className="w-8 h-8" />
              <Wordmark className="!text-headline-sm" />
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              {t("tagline")}
            </p>
            <div className="flex items-center gap-space-sm pt-space-xs">
              {SOCIAL.map((s) => (
                <a
                  key={s.icon}
                  aria-label={t(`social.${s.label}`)}
                  className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container transition-all"
                  href="#"
                >
                  <span className="material-symbols-outlined text-lg">{s.icon}</span>
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-space-sm">
            <h3 className="font-title-md text-title-md text-on-surface">{t("ourServices")}</h3>
            <ul className="flex flex-col gap-space-xs">
              {SERVICES.map((s) => (
                <li key={s.label} className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">
                  <Link href={s.href}>{t(`services.${s.label}`)}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-space-sm">
            <h3 className="font-title-md text-title-md text-on-surface">{t("safety")}</h3>
            <div className="flex flex-col gap-space-sm">
              {TRUST.map((item) => {
                const inner = (
                  <>
                    <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                    <span className="font-label-md text-label-md text-on-surface">
                      {t(`trust.${item.label}`, { amount: formatMoney(VET_COVERAGE_CENTS, { locale }) })}
                    </span>
                  </>
                );
                const cls = "flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container";
                return item.href ? (
                  <Link key={item.icon} className={`${cls} hover:bg-surface-container-high transition-colors`} href={item.href}>
                    {inner}
                  </Link>
                ) : (
                  <div key={item.icon} className={cls}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-space-md">
            <div className="p-space-md rounded-2xl bg-surface-container flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-xl">mark_email_read</span>
                <span className="font-title-md text-title-md text-on-surface">{t("newsletterTitle")}</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {t("newsletterText")}
              </p>
              <NewsletterForm />
            </div>
          </div>
        </div>
        {hoods.length > 0 && (
          <nav aria-label={t("popularHoods")} className="pb-space-lg flex flex-col gap-space-sm">
            <h3 className="font-title-md text-title-md text-on-surface">{t("popularHoods")}</h3>
            <ul className="flex flex-wrap gap-x-space-md gap-y-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <Link className="hover:text-primary transition-colors" href={hoods[0].cityHref}>
                  {t("sittersIn", { city: hoods[0].cityName })}
                </Link>
              </li>
              {hoods.map((h) => (
                <li key={h.href}>
                  <Link className="hover:text-primary transition-colors" href={h.href}>
                    {h.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex flex-col sm:flex-row items-center gap-space-md">
            <Suspense>
              <LanguageChip />
            </Suspense>
            <span className="font-body-sm text-body-sm text-on-surface-variant text-center">
              {t("copyright")}
            </span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-space-md font-label-sm text-label-sm text-on-surface-variant">
            <Link className="hover:text-on-surface transition-colors" href="/terms">
              {t("terms")}
            </Link>
            <Link className="hover:text-on-surface transition-colors" href="/privacy">
              {t("privacy")}
            </Link>
            <Link className="hover:text-on-surface transition-colors" href="/pipeda">
              {t("pipeda")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
