import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { baseMetadata, RootDocument } from "@/app/_root/RootDocument";
import { routing } from "@/i18n/routing";

export const viewport: Viewport = { themeColor: "#226150" };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : "en", namespace: "common.meta" });
  return {
    ...baseMetadata,
    openGraph: { ...baseMetadata.openGraph, locale: locale === "fr" ? "fr_CA" : "en_CA" },
    title: { default: t("defaultTitle"), template: "%s · WagStays" },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <RootDocument locale={locale}>{children}</RootDocument>;
}
