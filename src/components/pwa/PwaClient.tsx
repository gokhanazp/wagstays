"use client";

import { usePathname } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { pushPromptStatus } from "@/app/actions/push";
import { EARLY_INSTALL_SCRIPT, captureInstallPrompt, currentSubscription, enablePush, needsHomeScreenFirst, pushSupported, registerServiceWorker } from "./push-client";

const PROMPT_KEY = "wagstays.pushPrompt.v1";
const SKIP_PATHS = ["/login", "/signup", "/offline", "/auth", "/forgot-password", "/reset-password", "/suspended"];

function readFlag() {
  try {
    return localStorage.getItem(PROMPT_KEY);
  } catch {
    return "unavailable"; // no storage → never nag
  }
}
function writeFlag(v: string) {
  try {
    localStorage.setItem(PROMPT_KEY, v);
  } catch {}
}

/**
 * Mounted once in the root layout: registers the service worker, captures the install prompt and shows a
 * gentle, one-time "turn on notifications" card to signed-in users. Permission is only ever requested from the
 * card's button (a user gesture), never on load.
 */
export function PwaClient({ vapidKey }: { vapidKey: string | null }) {
  useEffect(() => {
    void registerServiceWorker();
    return captureInstallPrompt();
  }, []);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: EARLY_INSTALL_SCRIPT }} />
      {vapidKey && <PushPrompt vapidKey={vapidKey} />}
    </>
  );
}

type Mode = "push" | "ios";

function PushPrompt({ vapidKey }: { vapidKey: string }) {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode || SKIP_PATHS.some((p) => pathname.startsWith(p))) return;
    if (readFlag()) return;
    // Cheap signed-in hint (Supabase session cookie) before asking the server.
    if (!/sb-[^=]*-auth-token/.test(document.cookie)) return;
    const ios = needsHomeScreenFirst();
    if (!ios && (!pushSupported() || Notification.permission !== "default")) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!ios && (await currentSubscription())) return;
      const { eligible } = await pushPromptStatus().catch(() => ({ eligible: false }));
      if (!cancelled && eligible && !readFlag()) setMode(ios ? "ios" : "push");
    }, 3500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname, mode]);

  if (!mode) return null;

  const close = (flag: string) => {
    writeFlag(flag);
    setMode(null);
  };

  const enable = async () => {
    setBusy(true);
    setError(null);
    const res = await enablePush(vapidKey);
    setBusy(false);
    if (res.ok) close("enabled");
    else setError(res.error);
  };

  return (
    <div
      aria-labelledby="push-prompt-title"
      className="fixed z-[60] inset-x-3 bottom-3 sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-[380px] p-space-md rounded-2xl bg-surface-container-lowest border border-[#EFE7DE] shadow-[0_20px_36px_-6px_rgba(83,72,62,0.18)] flex gap-space-md"
      role="dialog"
    >
      <span className="w-11 h-11 shrink-0 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center">
        <span className="material-symbols-outlined text-2xl">{mode === "ios" ? "add_to_home_screen" : "notifications_active"}</span>
      </span>
      <div className="flex flex-col gap-space-xs min-w-0 flex-1">
        <h2 className="font-title-md text-title-md text-on-surface pr-6" id="push-prompt-title">
          {mode === "ios" ? "Get booking updates on your iPhone" : "Never miss a booking update"}
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {mode === "ios" ? (
            <>
              Tap <span className="material-symbols-outlined text-base align-text-bottom">ios_share</span> Share, then <b>Add to Home Screen</b>. Open
              WagStays from your Home Screen to turn on notifications.
            </>
          ) : (
            "Get a notification when a sitter replies or your booking changes. You can turn it off anytime in Account Settings."
          )}
        </p>
        {error && (
          <p className="font-body-sm text-body-sm text-error" role="alert">
            {error}
          </p>
        )}
        <div className="flex items-center gap-space-sm pt-space-xs">
          {mode === "push" ? (
            <>
              <button
                className="inline-flex items-center justify-center gap-1 h-9 px-space-md rounded-full bg-secondary text-on-secondary font-label-md text-label-md disabled:opacity-60"
                disabled={busy}
                onClick={enable}
                type="button"
              >
                <span className={`material-symbols-outlined text-base ${busy ? "animate-spin" : ""}`}>{busy ? "autorenew" : "notifications"}</span>
                Turn on
              </button>
              <button className="h-9 px-space-md rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low" onClick={() => close("dismissed")} type="button">
                Not now
              </button>
            </>
          ) : (
            <button className="h-9 px-space-md rounded-full bg-[#EBF3EF] text-primary-container border border-[#C8DDD4] font-label-md text-label-md" onClick={() => close("ios-seen")} type="button">
              Got it
            </button>
          )}
        </div>
      </div>
      <button
        aria-label="Dismiss"
        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
        onClick={() => close("dismissed")}
        type="button"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}
