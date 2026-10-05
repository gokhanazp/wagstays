import "server-only";
import { createTranslator } from "next-intl";
import { db } from "./db";
import en from "../../messages/en/chat.json";
import fr from "../../messages/fr/chat.json";

const tr = (locale = "en") => createTranslator({ locale: locale === "fr" ? "fr" : "en", messages: { chat: locale === "fr" ? fr : en }, namespace: "chat.inbox" });

// Messaging data access. A user can sit on the owner side (Conversation.ownerId === user.id) and, if they
// have a SitterProfile, on the sitter side (Conversation.sitterId === profile.id). Every helper here takes the
// viewer's user id and only returns conversations that viewer participates in.

export type Side = "owner" | "sitter";

export const MESSAGE_MAX = 2000;

export async function getViewerSitterId(userId: string) {
  const p = await db.sitterProfile.findUnique({ where: { userId }, select: { id: true } });
  return p?.id ?? null;
}

function participantWhere(userId: string, sitterId: string | null) {
  return { OR: [{ ownerId: userId }, ...(sitterId ? [{ sitterId }] : [])] };
}

/** "Emily R." */
export function ownerDisplayName(o: { firstName: string; lastName: string }) {
  return `${o.firstName} ${o.lastName.charAt(0)}.`.trim();
}

export async function listConversations(userId: string, locale = "en") {
  const t = tr(locale);
  const sitterId = await getViewerSitterId(userId);
  const rows = await db.conversation.findMany({
    // Empty chats (opened via "Message" but never written in) only show on the owner's side, so sitters
    // don't see blank conversations.
    where: { OR: [{ ownerId: userId }, ...(sitterId ? [{ sitterId, messages: { some: {} } }] : [])] },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    select: {
      id: true,
      ownerId: true,
      lastMessageAt: true,
      ownerReadAt: true,
      sitterReadAt: true,
      owner: { select: { firstName: true, lastName: true, avatarUrl: true } },
      sitter: { select: { displayName: true, avatarUrl: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderId: true, createdAt: true } },
    },
  });
  return rows.map((c) => {
    const side: Side = c.ownerId === userId ? "owner" : "sitter";
    const last = c.messages[0] ?? null;
    const readAt = side === "owner" ? c.ownerReadAt : c.sitterReadAt;
    const unread = !!last && last.senderId !== userId && (!readAt || readAt < last.createdAt);
    const other =
      side === "owner"
        ? { name: c.sitter.displayName, avatarUrl: c.sitter.avatarUrl as string | null, initial: c.sitter.displayName.charAt(0) }
        : { name: ownerDisplayName(c.owner), avatarUrl: c.owner.avatarUrl, initial: c.owner.firstName.charAt(0) };
    return {
      id: c.id,
      side,
      other,
      preview: last ? (last.senderId === userId ? t("youPrefix", { body: last.body }) : last.body) : t("noMessages"),
      at: last?.createdAt ?? c.lastMessageAt,
      unread,
    };
  });
}
export type ConversationListItem = Awaited<ReturnType<typeof listConversations>>[number];

/** Full thread for a participant, or null (callers 404) when the viewer isn't on either side. */
export async function getThread(conversationId: string, userId: string) {
  const sitterId = await getViewerSitterId(userId);
  const c = await db.conversation.findFirst({
    where: { id: conversationId, ...participantWhere(userId, sitterId) },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      sitter: {
        select: {
          id: true,
          userId: true,
          slug: true,
          displayName: true,
          headline: true,
          avatarUrl: true,
          rating: true,
          reviewCount: true,
          status: true,
          idVerified: true,
          neighbourhood: { select: { name: true } },
          city: { select: { timeZone: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" }, take: 500, select: { id: true, body: true, senderId: true, createdAt: true } },
    },
  });
  if (!c) return null;
  const side: Side = c.ownerId === userId ? "owner" : "sitter";
  return { ...c, side };
}
export type Thread = NonNullable<Awaited<ReturnType<typeof getThread>>>;

/** Upcoming (pending / confirmed, not yet ended) bookings between an owner and a sitter. */
export async function upcomingBookingsBetween(ownerId: string, sitterId: string) {
  return db.booking.findMany({
    where: { ownerId, sitterId, status: { in: ["PENDING", "CONFIRMED"] }, endAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
    take: 5,
    select: { id: true, startAt: true, status: true, meetAndGreet: true, service: { select: { type: true } }, pet: { select: { name: true } }, petCount: true },
  });
}

/** Is the viewer a participant? Returns their side, or null. Used by every server action. */
export async function participantSide(conversationId: string, userId: string): Promise<Side | null> {
  const c = await db.conversation.findUnique({ where: { id: conversationId }, select: { ownerId: true, sitter: { select: { userId: true } } } });
  if (!c) return null;
  if (c.ownerId === userId) return "owner";
  if (c.sitter.userId === userId) return "sitter";
  return null;
}

export async function markRead(conversationId: string, side: Side) {
  await db.conversation.update({
    where: { id: conversationId },
    data: side === "owner" ? { ownerReadAt: new Date() } : { sitterReadAt: new Date() },
  });
}
