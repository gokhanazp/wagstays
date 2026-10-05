"use client";

import { subscribePush, unsubscribePush } from "@/app/actions/push";

// Browser-side helpers for the service worker, Web Push and install prompt. All functions are safe to call in
// unsupported browsers (they report "unsupported" instead of throwing).

export const SW_URL = "/sw.js";

export function swAllowed() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  return process.env.NODE_ENV === "production" || ["localhost", "127.0.0.1"].includes(location.hostname);
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iOS only supports web push for sites added to the Home Screen. */
export function needsHomeScreenFirst() {
  return isIOS() && !isStandalone();
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker() {
  if (!swAllowed()) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch (e) {
    console.warn("[pwa] service worker registration failed", e);
    return null;
  }
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return reg ? reg.pushManager.getSubscription() : null;
}

export type PushErrorTexts = Record<"unsupported" | "blocked" | "notGranted" | "failed", string>;
const EN_ERRORS: PushErrorTexts = {
  unsupported: "This browser doesn't support notifications.",
  blocked: "Notifications are blocked. Allow them in your browser's site settings.",
  notGranted: "Permission wasn't granted.",
  failed: "Couldn't turn on notifications in this browser.",
};

/**
 * Asks for permission (must be called from a user gesture), subscribes and stores the subscription.
 * `errors` are the translated messages (common.push); English by default.
 */
export async function enablePush(vapidKey: string, errors: PushErrorTexts = EN_ERRORS): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!pushSupported()) return { ok: false, error: errors.unsupported };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: permission === "denied" ? errors.blocked : errors.notGranted };
  }
  try {
    const reg = await registration();
    const key = urlBase64ToUint8Array(vapidKey);
    let sub = await reg.pushManager.getSubscription();
    // A subscription made with a different (rotated) key can't be used — replace it.
    const existingKey = sub?.options.applicationServerKey;
    if (sub && existingKey && !equalBytes(new Uint8Array(existingKey), key)) {
      await sub.unsubscribe();
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const json = sub.toJSON();
    const res = await subscribePush({ endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent.slice(0, 300) });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  } catch (e) {
    console.warn("[pwa] subscribe failed", e);
    return { ok: false, error: errors.failed };
  }
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await unsubscribePush(sub.endpoint);
  await sub.unsubscribe().catch(() => {});
}

function equalBytes(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ---- Install prompt (beforeinstallprompt, Chromium only) -------------------------------------------------------

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Inline script rendered by PwaClient: captures beforeinstallprompt before React hydrates. */
export const EARLY_INSTALL_SCRIPT =
  "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__wsInstall=e;},{once:true});";

/** Called once from the root client component so the event isn't missed while menus are closed. */
export function captureInstallPrompt() {
  // Pick up an event captured by the early inline script (it can fire before hydration).
  const w = window as Window & { __wsInstall?: BeforeInstallPromptEvent | null };
  if (w.__wsInstall) {
    deferred = w.__wsInstall;
    w.__wsInstall = null;
    notify();
  }
  const onPrompt = (e: Event) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  };
  const onInstalled = () => {
    deferred = null;
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export const installStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  canInstall: () => deferred !== null,
  canInstallServer: () => false,
  async prompt() {
    const e = deferred;
    if (!e) return;
    deferred = null;
    notify();
    await e.prompt();
    await e.userChoice.catch(() => null);
  },
};
