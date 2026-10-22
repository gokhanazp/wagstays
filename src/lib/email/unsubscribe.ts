import "server-only";
import { db } from "@/lib/db";
import { revalidatePath } from "@/i18n/revalidate";
import type { EmailCategory, UnsubscribeToken } from "./links";

// Shared by the /unsubscribe page (confirm button) and the RFC 8058 one-click endpoint (/api/email/unsubscribe).

const FIELD = { bookings: "emailBookings", messages: "emailMessages", reminders: "emailReminders" } as const satisfies Record<EmailCategory, string>;
const isCategory = (c: unknown): c is EmailCategory => typeof c === "string" && c in FIELD;

/** Validates the token's target (verifyUnsubscribe only checks the signature). Returns its locale and current state, or null. */
export async function unsubscribeTarget(t: UnsubscribeToken | null) {
  if (!t) return null;
  if (t.kind === "user" && typeof t.userId === "string" && isCategory(t.category)) {
    const u = await db.user.findUnique({ where: { id: t.userId }, select: { locale: true, emailBookings: true, emailMessages: true, emailReminders: true } });
    return u ? { locale: u.locale, done: !u[FIELD[t.category]] } : null;
  }
  if (t.kind === "newsletter" && typeof t.subscriberId === "string") {
    const s = await db.newsletterSubscriber.findUnique({ where: { id: t.subscriberId }, select: { locale: true, unsubscribedAt: true } });
    return s ? { locale: s.locale, done: !!s.unsubscribedAt } : null;
  }
  return null;
}

/** Applies a verified token. Idempotent; false if the user/subscriber no longer exists. */
export async function applyUnsubscribe(t: UnsubscribeToken): Promise<boolean> {
  if (t.kind === "user") {
    if (!isCategory(t.category)) return false;
    const { count } = await db.user.updateMany({ where: { id: t.userId }, data: { [FIELD[t.category]]: false } });
    if (count) revalidatePath("/account/settings");
    return count > 0;
  }
  if (t.kind === "newsletter") {
    const s = await db.newsletterSubscriber.findUnique({ where: { id: t.subscriberId }, select: { unsubscribedAt: true } });
    if (!s) return false;
    if (!s.unsubscribedAt) await db.newsletterSubscriber.update({ where: { id: t.subscriberId }, data: { unsubscribedAt: new Date() } });
    revalidatePath("/admin/newsletter");
    return true;
  }
  return false;
}
