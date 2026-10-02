"use client";

import { useEffect, useRef, useState } from "react";
import { RangePanel } from "@/components/forms/DatePicker";
import { Select } from "@/components/forms/Select";
import { PET_SIZES, PET_SIZE_LABELS, SERVICE_LABELS, SERVICE_TYPES, type PetSize, type ServiceType } from "@/lib/constants";
import type { SearchFilters } from "@/lib/queries";
import { SERVICE_ICONS, formatDateRange, petLabel, type SearchExtras } from "./search-url";
import { useSearchNav } from "./useSearchNav";

type Hood = { slug: string; name: string };
type CityOption = { slug: string; name: string; hoods: Hood[] };

const tile = "relative bg-surface-container-lowest p-space-sm px-space-md rounded-2xl flex items-center gap-space-sm shadow-sm cursor-pointer group";

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
      },
      { from: from || undefined, to: to && (!from || to >= from) ? to : undefined },
    );
  };

  return (
    <section className="w-full bg-surface-container-low px-margin-mobile md:px-margin py-space-md shadow-sm">
      <div className="max-w-[1440px] mx-auto flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm flex-1">
          {/* Service Selector */}
          <div className={tile}>
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
              <span className="material-symbols-outlined text-xl">{service ? SERVICE_ICONS[service] : "pets"}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Service</span>
              <span className="font-title-md text-title-md text-on-surface truncate">{service ? SERVICE_LABELS[service] : "Any Service"}</span>
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
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-all">
              <span className="material-symbols-outlined text-xl">location_on</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Location</span>
              <span className="font-title-md text-title-md text-on-surface truncate">
                {cityName} / {hoodName}
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
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-tertiary group-hover:bg-tertiary-container group-hover:text-on-tertiary-container transition-all">
                <span className="material-symbols-outlined text-xl">calendar_month</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Date Range</span>
                <span className="font-title-md text-title-md text-on-surface truncate">{formatDateRange(from || undefined, to || undefined)}</span>
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
          {/* Pet Profile Spec */}
          <div className={tile}>
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
              <span className="material-symbols-outlined text-xl">pets</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Pet</span>
              <span className="font-title-md text-title-md text-on-surface truncate">{petLabel(sizes, PET_SIZE_LABELS)}</span>
            </div>
            <Select
              aria-label="Dog size"
              onChange={(v) => setSizes(v ? [v as PetSize] : [])}
              options={[
                { value: "", label: sizes.length > 1 ? petLabel(sizes, PET_SIZE_LABELS) : "Any Dog Size" },
                ...PET_SIZES.map((s) => ({ value: s, label: `1 ${PET_SIZE_LABELS[s].label} Dog (${PET_SIZE_LABELS[s].range})` })),
              ]}
              panelMinWidth={260}
              value={sizes.length === 1 ? sizes[0] : ""}
              variant="overlay"
            />
          </div>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            className="w-full xl:w-auto h-14 px-space-xl rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg flex items-center justify-center gap-space-xs shadow-md hover:bg-secondary-container hover:text-on-secondary-container transition-all active:scale-95 disabled:opacity-70"
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
