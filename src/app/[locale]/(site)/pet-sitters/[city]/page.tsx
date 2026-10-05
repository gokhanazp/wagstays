import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getFees } from "@/lib/settings";
import { buildLanding, getLandingCity, landingMetadata } from "@/lib/seo/landing";
import { LandingView } from "../_components/LandingView";
import { cityParams } from "../_components/params";

export const revalidate = 3600;
export const generateStaticParams = cityParams;

async function load(params: PageProps<"/[locale]/pet-sitters/[city]">["params"]) {
  const { city } = await params;
  const data = await getLandingCity(city);
  return data ? buildLanding(data, null) : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/pet-sitters/[city]">): Promise<Metadata> {
  return landingMetadata(await load(params), await getLocale());
}

export default async function CityLandingPage({ params }: PageProps<"/[locale]/pet-sitters/[city]">) {
  const l = await load(params);
  if (!l) notFound();
  const { vetCoverageCents } = await getFees();
  return <LandingView landing={l} vetCoverageCents={vetCoverageCents} />;
}
