import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "../AuthShell";
import { ForgotForm } from "./ForgotForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgot");
  return (
    <AuthShell eyebrow={t("eyebrow")} subtitle={t("subtitle")} title={t("title")}>
      <ForgotForm />
    </AuthShell>
  );
}
