import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "../AuthShell";
import { SignupForm } from "./SignupForm";
import { ReferralBanner } from "@/components/points/ReferralBanner";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";
import { getLocale, getTranslations } from "next-intl/server";
import { localeAlternates } from "@/lib/seo/site";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("auth.signup"), getLocale()]);
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: localeAlternates("/signup", locale) };
}

export default async function SignupPage({ searchParams }: PageProps<"/[locale]/signup">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getCurrentUser()) redirect(await localizedPath(nextPath));
  const t = await getTranslations("auth.signup");
  return (
    <AuthShell eyebrow={t("eyebrow")} subtitle={t("subtitle")} title={t("title")}>
      <ReferralBanner />
      <SignupForm next={nextPath} />
    </AuthShell>
  );
}
