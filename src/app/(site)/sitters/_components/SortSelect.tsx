"use client";

import { Select } from "@/components/forms/Select";
import type { SearchFilters } from "@/lib/queries";
import type { SearchExtras } from "./search-url";
import { useSearchNav } from "./useSearchNav";

const SORTS: { value: SearchFilters["sort"]; label: string; icon: string }[] = [
  { value: "recommended", icon: "auto_awesome", label: "Recommended" },
  { value: "price-asc", icon: "trending_up", label: "Price: low to high" },
  { value: "price-desc", icon: "trending_down", label: "Price: high to low" },
  { value: "rating", icon: "star", label: "Top rated" },
  { value: "distance", icon: "near_me", label: "Nearest" },
];

export function SortSelect({ filters: urlFilters, extras }: { filters: SearchFilters; extras: SearchExtras }) {
  const { filters, update } = useSearchNav(urlFilters, extras);
  const current = SORTS.find((s) => s.value === filters.sort) ?? SORTS[0];
  return (
    <div className="relative flex items-center gap-space-xs bg-surface-container px-space-sm sm:px-space-md py-2 rounded-full cursor-pointer hover:bg-surface-container-high transition-colors">
      <span className="font-label-sm text-label-sm text-outline">Sort:</span>
      <span className="font-label-lg text-label-lg text-on-surface font-bold whitespace-nowrap">{current.label}</span>
      <span className="material-symbols-outlined text-base">expand_more</span>
      <Select
        align="end"
        aria-label="Sort results"
        onChange={(v) => update({ sort: v as SearchFilters["sort"] })}
        options={SORTS}
        value={filters.sort}
        variant="overlay"
      />
    </div>
  );
}
