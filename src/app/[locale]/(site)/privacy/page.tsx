import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localePrefix } from "@/i18n/routing";
import { localeAlternates } from "@/lib/seo/site";
import { getPlatformSettings } from "@/lib/settings";
import { LegalDocument, type LegalSection } from "../terms/_components/LegalDocument";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("legal.privacy.meta"), getLocale()]);
  return { title: t("title"), description: t("description"), alternates: localeAlternates("/privacy", locale) };
}

export default async function PrivacyPage() {
  const [{ supportEmail: email, supportPhone: phone }, t, locale] = await Promise.all([getPlatformSettings(), getTranslations("legal.privacy"), getLocale()]);
  const tags = {
    b: (c: ReactNode) => <strong>{c}</strong>,
    em: (c: ReactNode) => <em>{c}</em>,
    pipeda: (c: ReactNode) => <Link href="/pipeda">{c}</Link>,
    settings: (c: ReactNode) => <Link href="/account/settings">{c}</Link>,
    // Route handler (JSON file download), so a plain link rather than client-side navigation
    export: (c: ReactNode) => <a href={`${localePrefix(locale)}/account/data-export`}>{c}</a>,
    mail: (c: ReactNode) => <a href={`mailto:${email}`}>{c}</a>,
  };

  const sections: LegalSection[] = [
    {
      id: "scope",
      title: t("scope.title"),
      body: <p>{t.rich("scope.p1", tags)}</p>,
    },
    {
      id: "collect",
      title: t("collect.title"),
      body: (
        <>
          <p><strong>{t("collect.given")}</strong></p>
          <ul>
            <li>{t("collect.given1")}</li>
            <li>{t("collect.given2")}</li>
            <li>{t("collect.given3")}</li>
            <li>{t("collect.given4")}</li>
          </ul>
          <p><strong>{t("collect.auto")}</strong></p>
          <ul>
            <li>{t("collect.auto1")}</li>
            <li>{t("collect.auto2")}</li>
            <li>{t("collect.auto3")}</li>
          </ul>
          <p>{t("collect.cards")}</p>
        </>
      ),
    },
    {
      id: "use",
      title: t("use.title"),
      body: (
        <ul>
          <li>{t("use.li1")}</li>
          <li>{t("use.li2")}</li>
          <li>{t("use.li3")}</li>
          <li>{t("use.li4")}</li>
          <li>{t("use.li5")}</li>
          <li>{t("use.li6")}</li>
        </ul>
      ),
    },
    {
      id: "share",
      title: t("share.title"),
      body: (
        <>
          <p>{t("share.p1")}</p>
          <ul>
            <li>{t.rich("share.li1", tags)}</li>
            <li>{t.rich("share.li2", tags)}</li>
            <li>{t.rich("share.li3", tags)}</li>
            <li>{t.rich("share.li4", tags)}</li>
          </ul>
        </>
      ),
    },
    {
      id: "transfers",
      title: t("transfers.title"),
      body: <p>{t("transfers.p1")}</p>,
    },
    {
      id: "retention",
      title: t("retention.title"),
      body: <p>{t("retention.p1")}</p>,
    },
    {
      id: "security",
      title: t("security.title"),
      body: <p>{t("security.p1")}</p>,
    },
    {
      id: "rights",
      title: t("rights.title"),
      body: (
        <ul>
          <li>{t.rich("rights.li1", tags)}</li>
          <li>{t("rights.li2")}</li>
          <li>{t.rich("rights.li3", tags)}</li>
          <li>{t("rights.li4")}</li>
        </ul>
      ),
    },
    {
      id: "children",
      title: t("children.title"),
      body: <p>{t("children.p1")}</p>,
    },
    {
      id: "contact",
      title: t("contact.title"),
      body: (
        <>
          <p>{t("contact.p1")}</p>
          <p>{t.rich("contact.p2", { ...tags, email, phone })}</p>
        </>
      ),
    },
  ];

  return <LegalDocument current="/privacy" intro={<p>{t("intro")}</p>} sections={sections} title={t("meta.title")} />;
}
