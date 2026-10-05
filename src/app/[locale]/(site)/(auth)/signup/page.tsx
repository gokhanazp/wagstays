import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "../AuthShell";
import { SignupForm } from "./SignupForm";
import { ReferralBanner } from "@/components/points/ReferralBanner";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a free WagStays account to book trusted pet sitters and dog walkers near you.",
  alternates: { canonical: "/signup" },
};

export default async function SignupPage({ searchParams }: PageProps<"/[locale]/signup">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getCurrentUser()) redirect(await localizedPath(nextPath));
  return (
    <AuthShell eyebrow="Join WagStays" subtitle="Toronto's community of verified, loving sitters and happy pet parents." title="Create your free account">
      <ReferralBanner />
      <SignupForm next={nextPath} />
    </AuthShell>
  );
}
