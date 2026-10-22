"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailLinkTarget } from "@/lib/origin";
import { signOut } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { emit } from "@/lib/events";
import { getPlatformSettings } from "@/lib/settings";
import { REF_COOKIE, findReferrer, generateReferralCode } from "@/lib/referrals";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";
import { getLocale, getTranslations } from "next-intl/server";

type T = Awaited<ReturnType<typeof getTranslations<"auth.errors">>>;

export type AuthState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined>; checkEmail?: string; ok?: boolean; unconfirmedEmail?: string }
  | undefined;

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

const emailField = (t: T) => z.string().trim().toLowerCase().pipe(z.email(t("email")));

const SignupSchema = (t: T) =>
  z.object({
    firstName: z.string().trim().min(1, t("firstName")),
    lastName: z.string().trim().min(1, t("lastName")),
    email: emailField(t),
    password: z.string().min(8, t("passwordMin")),
    role: z.enum(["OWNER", "SITTER"]).default("OWNER"),
  });

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const t = await getTranslations("auth.errors");
  const parsed = SignupSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { email, password, firstName, lastName, role } = parsed.data;
  const next = safeNext(formData.get("next"));

  if (await db.user.findUnique({ where: { email } })) {
    return { fieldErrors: { email: [t("emailExists")] } };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // `locale` picks the language of Supabase's auth emails (templates read .Data.locale)
      data: { firstName, lastName, locale: await getLocale() },
      emailRedirectTo: await emailLinkTarget(next),
    },
  });
  if (error || !data.user) return { error: error?.message ?? t("createFailed") };
  // With email confirmation on, Supabase returns a user with no identities for an existing address.
  if (data.user.identities?.length === 0) {
    return { fieldErrors: { email: [t("emailExists")] } };
  }

  // Role is assigned here (server-side), never from user-editable auth metadata.
  // Referral: own share code + who invited them (ws_ref cookie from /r/<code>; unknown/self codes are ignored).
  const jar = await cookies();
  const referrer = await findReferrer(jar.get(REF_COOKIE)?.value);
  const referredById = referrer && referrer.id !== data.user.id ? referrer.id : null;
  // Optional manual vetting of new pet parents (sitters are vetted through their application instead).
  const approvalStatus = role === "OWNER" && (await getPlatformSettings()).requireOwnerApproval ? "PENDING" : "APPROVED";
  await db.user.create({ data: { id: data.user.id, email, firstName, lastName, role, approvalStatus, referralCode: await generateReferralCode(), referredById } });
  if (jar.has(REF_COOKIE)) jar.delete(REF_COOKIE);
  emit({ type: "user.signedUp", userId: data.user.id });

  if (!data.session) return { checkEmail: email };
  redirect(await localizedPath(next));
}

const LoginSchema = (t: T) =>
  z.object({
    email: emailField(t),
    password: z.string().min(1, t("passwordRequired")),
  });

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const t = await getTranslations("auth.errors");
  const parsed = LoginSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: t("unconfirmed"), unconfirmedEmail: parsed.data.email };
    }
    if (error.code === "user_banned") return { error: t("suspended") };
    return { error: t("badCredentials") };
  }
  // keep the auth-email language in step with the language the user signs in with
  const locale = await getLocale();
  const { data: current } = await supabase.auth.getUser();
  if (current.user && current.user.user_metadata?.locale !== locale) await supabase.auth.updateUser({ data: { locale } });
  const account = await db.user.findUnique({ where: { email: parsed.data.email }, select: { suspended: true } });
  redirect(await localizedPath(account?.suspended ? "/suspended" : safeNext(formData.get("next"))));
}

export async function logout() {
  await signOut();
  redirect(await localizedPath("/"));
}

const ForgotSchema = (t: T) => z.object({ email: emailField(t) });

/** Sends Supabase's password-reset email. Always reports success so addresses can't be probed. */
export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = ForgotSchema(await getTranslations("auth.errors")).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: await emailLinkTarget("/set-password"),
  });
  return { checkEmail: parsed.data.email };
}

/** Re-sends the sign-up confirmation email (e.g. when the first link expired or pointed at the wrong site). */
export async function resendConfirmation(_: AuthState, formData: FormData): Promise<AuthState> {
  const t = await getTranslations("auth.errors");
  const parsed = ForgotSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: await emailLinkTarget("/") },
  });
  if (error?.code === "over_email_send_rate_limit") return { error: t("rateLimited") };
  return { checkEmail: parsed.data.email };
}
