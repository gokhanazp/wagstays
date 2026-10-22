import "server-only";
import { db } from "@/lib/db";
import type { EmailCategory } from "./links";

export type Recipient = { id: string; email: string; firstName: string; locale: string; prefs: Record<EmailCategory, boolean> };

/** The user as an email recipient, or null if they can't be emailed (closed account). */
export async function getRecipient(userId: string): Promise<Recipient | null> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, locale: true, deletedAt: true, emailBookings: true, emailMessages: true, emailReminders: true },
  });
  if (!u || u.deletedAt) return null;
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    locale: u.locale,
    prefs: { bookings: u.emailBookings, messages: u.emailMessages, reminders: u.emailReminders },
  };
}

/** Whether a recipient wants this category of notification email. */
export const wants = (r: Recipient, c: EmailCategory) => r.prefs[c];
