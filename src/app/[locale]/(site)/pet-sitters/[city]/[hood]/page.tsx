import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFees } from "@/lib/settings";
import { buildLanding, getLandingCity, landingMetadata } from "@/lib/seo/landing";
import { LandingView } from "../../_components/LandingView";
import { hoodParams } from "../../_components/params";

export const revalidate = 3600;
export const generateStaticParams = hoodParams;

async function load(params: PageProps<"/[locale]/pet-sitters/[city]/[hood]">["params"]) {
  const { city, hood } = await params;
  const data = await getLandingCity(city);
  const n = data?.city.neighbourhoods.find((x) => x.slug === hood);
  return data && n ? buildLanding(data, n) : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/pet-sitters/[city]/[hood]">): Promise<Metadata> {
  return landingMetadata(await load(params));
}

export default async function HoodLandingPage({ params }: PageProps<"/[locale]/pet-sitters/[city]/[hood]">) {
  const l = await load(params);
  if (!l) notFound();
  const { vetCoverageCents } = await getFees();
  return <LandingView landing={l} vetCoverageCents={vetCoverageCents} />;
}
