"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";

export type AuthState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

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

  if (await db.user.findUnique({ where: { email } })) {
    return { fieldErrors: { email: ["An account with this email already exists."] } };
  }
  const user = await db.user.create({
    data: { email, firstName, lastName, role, passwordHash: await bcrypt.hash(password, 10) },
  });
  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email.")),
  password: z.string().min(1, "Please enter your password."),
});

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "That email and password don't match our records." };
  }
  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
