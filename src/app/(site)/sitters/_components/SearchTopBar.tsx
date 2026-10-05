"use client";

import { MAX_PETS_LIMIT } from "@/lib/quote";
import { useEffect, useRef, useState } from "react";
import { RangePanel } from "@/components/forms/DatePicker";
import { Select } from "@/components/forms/Select";
import { PET_SIZES, PET_SIZE_LABELS, SERVICE_LABELS, SERVICE_TYPES, type PetSize, type ServiceType } from "@/lib/constants";
import type { SearchFilters } from "@/lib/queries";
import { PET_KINDS, PET_KIND_META, type PetKind } from "@/lib/pets";
import { SERVICE_ICONS, formatDateRange, petTypeLabel, type SearchExtras } from "./search-url";
import { useSearchNav } from "./useSearchNav";

type Hood = { slug: string; name: string };
type CityOption = { slug: string; name: string; hoods: Hood[] };

// Mobile: 2×2 compact tiles without the icon circles; sm+: the full tiles.
const tile = "relative bg-surface-container-lowest p-space-sm px-space-sm sm:px-space-md rounded-2xl flex items-center gap-space-sm shadow-sm cursor-pointer group min-w-0";
const iconCircle = "hidden sm:flex w-10 h-10 rounded-full bg-surface-container items-center justify-center shrink-0 transition-all";
const value = "font-label-lg text-label-lg sm:font-title-md sm:text-title-md sm:tracking-normal text-on-surface truncate";

export function SearchTopBar({
  filters,
  extras,
  citySlug,
  cities,
  centreHood,
}: {
  filters: SearchFilters;
  extras: SearchExtras;
  citySlug: string;
  cities: CityOption[];
  centreHood: string;
}) {
  const { update, pending } = useSearchNav(filters, extras);
  const [service, setService] = useState<ServiceType | "">(filters.service ?? "");
  const [hood, setHood] = useState(filters.hood ?? centreHood);
  const [city, setCity] = useState(citySlug);
  const current = cities.find((c) => c.slug === city) ?? cities[0];
  const cityName = current?.name ?? "";
  const hoods = current?.hoods ?? [];
  const [sizes, setSizes] = useState<PetSize[]>(filters.sizes);
  const [pets, setPets] = useState<PetKind[]>(filters.pets);
  // Single-choice value for the "Pet type" tile: "", a kind ("CAT") or a dog size ("DOG:SMALL").
  const petValue =
    pets.length > 1 || sizes.length > 1 || (sizes.length === 1 && pets.length === 1 && pets[0] !== "DOG")
      ? "MIXED"
      : pets.length === 0
        ? sizes.length === 1 ? `DOG:${sizes[0]}` : ""
        : pets[0] === "DOG" && sizes.length === 1 ? `DOG:${sizes[0]}` : pets[0];
  const petIcon = pets.length === 1 ? PET_KIND_META[pets[0]].icon : "pets";
  const [from, setFrom] = useState(extras.from ?? "");
  const [to, setTo] = useState(extras.to ?? "");
  const [datesOpen, setDatesOpen] = useState(false);
  const datesRef = useRef<HTMLDivElement>(null);

  // The sidebar's "Select" availability link opens this popover.
  useEffect(() => {
    const open = () => {
      setDatesOpen(true);
      datesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener("wagstays:open-dates", open);
    return () => window.removeEventListener("wagstays:open-dates", open);
  }, []);

  const hoodName = hoods.find((h) => h.slug === hood)?.name ?? hood;
  const today = new Date().toISOString().slice(0, 10);

  const apply = () => {
    setDatesOpen(false);
    update(
      {
        service: service || undefined,
        city: city === citySlug && !filters.city ? undefined : city,
        hood: city === citySlug && hood === centreHood && !filters.hood ? undefined : hood,
        sizes,
        pets,
      },
      { from: from || undefined, to: to && (!from || to >= from) ? to : undefined },
    );
  };

  return (
    <section className="w-full bg-surface-container-low px-margin-mobile md:px-margin py-space-sm sm:py-space-md shadow-sm">
      <div className="max-w-[1440px] mx-auto flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-sm sm:gap-space-md">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm flex-1">
          {/* Service Selector */}
          <div className={tile}>
            <div className={`${iconCircle} text-primary group-hover:bg-primary group-hover:text-on-primary`}>
              <span className="material-symbols-outlined text-xl">{service ? SERVICE_ICONS[service] : "pets"}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Service</span>
              <span className={value}>{service ? SERVICE_LABELS[service] : "Any Service"}</span>
            </div>
            <Select
              aria-label="Service"
              onChange={(v) => setService(v as ServiceType | "")}
              options={[
                { value: "", label: "Any Service", icon: "pets" },
                ...SERVICE_TYPES.map((t) => ({ value: t, label: SERVICE_LABELS[t], icon: SERVICE_ICONS[t] })),
              ]}
              value={service}
              variant="overlay"
            />
          </div>
          {/* Location Selector */}
          <div className={tile}>
            <div className={`${iconCircle} text-secondary group-hover:bg-secondary group-hover:text-on-secondary`}>
              <span className="material-symbols-outlined text-xl">location_on</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Location</span>
              <span className={value}>
                <span className="hidden sm:inline">{cityName} / </span>
                {hoodName}
              </span>
            </div>
            <Select
              aria-label="Neighbourhood"
              onChange={(v) => {
                const [c, h] = v.split("|");
                setCity(c);
                setHood(h);
              }}
              options={
                cities.length > 1
                  ? cities.flatMap((c) => c.hoods.map((h) => ({ value: `${c.slug}|${h.slug}`, label: `${h.name}, ${c.name}`, group: c.name })))
                  : hoods.map((h) => ({ value: `${city}|${h.slug}`, label: h.name }))
              }
              panelMinWidth={260}
              value={`${city}|${hood}`}
              variant="overlay"
            />
          </div>
          {/* Date Range */}
          <div className="relative" ref={datesRef}>
            <button
              aria-expanded={datesOpen}
              className={`${tile} w-full text-left`}
              id="search-dates"
              onClick={() => setDatesOpen((o) => !o)}
              type="button"
            >
              <div className={`${iconCircle} text-tertiary group-hover:bg-tertiary-container group-hover:text-on-tertiary-container`}>
                <span className="material-symbols-outlined text-xl">calendar_month</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Date Range</span>
                <span className={value}>{formatDateRange(from || undefined, to || undefined)}</span>
              </div>
            </button>
            <RangePanel
              anchor={datesRef}
              end={to}
              min={today}
              onChange={(ns, ne) => {
                setFrom(ns);
                setTo(ne ?? "");
              }}
              onClose={() => setDatesOpen(false)}
              open={datesOpen}
              start={from}
              unitLabel="night"
            />
          </div>
          {/* Pet type (+ dog size) */}
          <div className={tile}>
            <div className={`${iconCircle} text-primary group-hover:bg-primary group-hover:text-on-primary`}>
              <span className="material-symbols-outlined text-xl">{petIcon}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Pet Type</span>
              <span className={value}>
                {(filters.petCount ?? 1) > 1 && <span data-testid="topbar-pet-count">{filters.petCount} pets · </span>}
                {petTypeLabel(pets, sizes, PET_SIZE_LABELS)}
              </span>
            </div>
            <Select
              aria-label="Pet type"
              onChange={(v) => {
                if (v === "MIXED") return;
                const [kind, size] = v.split(":");
                setPets(kind ? [kind as PetKind] : []);
                setSizes(size ? [size as PetSize] : []);
              }}
              options={[
                ...(petValue === "MIXED" ? [{ value: "MIXED", label: petTypeLabel(pets, sizes, PET_SIZE_LABELS), icon: "pets" }] : []),
                { value: "", label: "Any Pet", icon: "pets" },
                { value: "DOG", label: "Dog · Any Size", icon: PET_KIND_META.DOG.icon, group: "Dogs" },
                ...PET_SIZES.map((s) => ({ value: `DOG:${s}`, label: `${PET_SIZE_LABELS[s].label} Dog (${PET_SIZE_LABELS[s].range})`, icon: PET_KIND_META.DOG.icon, group: "Dogs" })),
                ...PET_KINDS.filter((k) => k !== "DOG").map((k) => ({ value: k, label: PET_KIND_META[k].label, icon: PET_KIND_META[k].icon, group: "Other pets" })),
              ]}
              panelMinWidth={260}
              value={petValue}
              variant="overlay"
            />
          </div>
        </div>
        <div className="flex items-center gap-space-sm">
          {/* Phones/tablets: the pet-count filter lives in the collapsed sidebar, so surface it here too */}
          <div aria-label="Number of pets" className="lg:hidden shrink-0 h-12 sm:h-14 flex items-center gap-1 pl-space-md pr-1 rounded-full bg-surface-container-lowest shadow-sm" role="group">
            <span className="material-symbols-outlined text-lg text-secondary">pets</span>
            <span className="font-label-md text-label-md text-on-surface-variant mr-1">Pets</span>
            <button
              aria-label="One pet fewer"
              className="w-9 h-9 rounded-full flex items-center justify-center text-primary bg-surface-container hover:bg-surface-container-high disabled:text-outline disabled:bg-transparent transition-colors"
              disabled={(filters.petCount ?? 1) <= 1 || pending}
              onClick={() => update({ petCount: (filters.petCount ?? 1) - 1 > 1 ? (filters.petCount ?? 1) - 1 : undefined })}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">remove</span>
            </button>
            <span aria-live="polite" className="w-6 text-center font-label-lg text-label-lg text-on-surface">
              {filters.petCount ?? 1}
            </span>
            <button
              aria-label="One pet more"
              className="w-9 h-9 rounded-full flex items-center justify-center text-primary bg-surface-container hover:bg-surface-container-high disabled:text-outline disabled:bg-transparent transition-colors"
              disabled={(filters.petCount ?? 1) >= MAX_PETS_LIMIT || pending}
              onClick={() => update({ petCount: (filters.petCount ?? 1) + 1 })}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          </div>
          <button
            className="flex-1 xl:flex-none w-full xl:w-auto h-12 sm:h-14 px-space-xl rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg flex items-center justify-center gap-space-xs shadow-md hover:bg-secondary-container hover:text-on-secondary-container transition-all active:scale-95 disabled:opacity-70"
            disabled={pending}
            onClick={apply}
            type="button"
          >
            <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "progress_activity" : "tune"}</span>
            <span>Update Filters</span>
          </button>
        </div>
      </div>
    </section>
  );
}
