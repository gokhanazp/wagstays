import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "../AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to WagStays to manage bookings, message your sitter and keep your pets' details up to date.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getCurrentUser()) redirect(nextPath);
  return (
    <AuthShell eyebrow="Welcome back" subtitle="Log in to book trusted sitters, track walks live and manage your pets." title="Good to see you again!">
      <LoginForm linkError={error === "link"} next={nextPath} />
    </AuthShell>
  );
}
