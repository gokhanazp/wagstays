import type { Metadata } from "next";
import Link from "next/link";
import { findValidToken } from "@/lib/password-tokens";
import { getPlatformSettings } from "@/lib/settings";
import { AuthShell } from "../AuthShell";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata: Metadata = { title: "Set your password", robots: { index: false } };

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const row = await findValidToken(token);
  if (!row) {
    const { supportEmail } = await getPlatformSettings();
    return (
      <AuthShell eyebrow="Link expired" subtitle="Password links work once and expire after a short time." title="This link is no longer valid">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Please ask our team for a new link at{" "}
          <a className="font-label-lg text-label-lg text-primary hover:underline" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
          , or{" "}
          <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/login">
            log in
          </Link>{" "}
          if you already know your password.
        </p>
      </AuthShell>
    );
  }
  return (
    <AuthShell eyebrow="Account security" subtitle={`Choose a password for ${row.user.email}.`} title={`Welcome, ${row.user.firstName}!`}>
      <SetPasswordForm token={token} />
    </AuthShell>
  );
}
