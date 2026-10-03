"use client";

import { useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Share link with copy-to-clipboard and the native share sheet (Web Share API) where supported. */
export function ReferralShare({ url, rewardLabel }: { url: string; rewardLabel: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.getElementById("referral-link") as HTMLInputElement | null;
      input?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    try {
      await navigator.share({
        title: "Join me on WagStays",
        text: `I use WagStays for trusted, verified pet sitters. Sign up with my link and we'll both get ${rewardLabel} in WagPoints after your first stay.`,
        url,
      });
    } catch {
      // user dismissed the share sheet
    }
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex items-center gap-space-xs p-1.5 pl-space-md rounded-full bg-surface-container-low border border-[#EFE7DE] min-w-0">
        <span className="material-symbols-outlined text-lg text-primary shrink-0">link</span>
        <input
          aria-label="Your referral link"
          className="flex-1 min-w-0 bg-transparent font-body-md text-body-md text-on-surface focus:outline-none truncate"
          id="referral-link"
          onFocus={(e) => e.currentTarget.select()}
          readOnly
          value={url.replace(/^https?:\/\//, "")}
        />
        <button
          className={`inline-flex items-center gap-1 h-9 px-space-md rounded-full font-label-md text-label-md shrink-0 transition-all ${
            copied ? "bg-primary text-on-primary" : "bg-secondary text-on-secondary hover:-translate-y-0.5"
          }`}
          onClick={copy}
          type="button"
        >
          <span className="material-symbols-outlined text-base">{copied ? "check" : "content_copy"}</span>
          <span aria-live="polite">{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      {canShare && (
        <button
          className="inline-flex items-center justify-center gap-space-xs h-11 px-space-lg rounded-full bg-[#EBF3EF] text-primary-container border border-[#C8DDD4] font-label-lg text-label-lg hover:bg-[#DCECE4] transition-all"
          onClick={share}
          type="button"
        >
          <span className="material-symbols-outlined text-xl">ios_share</span>
          Share invite
        </button>
      )}
    </div>
  );
}
