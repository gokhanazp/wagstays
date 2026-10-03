"use client";

import { useSyncExternalStore } from "react";
import { installStore } from "./push-client";

/** "Install WagStays" menu item — only rendered when the browser offered an install prompt (Chromium). */
export function InstallAppButton({ className }: { className?: string }) {
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
      <span className="material-symbols-outlined text-lg">install_mobile</span>
      Install WagStays
    </button>
  );
}
