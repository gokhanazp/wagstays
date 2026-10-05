"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/forms/Select";
import type { SearchFilters } from "@/lib/queries";
import type { SearchExtras } from "./search-url";
import { useSearchNav } from "./useSearchNav";

const SORTS = [
  { value: "recommended", icon: "auto_awesome", label: "recommended" },
  { value: "price-asc", icon: "trending_up", label: "priceAsc" },
  { value: "price-desc", icon: "trending_down", label: "priceDesc" },
  { value: "rating", icon: "star", label: "rating" },
  { value: "distance", icon: "near_me", label: "distance" },
] as const satisfies readonly { value: SearchFilters["sort"]; label: string; icon: string }[];

export function SortSelect({ filters: urlFilters, extras }: { filters: SearchFilters; extras: SearchExtras }) {
  const t = useTranslations("search.sort");
  const { filters, update } = useSearchNav(urlFilters, extras);
  const sorts = SORTS.map((s) => ({ ...s, label: t(s.label) }));
  const current = sorts.find((s) => s.value === filters.sort) ?? sorts[0];
  return (
    <div className="relative flex items-center gap-space-xs bg-surface-container px-space-sm sm:px-space-md py-2.5 sm:py-2 rounded-full cursor-pointer hover:bg-surface-container-high transition-colors">
      <span className="hidden sm:inline font-label-sm text-label-sm text-outline">{t("label")}</span>
      <span className="font-label-lg text-label-lg text-on-surface font-bold whitespace-nowrap">{current.label}</span>
      <span className="material-symbols-outlined text-base">expand_more</span>
      <Select
        align="end"
        aria-label={t("aria")}
        onChange={(v) => update({ sort: v as SearchFilters["sort"] })}
        options={sorts}
        value={filters.sort}
        variant="overlay"
      />
    </div>
  );
}
