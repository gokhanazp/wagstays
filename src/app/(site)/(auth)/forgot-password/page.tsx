import type { Metadata } from "next";
import { AuthShell } from "../AuthShell";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell eyebrow="Account security" subtitle="Enter the email you use for WagStays and we'll send you a reset link." title="Forgot your password?">
      <ForgotForm />
    </AuthShell>
  );
}
