import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "../AuthShell";
import { SetPasswordForm } from "./SetPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.setPassword");
  return { title: t("metaTitle"), robots: { index: false } };
}

// Reached through /auth/callback or /auth/confirm, which sign the user in from the emailed / admin link.
export default async function SetPasswordPage() {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations("auth.setPassword")]);
  if (!user) {
    return (
      <AuthShell eyebrow={t("expiredEyebrow")} subtitle={t("expiredSubtitle")} title={t("expiredTitle")}>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t.rich("expiredText", {
            request: (c) => (
              <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/forgot-password">
                {c}
              </Link>
            ),
            login: (c) => (
              <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/login">
                {c}
              </Link>
            ),
          })}
        </p>
      </AuthShell>
    );
  }
  return (
    <AuthShell eyebrow={t("eyebrow")} subtitle={t("subtitle", { email: user.email })} title={t("title", { name: user.firstName })}>
      <SetPasswordForm />
    </AuthShell>
  );
}
