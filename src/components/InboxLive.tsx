"use client";

import { useRealtimeRefresh } from "./useRealtimeRefresh";

/** Mounted in the header for signed-in users: refreshes unread indicators when a new message arrives. */
export function InboxLive({ channel }: { channel: string }) {
  useRealtimeRefresh(channel, 5 * 60_000);
  return null;
}
