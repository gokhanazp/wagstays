import "server-only";
import { cache } from "react";
import { db } from "./db";

/** Conversations with messages newer than the viewer's last read, from either side. */
export const getUnreadCount = cache(async (userId: string) => {
  const sitter = await db.sitterProfile.findUnique({ where: { userId }, select: { id: true } });
  const convs = await db.conversation.findMany({
    where: { OR: [{ ownerId: userId }, ...(sitter ? [{ sitterId: sitter.id }] : [])] },
    select: {
      ownerId: true,
      ownerReadAt: true,
      sitterReadAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderId: true, createdAt: true } },
    },
  });
  return convs.filter((c) => {
    const last = c.messages[0];
    if (!last || last.senderId === userId) return false;
    const readAt = c.ownerId === userId ? c.ownerReadAt : c.sitterReadAt;
    return !readAt || readAt < last.createdAt;
  }).length;
});
