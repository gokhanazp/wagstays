"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { PET_SIZES, PET_SIZE_LABELS, SERVICE_LABELS, type PetSize, type ServiceType } from "@/lib/constants";
import type { SearchFilters } from "@/lib/queries";
import { PET_KINDS, PET_KIND_META, type PetKind } from "@/lib/pets";
import { MAX_PETS_LIMIT } from "@/lib/quote";
import { RATE_LABEL, buildSearchHref, type SearchExtras } from "./search-url";
import { useSearchNav } from "./useSearchNav";

type Flag = "yard" | "smokeFree" | "noPets" | "noKids" | "superSitter" | "vet" | "trainer" | "idVerified";

const SERVICE_ROWS: ServiceType[] = ["DOG_WALKING", "BOARDING", "DAY_CARE", "DROP_IN"];

const HOME_ROWS: { key: Flag; label: string }[] = [
  { key: "yard", label: "Home with a Yard" },
  { key: "smokeFree", label: "Smoke-Free Home" },
  { key: "noPets", label: "No Other Pets" },
  { key: "noKids", label: "Quiet Home, No Kids" },
];

const chipBase = "px-3 py-1.5 rounded-full font-label-sm text-label-sm flex items-center gap-1 transition-colors";
const chipOff = "bg-surface-container text-on-surface hover:bg-surface-container-high";
const QUAL_CHIPS: { key: Flag; label: string; icon?: string; iconClass?: string; on: string }[] = [
  { key: "superSitter", label: "Super Sitter", icon: "hotel_class", iconClass: "text-secondary", on: "bg-secondary-fixed text-on-secondary-fixed" },
  { key: "vet", label: "Vet Knowledge", on: "bg-primary-fixed text-on-primary-fixed-variant" },
  { key: "trainer", label: "Professional Trainer", on: "bg-primary-fixed text-on-primary-fixed-variant" },
  { key: "idVerified", label: "ID Verified", icon: "verified", on: "bg-primary-fixed text-on-primary-fixed-variant" },
];

const rowClass = "flex items-center gap-space-sm p-space-xs rounded-xl hover:bg-surface-container cursor-pointer transition-colors";
const checkClass = "w-5 h-5 rounded accent-primary cursor-pointer";

export function FilterSidebar({
  filters: urlFilters,
  extras,
  priceRange,
  serviceCounts,
  medicalCount,
  kindCounts,
}: {
  filters: SearchFilters;
  extras: SearchExtras;
  priceRange: { min: number; max: number };
  serviceCounts: Record<ServiceType, number>;
  medicalCount: number;
  kindCounts: Record<PetKind, number>;
}) {
  const { filters, update } = useSearchNav(urlFilters, extras);
  const [open, setOpen] = useState(false); // mobile only; always expanded on lg+
  const urlMax = Math.min(priceRange.max, Math.max(priceRange.min, urlFilters.maxPrice ?? priceRange.max));
  const [max, setMax] = useState(urlMax);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the slider in sync when the URL changes elsewhere (e.g. Reset, back button).
  const [prevUrlMax, setPrevUrlMax] = useState(urlMax);
  if (prevUrlMax !== urlMax) {
    setPrevUrlMax(urlMax);
    setMax(urlMax);
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onSlide = (v: number) => {
    setMax(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ maxPrice: v >= priceRange.max ? undefined : v }), 350);
  };

  const toggleSize = (s: PetSize) =>
    update({ sizes: filters.sizes.includes(s) ? filters.sizes.filter((x) => x !== s) : PET_SIZES.filter((x) => x === s || filters.sizes.includes(x)) });

  const togglePet = (k: PetKind) =>
    update({ pets: filters.pets.includes(k) ? filters.pets.filter((x) => x !== k) : PET_KINDS.filter((x) => x === k || filters.pets.includes(x)) });
  const showSizes = !filters.pets.length || filters.pets.includes("DOG");
  const petCount = filters.petCount ?? 1;

  const activeCount =
    (filters.service ? 1 : 0) +
    filters.pets.length +
    (filters.maxPrice !== undefined ? 1 : 0) +
    filters.sizes.length +
    ((filters.petCount ?? 1) > 1 ? 1 : 0) +
    (["yard", "smokeFree", "noPets", "noKids", "superSitter", "vet", "trainer", "idVerified"] as const).filter((k) => filters[k]).length;

  const maxLabel = max >= priceRange.max ? `$${priceRange.max}+` : `$${max}`;

  return (
    <aside className="w-full lg:w-[280px] shrink-0 flex flex-col gap-space-lg lg:sticky top-28 bg-surface-container-lowest px-space-md py-space-sm lg:p-space-lg rounded-3xl shadow-sm">
      <div className="flex items-center justify-between lg:pb-space-xs">
        <button
          aria-expanded={open}
          className="flex-1 lg:flex-none min-h-11 lg:min-h-0 flex items-center gap-space-xs lg:pointer-events-none"
          onClick={() => setOpen((o) => !o)}
          type="button"
        >
          <span className="material-symbols-outlined text-primary text-xl">filter_list</span>
          <h2 className="font-title-md text-title-md text-on-surface">Filters</h2>
          {activeCount > 0 && (
            <span className="lg:hidden px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm">{activeCount}</span>
          )}
          <span className="lg:!hidden material-symbols-outlined text-base text-outline">{open ? "expand_less" : "expand_more"}</span>
        </button>
        <Link
          className="px-space-xs py-3 -my-3 lg:p-0 lg:my-0 font-label-sm text-label-sm text-secondary hover:underline cursor-pointer"
          href={buildSearchHref({ view: filters.view, hood: filters.hood }, extras)}
          replace
          scroll={false}
        >
          Reset
        </Link>
      </div>

      <div className={`${open ? "flex" : "hidden"} lg:flex flex-col gap-space-lg pb-space-sm lg:pb-0`}>
        {/* Price Range Slider */}
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-lg text-label-lg text-on-surface">{RATE_LABEL[filters.service ?? "DOG_WALKING"]}</span>
            <span className="font-label-md text-label-md text-primary font-bold bg-primary-fixed px-2.5 py-0.5 rounded-full">
              ${priceRange.min} – {maxLabel}
            </span>
          </div>
          <div className="relative flex items-center py-2">
            <input
              aria-label="Maximum price"
              className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
              max={priceRange.max}
              min={priceRange.min}
              onChange={(e) => onSlide(Number(e.target.value))}
              step={1}
              type="range"
              value={max}
            />
          </div>
          <div className="flex justify-between font-body-sm text-body-sm text-outline">
            <span>${priceRange.min}</span>
            <span>${priceRange.max}+</span>
          </div>
        </div>

        {/* Service Types */}
        <div className="flex flex-col gap-space-sm pt-space-xs">
          <span className="font-label-lg text-label-lg text-on-surface">Service Type</span>
          <div className="flex flex-col gap-space-xs">
            {SERVICE_ROWS.map((t) => (
              <label className={rowClass} key={t}>
                <input
                  checked={filters.service === t}
                  className={checkClass}
                  onChange={() => update({ service: filters.service === t ? undefined : t })}
                  type="checkbox"
                />
                <span className="font-body-md text-body-md text-on-surface flex-1">{SERVICE_LABELS[t]}</span>
                <span className="font-label-sm text-label-sm text-outline">{serviceCounts[t] ?? 0}</span>
              </label>
            ))}
            <label className={rowClass}>
              <input checked={filters.vet} className={checkClass} onChange={() => update({ vet: !filters.vet })} type="checkbox" />
              <span className="font-body-md text-body-md text-on-surface flex-1">Medication &amp; Medical Care</span>
              <span className="font-label-sm text-label-sm text-outline">{medicalCount}</span>
            </label>
          </div>
        </div>

        {/* Pets in one booking: only sitters who take that many (extra-pet rate + max pets per booking) */}
        <div className="flex flex-col gap-1.5 pt-space-xs" data-testid="pet-count-filter">
          <div className="flex items-center justify-between gap-space-sm">
            <span className="font-label-lg text-label-lg text-on-surface" id="pet-count-label">
              Number of pets
            </span>
            <div aria-labelledby="pet-count-label" className="flex items-center gap-1 bg-surface-container rounded-full p-0.5" role="group">
              <button
                aria-label="One pet fewer"
                className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-surface-container-lowest disabled:text-outline disabled:hover:bg-transparent transition-colors"
                disabled={petCount <= 1}
                onClick={() => update({ petCount: petCount - 1 > 1 ? petCount - 1 : undefined })}
                type="button"
              >
                <span className="material-symbols-outlined text-lg">remove</span>
              </button>
              <span aria-live="polite" className="w-6 text-center font-label-lg text-label-lg text-on-surface" data-testid="pet-count-value">
                {petCount}
              </span>
              <button
                aria-label="One pet more"
                className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-surface-container-lowest disabled:text-outline disabled:hover:bg-transparent transition-colors"
                disabled={petCount >= MAX_PETS_LIMIT}
                onClick={() => update({ petCount: petCount + 1 })}
                type="button"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
            </div>
          </div>
          <p className="font-body-sm text-body-sm text-outline">
            {petCount > 1 ? `Showing sitters who take ${petCount} pets in one booking.` : "In one booking. Extra pets usually cost a little more."}
          </p>
        </div>

        {/* Pet types (sitter must accept every selected kind) */}
        <div className="flex flex-col gap-space-sm pt-space-xs">
          <span className="font-label-lg text-label-lg text-on-surface">Pet Type</span>
          <div className="flex flex-wrap gap-space-xs">
            {PET_KINDS.filter((k) => kindCounts[k] > 0 || filters.pets.includes(k)).map((k) => {
              const on = filters.pets.includes(k);
              return (
                <button
                  aria-pressed={on}
                  className={`${chipBase} ${on ? "bg-primary text-on-primary" : chipOff}`}
                  key={k}
                  onClick={() => togglePet(k)}
                  type="button"
                >
                  <span className={`material-symbols-outlined text-sm ${on ? "" : "text-outline"}`}>{PET_KIND_META[k].icon}</span>
                  <span>{PET_KIND_META[k].label}</span>
                  <span className={on ? "text-on-primary/80" : "text-outline"}>{kindCounts[k]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pet Size Acceptance */}
        <div className={`flex flex-col gap-space-sm pt-space-xs ${showSizes ? "" : "hidden"}`}>
          <span className="font-label-lg text-label-lg text-on-surface">Dog Size</span>
          <div className="grid grid-cols-2 gap-space-xs">
            {PET_SIZES.map((s) => {
              const on = filters.sizes.includes(s);
              return (
                <button
                  aria-pressed={on}
                  className={`flex flex-col items-center justify-center p-space-sm rounded-2xl transition-all ${
                    on ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                  }`}
                  key={s}
                  onClick={() => toggleSize(s)}
                  type="button"
                >
                  <span className="font-label-sm text-label-sm font-bold">{PET_SIZE_LABELS[s].label}</span>
                  <span className={`font-label-sm text-label-sm ${on ? "text-on-primary/80" : "text-outline"}`}>{PET_SIZE_LABELS[s].range}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Home & Environment */}
        <div className="flex flex-col gap-space-sm pt-space-xs">
          <span className="font-label-lg text-label-lg text-on-surface">Home &amp; Environment</span>
          <div className="flex flex-col gap-space-xs">
            {HOME_ROWS.map((r) => (
              <label className={rowClass} key={r.key}>
                <input checked={filters[r.key]} className={checkClass} onChange={() => update({ [r.key]: !filters[r.key] })} type="checkbox" />
                <span className="font-body-sm text-body-sm text-on-surface flex-1">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Sitter Qualifications */}
        <div className="flex flex-col gap-space-sm pt-space-xs">
          <span className="font-label-lg text-label-lg text-on-surface">Sitter Qualifications</span>
          <div className="flex flex-wrap gap-space-xs">
            {QUAL_CHIPS.map((c) => {
              const on = filters[c.key];
              return (
                <button aria-pressed={on} className={`${chipBase} ${on ? c.on : chipOff}`} key={c.key} onClick={() => update({ [c.key]: !on })} type="button">
                  {c.icon && <span className={`material-symbols-outlined text-sm ${on ? (c.iconClass ?? "") : "text-outline"}`}>{c.icon}</span>}
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Calendar View Trigger */}
        <div className="p-space-sm bg-surface-container-low rounded-2xl flex items-center justify-between mt-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-xl">event_available</span>
            <span className="font-label-md text-label-md text-on-surface">Availability</span>
          </div>
          <button
            className="font-label-sm text-label-sm text-primary font-bold underline cursor-pointer"
            onClick={() => window.dispatchEvent(new Event("wagstays:open-dates"))}
            type="button"
          >
            Select
          </button>
        </div>
      </div>
    </aside>
  );
}
