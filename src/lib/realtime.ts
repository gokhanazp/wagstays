import "server-only";
import { createSupabaseAdminClient } from "./supabase/admin";

// Realtime "pings" over Supabase Broadcast. Payloads are empty on purpose: a ping only tells the browser to
// re-fetch through the normal, authorised server render, so message content never travels over Realtime.
// Channel names use unguessable ids (cuid / auth uuid).
export const conversationChannel = (conversationId: string) => `conv:${conversationId}`;
export const inboxChannel = (userId: string) => `inbox:${userId}`;

export async function ping(...channels: string[]) {
  const admin = createSupabaseAdminClient();
  await Promise.all(
    channels.map((name) =>
      admin
        .channel(name)
        .httpSend("refresh", {})
        .catch(() => undefined), // realtime is best-effort; the fallback poll covers misses
    ),
  );
}
