"use server";

import { z } from "zod";
import { db } from "@/lib/db";

export type NewsletterState = { ok?: boolean; error?: string } | undefined;

export async function subscribe(_: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Please enter a valid email." };
  await db.newsletterSubscriber.upsert({ where: { email: email.data }, create: { email: email.data }, update: {} });
  return { ok: true };
}
