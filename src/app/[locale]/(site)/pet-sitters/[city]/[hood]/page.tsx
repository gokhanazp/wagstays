import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getFees } from "@/lib/settings";
import { buildLanding, getLandingCity, landingMetadata } from "@/lib/seo/landing";
import { LandingView } from "../../_components/LandingView";

// Rendered per request: the header reads the session cookie. (Static params would also need the [locale] segment.)

async function load(params: PageProps<"/[locale]/pet-sitters/[city]/[hood]">["params"]) {
  const { city, hood } = await params;
  const data = await getLandingCity(city);
  const n = data?.city.neighbourhoods.find((x) => x.slug === hood);
  return data && n ? buildLanding(data, n) : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/pet-sitters/[city]/[hood]">): Promise<Metadata> {
  // ISR page: take the locale from the URL (setRequestLocale) instead of request headers
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return landingMetadata(await load(params), locale);
}

export default async function HoodLandingPage({ params }: PageProps<"/[locale]/pet-sitters/[city]/[hood]">) {
  setRequestLocale((await params).locale as Locale);
  const l = await load(params);
  if (!l) notFound();
  const { vetCoverageCents } = await getFees();
  return <LandingView landing={l} vetCoverageCents={vetCoverageCents} />;
}
