"use client";

import { useRouter } from "next/navigation";
import { useCallback, useOptimistic, useTransition } from "react";
import type { SearchFilters } from "@/lib/queries";
import { buildSearchHref, type SearchExtras } from "./search-url";

/**
 * Pushes a filter patch into the URL (router.replace, no scroll). Any filter change resets to page 1.
 * Returns optimistic filters so checkboxes/chips flip instantly while the server re-renders.
 */
export function useSearchNav(filters: SearchFilters, extras: SearchExtras) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(filters);
  const update = useCallback(
    (patch: Partial<SearchFilters>, nextExtras: SearchExtras = extras) => {
      const next = { ...optimistic, page: 1, ...patch };
      startTransition(() => {
        setOptimistic(next);
        router.replace(buildSearchHref(next, nextExtras), { scroll: false });
      });
    },
    [optimistic, extras, router, setOptimistic],
  );
  return { filters: optimistic, update, pending };
}
