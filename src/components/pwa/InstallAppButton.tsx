"use client";

import { useSyncExternalStore } from "react";
import { installStore } from "./push-client";

/**
 * "Get the app" menu item: adds WagStays to the home screen as an app (PWA). Only rendered when the browser offered
 * an install prompt (Chromium on Android/desktop) — iOS Safari has no prompt, and installed users never see it.
 */
export function InstallAppButton({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  const canInstall = useSyncExternalStore(installStore.subscribe, installStore.canInstall, installStore.canInstallServer);
  if (!canInstall) return null;
  return (
    <button
      className={
        className ??
        "w-full flex items-center gap-space-sm text-left px-space-md py-space-sm rounded-xl font-label-lg text-label-lg text-primary hover:bg-surface-container-low"
      }
      onClick={() => void installStore.prompt()}
      type="button"
    >
      <span className={iconClassName ?? "contents"}>
        <span className="material-symbols-outlined text-lg">install_mobile</span>
      </span>
      <span className="flex flex-col leading-tight">
        Get the app
        <span className="font-body-sm text-[12px] text-on-surface-variant font-normal">Add WagStays to your home screen</span>
      </span>
    </button>
  );
}
