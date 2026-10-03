import "server-only";
import webpush from "web-push";
import { db } from "./db";

// Web Push (VAPID). Everything here is a no-op when the keys are missing, so the app works without push configured.

export type PushPayload = {
  title: string;
  body: string;
  /** Same-origin path opened when the notification is clicked, e.g. "/messages/abc". */
  url: string;
  /** Notifications with the same tag replace each other on the device (collapse duplicates). */
  tag?: string;
};

/** Public key for the browser's pushManager.subscribe(); null when push isn't configured. */
export function vapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

let configured: boolean | null = null;

/** Configures web-push once. Returns false (and never throws) when the VAPID env vars are missing/invalid. */
export function pushEnabled(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@wagstays.ca";
  if (!pub || !priv) return (configured = false);
  try {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  } catch (e) {
    console.error("[push] invalid VAPID configuration:", e);
    configured = false;
  }
  return configured;
}

/** Test seam: replaced in tests to capture payloads without hitting a push service. */
export const pushTransport = {
  send: (sub: webpush.PushSubscription, payload: string, options: webpush.RequestOptions) =>
    webpush.sendNotification(sub, payload, options),
};

/**
 * Sends a notification to every device the user subscribed. Subscriptions the push service reports as gone
 * (404/410) are deleted. Returns how many deliveries were accepted. Never throws.
 */
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  if (process.env.PUSH_DEBUG === "1") console.log("[push] sendPush", userId, JSON.stringify(payload));
  if (!pushEnabled()) return 0;

  const subs = await db.pushSubscription.findMany({ where: { userId }, select: { id: true, endpoint: true, p256dh: true, auth: true } });
  if (subs.length === 0) return 0;

  const body = JSON.stringify({
    title: payload.title.slice(0, 80),
    body: payload.body.slice(0, 180),
    url: payload.url.startsWith("/") ? payload.url : "/",
    tag: payload.tag,
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await pushTransport.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24, urgency: "normal", timeout: 10_000 });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription.deleteMany({ where: { id: s.id } });
        } else {
          console.error(`[push] delivery failed (${status ?? "network"}):`, (e as Error).message);
        }
      }
    }),
  );
  return sent;
}
