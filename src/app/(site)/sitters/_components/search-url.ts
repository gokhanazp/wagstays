import { SERVICE_SLUGS, type PetSize, type ServiceType } from "@/lib/constants";
import type { SearchFilters } from "@/lib/queries";
import { PET_KIND_META, type PetKind } from "@/lib/pets";

/**
 * The date range (`from` / `to`, YYYY-MM-DD). It filters results by sitter availability on the server
 * (SearchFilters.from/to) and is carried separately here so the top bar can set or clear it.
 */
export type SearchExtras = { from?: string; to?: string };

/**
 * Client-safe mirror of `toSearchQuery` from `@/lib/queries` (that module is server-only).
 * Keep the two in sync — same param names and defaults. Dates come from `extras` when it has the
 * key (so the top bar can clear them), otherwise from the filters.
 */
export function buildSearchHref(f: Partial<SearchFilters>, extras: SearchExtras = {}) {
  const q = new URLSearchParams();
  if (f.city) q.set("city", f.city);
  if (f.service) q.set("service", SERVICE_SLUGS[f.service]);
  if (f.hood) q.set("hood", f.hood);
  if (f.minPrice !== undefined) q.set("minPrice", String(f.minPrice));
  if (f.maxPrice !== undefined) q.set("maxPrice", String(f.maxPrice));
  if (f.pets?.length) q.set("pets", f.pets.join(",").toLowerCase());
  if (f.sizes?.length) q.set("sizes", f.sizes.join(",").toLowerCase());
  for (const k of ["yard", "smokeFree", "noPets", "noKids", "superSitter", "vet", "trainer", "idVerified"] as const) {
    if (f[k]) q.set(k, "1");
  }
  if (f.sort && f.sort !== "recommended") q.set("sort", f.sort);
  if (f.page && f.page > 1) q.set("page", String(f.page));
  if (f.view === "map") q.set("view", "map");
  const from = "from" in extras ? extras.from : f.from;
  const to = "to" in extras ? extras.to : f.to;
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const s = q.toString();
  return `/sitters${s ? `?${s}` : ""}`;
}

/** Appends the date extras to a query string produced by `toSearchQuery`. */
export function withExtras(query: string, extras: SearchExtras) {
  const q = new URLSearchParams(query.replace(/^\?/, ""));
  if (extras.from) q.set("from", extras.from);
  if (extras.to) q.set("to", extras.to);
  const s = q.toString();
  return `/sitters${s ? `?${s}` : ""}`;
}

export const SERVICE_ICONS: Record<ServiceType, string> = {
  DOG_WALKING: "directions_walk",
  BOARDING: "night_shelter",
  DAY_CARE: "sunny",
  DROP_IN: "home",
};

export const UNIT_LONG: Record<string, string> = { WALK: "hour", NIGHT: "night", DAY: "day", VISIT: "visit" };
export const UNIT_SHORT: Record<string, string> = { WALK: "hr", NIGHT: "night", DAY: "day", VISIT: "visit" };

export const RATE_LABEL: Record<ServiceType, string> = {
  DOG_WALKING: "Hourly Rate",
  BOARDING: "Nightly Rate",
  DAY_CARE: "Daily Rate",
  DROP_IN: "Per-Visit Rate",
};

const fmtDate = (iso: string, withYear: boolean) => {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
};

/** "Oct 18 – Oct 22, 2026" */
export function formatDateRange(from?: string, to?: string) {
  if (from && to) return `${fmtDate(from, false)} – ${fmtDate(to, true)}`;
  if (from) return `From ${fmtDate(from, true)}`;
  if (to) return `Until ${fmtDate(to, true)}`;
  return "Add dates";
}

/** Top-bar "Pet type" summary: "Any Pet", "Cat", "Dog · Small", "Cat + Rabbit". */
export function petTypeLabel(pets: PetKind[], sizes: PetSize[], labels: Record<PetSize, { label: string }>) {
  const dogSizes = sizes.length && (!pets.length || pets.includes("DOG"));
  if (!pets.length) return dogSizes ? petLabel(sizes, labels) : "Any Pet";
  if (pets.length === 1 && pets[0] === "DOG") return petLabel(sizes, labels);
  const kinds = pets.length > 2 ? `${pets.length} pet types` : pets.map((k) => (k === "OTHER" ? "Other" : PET_KIND_META[k].label)).join(" + ");
  return kinds;
}

export function petLabel(sizes: PetSize[], labels: Record<PetSize, { label: string }>) {
  if (sizes.length === 0) return "Any Dog Size";
  if (sizes.length === 1) return `1 ${labels[sizes[0]].label} Dog`;
  return sizes.map((s) => labels[s].label).join(" + ") + " Dogs";
}
