"use client";

import { useTranslations } from "next-intl";
import { FavoriteButton } from "@/components/FavoriteButton";

/** Featured-card heart: FavoriteButton with the design's smaller (text-base) icon. */
export function FeaturedHeart({ sitterId, initial, name }: { sitterId: string; initial: boolean; name: string }) {
  const t = useTranslations("home.featured");
  return (
    <FavoriteButton
      activeClassName="!text-secondary"
      className="w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-center text-on-surface-variant hover:text-secondary shadow-sm transition-colors"
      initial={initial}
      label={t("saveFavourite", { name })}
      sitterId={sitterId}
    >
      {(fav) => (
        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: fav ? "'FILL' 1" : "'FILL' 0" }}>
          favorite
        </span>
      )}
    </FavoriteButton>
  );
}
