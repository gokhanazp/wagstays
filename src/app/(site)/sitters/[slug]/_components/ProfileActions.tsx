"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FavoriteButton } from "@/components/FavoriteButton";

const pill =
  "px-space-md py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-space-xs transition-all shadow-sm";

export function ProfileActions({ sitterId, isFavorite, name }: { sitterId: string; isFavorite: boolean; name: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} on WagStays`, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-space-sm">
      <FavoriteButton activeClassName="bg-secondary-fixed" className={pill} initial={isFavorite} label="Add to Favourites" sitterId={sitterId}>
        {(fav) => (
          <>
            <span className="material-symbols-outlined text-secondary text-base" style={{ fontVariationSettings: fav ? "'FILL' 1" : "'FILL' 0" }}>
              {fav ? "favorite" : "favorite_border"}
            </span>
            <span>{fav ? "Saved" : "Add to Favourites"}</span>
          </>
        )}
      </FavoriteButton>
      <button className={pill} onClick={share} type="button">
        <span className="material-symbols-outlined text-base">{copied ? "check" : "share"}</span>
        <span aria-live="polite">{copied ? "Link copied!" : "Share Profile"}</span>
      </button>
      <Link
        className="px-space-md py-2 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center gap-space-xs hover:opacity-95 transition-all shadow-sm"
        href={`/messages/new?sitter=${sitterId}`}
      >
        <span className="material-symbols-outlined text-base">chat_bubble</span>
        <span>Message</span>
      </Link>
    </div>
  );
}
