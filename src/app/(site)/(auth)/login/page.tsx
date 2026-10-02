import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "../AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getCurrentUser()) redirect(nextPath);
  return (
    <AuthShell eyebrow="Welcome back" subtitle="Log in to book trusted sitters, track walks live and manage your pets." title="Good to see you again!">
      <LoginForm next={nextPath} />
    </AuthShell>
  );
}
