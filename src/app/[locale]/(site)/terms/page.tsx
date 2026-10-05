import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { localeAlternates } from "@/lib/seo/site";
import { getPlatformSettings } from "@/lib/settings";
import { LegalDocument, type LegalSection } from "./_components/LegalDocument";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("legal.terms.meta"), getLocale()]);
  return { title: t("title"), description: t("description"), alternates: localeAlternates("/terms", locale) };
}

export default async function TermsPage() {
  const [s, t, locale] = await Promise.all([getPlatformSettings(), getTranslations("legal.terms"), getLocale()]);
  const email = s.supportEmail;
  const tags = {
    b: (c: ReactNode) => <strong>{c}</strong>,
    em: (c: ReactNode) => <em>{c}</em>,
    privacy: (c: ReactNode) => <Link href="/privacy">{c}</Link>,
    mail: (c: ReactNode) => <a href={`mailto:${email}`}>{c}</a>,
  };

  const sections: LegalSection[] = [
    {
      id: "about",
      title: t("about.title"),
      body: (
        <>
          <p>{t.rich("about.p1", tags)}</p>
          <p>{t.rich("about.p2", tags)}</p>
        </>
      ),
    },
    {
      id: "marketplace",
      title: t("marketplace.title"),
      body: (
        <>
          <p>{t("marketplace.p1")}</p>
          <p>{t("marketplace.p2")}</p>
        </>
      ),
    },
    {
      id: "accounts",
      title: t("accounts.title"),
      body: (
        <ul>
          <li>{t("accounts.li1")}</li>
          <li>{t("accounts.li2")}</li>
          <li>{t("accounts.li3")}</li>
        </ul>
      ),
    },
    {
      id: "bookings",
      title: t("bookings.title"),
      body: (
        <>
          <p>
            {t.rich("bookings.p1", {
              ...tags,
              serviceFee: formatMoney(s.serviceFeeCents, { exact: true, locale }),
              wagShieldFee: formatMoney(s.wagShieldFeeCents, { exact: true, locale }),
            })}
          </p>
          <p>{t("bookings.p2")}</p>
          <p>{t("bookings.p3")}</p>
        </>
      ),
    },
    {
      id: "cancellations",
      title: t("cancellations.title"),
      body: (
        <>
          <p>{t("cancellations.p1")}</p>
          <p>{t.rich("cancellations.p2", tags)}</p>
        </>
      ),
    },
    {
      id: "conduct",
      title: t("conduct.title"),
      body: (
        <>
          <p>{t.rich("conduct.owners", tags)}</p>
          <p>{t.rich("conduct.sitters", tags)}</p>
          <p>{t("conduct.everyone")}</p>
          <ul>
            <li>{t("conduct.li1")}</li>
            <li>{t("conduct.li2")}</li>
            <li>{t("conduct.li3")}</li>
            <li>{t("conduct.li4")}</li>
          </ul>
        </>
      ),
    },
    {
      id: "messaging",
      title: t("messaging.title"),
      body: <p>{t("messaging.p1")}</p>,
    },
    {
      id: "wagshield",
      title: t("wagshield.title"),
      body: <p>{t("wagshield.p1", { coverage: formatMoney(s.vetCoverageCents, { locale }) })}</p>,
    },
    {
      id: "liability",
      title: t("liability.title"),
      body: (
        <>
          <p>{t("liability.p1")}</p>
          <p>{t("liability.p2")}</p>
        </>
      ),
    },
    {
      id: "termination",
      title: t("termination.title"),
      body: <p>{t("termination.p1")}</p>,
    },
    {
      id: "law",
      title: t("law.title"),
      body: <p>{t("law.p1")}</p>,
    },
    {
      id: "changes",
      title: t("changes.title"),
      body: (
        <>
          <p>{t("changes.p1")}</p>
          <p>{t.rich("changes.p2", { ...tags, email, phone: s.supportPhone })}</p>
        </>
      ),
    },
  ];

  return <LegalDocument current="/terms" intro={<p>{t("intro")}</p>} sections={sections} title={t("meta.title")} />;
}
