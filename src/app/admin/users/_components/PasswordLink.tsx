"use client";

import { useState, useTransition } from "react";
import { adminCreatePasswordLink } from "@/app/actions/password";
import { BTN } from "@/components/ui";

/** Generates a one-time set-password link the admin can pass to the user (no email sending in local dev). */
export function PasswordLink({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<{ url?: string; expiresInHours?: number; error?: string }>();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-space-sm px-space-lg">
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Create a one-time link so this person can set a new password. Any earlier link stops working.
      </p>
      <button
        className={`${BTN.small} bg-surface-container-high text-on-surface hover:brightness-95 w-fit`}
        disabled={pending}
        onClick={() => start(async () => setLink(await adminCreatePasswordLink(userId)))}
        type="button"
      >
        <span className="material-symbols-outlined text-base">key</span>
        {pending ? "Creating…" : "Create password link"}
      </button>
      {link?.error && <p className="font-body-sm text-body-sm text-error">{link.error}</p>}
      {link?.url && (
        <div className="flex flex-col gap-space-xs p-space-md rounded-xl bg-surface-container-low">
          <code className="font-body-sm text-body-sm text-on-surface break-all">{link.url}</code>
          <div className="flex items-center gap-space-sm">
            <button
              className={`${BTN.small} bg-primary text-on-primary`}
              onClick={async () => {
                await navigator.clipboard.writeText(link.url!);
                setCopied(true);
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-base">{copied ? "check" : "content_copy"}</span>
              {copied ? "Copied" : "Copy link"}
            </button>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Expires in {link.expiresInHours} hours · shown once</span>
          </div>
        </div>
      )}
    </div>
  );
}
