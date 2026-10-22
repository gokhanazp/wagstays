import "server-only";
import { db } from "@/lib/db";
import { intlLocale } from "@/i18n/routing";
import { SERVICE_SLUGS, type ServiceType } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { bookingPets, petNames } from "@/lib/pets";
import { isStayService, zonedParts } from "@/lib/availability-core";
import { sendEmail, wasSent } from "../send";
import { mailT } from "../i18n";
import { emailUrl, unsubscribeUrl, type EmailCategory } from "../links";
import { getRecipient, wants, type Recipient } from "../recipients";
import type { EmailContent } from "../layout";

// Booking emails: data loading, formatting and rendering. The event handlers (src/lib/events/email-booking.ts)
// and the reminders cron (./booking-reminders.ts) decide *when* to send; this file decides *what* is sent.

export const bookingSelect = {
  id: true,
  ownerId: true,
  seriesId: true,
  meetAndGreet: true,
  status: true,
  startAt: true,
  endAt: true,
  petCount: true,
  notes: true,
  sitterNote: true,
  cancelReason: true,
  cancelledBy: true,
  subtotalCents: true,
  totalCents: true,
  discountCents: true,
  confirmedAt: true,
  completedAt: true,
  cancelledAt: true,
  updatedAt: true,
  createdAt: true,
  pet: { select: { id: true, name: true } },
  pets: { select: { pet: { select: { id: true, name: true } } } },
  owner: { select: { firstName: true } },
  service: { select: { type: true } },
  sitter: { select: { userId: true, displayName: true, city: { select: { slug: true, timeZone: true } } } },
} as const;

export function loadBooking(id: string) {
  return db.booking.findUnique({ where: { id }, select: bookingSelect });
}
export type MailBooking = NonNullable<Awaited<ReturnType<typeof loadBooking>>>;

/** Occurrences of a weekly series described together in one email (just [b] for a single booking). */
export type Group = { lead: MailBooking; members: { id: string; startAt: Date; subtotalCents: number; totalCents: number; discountCents: number }[] };

const sitterFirstName = (displayName: string) => (displayName.includes("&") ? displayName : displayName.split(" ")[0] || displayName);
const excerpt = (s: string | null | undefined, max = 200) => {
  const v = (s ?? "").replace(/\s+/g, " ").trim();
  return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v;
};

function when(start: Date, end: Date, tz: string, locale: string) {
  const loc = intlLocale(locale);
  const day = new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
  const timeFmt = new Intl.DateTimeFormat(loc, { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const time = { format: (d: Date) => timeFmt.format(d).replace(/ /g, "\u00a0") }; // keep "9 h 00" / "9:00 a.m." on one line
  const sameDay = zonedParts(start.getTime(), tz).iso === zonedParts(end.getTime(), tz).iso;
  return sameDay
    ? `${day.format(start)} · ${time.format(start)} – ${time.format(end)}`
    : `${day.format(start)}, ${time.format(start)} → ${day.format(end)}, ${time.format(end)}`;
}
const shortDay = (d: Date, tz: string, locale: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(d);

/** Search pre-filled with the booking's city, service, dates and pet count. */
function searchPath(b: MailBooking) {
  const tz = b.sitter.city.timeZone;
  const q = new URLSearchParams({ city: b.sitter.city.slug });
  const slug = SERVICE_SLUGS[b.service.type as ServiceType];
  if (slug) q.set("service", slug);
  const from = zonedParts(b.startAt.getTime(), tz).iso;
  const to = zonedParts(b.endAt.getTime(), tz).iso;
  if (b.startAt.getTime() > Date.now()) {
    q.set("from", from);
    if (isStayService(b.service.type) && to !== from) q.set("to", to);
  }
  if (b.petCount > 1) q.set("petCount", String(b.petCount));
  return `/sitters?${q.toString()}`;
}

const ownerPath = (b: MailBooking) => `/account/bookings/${b.id}`;
const sitterPath = (b: MailBooking) => `/sitter/bookings/${b.id}`;

export type BookingMailKind =
  | "booking.request"
  | "booking.request.nudge"
  | "booking.confirmed"
  | "booking.declined"
  | "booking.cancelled.owner"
  | "booking.cancelled.sitter"
  | "booking.completed.owner"
  | "booking.completed.sitter"
  | "reminder.owner"
  | "reminder.sitter";

const CATEGORY: Record<BookingMailKind, EmailCategory> = {
  "booking.request": "bookings",
  "booking.request.nudge": "bookings",
  "booking.confirmed": "bookings",
  "booking.declined": "bookings",
  "booking.cancelled.owner": "bookings",
  "booking.cancelled.sitter": "bookings",
  "booking.completed.owner": "bookings",
  "booking.completed.sitter": "bookings",
  "reminder.owner": "reminders",
  "reminder.sitter": "reminders",
};
const TO_SITTER = new Set<BookingMailKind>(["booking.request", "booking.request.nudge", "booking.cancelled.sitter", "booking.completed.sitter", "reminder.sitter"]);

type Built = Omit<EmailContent, "locale" | "footer" | "name"> & { subject: string };

/** French elision before names that start with a vowel: "de Emily" → "d'Emily", "que Oscar" → "qu'Oscar". */
function elideFr<T>(value: T, names: string[]): T {
  const vowel = names.filter((n) => /^[aeiouyàâéèêëîïôöûù]/i.test(n));
  if (!vowel.length) return value;
  const esc = (n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[\\s(«])(de|De|que|Que) (${vowel.map(esc).join("|")})`, "g");
  const fix = (v: unknown): unknown =>
    typeof v === "string"
      ? v.replace(re, (_, pre: string, word: string, name: string) => `${pre}${word.slice(0, -1)}'${name}`)
      : Array.isArray(v)
        ? v.map(fix)
        : v && typeof v === "object"
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "url" ? x : fix(x)]))
          : v;
  return fix(value) as T;
}

/** The subject + body of one booking email in the recipient's language. */
export function buildBookingEmail(kind: BookingMailKind, g: Group, r: Pick<Recipient, "locale">, extra: { pointsCents?: number; actor?: string } = {}): Built {
  const built = buildRaw(kind, g, r, extra);
  if (r.locale !== "fr") return built;
  const b = g.lead;
  return elideFr(built, [b.owner.firstName, sitterFirstName(b.sitter.displayName), ...bookingPets(b).map((p) => p.name)]);
}

function buildRaw(kind: BookingMailKind, g: Group, r: Pick<Recipient, "locale">, extra: { pointsCents?: number; actor?: string }): Built {
  const b = g.lead;
  const locale = r.locale === "fr" ? "fr" : "en";
  const t = mailT(locale, "mailBooking");
  const tz = b.sitter.city.timeZone;
  const type = b.service.type;
  const petList = bookingPets(b);
  const pets = petNames(petList.map((p) => p.name), locale);
  const owner = b.owner.firstName;
  const sitter = sitterFirstName(b.sitter.displayName);
  const noun = t("noun", { type });
  const series = g.members.length > 1 ? t("series", { count: g.members.length, type }) : null;
  const money = (c: number) => formatMoney(c, { locale });
  const sum = (k: "subtotalCents" | "totalCents") => g.members.reduce((n, m) => n + m[k], 0);
  const v = { owner, sitter, pets, noun };

  const details: { label: string; value: string }[] = [{ label: t("details.service"), value: t("service", { type }) }];
  if (series) {
    details.push({ label: t("details.schedule"), value: series }, { label: t("details.starts"), value: when(b.startAt, b.endAt, tz, locale) });
  } else {
    details.push({ label: t("details.when"), value: when(b.startAt, b.endAt, tz, locale) });
  }
  details.push({ label: t("details.pets", { count: petList.length }), value: pets });
  const toSitter = TO_SITTER.has(kind);
  const withMoney = kind === "booking.request" || kind === "booking.confirmed" || kind === "booking.request.nudge";
  if (withMoney) details.push(toSitter ? { label: t("details.youEarn"), value: money(sum("subtotalCents")) } : { label: t("details.total"), value: money(sum("totalCents")) });

  const button = (label: string, path: string) => ({ label, url: emailUrl(path, locale) });
  const points = extra.pointsCents ? t("cancelled.points", { amount: money(extra.pointsCents) }) : null;

  switch (kind) {
    case "booking.request": {
      const note = excerpt(b.notes);
      if (note) details.push({ label: t("details.noteFrom", { name: owner }), value: note });
      const meet = b.meetAndGreet;
      return {
        subject: t(meet ? "request.subjectMeet" : "request.subject", { owner }),
        title: t(meet ? "request.titleMeet" : "request.title"),
        preheader: t("request.preheader", v),
        paragraphs: [meet ? t("request.bodyMeet", v) : series ? t("request.bodySeries", { ...v, series }) : t("request.body", v)],
        details,
        button: button(t("request.button"), sitterPath(b)),
        note: t("request.note", { pets }),
      };
    }
    case "booking.request.nudge":
      return {
        subject: t("nudge.subject", { owner }),
        title: t("nudge.title"),
        preheader: t("nudge.preheader", v),
        paragraphs: [t("nudge.body", v)],
        details,
        button: button(t("nudge.button"), sitterPath(b)),
      };
    case "booking.confirmed": {
      const note = excerpt(b.sitterNote);
      if (note) details.push({ label: t("details.noteFrom", { name: sitter }), value: note });
      return {
        subject: t("confirmed.subject", { sitter }),
        title: t("confirmed.title"),
        preheader: t("confirmed.preheader", v),
        paragraphs: [series ? t("confirmed.bodySeries", { ...v, series }) : t("confirmed.body", v), t("confirmed.tip", { sitter })],
        details,
        button: button(t("confirmed.button"), ownerPath(b)),
      };
    }
    case "booking.declined":
      return {
        subject: t("declined.subject", { sitter }),
        title: t("declined.title", { sitter }),
        preheader: t("declined.preheader", { pets }),
        paragraphs: [t("declined.body", v), ...(points ? [points] : [])],
        details,
        button: button(t("declined.button"), searchPath(b)),
      };
    case "booking.cancelled.owner":
    case "booking.cancelled.sitter": {
      const actor = extra.actor ?? b.cancelledBy ?? "ADMIN";
      const by = actor === "OWNER" ? "ByOwner" : actor === "SITTER" ? "BySitter" : "ByAdmin";
      const toOwner = kind === "booking.cancelled.owner";
      // Only free-text reasons written by the sitter are shown; owner reasons are stored as English codes.
      const reason = actor === "SITTER" ? excerpt(b.cancelReason) : "";
      if (reason) details.push({ label: t("details.reason"), value: reason });
      const findAnother = toOwner && actor !== "OWNER" && b.startAt.getTime() > Date.now();
      return {
        subject: t(`cancelled.subject${by}`, v),
        title: t("cancelled.title"),
        preheader: t("cancelled.preheader", { ...v, date: shortDay(b.startAt, tz, locale) }),
        paragraphs: [t(`cancelled.body${by}`, v), ...(toOwner && points ? [points] : [])],
        details,
        button: findAnother ? button(t("cancelled.buttonFind"), searchPath(b)) : button(t("cancelled.buttonView"), toOwner ? ownerPath(b) : sitterPath(b)),
      };
    }
    case "booking.completed.owner":
      return {
        subject: t("completed.ownerSubject", v),
        title: t("completed.ownerTitle"),
        preheader: t("completed.ownerPreheader", { sitter }),
        paragraphs: [t("completed.ownerBody", v)],
        button: button(t("completed.ownerButton"), `${ownerPath(b)}#review`),
      };
    case "booking.completed.sitter":
      return {
        subject: t("completed.sitterSubject", { pets }),
        title: t("completed.sitterTitle"),
        preheader: t("completed.sitterPreheader", { owner }),
        paragraphs: [t("completed.sitterBody", v), t("completed.sitterAsk", { owner })],
        button: button(t("completed.sitterButton", { owner }), sitterPath(b)),
      };
    case "reminder.owner":
      return {
        subject: t("reminder.ownerSubject", v),
        title: t("reminder.ownerTitle"),
        preheader: t("reminder.ownerPreheader", v),
        paragraphs: [t("reminder.ownerBody", v)],
        details,
        button: button(t("reminder.button"), ownerPath(b)),
      };
    case "reminder.sitter":
      return {
        subject: t("reminder.sitterSubject", v),
        title: t("reminder.sitterTitle"),
        preheader: t("reminder.sitterPreheader", v),
        paragraphs: [t("reminder.sitterBody", v)],
        details,
        button: button(t("reminder.button"), sitterPath(b)),
      };
  }
}

/**
 * Sends one booking email to the owner or sitter, respecting their preferences, at most once per
 * (kind, lead booking, recipient). Returns what happened, for logs and the cron's counts.
 */
export async function sendBookingEmail(
  kind: BookingMailKind,
  g: Group,
  extra: { pointsCents?: number; actor?: string } = {},
): Promise<"sent" | "dev" | "skipped" | "failed" | "optedOut" | "duplicate" | "noRecipient"> {
  const b = g.lead;
  const userId = TO_SITTER.has(kind) ? b.sitter.userId : b.ownerId;
  const r = await getRecipient(userId);
  if (!r) return "noRecipient";
  const category = CATEGORY[kind];
  if (!wants(r, category)) return "optedOut";
  if (await wasSent({ kind, bookingId: b.id, userId })) return "duplicate";
  const { subject, ...content } = buildBookingEmail(kind, g, r, extra);
  const unsubscribe = { kind: "user" as const, userId, category };
  const res = await sendEmail({
    ...content,
    to: r.email,
    subject,
    kind,
    userId,
    bookingId: b.id,
    locale: r.locale,
    name: r.firstName,
    unsubscribe,
    idempotencyKey: `${kind}:${b.id}:${userId}`,
    footer: { manageUrl: emailUrl("/account/settings#email", r.locale), unsubscribeUrl: unsubscribeUrl(unsubscribe, r.locale) },
  });
  return res.status;
}
