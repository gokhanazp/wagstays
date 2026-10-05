"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { FavoriteButton } from "@/components/FavoriteButton";

// Icon-only circles on mobile, labelled pills from `sm` up.
const pill =
  "w-10 h-10 sm:w-auto sm:h-auto justify-center sm:px-space-md sm:py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-space-xs transition-all shadow-sm";

export function ProfileActions({ sitterId, isFavorite, name }: { sitterId: string; isFavorite: boolean; name: string }) {
  const t = useTranslations("profile.actions");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: t("shareTitle", { name }), url });
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
      window.prompt(t("copyPrompt"), url);
    }
  }

  return (
    <div className="flex items-center gap-space-xs sm:gap-space-sm shrink-0">
      <FavoriteButton activeClassName="bg-secondary-fixed" className={pill} initial={isFavorite} label={t("addFavorite")} sitterId={sitterId}>
        {(fav) => (
          <>
            <span className="material-symbols-outlined text-secondary text-base" style={{ fontVariationSettings: fav ? "'FILL' 1" : "'FILL' 0" }}>
              {fav ? "favorite" : "favorite_border"}
            </span>
            <span className="hidden sm:inline">{fav ? t("saved") : t("addFavorite")}</span>
          </>
        )}
      </FavoriteButton>
      <button aria-label={t("shareAria")} className={pill} onClick={share} type="button">
        <span className="material-symbols-outlined text-base">{copied ? "check" : "share"}</span>
        <span aria-live="polite" className="hidden sm:inline">{copied ? t("linkCopied") : t("share")}</span>
      </button>
      <Link
        aria-label={t("message")}
        className="w-10 h-10 sm:w-auto sm:h-auto justify-center sm:px-space-md sm:py-2 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center gap-space-xs hover:opacity-95 transition-all shadow-sm"
        href={`/messages/new?sitter=${sitterId}`}
      >
        <span className="material-symbols-outlined text-base">chat_bubble</span>
        <span className="hidden sm:inline">{t("message")}</span>
      </Link>
    </div>
  );
}
