"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PET_SIZES, PET_SIZE_LABELS, type PetSize, type ServiceType } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import type { SearchFilters } from "@/lib/queries";
import { PET_KINDS, PET_KIND_META, type PetKind } from "@/lib/pets";
import { MAX_PETS_LIMIT } from "@/lib/quote";
import { buildSearchHref, type SearchExtras } from "./search-url";
import { useSearchNav } from "./useSearchNav";

type Flag = "yard" | "smokeFree" | "noPets" | "noKids" | "superSitter" | "vet" | "trainer" | "idVerified";

const SERVICE_ROWS: ServiceType[] = ["DOG_WALKING", "BOARDING", "DAY_CARE", "DROP_IN"];

const HOME_ROWS = ["yard", "smokeFree", "noPets", "noKids"] as const satisfies readonly Flag[];

const chipBase = "px-3 py-1.5 rounded-full font-label-sm text-label-sm flex items-center gap-1 transition-colors";
const chipOff = "bg-surface-container text-on-surface hover:bg-surface-container-high";
const QUAL_CHIPS: { key: "superSitter" | "vet" | "trainer" | "idVerified"; icon?: string; iconClass?: string; on: string }[] = [
  { key: "superSitter", icon: "hotel_class", iconClass: "text-secondary", on: "bg-secondary-fixed text-on-secondary-fixed" },
  { key: "vet", on: "bg-primary-fixed text-on-primary-fixed-variant" },
  { key: "trainer", on: "bg-primary-fixed text-on-primary-fixed-variant" },
  { key: "idVerified", icon: "verified", on: "bg-primary-fixed text-on-primary-fixed-variant" },
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
  total,
}: {
  filters: SearchFilters;
  extras: SearchExtras;
  priceRange: { min: number; max: number };
  serviceCounts: Record<ServiceType, number>;
  medicalCount: number;
  kindCounts: Record<PetKind, number>;
  /** results for the current filters ("Show 12 sitters" in the mobile sheet) */
  total: number;
}) {
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { filters, update, pending } = useSearchNav(urlFilters, extras);
  const [open, setOpen] = useState(false); // mobile bottom sheet; the sidebar is always expanded on lg+
  const urlMax = Math.min(priceRange.max, Math.max(priceRange.min, urlFilters.maxPrice ?? priceRange.max));
  const [max, setMax] = useState(urlMax);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // portal target only exists in the browser; false during SSR and hydration
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

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

  const money = (dollars: number) => formatMoney(dollars * 100, { locale });
  const maxLabel = max >= priceRange.max ? t("filters.priceMax", { amount: money(priceRange.max) }) : money(max);

  // Mobile sheet: scroll lock, Esc to close, focus to the close button and back to the trigger.
  useEffect(() => {
    if (!open) return;
    const opener = trigger.current;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // the sheet is lg:hidden — don't leave the page locked when the window grows past lg
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      opener?.focus();
    };
  }, [open]);

  const controls: ReactNode = (
    <>
    {/* Price Range Slider */}
    <div className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <span className="font-label-lg text-label-lg text-on-surface">{t(`filters.rate.${filters.service ?? "DOG_WALKING"}`)}</span>
        <span className="font-label-md text-label-md text-primary font-bold bg-primary-fixed px-2.5 py-0.5 rounded-full">
          {money(priceRange.min)} – {maxLabel}
        </span>
      </div>
      <div className="relative flex items-center py-2">
        <input
          aria-label={t("filters.maxPrice")}
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
        <span>{money(priceRange.min)}</span>
        <span>{t("filters.priceMax", { amount: money(priceRange.max) })}</span>
      </div>
    </div>

    {/* Service Types */}
    <div className="flex flex-col gap-space-sm pt-space-xs">
      <span className="font-label-lg text-label-lg text-on-surface">{t("filters.serviceType")}</span>
      <div className="flex flex-col gap-space-xs">
        {SERVICE_ROWS.map((st) => (
          <label className={rowClass} key={st}>
            <input
              checked={filters.service === st}
              className={checkClass}
              onChange={() => update({ service: filters.service === st ? undefined : st })}
              type="checkbox"
            />
            <span className="font-body-md text-body-md text-on-surface flex-1">{tc(`enums.service.${st}`)}</span>
            <span className="font-label-sm text-label-sm text-outline">{serviceCounts[st] ?? 0}</span>
          </label>
        ))}
        <label className={rowClass}>
          <input checked={filters.vet} className={checkClass} onChange={() => update({ vet: !filters.vet })} type="checkbox" />
          <span className="font-body-md text-body-md text-on-surface flex-1">{t("filters.medical")}</span>
          <span className="font-label-sm text-label-sm text-outline">{medicalCount}</span>
        </label>
      </div>
    </div>

    {/* Pets in one booking: only sitters who take that many (extra-pet rate + max pets per booking) */}
    <div className="flex flex-col gap-1.5 pt-space-xs" data-testid="pet-count-filter">
      <div className="flex items-center justify-between gap-space-sm">
        <span className="font-label-lg text-label-lg text-on-surface" id="pet-count-label">
          {t("petCount.label")}
        </span>
        <div aria-labelledby="pet-count-label" className="flex items-center gap-1 bg-surface-container rounded-full p-0.5" role="group">
          <button
            aria-label={t("petCount.fewer")}
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
            aria-label={t("petCount.more")}
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
        {petCount > 1 ? t("petCount.many", { count: petCount }) : t("petCount.one")}
      </p>
    </div>

    {/* Pet types (sitter must accept every selected kind) */}
    <div className="flex flex-col gap-space-sm pt-space-xs">
      <span className="font-label-lg text-label-lg text-on-surface">{t("filters.petType")}</span>
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
              <span>{tc(`enums.petKind.${k}`)}</span>
              <span className={on ? "text-on-primary/80" : "text-outline"}>{kindCounts[k]}</span>
            </button>
          );
        })}
      </div>
    </div>

    {/* Pet Size Acceptance */}
    <div className={`flex flex-col gap-space-sm pt-space-xs ${showSizes ? "" : "hidden"}`}>
      <span className="font-label-lg text-label-lg text-on-surface">{t("filters.dogSize")}</span>
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
              <span className="font-label-sm text-label-sm font-bold">{tc(`enums.petSize.${s}`)}</span>
              <span className={`font-label-sm text-label-sm ${on ? "text-on-primary/80" : "text-outline"}`}>{PET_SIZE_LABELS[s].range}</span>
            </button>
          );
        })}
      </div>
    </div>

    {/* Home & Environment */}
    <div className="flex flex-col gap-space-sm pt-space-xs">
      <span className="font-label-lg text-label-lg text-on-surface">{t("filters.home")}</span>
      <div className="flex flex-col gap-space-xs">
        {HOME_ROWS.map((key) => (
          <label className={rowClass} key={key}>
            <input checked={filters[key]} className={checkClass} onChange={() => update({ [key]: !filters[key] })} type="checkbox" />
            <span className="font-body-sm text-body-sm text-on-surface flex-1">{t(`filters.homeRows.${key}`)}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Sitter Qualifications */}
    <div className="flex flex-col gap-space-sm pt-space-xs">
      <span className="font-label-lg text-label-lg text-on-surface">{t("filters.qualifications")}</span>
      <div className="flex flex-wrap gap-space-xs">
        {QUAL_CHIPS.map((c) => {
          const on = filters[c.key];
          return (
            <button aria-pressed={on} className={`${chipBase} ${on ? c.on : chipOff}`} key={c.key} onClick={() => update({ [c.key]: !on })} type="button">
              {c.icon && <span className={`material-symbols-outlined text-sm ${on ? (c.iconClass ?? "") : "text-outline"}`}>{c.icon}</span>}
              <span>{t(`filters.quals.${c.key}`)}</span>
            </button>
          );
        })}
      </div>
    </div>

    {/* Quick Calendar View Trigger */}
    <div className="p-space-sm bg-surface-container-low rounded-2xl flex items-center justify-between mt-space-xs">
      <div className="flex items-center gap-space-xs">
        <span className="material-symbols-outlined text-primary text-xl">event_available</span>
        <span className="font-label-md text-label-md text-on-surface">{t("filters.availability")}</span>
      </div>
      <button
        className="font-label-sm text-label-sm text-primary font-bold underline cursor-pointer"
        onClick={() => {
          setOpen(false);
          window.dispatchEvent(new Event("wagstays:open-dates"));
        }}
        type="button"
      >
        {t("filters.select")}
      </button>
    </div>
    </>
  );

  const resetHref = buildSearchHref({ view: filters.view, hood: filters.hood }, extras);

  return (
    <aside className="w-full lg:w-[280px] shrink-0 flex flex-col gap-space-lg lg:sticky top-28 bg-surface-container-lowest px-space-md py-space-sm lg:p-space-lg rounded-3xl shadow-sm">
      <div className="flex items-center justify-between lg:pb-space-xs">
        <button
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex-1 lg:flex-none min-h-11 lg:min-h-0 flex items-center gap-space-xs lg:pointer-events-none"
          onClick={() => setOpen(true)}
          ref={trigger}
          type="button"
        >
          <span className="material-symbols-outlined text-primary text-xl">filter_list</span>
          <h2 className="font-title-md text-title-md text-on-surface">{t("filters.title")}</h2>
          {activeCount > 0 && (
            <span className="lg:hidden px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm">{activeCount}</span>
          )}
          <span className="lg:!hidden material-symbols-outlined text-base text-outline">expand_less</span>
        </button>
        <Link
          className="px-space-xs py-3 -my-3 lg:p-0 lg:my-0 font-label-sm text-label-sm text-secondary hover:underline cursor-pointer"
          href={resetHref}
          replace
          scroll={false}
        >
          {t("filters.reset")}
        </Link>
      </div>

      <div className="hidden lg:flex flex-col gap-space-lg">{controls}</div>
      {mounted && createPortal(<FilterSheet {...{ open, activeCount, total, pending, resetHref, controls, closeBtn, titleId }} onClose={() => setOpen(false)} />, document.body)}
    </aside>
  );
}

/**
 * Below lg: the filters in a bottom sheet (portal on <body>, so no ancestor transform / overflow can trap it).
 * Filters apply instantly (URL replace), so "Show N sitters" just closes; N follows the server results.
 */
function FilterSheet({
  open,
  onClose,
  activeCount,
  total,
  pending,
  resetHref,
  controls,
  closeBtn,
  titleId,
}: {
  open: boolean;
  onClose: () => void;
  activeCount: number;
  total: number;
  pending: boolean;
  resetHref: string;
  controls: ReactNode;
  closeBtn: React.RefObject<HTMLButtonElement | null>;
  titleId: string;
}) {
  const t = useTranslations("search");
  // drag the handle / header down to dismiss
  const [drag, setDrag] = useState<{ startY: number; dy: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setDrag({ startY: e.touches[0].clientY, dy: 0 });
  const onTouchMove = (e: React.TouchEvent) => drag && setDrag({ ...drag, dy: Math.max(0, e.touches[0].clientY - drag.startY) });
  const onTouchEnd = () => {
    if (drag && drag.dy > 80) onClose();
    setDrag(null);
  };

  return (
    <div className={`lg:hidden fixed inset-0 z-[90] ${open ? "" : "pointer-events-none"}`} data-testid="filter-sheet" inert={!open}>
      <div
        aria-hidden
        className={`absolute inset-0 bg-on-surface/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        data-testid="filter-sheet-backdrop"
        onClick={onClose}
      />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={`absolute inset-x-0 bottom-0 max-h-[85dvh] bg-surface-container-lowest rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(83,72,62,0.3)] flex flex-col ${
          drag ? "" : "transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
        } ${open ? "translate-y-0" : "translate-y-full"}`}
        role="dialog"
        style={drag?.dy ? { transform: `translateY(${drag.dy}px)` } : undefined}
      >
        <div className="shrink-0 touch-none" onTouchCancel={onTouchEnd} onTouchEnd={onTouchEnd} onTouchMove={onTouchMove} onTouchStart={onTouchStart}>
          <div className="flex justify-center pt-space-sm pb-space-xs">
            <span className="w-10 h-1.5 rounded-full bg-outline-variant" />
          </div>
          <div className="flex items-center justify-between gap-space-sm px-space-lg pb-space-sm border-b border-outline-variant/30">
            <div className="flex items-center gap-space-xs min-w-0">
              <span className="material-symbols-outlined text-primary text-xl">filter_list</span>
              <h2 className="font-title-md text-title-md text-on-surface" id={titleId}>
                {t("filters.title")}
              </h2>
              {activeCount > 0 && (
                <span aria-label={t("filters.activeCount", { count: activeCount })} className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm">
                  {activeCount}
                </span>
              )}
            </div>
            <button
              aria-label={t("filters.close")}
              className="w-10 h-10 shrink-0 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              onClick={onClose}
              ref={closeBtn}
              type="button"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-space-lg py-space-md flex flex-col gap-space-lg">{controls}</div>

        <div className="shrink-0 grid grid-cols-[auto_1fr] gap-space-sm px-space-lg pt-space-sm pb-[max(16px,env(safe-area-inset-bottom))] border-t border-outline-variant/30 bg-surface-container-lowest">
          <Link
            className="h-12 px-space-md sm:px-space-lg rounded-full bg-surface-container-low text-secondary font-label-lg text-label-lg flex items-center justify-center hover:bg-surface-container"
            href={resetHref}
            replace
            scroll={false}
          >
            {t("filters.reset")}
          </Link>
          <button
            aria-busy={pending}
            className="min-h-12 px-space-sm py-1 rounded-full bg-primary text-on-primary font-label-lg text-label-lg leading-tight text-center flex items-center justify-center gap-space-xs shadow-sm min-w-0"
            data-testid="filter-sheet-apply"
            onClick={onClose}
            type="button"
          >
            {pending && <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>}
            <span>{t("filters.showResults", { count: total })}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
