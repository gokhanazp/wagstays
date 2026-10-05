import "server-only";
import { bookingPets, petNames } from "../pets";
import { db } from "../db";
import { pushEnabled, sendPush, type PushPayload } from "../push";
import type { DomainEvent, EventHandler } from "./index";

// Web push notifications for domain events. Payloads stay short and carry no sensitive data (no addresses,
// phone numbers, message bodies or amounts) — just who/what and a link into the app.

/** "walk" / "stay" / "visit" / "day" — used in owner-facing copy. */
const NOUN: Record<string, string> = { DOG_WALKING: "walk", BOARDING: "stay", DAY_CARE: "day care", DROP_IN: "visit" };

/** A recipient who read the conversation this recently is treated as "watching it" and isn't pushed. */
export const ACTIVE_WINDOW_MS = 30_000;
/** Give an open thread a moment to mark the new message read (realtime ping → markConversationRead). */
const READ_GRACE_MS = 2_500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadBooking(id: string) {
  return db.booking.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      meetAndGreet: true,
      pet: { select: { id: true, name: true } },
      pets: { select: { pet: { select: { id: true, name: true } } } },
      owner: { select: { firstName: true } },
      service: { select: { type: true } },
      sitter: { select: { userId: true, displayName: true } },
    },
  });
}

type Booking = NonNullable<Awaited<ReturnType<typeof loadBooking>>>;
type Out = { userId: string; payload: PushPayload };

const ownerUrl = (b: Booking) => `/account/bookings/${b.id}`;
const sitterUrl = (b: Booking) => `/sitter/bookings/${b.id}`;
const firstName = (displayName: string) => displayName.split(" ")[0] || displayName;

function bookingNotifications(event: Extract<DomainEvent, { bookingId: string }>, b: Booking): Out[] {
  // "Maple" / "Maple & Biscuit"
  const pet = petNames(bookingPets(b).map((p) => p.name));
  const sitter = firstName(b.sitter.displayName);
  const noun = NOUN[b.service.type] ?? "booking";
  const tag = `booking-${b.id}`;
  switch (event.type) {
    case "booking.created":
      return [
        {
          userId: b.sitter.userId,
          payload: {
            title: b.meetAndGreet ? "New Meet & Greet request" : "New booking request",
            body: `New booking request from ${b.owner.firstName} for ${pet}`,
            url: sitterUrl(b),
            tag,
          },
        },
      ];
    case "booking.confirmed":
      return [{ userId: b.ownerId, payload: { title: "Booking confirmed", body: `${sitter} confirmed ${pet}'s ${noun}.`, url: ownerUrl(b), tag } }];
    case "booking.declined":
      return [
        {
          userId: b.ownerId,
          payload: { title: "Booking request declined", body: `${sitter} can't take ${pet}'s ${noun}. Find another sitter.`, url: ownerUrl(b), tag },
        },
      ];
    case "booking.completed":
      return [{ userId: b.ownerId, payload: { title: `${pet}'s ${noun} is complete`, body: `How was ${pet}'s ${noun}? Leave a review`, url: ownerUrl(b), tag } }];
    case "booking.cancelled": {
      const actor = event.actor;
      const toSitter: Out = {
        userId: b.sitter.userId,
        payload: {
          title: "Booking cancelled",
          body: actor === "ADMIN" ? `WagStays cancelled ${pet}'s ${noun}.` : `${b.owner.firstName} cancelled ${pet}'s ${noun}.`,
          url: sitterUrl(b),
          tag,
        },
      };
      const toOwner: Out = {
        userId: b.ownerId,
        payload: {
          title: "Booking cancelled",
          body: actor === "ADMIN" ? `WagStays cancelled ${pet}'s ${noun}.` : `${sitter} cancelled ${pet}'s ${noun}.`,
          url: ownerUrl(b),
          tag,
        },
      };
      if (actor === "OWNER") return [toSitter];
      if (actor === "SITTER") return [toOwner];
      return [toOwner, toSitter];
    }
    default:
      return [];
  }
}

async function messageNotification(event: Extract<DomainEvent, { type: "message.sent" }>): Promise<Out[]> {
  await sleep(READ_GRACE_MS);
  const [conv, message, sender] = await Promise.all([
    db.conversation.findUnique({ where: { id: event.conversationId }, select: { ownerId: true, ownerReadAt: true, sitterReadAt: true, sitter: { select: { displayName: true, userId: true } } } }),
    db.message.findUnique({ where: { id: event.messageId }, select: { createdAt: true } }),
    db.user.findUnique({ where: { id: event.senderId }, select: { firstName: true } }),
  ]);
  if (!conv || !message) return [];
  const readAt = event.recipientId === conv.ownerId ? conv.ownerReadAt : conv.sitterReadAt;
  // Recipient had the thread open just before (or read the message right after) it arrived — no push.
  if (readAt && readAt.getTime() >= message.createdAt.getTime() - ACTIVE_WINDOW_MS) return [];

  const name = event.senderId === conv.sitter.userId ? firstName(conv.sitter.displayName) : sender?.firstName || "Someone";
  return [
    {
      userId: event.recipientId,
      payload: { title: `New message from ${name}`, body: "Tap to read and reply.", url: `/messages/${event.conversationId}`, tag: `conv-${event.conversationId}` },
    },
  ];
}

async function reviewNotification(event: Extract<DomainEvent, { type: "review.created" }>): Promise<Out[]> {
  const r = await db.review.findUnique({
    where: { id: event.reviewId },
    select: { rating: true, authorName: true, sitter: { select: { userId: true } } },
  });
  if (!r) return [];
  return [
    {
      userId: r.sitter.userId,
      payload: {
        title: "You got a new review",
        body: `${r.authorName.split(" ")[0]} left you ${r.rating} star${r.rating === 1 ? "" : "s"}.`,
        url: "/sitter/reviews?tab=needs-reply",
        tag: `review-${event.reviewId}`,
      },
    },
  ];
}

async function ticketNotification(event: Extract<DomainEvent, { type: "ticket.updated" }>): Promise<Out[]> {
  const t = await db.supportTicket.findUnique({ where: { id: event.ticketId }, select: { reference: true } });
  if (!t) return [];
  return [
    {
      userId: event.recipientId,
      payload: event.byAdmin
        ? { title: "Support replied", body: `There's an update on your request ${t.reference}.`, url: `/account/support/${event.ticketId}`, tag: `ticket-${event.ticketId}` }
        : { title: "Support ticket updated", body: `Ticket ${t.reference} has a new update.`, url: `/admin/support/${event.ticketId}`, tag: `ticket-${event.ticketId}` },
    },
  ];
}

/** Maps an event to the notifications it should produce (exported for tests). */
export async function notificationsFor(event: DomainEvent): Promise<Out[]> {
  switch (event.type) {
    case "booking.created":
    case "booking.confirmed":
    case "booking.declined":
    case "booking.completed":
    case "booking.cancelled": {
      const b = await loadBooking(event.bookingId);
      return b ? bookingNotifications(event, b) : [];
    }
    case "message.sent":
      return messageNotification(event);
    case "review.created":
      return reviewNotification(event);
    case "ticket.updated":
      return ticketNotification(event);
    default:
      return [];
  }
}

const pushHandler: EventHandler = async (event) => {
  if (!pushEnabled()) return;
  // Only bother loading data when the likely recipient(s) have a device subscribed at all.
  if (!(await db.pushSubscription.findFirst({ select: { id: true } }))) return;
  const out = await notificationsFor(event);
  await Promise.all(out.map((n) => sendPush(n.userId, n.payload)));
};

export const notificationHandlers: EventHandler[] = [pushHandler];
