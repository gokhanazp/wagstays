"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/origin";
import { signOut } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined>; checkEmail?: string; ok?: boolean }
  | undefined;

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

const SignupSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name."),
  lastName: z.string().trim().min(1, "Please enter your last name."),
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email.")),
  password: z.string().min(8, "Use at least 8 characters."),
  role: z.enum(["OWNER", "SITTER"]).default("OWNER"),
});

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { email, password, firstName, lastName, role } = parsed.data;
  const next = safeNext(formData.get("next"));

  if (await db.user.findUnique({ where: { email } })) {
    return { fieldErrors: { email: ["An account with this email already exists."] } };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { firstName, lastName },
      emailRedirectTo: `${await getOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.user) return { error: error?.message ?? "We couldn't create your account. Please try again." };
  // With email confirmation on, Supabase returns a user with no identities for an existing address.
  if (data.user.identities?.length === 0) {
    return { fieldErrors: { email: ["An account with this email already exists."] } };
  }

  // Role is assigned here (server-side), never from user-editable auth metadata.
  await db.user.create({ data: { id: data.user.id, email, firstName, lastName, role } });

  if (!data.session) return { checkEmail: email };
  redirect(next);
}

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email.")),
  password: z.string().min(1, "Please enter your password."),
});

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Please confirm your email first — check your inbox for the link." };
    if (error.code === "user_banned") return { error: "This account is suspended. Please contact support@wagstays.ca." };
    return { error: "That email and password don't match our records." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await signOut();
  redirect("/");
}

const ForgotSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email.")) });

/** Sends Supabase's password-reset email. Always reports success so addresses can't be probed. */
export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = ForgotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getOrigin()}/auth/callback?next=/set-password`,
  });
  return { checkEmail: parsed.data.email };
}
