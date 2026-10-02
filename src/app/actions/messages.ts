"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { MESSAGE_MAX, markRead, participantSide } from "@/lib/conversations";
import { getCurrentUser } from "@/lib/session";

export type SendResult = { ok: true } | { ok: false; error: string };

const sendSchema = z.object({
  conversationId: z.string().min(1).max(64),
  body: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(MESSAGE_MAX, `Messages can be up to ${MESSAGE_MAX.toLocaleString("en-CA")} characters.`),
});

/** Sends a message. Only a participant of the conversation (owner or the sitter's user) may post. */
export async function sendMessage(conversationId: string, body: string): Promise<SendResult> {
  const user = await getCurrentUser();
  if (!user || user.suspended) return { ok: false, error: "Please sign in again to send messages." };

  const parsed = sendSchema.safeParse({ conversationId, body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };

  const side = await participantSide(parsed.data.conversationId, user.id);
  if (!side) return { ok: false, error: "Conversation not found." };

  const now = new Date();
  await db.$transaction([
    db.message.create({ data: { conversationId: parsed.data.conversationId, senderId: user.id, body: parsed.data.body, createdAt: now } }),
    db.conversation.update({
      where: { id: parsed.data.conversationId },
      data: { lastMessageAt: now, ...(side === "owner" ? { ownerReadAt: now } : { sitterReadAt: now }) },
    }),
  ]);
  revalidatePath("/messages", "layout");
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
