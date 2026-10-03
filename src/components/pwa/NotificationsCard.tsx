"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { removePushDevice, sendTestPush, type PushDevice } from "@/app/actions/push";
import { BTN, Card, CardHeader } from "@/components/ui";
import { currentSubscription, disablePush, enablePush, isIOS, needsHomeScreenFirst, pushSupported } from "./push-client";

type Env = "loading" | "unsupported" | "ios-home-screen" | "blocked" | "ready";
type Flash = { ok: boolean; text: string } | null;

/** Account Settings → Notifications: enable/disable on this device, device list, test notification. */
export function NotificationsCard({ vapidKey, devices }: { vapidKey: string; devices: PushDevice[] }) {
  const router = useRouter();
  const [env, setEnv] = useState<Env>("loading");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    (async () => {
      let next: Env = "ready";
      if (needsHomeScreenFirst()) next = "ios-home-screen";
      else if (!pushSupported()) next = "unsupported";
      else if (Notification.permission === "denied") next = "blocked";
      const sub = next === "ready" ? await currentSubscription().catch(() => null) : null;
      if (!alive) return;
      setEnv(next);
      setEndpoint(sub?.endpoint ?? null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // This device counts as "on" only if its browser subscription is also stored on the server.
  const thisDevice = endpoint ? devices.find((d) => d.endpoint === endpoint) : undefined;
  const on = !!thisDevice;

  const toggle = async () => {
    setBusy(true);
    setFlash(null);
    if (on) {
      await disablePush().catch(() => {});
      setEndpoint(null);
      setFlash({ ok: true, text: "Notifications are off for this device." });
    } else {
      const res = await enablePush(vapidKey);
      if (res.ok) {
        setEndpoint((await currentSubscription())?.endpoint ?? null);
        setFlash({ ok: true, text: "Notifications are on for this device." });
      } else {
        if (Notification.permission === "denied") setEnv("blocked");
        setFlash({ ok: false, text: res.error });
      }
    }
    setBusy(false);
    router.refresh();
  };

  const test = () =>
    startTransition(async () => {
      const res = await sendTestPush();
      setFlash(res.ok ? { ok: true, text: res.message ?? "Test sent." } : { ok: false, text: res.error });
    });

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await removePushDevice(id);
      if (res.ok && thisDevice?.id === id) {
        const sub = await currentSubscription();
        await sub?.unsubscribe().catch(() => {});
        setEndpoint(null);
      }
      setFlash(res.ok ? { ok: true, text: res.message ?? "Removed." } : { ok: false, text: res.error });
      router.refresh();
    });

  return (
    <Card className="pb-space-lg">
      <CardHeader icon="notifications" title="Notifications" />
      <div className="px-space-lg pt-space-md flex flex-col gap-space-md" data-testid="notifications-card">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Get a push notification for new booking requests, confirmations, cancellations and messages.
        </p>

        {env === "ios-home-screen" && (
          <Notice icon="add_to_home_screen">
            On iPhone and iPad, notifications work once WagStays is on your Home Screen: tap{" "}
            <span className="material-symbols-outlined text-base align-text-bottom">ios_share</span> <b>Share</b> → <b>Add to Home Screen</b>, then open WagStays
            from there and come back to this page.
          </Notice>
        )}
        {env === "unsupported" && (
          <Notice icon="info">
            {isIOS() ? "Update to iOS 16.4 or later to get notifications." : "This browser doesn't support push notifications. Try Chrome, Edge, Firefox or Safari."}
          </Notice>
        )}
        {env === "blocked" && (
          <Notice icon="notifications_off">Notifications are blocked for WagStays in this browser. Allow them in your browser&apos;s site settings, then try again.</Notice>
        )}

        {(env === "ready" || env === "blocked") && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm p-space-md rounded-xl bg-surface-container-low">
            <div className="flex items-center gap-space-sm min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${on ? "bg-primary" : "bg-outline-variant"}`} />
              <span className="font-label-lg text-label-lg text-on-surface">{on ? "On for this device" : "Off for this device"}</span>
            </div>
            <button className={on ? BTN.ghost : BTN.sage} disabled={busy || env === "blocked"} onClick={toggle} type="button">
              <span className={`material-symbols-outlined text-xl ${busy ? "animate-spin" : ""}`}>{busy ? "autorenew" : on ? "notifications_off" : "notifications_active"}</span>
              {on ? "Turn off" : "Turn on"}
            </button>
          </div>
        )}

        {devices.length > 0 && (
          <div className="flex flex-col gap-space-xs">
            <span className="font-label-md text-label-md uppercase tracking-wide text-on-surface-variant">Your devices</span>
            <ul className="flex flex-col divide-y divide-[#EFE7DE]">
              {devices.map((d) => (
                <li className="flex items-center justify-between gap-space-sm py-space-sm" key={d.id}>
                  <div className="flex items-center gap-space-sm min-w-0">
                    <span className="material-symbols-outlined text-xl text-on-surface-variant">{/Android|iOS/.test(d.label) ? "smartphone" : "computer"}</span>
                    <div className="min-w-0">
                      <div className="font-label-lg text-label-lg text-on-surface truncate">
                        {d.label}
                        {thisDevice?.id === d.id && <span className="ml-space-xs font-label-sm text-label-sm text-primary">· This device</span>}
                      </div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">
                        Added {new Date(d.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                  <button aria-label={`Remove ${d.label}`} className={`${BTN.small} text-on-surface-variant hover:bg-surface-container-low`} disabled={pending} onClick={() => remove(d.id)} type="button">
                    <span className="material-symbols-outlined text-base">delete</span>
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </li>
              ))}
            </ul>
            <div>
              <button className={BTN.secondary} disabled={pending} onClick={test} type="button">
                <span className="material-symbols-outlined text-xl">send</span>
                Send a test notification
              </button>
            </div>
          </div>
        )}

        {flash && (
          <p className={`flex items-center gap-1 font-body-sm text-body-sm ${flash.ok ? "text-primary" : "text-error"}`} role={flash.ok ? "status" : "alert"}>
            <span className="material-symbols-outlined text-base">{flash.ok ? "check_circle" : "error"}</span>
            {flash.text}
          </p>
        )}
      </div>
    </Card>
  );
}

function Notice({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-space-sm p-space-md rounded-xl bg-tertiary-fixed/40 text-on-surface font-body-sm text-body-sm">
      <span className="material-symbols-outlined text-xl text-tertiary shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  );
}
