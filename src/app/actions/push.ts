"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "@/i18n/revalidate";
import { z } from "zod";
import { db } from "@/lib/db";
import { pushEnabled, sendPush } from "@/lib/push";
import { getCurrentUser } from "@/lib/session";

// Web Push subscriptions for the signed-in user. Every action re-checks the session and only touches the
// caller's own subscriptions (an endpoint belonging to someone else is re-assigned only when that same browser
// subscribes again, which proves possession of the push endpoint).

export type PushDevice = { id: string; label: string; createdAt: string; endpoint: string };
export type PushResult = { ok: true; message?: string } | { ok: false; error: string };

const MAX_DEVICES = 10;

const subscribeSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({
    p256dh: z.string().min(20).max(200).regex(/^[A-Za-z0-9_=-]+$/),
    auth: z.string().min(8).max(100).regex(/^[A-Za-z0-9_=-]+$/),
  }),
  userAgent: z.string().max(300).optional(),
});
const endpointSchema = z.url({ protocol: /^https$/ }).max(1000);
const idSchema = z.string().min(1).max(64);

const tr = () => getTranslations("account.errors");

async function activeUser() {
  const user = await getCurrentUser();
  return user && !user.suspended ? user : null;
}

/** Short human label from a user agent, e.g. "Chrome on Android". */
function deviceLabel(ua: string | null, t: Awaited<ReturnType<typeof tr>>): string {
  if (!ua) return t("push.unknownDevice");
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux|CrOS/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : t("push.browser");
  return os ? t("push.deviceOn", { browser, os }) : browser;
}

export async function subscribePush(input: unknown): Promise<PushResult> {
  const t = await tr();
  const user = await activeUser();
  if (!user) return { ok: false, error: t("signInAgain") };
  if (!pushEnabled()) return { ok: false, error: t("push.unavailable") };
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("push.invalidSubscription") };
  const { endpoint, keys, userAgent } = parsed.data;

  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent ?? null },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent ?? null },
  });
  // Keep the device list bounded: drop the oldest beyond the limit.
  const extra = await db.pushSubscription.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, skip: MAX_DEVICES, select: { id: true } });
  if (extra.length) await db.pushSubscription.deleteMany({ where: { id: { in: extra.map((e) => e.id) }, userId: user.id } });

  revalidatePath("/account/settings");
  return { ok: true, message: t("push.on") };
}

/** Removes this browser's subscription (by endpoint). */
export async function unsubscribePush(endpoint: unknown): Promise<PushResult> {
  const t = await tr();
  const user = await activeUser();
  if (!user) return { ok: false, error: t("signInAgain") };
  const parsed = endpointSchema.safeParse(endpoint);
  if (!parsed.success) return { ok: false, error: t("push.invalidDevice") };
  await db.pushSubscription.deleteMany({ where: { endpoint: parsed.data, userId: user.id } });
  revalidatePath("/account/settings");
  return { ok: true, message: t("push.off") };
}

/** Removes one of the caller's devices from the list. */
export async function removePushDevice(id: unknown): Promise<PushResult> {
  const t = await tr();
  const user = await activeUser();
  if (!user) return { ok: false, error: t("signInAgain") };
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: t("push.invalidDevice") };
  const res = await db.pushSubscription.deleteMany({ where: { id: parsed.data, userId: user.id } });
  revalidatePath("/account/settings");
  return res.count ? { ok: true, message: t("push.removed") } : { ok: false, error: t("push.notFound") };
}

export async function listPushDevices(): Promise<PushDevice[]> {
  const user = await activeUser();
  if (!user) return [];
  const t = await tr();
  const subs = await db.pushSubscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, endpoint: true, userAgent: true, createdAt: true },
  });
  return subs.map((s) => ({ id: s.id, endpoint: s.endpoint, label: deviceLabel(s.userAgent, t), createdAt: s.createdAt.toISOString() }));
}

/** Sends a test notification to all of the caller's devices. */
export async function sendTestPush(): Promise<PushResult> {
  const t = await tr();
  const user = await activeUser();
  if (!user) return { ok: false, error: t("signInAgain") };
  if (!pushEnabled()) return { ok: false, error: t("push.unavailable") };
  const sent = await sendPush(user.id, { title: "WagStays notifications are on 🐾", body: "You'll hear about bookings and messages here.", url: "/account/settings", tag: "test" });
  revalidatePath("/account/settings");
  return sent > 0 ? { ok: true, message: t("push.testSent", { count: sent }) } : { ok: false, error: t("push.unreachable") };
}

/** Lightweight status for the post-login prompt: is the visitor signed in and is push configured? */
export async function pushPromptStatus(): Promise<{ eligible: boolean }> {
  const user = await activeUser();
  return { eligible: !!user && pushEnabled() };
}
