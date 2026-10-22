import "server-only";
import { after } from "next/server";
import { db } from "@/lib/db";
import { intlLocale } from "@/i18n/routing";
import { mailLocale, mailT } from "@/lib/email/i18n";
import { emailUrl, unsubscribeUrl } from "@/lib/email/links";
import { getRecipient, wants } from "@/lib/email/recipients";
import { sendEmail, wasSent } from "@/lib/email/send";
import { MEET_GREET_TZ, formatTime } from "@/lib/meet-greet";
import { getPlatformSettings } from "@/lib/settings";
import { ACTIVE_WINDOW_MS } from "./notifications";
import type { DomainEvent, EventHandler } from "./index";

// Non-booking emails: new messages, support replies, welcome, sitter applications and pet-parent account approval.
// Messages are a notification category (`messages`, unsubscribable); everything else is an account email.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const firstWord = (s: string) => s.split(" ")[0] || s;

// ------------------------------------------------------------------------------------------- New message

/** At most one new-message email per recipient per conversation in this window. */
export const MESSAGE_EMAIL_THROTTLE_MS = 30 * 60_000;
/** Wait this long before emailing, so a recipient who reads the message right away isn't emailed at all. */
// short enough to stay well inside the serverless function time limit (after() work counts towards it)
const MESSAGE_READ_WAIT_MS = Number(process.env.EMAIL_MESSAGE_READ_WAIT_MS ?? 15_000);
const PREVIEW_MAX = 200;

const preview = (body: string) => {
  const s = body.replace(/\s+/g, " ").trim();
  return s.length > PREVIEW_MAX ? `${s.slice(0, PREVIEW_MAX - 1).trimEnd()}…` : s;
};

const recentlyEmailed = (conversationId: string, userId: string) =>
  db.emailLog.findFirst({
    where: { kind: "message.new", conversationId, userId, status: { in: ["sent", "dev"] }, createdAt: { gte: new Date(Date.now() - MESSAGE_EMAIL_THROTTLE_MS) } },
    select: { id: true },
  });

async function onMessage(e: Extract<DomainEvent, { type: "message.sent" }>) {
  const r = await getRecipient(e.recipientId);
  if (!r || !wants(r, "messages")) return;
  if (await recentlyEmailed(e.conversationId, r.id)) return;
  const sender = await db.user.findUnique({ where: { id: e.senderId }, select: { firstName: true, role: true } });
  if (!sender || sender.role === "ADMIN") return; // no system/admin messages

  await sleep(MESSAGE_READ_WAIT_MS);
  const [conv, message] = await Promise.all([
    db.conversation.findUnique({ where: { id: e.conversationId }, select: { ownerId: true, ownerReadAt: true, sitterReadAt: true, sitter: { select: { userId: true, displayName: true } } } }),
    db.message.findUnique({ where: { id: e.messageId }, select: { body: true, createdAt: true, senderId: true } }),
  ]);
  if (!conv || !message || message.senderId !== e.senderId) return;
  // Same idea as push (notifications.ts): the recipient had the thread open, or read the message during the wait.
  const readAt = r.id === conv.ownerId ? conv.ownerReadAt : conv.sitterReadAt;
  if (readAt && readAt.getTime() >= message.createdAt.getTime() - ACTIVE_WINDOW_MS) return;
  if (await recentlyEmailed(e.conversationId, r.id)) return; // another message of the burst got there first

  const name = e.senderId === conv.sitter.userId ? firstWord(conv.sitter.displayName) : sender.firstName;
  const t = mailT(r.locale, "mailMisc");
  const unsubscribe = { kind: "user" as const, userId: r.id, category: "messages" as const };
  await sendEmail({
    to: r.email,
    kind: "message.new",
    userId: r.id,
    conversationId: e.conversationId,
    unsubscribe,
    idempotencyKey: `message.new:${e.conversationId}:${r.id}:${Math.floor(Date.now() / MESSAGE_EMAIL_THROTTLE_MS)}`,
    locale: r.locale,
    subject: t("message.subject", { name }),
    preheader: t("message.preheader"),
    title: t("message.title", { name }),
    name: r.firstName,
    paragraphs: [t("message.intro", { name })],
    quote: preview(message.body),
    button: { label: t("message.button"), url: emailUrl(`/messages/${e.conversationId}`, r.locale) },
    note: t("message.note"),
    footer: {
      manageUrl: emailUrl("/account/settings", r.locale),
      unsubscribeUrl: unsubscribeUrl(unsubscribe, r.locale),
    },
  });
}

// ------------------------------------------------------------------------------------------- Support replies

/** A reply this recent counts as "the update" behind a ticket.updated event (status-only changes don't email). */
const TICKET_REPLY_WINDOW_MS = 10 * 60_000;

async function onTicket(e: Extract<DomainEvent, { type: "ticket.updated" }>) {
  if (!e.byAdmin) return;
  const ticket = await db.supportTicket.findUnique({
    where: { id: e.ticketId },
    select: { id: true, reference: true, subject: true, openedById: true, messages: { where: { internal: false }, orderBy: { createdAt: "desc" }, take: 1, select: { authorId: true, createdAt: true } } },
  });
  const last = ticket?.messages[0];
  if (!ticket || !last || last.authorId === ticket.openedById) return;
  if (Date.now() - last.createdAt.getTime() > TICKET_REPLY_WINDOW_MS) return;
  if (await wasSent({ kind: "ticket.reply", userId: ticket.openedById, since: last.createdAt })) return;
  const r = await getRecipient(ticket.openedById);
  if (!r) return;
  const t = mailT(r.locale, "mailMisc");
  await sendEmail({
    to: r.email,
    kind: "ticket.reply",
    userId: r.id,
    idempotencyKey: `ticket.reply:${ticket.id}:${last.createdAt.getTime()}`,
    locale: r.locale,
    subject: t("ticket.subject", { subject: ticket.subject }),
    preheader: t("ticket.preheader"),
    title: t("ticket.title"),
    name: r.firstName,
    paragraphs: [t("ticket.intro")],
    details: [
      { label: t("ticket.reference"), value: ticket.reference },
      { label: t("ticket.subjectLabel"), value: ticket.subject },
    ],
    button: { label: t("ticket.button"), url: emailUrl(`/account/support/${ticket.id}`, r.locale) },
  });
}

// ------------------------------------------------------------------------------------------- Welcome

const OPEN_APPLICATION = ["IN_REVIEW", "MEET_GREET"];

async function onEmailConfirmed(e: Extract<DomainEvent, { type: "user.emailConfirmed" }>) {
  if (await wasSent({ kind: "welcome", userId: e.userId })) return;
  const [r, user] = await Promise.all([
    getRecipient(e.userId),
    db.user.findUnique({ where: { id: e.userId }, select: { role: true, approvalStatus: true, sitter: { select: { id: true } } } }),
  ]);
  if (!r || !user || user.role === "ADMIN") return;
  const t = mailT(r.locale, "mailMisc");
  const base = { to: r.email, kind: "welcome", userId: r.id, idempotencyKey: `welcome:${r.id}`, locale: r.locale, subject: t("welcome.subject"), title: t("welcome.title"), name: r.firstName };

  if (user.role === "SITTER" && !user.sitter) {
    const app = await db.sitterApplication.findFirst({
      where: { OR: [{ userId: r.id }, { email: { equals: r.email, mode: "insensitive" } }], status: { in: OPEN_APPLICATION } },
      orderBy: { createdAt: "desc" },
      select: { trackingCode: true },
    });
    await sendEmail({
      ...base,
      preheader: t("welcome.sitter.preheader"),
      paragraphs: app ? [t("welcome.sitter.inReview", { code: app.trackingCode })] : [t("welcome.sitter.intro"), t("welcome.sitter.next")],
      button: app
        ? { label: t("welcome.sitter.statusButton"), url: emailUrl(`/become-a-sitter/submitted?code=${encodeURIComponent(app.trackingCode)}`, r.locale) }
        : { label: t("welcome.sitter.button"), url: emailUrl("/become-a-sitter", r.locale) },
    });
    return;
  }
  await sendEmail({
    ...base,
    preheader: t("welcome.owner.preheader"),
    paragraphs: [
      t("welcome.owner.intro"),
      t("welcome.owner.stepPet"),
      t("welcome.owner.stepSitter"),
      t("welcome.owner.stepMeet"),
      ...(user.approvalStatus === "PENDING" ? [t("welcome.owner.pending")] : []),
    ],
    button: { label: t("welcome.owner.button"), url: emailUrl("/sitters", r.locale) },
    secondaryButton: { label: t("welcome.owner.secondary"), url: emailUrl("/account/pets/new", r.locale) },
  });
}

// ------------------------------------------------------------------------------------------- Handlers

export const email_miscHandlers: EventHandler[] = [
  async (event) => {
    switch (event.type) {
      case "message.sent":
        return onMessage(event);
      case "ticket.updated":
        return onTicket(event);
      case "user.emailConfirmed":
        return onEmailConfirmed(event);
    }
  },
];

// ------------------------------------------------------------------------------------------- Direct sends
// Sitter applications and pet-parent approval have no domain event: the actions call these through sendLater().

/** Runs `fn` after the response (like emit); inline outside a request. Never throws. */
export function sendLater(fn: () => Promise<unknown>) {
  const run = () => fn().catch((e) => console.error("[email] misc send failed", e));
  try {
    after(run);
  } catch {
    void run();
  }
}

/**
 * The applicant as a recipient. Applicants may have no account: the language is the one they're using right now
 * (`requestLocale`, when they triggered the email), else their account's, else English.
 */
async function applicant(applicationId: string, requestLocale?: string) {
  const app = await db.sitterApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, trackingCode: true, firstName: true, email: true, meetGreetAt: true, user: { select: { id: true, locale: true, deletedAt: true } } },
  });
  if (!app) return null;
  const account = app.user && !app.user.deletedAt ? app.user : await db.user.findFirst({ where: { email: { equals: app.email.trim(), mode: "insensitive" }, deletedAt: null }, select: { id: true, locale: true } });
  const locale = mailLocale(requestLocale ?? account?.locale);
  return { app, locale, userId: account?.id ?? null, t: mailT(locale, "mailMisc") };
}

const statusUrl = (code: string, locale: string) => emailUrl(`/become-a-sitter/submitted?code=${encodeURIComponent(code)}`, locale);

export async function emailApplicationReceived(applicationId: string, requestLocale?: string) {
  const a = await applicant(applicationId, requestLocale);
  if (!a) return;
  const { app, locale, t } = a;
  await sendEmail({
    to: app.email,
    kind: "application.received",
    userId: a.userId,
    idempotencyKey: `application.received:${app.id}`,
    locale,
    subject: t("application.received.subject"),
    preheader: t("application.received.preheader", { code: app.trackingCode }),
    title: t("application.received.title"),
    name: app.firstName,
    paragraphs: [t("application.received.intro"), t("application.received.next")],
    details: [{ label: t("application.codeLabel"), value: app.trackingCode }],
    button: { label: t("application.statusButton"), url: statusUrl(app.trackingCode, locale) },
    note: t("application.received.note"),
  });
}

/** `changed`: the applicant already had a Meet & Greet time and it moved. */
export async function emailMeetGreetBooked(applicationId: string, opts: { changed: boolean; requestLocale?: string }) {
  const a = await applicant(applicationId, opts.requestLocale);
  if (!a?.app.meetGreetAt) return;
  const { app, locale, t } = a;
  const at = app.meetGreetAt!;
  const date = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: MEET_GREET_TZ, weekday: "long", month: "long", day: "numeric" }).format(at);
  const time = formatTime(at, MEET_GREET_TZ, locale);
  const when = t("application.meetGreet.when", { date, time });
  await sendEmail({
    to: app.email,
    kind: "application.meetGreet",
    userId: a.userId,
    idempotencyKey: `application.meetGreet:${app.id}:${at.getTime()}`,
    locale,
    subject: opts.changed ? t("application.meetGreet.subjectChanged", { when }) : t("application.meetGreet.subject", { when }),
    preheader: t("application.meetGreet.preheader", { when }),
    title: opts.changed ? t("application.meetGreet.titleChanged") : t("application.meetGreet.title"),
    name: app.firstName,
    paragraphs: [t("application.meetGreet.intro"), t("application.meetGreet.link")],
    details: [
      { label: t("application.meetGreet.date"), value: date },
      { label: t("application.meetGreet.time"), value: t("application.meetGreet.timeValue", { time }) },
      { label: t("application.codeLabel"), value: app.trackingCode },
    ],
    button: { label: t("application.statusButton"), url: statusUrl(app.trackingCode, locale) },
    note: t("application.meetGreet.note"),
  });
}

/** `newAccount`: approval created the login, so they still need to set a password. */
export async function emailApplicationApproved(applicationId: string, opts: { newAccount: boolean }) {
  const a = await applicant(applicationId);
  if (!a) return;
  const { app, locale, t } = a;
  await sendEmail({
    to: app.email,
    kind: "application.approved",
    userId: a.userId,
    idempotencyKey: `application.approved:${app.id}`,
    locale,
    subject: t("application.approved.subject"),
    preheader: t("application.approved.preheader"),
    title: t("application.approved.title"),
    name: app.firstName,
    paragraphs: [t("application.approved.intro"), t("application.approved.next")],
    button: { label: t("application.approved.button"), url: emailUrl("/sitter", locale) },
    ...(opts.newAccount && { note: t("application.approved.newAccount") }),
  });
}

export async function emailApplicationRejected(applicationId: string) {
  const a = await applicant(applicationId);
  if (!a) return;
  const { app, locale, t } = a;
  const { supportEmail } = await getPlatformSettings();
  await sendEmail({
    to: app.email,
    kind: "application.rejected",
    userId: a.userId,
    idempotencyKey: `application.rejected:${app.id}`,
    locale,
    subject: t("application.rejected.subject"),
    preheader: t("application.rejected.preheader"),
    title: t("application.rejected.title"),
    name: app.firstName,
    paragraphs: [t("application.rejected.intro"), t("application.rejected.body"), t("application.rejected.contact", { email: supportEmail })],
    button: { label: t("application.rejected.button"), url: `mailto:${supportEmail}` },
  });
}

/** Pet-parent account approval (PlatformSettings.requireOwnerApproval). */
export async function emailAccountApproval(userId: string, decision: "approved" | "rejected") {
  const r = await getRecipient(userId);
  if (!r) return;
  const t = mailT(r.locale, "mailMisc");
  const approved = decision === "approved";
  await sendEmail({
    to: r.email,
    kind: `account.${decision}`,
    userId: r.id,
    locale: r.locale,
    subject: approved ? t("account.approved.subject") : t("account.rejected.subject"),
    preheader: approved ? t("account.approved.preheader") : t("account.rejected.preheader"),
    title: approved ? t("account.approved.title") : t("account.rejected.title"),
    name: r.firstName,
    paragraphs: approved ? [t("account.approved.intro"), t("account.approved.next")] : [t("account.rejected.intro"), t("account.rejected.contact")],
    button: approved
      ? { label: t("account.approved.button"), url: emailUrl("/sitters", r.locale) }
      : { label: t("account.rejected.button"), url: emailUrl("/account/support/new", r.locale) },
  });
}
