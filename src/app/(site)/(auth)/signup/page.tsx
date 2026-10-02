import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "../AuthShell";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getCurrentUser()) redirect(nextPath);
  return (
    <AuthShell eyebrow="Join WagStays" subtitle="Toronto's community of verified, loving sitters and happy pet parents." title="Create your free account">
      <SignupForm next={nextPath} />
    </AuthShell>
  );
}
