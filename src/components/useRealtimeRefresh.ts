"use client";

import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Re-renders the current route when the server pings `channel` (Supabase Broadcast), plus a slow fallback
 * poll while the tab is visible in case the socket drops.
 */
export function useRealtimeRefresh(channel: string | null, fallbackMs = 60_000) {
  const router = useRouter();
  useEffect(() => {
    if (!channel) return;
    const supabase = getSupabaseBrowserClient();
    const sub = supabase
      .channel(channel)
      .on("broadcast", { event: "refresh" }, () => router.refresh())
      .subscribe();
    const tick = () => document.visibilityState === "visible" && router.refresh();
    const t = setInterval(tick, fallbackMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
      supabase.removeChannel(sub);
    };
  }, [channel, fallbackMs, router]);
}
