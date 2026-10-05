import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "../AuthShell";
import { LoginForm } from "./LoginForm";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to WagStays to manage bookings, message your sitter and keep your pets' details up to date.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({ searchParams }: PageProps<"/[locale]/login">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getCurrentUser()) redirect(await localizedPath(nextPath));
  return (
    <AuthShell eyebrow="Welcome back" subtitle="Log in to book trusted sitters, track walks live and manage your pets." title="Good to see you again!">
      <LoginForm linkError={error === "link"} next={nextPath} />
    </AuthShell>
  );
}
