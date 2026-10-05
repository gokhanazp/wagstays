"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@/lib/db";

export type NewsletterState = { ok?: boolean; error?: string } | undefined;

export async function subscribe(_: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: (await getTranslations("common.newsletter"))("invalidEmail") };
  await db.newsletterSubscriber.upsert({ where: { email: email.data }, create: { email: email.data }, update: {} });
  return { ok: true };
}
