"use client";

import { useRouter } from "@/i18n/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { RangePanel } from "@/components/forms/DatePicker";
import { Popover } from "@/components/forms/Popover";
import { Select } from "@/components/forms/Select";
import { PET_KINDS, PET_KIND_META, type PetKind } from "@/lib/pets";

type Hood = { slug: string; name: string; city: string; cityLabel: string };

const TABS = [
  { slug: "boarding", icon: "roofing", label: "Overnight Boarding" },
  { slug: "dog-walking", icon: "directions_walk", label: "Dog Walking" },
  { slug: "day-care", icon: "sunny", label: "Doggy Day Care" },
  { slug: "drop-in", icon: "home_pin", label: "Drop-In Visits" },
] as const;

const MIN_PETS = 1;
const MAX_PETS = 8;

const fmtDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric" });

export function HomeSearch({
  hoods,
  defaultCity,
  defaultHood,
  defaultStart,
  defaultEnd,
  today,
}: {
  /** neighbourhoods of every active city; `cityLabel` e.g. "Toronto, ON" */
  hoods: Hood[];
  defaultCity: string;
  defaultHood?: string;
  defaultStart: string;
  defaultEnd: string;
  /** yyyy-mm-dd, computed on the server so markup matches during hydration */
  today: string;
}) {
  const router = useRouter();
  const listId = useId();
  const [service, setService] = useState<(typeof TABS)[number]["slug"]>("boarding");
  const [where, setWhere] = useState(() => {
    const h = hoods.find((x) => x.city === defaultCity && x.slug === defaultHood);
    return h ? `${h.name}, ${h.cityLabel}` : "";
  });
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [datesOpen, setDatesOpen] = useState(false);
  const [pets, setPets] = useState(1);
  // "" = any pet; otherwise the kind every sitter in the results must accept (search `pets=`)
  const [kind, setKind] = useState<PetKind | "">("");
  const pickKind = (k: PetKind | "") => {
    setKind(k);
    if (k && k !== "DOG" && service === "dog-walking") setService("drop-in"); // walks are for dogs
  };
  const pickService = (slug: (typeof TABS)[number]["slug"]) => {
    setService(slug);
    if (slug === "dog-walking" && kind && kind !== "DOG") setKind("DOG");
  };
  const kindNoun = (k: PetKind | "", n: number) => {
    if (!k || k === "OTHER") return n > 1 ? "Pets" : "Pet";
    const m = PET_KIND_META[k];
    return n > 1 ? m.plural.replace(/\b\w/g, (c) => c.toUpperCase()) : m.label;
  };
  const datesAnchor = useRef<HTMLDivElement>(null);
  const whereTile = useRef<HTMLDivElement>(null);
  const whereInput = useRef<HTMLInputElement>(null);
  const [whereOpen, setWhereOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // search-as-you-type over neighbourhoods, kept in city order so they render grouped
  const suggestions = useMemo(() => {
    const t = where.trim().toLowerCase();
    const label = (h: Hood) => `${h.name}, ${h.cityLabel}`;
    const list = !t
      ? hoods
      : hoods.filter((h) => label(h).toLowerCase().includes(t) || h.name.toLowerCase().includes(t) || t.includes(h.name.toLowerCase()));
    const cities = [...new Set(list.map((h) => h.cityLabel))];
    return cities.flatMap((c) => list.filter((h) => h.cityLabel === c));
  }, [hoods, where]);

  const pickHood = (h: Hood) => {
    setWhere(`${h.name}, ${h.cityLabel}`);
    setWhereOpen(false);
    setActive(-1);
    whereInput.current?.focus();
  };

  const onWhereKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!whereOpen) {
        setWhereOpen(true);
        setActive(0);
        return;
      }
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => Math.min(Math.max(i + dir, 0), suggestions.length - 1));
    } else if (e.key === "Enter" && whereOpen && active >= 0 && suggestions[active]) {
      e.preventDefault();
      pickHood(suggestions[active]);
    } else if (e.key === "Escape" && whereOpen) {
      e.preventDefault();
      setWhereOpen(false);
    } else if (e.key === "Tab") setWhereOpen(false);
  };

  const matchHood = (text: string) => {
    const t = text.trim().toLowerCase();
    if (!t) return undefined;
    // Longest name first so "Upper Beaches" wins over "The Beaches"-style partial overlaps.
    const sorted = [...hoods].sort((a, b) => b.name.length - a.name.length);
    return (
      sorted.find((h) => t === `${h.name}, ${h.cityLabel}`.toLowerCase()) ??
      sorted.find((h) => t.startsWith(h.name.toLowerCase())) ??
      sorted.find((h) => t.includes(h.name.toLowerCase())) ??
      sorted.find((h) => h.name.toLowerCase().includes(t))
    );
  };

  const submit = () => {
    const q = new URLSearchParams({ service });
    const hood = matchHood(where);
    if (hood) {
      if (hood.city !== defaultCity) q.set("city", hood.city);
      q.set("hood", hood.slug);
    }
    if (start) q.set("start", start);
    if (end) q.set("end", end);
    if (kind) q.set("pets", kind.toLowerCase());
    if (pets > 1) q.set("petCount", String(pets));
    router.push(`/sitters?${q.toString()}`);
  };

  return (
    <form
      className="w-full bg-surface-container-lowest rounded-3xl p-space-md lg:p-space-lg shadow-xl shadow-surface-dim/40 relative z-20"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* Service Selector Tabs */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-space-sm mb-space-md no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {TABS.map((t) => {
          const active = t.slug === service;
          return (
            <button
              aria-selected={active}
              className={`shrink-0 px-5 py-2.5 rounded-full font-label-lg text-label-lg flex items-center gap-2 transition-all ${
                active ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
              key={t.slug}
              onClick={() => pickService(t.slug)}
              role="tab"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
      {/* Inputs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-space-sm items-center">
        {/* Location Input */}
        <div className="lg:col-span-4 bg-surface-container-low rounded-2xl p-space-sm flex items-center gap-3" ref={whereTile}>
          <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-xl">near_me</span>
          </div>
          <div className="flex flex-col w-full min-w-0">
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor={`${listId}-where`}>
              Where are you looking?
            </label>
            <input
              aria-activedescendant={whereOpen && active >= 0 ? `${listId}-hood-${active}` : undefined}
              aria-autocomplete="list"
              aria-controls={whereOpen ? `${listId}-hoods` : undefined}
              aria-expanded={whereOpen}
              autoComplete="off"
              className="bg-transparent font-title-md text-title-md text-on-surface focus:outline-none w-full truncate placeholder:text-outline"
              id={`${listId}-where`}
              onChange={(e) => {
                setWhere(e.target.value);
                setWhereOpen(true);
                setActive(-1);
              }}
              onClick={() => setWhereOpen(true)}
              onFocus={() => setWhereOpen(true)}
              onKeyDown={onWhereKey}
              placeholder="Type a neighbourhood or area..."
              ref={whereInput}
              role="combobox"
              type="text"
              value={where}
            />
          </div>
          <Popover anchor={whereTile} label="Neighbourhoods" matchWidth minWidth={280} onClose={() => setWhereOpen(false)} open={whereOpen && suggestions.length > 0}>
            <ul aria-label="Neighbourhoods" className="max-h-[320px] overflow-y-auto overscroll-contain p-space-xs flex flex-col gap-0.5" id={`${listId}-hoods`} role="listbox">
              {suggestions.map((h, i) => {
                const heading = h.cityLabel !== suggestions[i - 1]?.cityLabel ? h.cityLabel : null;
                const isActive = i === active;
                return (
                  <li key={`${h.city}-${h.slug}`} role="presentation">
                    {heading && (
                      <div className="px-space-sm pt-space-sm pb-1 font-label-sm text-label-sm uppercase tracking-wider text-outline" role="presentation">
                        {heading}
                      </div>
                    )}
                    <div
                      aria-selected={isActive}
                      className={`flex items-center gap-space-sm px-space-sm py-2.5 rounded-xl cursor-pointer select-none transition-colors text-on-surface ${
                        isActive ? "bg-surface-container-low" : "hover:bg-surface-container-low"
                      }`}
                      id={`${listId}-hood-${i}`}
                      onClick={() => pickHood(h)}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      ref={isActive ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                      role="option"
                    >
                      <span className="material-symbols-outlined text-xl shrink-0 text-on-surface-variant">location_on</span>
                      <span className="flex-1 min-w-0 truncate font-body-md text-body-md">{h.name}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Popover>
        </div>
        {/* Date Range Input */}
        <div className="lg:col-span-3 bg-surface-container-low rounded-2xl p-space-sm flex items-center gap-3 relative" ref={datesAnchor}>
          <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-secondary shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-xl">calendar_month</span>
          </div>
          <div className="flex flex-col w-full min-w-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Dates</span>
            <button
              aria-expanded={datesOpen}
              aria-haspopup="dialog"
              className="text-left font-title-md text-title-md text-on-surface truncate cursor-pointer hover:text-primary transition-colors"
              onClick={() => setDatesOpen((o) => !o)}
              type="button"
            >
              {start ? fmtDay(start) : "Start"} – {end ? fmtDay(end) : "End"}
            </button>
          </div>
          <RangePanel
            anchor={datesAnchor}
            end={end}
            min={today}
            onChange={(ns, ne) => {
              setStart(ns);
              setEnd(ne ?? "");
            }}
            onClose={() => setDatesOpen(false)}
            open={datesOpen}
            start={start}
            title="Drop-off → Pick-up"
            unitLabel="night"
          />
        </div>
        {/* Pet Type & Quantity Counter */}
        <div className="lg:col-span-3 bg-surface-container-low rounded-2xl p-space-sm flex items-center justify-between">
          <div className="relative flex items-center gap-3 min-w-0 flex-1 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-tertiary shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-xl">{kind ? PET_KIND_META[kind].icon : "pets"}</span>
            </div>
            <div className="flex flex-col truncate">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-0.5">
                Pets
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </span>
              <span aria-live="polite" className="font-title-md text-title-md text-on-surface truncate group-hover:text-primary transition-colors">
                {kind ? `${pets} ${kindNoun(kind, pets)}` : pets > 1 ? `${pets} Pets` : "1 Dog / Cat"}
              </span>
            </div>
            <Select
              aria-label="Pet type"
              onChange={(v) => pickKind(v as PetKind | "")}
              options={[
                { value: "", label: "Any pet", icon: "pets" },
                { value: "DOG", label: "Dog", icon: PET_KIND_META.DOG.icon },
                { value: "CAT", label: "Cat", icon: PET_KIND_META.CAT.icon },
                ...PET_KINDS.filter((k) => k !== "DOG" && k !== "CAT").map((k) => ({ value: k, label: PET_KIND_META[k].label, icon: PET_KIND_META[k].icon, group: "Other…" })),
              ]}
              panelMinWidth={220}
              value={kind}
              variant="overlay"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-surface-container-lowest rounded-full p-1 shadow-sm">
            <button
              aria-label="Remove a pet"
              className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors text-base font-bold disabled:opacity-40"
              disabled={pets <= MIN_PETS}
              onClick={() => setPets((n) => Math.max(MIN_PETS, n - 1))}
              type="button"
            >
              -
            </button>
            <span className="font-label-lg text-label-lg px-1">{pets}</span>
            <button
              aria-label="Add a pet"
              className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors text-base font-bold disabled:opacity-40"
              disabled={pets >= MAX_PETS}
              onClick={() => setPets((n) => Math.min(MAX_PETS, n + 1))}
              type="button"
            >
              +
            </button>
          </div>
        </div>
        {/* Submit CTA Button */}
        <div className="lg:col-span-2">
          <button
            className="w-full h-16 rounded-2xl bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform active:scale-95"
            type="submit"
          >
            <span className="material-symbols-outlined text-2xl">search</span>
            <span className="font-label-lg text-label-lg">Find a Sitter 🐾</span>
          </button>
        </div>
      </div>
      {/* Trust Badges Under Search */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-md mt-space-md bg-surface-container-low/50 px-space-md py-2.5 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
          <span className="font-label-md text-label-md text-on-surface">100% ID & Address Verification</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            local_hospital
          </span>
          <span className="font-label-md text-label-md text-on-surface">Free WagShield Vet Cover up to $5,000</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            photo_library
          </span>
          <span className="font-label-md text-label-md text-on-surface">Daily Live Photo & Video Updates</span>
        </div>
      </div>
    </form>
  );
}
