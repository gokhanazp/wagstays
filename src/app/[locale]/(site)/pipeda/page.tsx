import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localePrefix } from "@/i18n/routing";
import { localeAlternates } from "@/lib/seo/site";
import { getPlatformSettings } from "@/lib/settings";
import { LegalDocument, type LegalSection } from "../terms/_components/LegalDocument";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("legal.pipeda.meta"), getLocale()]);
  return { title: t("title"), description: t("description"), alternates: localeAlternates("/pipeda", locale) };
}

export default async function PipedaPage() {
  const [{ supportEmail: email, supportPhone: phone }, t, locale] = await Promise.all([getPlatformSettings(), getTranslations("legal.pipeda"), getLocale()]);
  const tags = {
    em: (c: ReactNode) => <em>{c}</em>,
    privacy: (c: ReactNode) => <Link href="/privacy">{c}</Link>,
    settings: (c: ReactNode) => <Link href="/account/settings">{c}</Link>,
    // Route handler (JSON file download), so a plain link rather than client-side navigation
    export: (c: ReactNode) => <a href={`${localePrefix(locale)}/account/data-export`}>{c}</a>,
    opc: (c: ReactNode) => (
      <a href="https://www.priv.gc.ca" rel="noopener noreferrer" target="_blank">
        {c}
      </a>
    ),
    mail: (c: ReactNode) => <a href={`mailto:${email}?subject=${encodeURIComponent(t("privacyOfficer.mailSubject"))}`}>{c}</a>,
  };

  const sections: LegalSection[] = [
    { id: "accountability", title: t("accountability.title"), body: <p>{t("accountability.p1")}</p> },
    { id: "purposes", title: t("purposes.title"), body: <p>{t.rich("purposes.p1", tags)}</p> },
    { id: "consent", title: t("consent.title"), body: <p>{t("consent.p1")}</p> },
    { id: "limiting-collection", title: t("limitingCollection.title"), body: <p>{t("limitingCollection.p1")}</p> },
    { id: "limiting-use", title: t("limitingUse.title"), body: <p>{t("limitingUse.p1")}</p> },
    { id: "accuracy", title: t("accuracy.title"), body: <p>{t("accuracy.p1")}</p> },
    { id: "safeguards", title: t("safeguards.title"), body: <p>{t("safeguards.p1")}</p> },
    { id: "openness", title: t("openness.title"), body: <p>{t("openness.p1")}</p> },
    {
      id: "access",
      title: t("access.title"),
      body: (
        <>
          <p>{t.rich("access.p1", tags)}</p>
          <p>{t("access.p2")}</p>
        </>
      ),
    },
    { id: "challenging", title: t("challenging.title"), body: <p>{t.rich("challenging.p1", tags)}</p> },
    {
      id: "privacy-officer",
      title: t("privacyOfficer.title"),
      body: (
        <div className="bg-surface-container-lowest rounded-2xl border border-[#EFE7DE] p-space-lg flex flex-col gap-space-xs">
          <strong className="font-title-md text-title-md">{t("privacyOfficer.name")}</strong>
          <span>{t("privacyOfficer.location")}</span>
          <span>{t.rich("privacyOfficer.email", { ...tags, email })}</span>
          <span>{t("privacyOfficer.phone", { phone })}</span>
          <span className="font-body-sm text-body-sm">{t("privacyOfficer.subjectHint")}</span>
        </div>
      ),
    },
  ];

  return <LegalDocument current="/pipeda" intro={<p>{t.rich("intro", tags)}</p>} sections={sections} title={t("meta.title")} />;
}
