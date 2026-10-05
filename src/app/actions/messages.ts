"use server";

import { emit } from "@/lib/events";
import { conversationChannel, inboxChannel, ping } from "@/lib/realtime";
import { revalidatePath } from "@/i18n/revalidate";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { intlLocale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { MESSAGE_MAX, markRead, participantSide } from "@/lib/conversations";
import { getCurrentUser } from "@/lib/session";

export type SendResult = { ok: true } | { ok: false; error: string };

const sendSchema = (t: Awaited<ReturnType<typeof getTranslations<"chat.errors">>>, locale: string) =>
  z.object({
    conversationId: z.string().min(1).max(64),
    body: z
      .string()
      .trim()
      .min(1, t("empty"))
      .max(MESSAGE_MAX, t("tooLong", { max: MESSAGE_MAX.toLocaleString(intlLocale(locale)) })),
  });

/** Sends a message. Only a participant of the conversation (owner or the sitter's user) may post. */
export async function sendMessage(conversationId: string, body: string): Promise<SendResult> {
  const [user, t, locale] = await Promise.all([getCurrentUser(), getTranslations("chat.errors"), getLocale()]);
  if (!user || user.suspended) return { ok: false, error: t("signIn") };

  const parsed = sendSchema(t, locale).safeParse({ conversationId, body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? t("invalid") };

  const side = await participantSide(parsed.data.conversationId, user.id);
  if (!side) return { ok: false, error: t("notFound") };

  const now = new Date();
  const [message] = await db.$transaction([
    db.message.create({ data: { conversationId: parsed.data.conversationId, senderId: user.id, body: parsed.data.body, createdAt: now } }),
    db.conversation.update({
      where: { id: parsed.data.conversationId },
      data: { lastMessageAt: now, ...(side === "owner" ? { ownerReadAt: now } : { sitterReadAt: now }) },
    }),
  ]);
  revalidatePath("/messages", "layout");
  const conv = await db.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    select: { ownerId: true, sitter: { select: { userId: true } } },
  });
  if (conv) {
    const recipient = side === "owner" ? conv.sitter.userId : conv.ownerId;
    await ping(conversationChannel(parsed.data.conversationId), inboxChannel(recipient));
    emit({ type: "message.sent", conversationId: parsed.data.conversationId, messageId: message.id, senderId: user.id, recipientId: recipient });
  }
  return { ok: true };
}

/** Marks the viewer's side of a conversation as read (no-op for non-participants / already read). */
export async function markConversationRead(conversationId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.suspended || typeof conversationId !== "string") return;
  const side = await participantSide(conversationId, user.id);
  if (!side) return;

  const c = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { ownerReadAt: true, sitterReadAt: true, messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } },
  });
  const last = c?.messages[0]?.createdAt;
  const readAt = side === "owner" ? c?.ownerReadAt : c?.sitterReadAt;
  if (!last || (readAt && readAt >= last)) return;

  await markRead(conversationId, side);
  revalidatePath("/", "layout");
}
