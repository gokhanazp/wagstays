import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "../AuthShell";
import { LoginForm } from "./LoginForm";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";
import { getLocale, getTranslations } from "next-intl/server";
import { localeAlternates } from "@/lib/seo/site";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("auth.login"), getLocale()]);
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: localeAlternates("/login", locale) };
}

export default async function LoginPage({ searchParams }: PageProps<"/[locale]/login">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getCurrentUser()) redirect(await localizedPath(nextPath));
  const t = await getTranslations("auth.login");
  return (
    <AuthShell eyebrow={t("eyebrow")} subtitle={t("subtitle")} title={t("title")}>
      <LoginForm linkError={error === "link"} next={nextPath} />
    </AuthShell>
  );
}
