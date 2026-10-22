"use server";

import { after } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendNewsletterWelcome } from "@/lib/email/newsletter";

export type NewsletterState = { ok?: boolean; error?: string } | undefined;

const SOURCES = ["coming-soon", "footer"] as const;

/**
 * CASL express consent: we keep when (createdAt), where (source), in which language (locale) and the exact sentence
 * shown under the form (consentText). Re-subscribing after an unsubscribe records fresh consent.
 */
export async function subscribe(_: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const t = await getTranslations("common.newsletter");
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: t("invalidEmail") };
  const locale = (await getLocale()) === "fr" ? "fr" : "en";
  const rawSource = String(formData.get("source") ?? "");
  const source = (SOURCES as readonly string[]).includes(rawSource) ? rawSource : null;
  const consent = { locale, source, consentText: t("consent") };

  const existing = await db.newsletterSubscriber.findUnique({ where: { email: email.data }, select: { id: true, unsubscribedAt: true } });
  if (existing && !existing.unsubscribedAt) return { ok: true }; // already subscribed: no second welcome email

  let id: string;
  if (existing) {
    ({ id } = await db.newsletterSubscriber.update({ where: { id: existing.id }, data: { ...consent, unsubscribedAt: null, createdAt: new Date() }, select: { id: true } }));
  } else {
    try {
      ({ id } = await db.newsletterSubscriber.create({ data: { email: email.data, ...consent }, select: { id: true } }));
    } catch {
      return { ok: true }; // a parallel submit won the unique-email race — that one sends the email
    }
  }

  const to = email.data;
  after(() => sendNewsletterWelcome(id, to, locale));
  return { ok: true };
}
