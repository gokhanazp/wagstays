import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "../AuthShell";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata: Metadata = { title: "Set your password", robots: { index: false } };

// Reached through /auth/callback or /auth/confirm, which sign the user in from the emailed / admin link.
export default async function SetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <AuthShell eyebrow="Link expired" subtitle="Password links work once and expire after a short time." title="This link is no longer valid">
        <p className="font-body-md text-body-md text-on-surface-variant">
          <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/forgot-password">
            Request a new link
          </Link>{" "}
          or{" "}
          <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/login">
            log in
          </Link>{" "}
          if you already know your password.
        </p>
      </AuthShell>
    );
  }
  return (
    <AuthShell eyebrow="Account security" subtitle={`Choose a new password for ${user.email}.`} title={`Welcome, ${user.firstName}!`}>
      <SetPasswordForm />
    </AuthShell>
  );
}
