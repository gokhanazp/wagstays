"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_NAMES, routing, type Locale } from "@/i18n/routing";
import { saveLocalePreference } from "@/app/actions/locale";

function useSwitch() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (next: Locale) => {
    if (next === locale) return;
    const qs = params.toString();
    // next-intl updates the WAG_LOCALE cookie on a locale switch, so the choice sticks for unprefixed links
    start(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { locale: next, scroll: false }));
    void saveLocalePreference(next).catch(() => {}); // emails follow the site language for signed-in users
  };
  return { locale, go, pending };
}

/** Footer chip: "🌐 EN | FR · $ CAD" (replaces the static "EN / $ CAD" chip from the design). */
export function LanguageChip() {
  const t = useTranslations("common.language");
  const { locale, go, pending } = useSwitch();
  return (
    <div
      aria-label={t("label")}
      className={`flex items-center gap-space-xs pl-space-md pr-1 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm ${pending ? "opacity-70" : ""}`}
      role="group"
    >
      <span className="material-symbols-outlined text-sm">language</span>
      <span className="flex items-center rounded-full bg-surface-container-high p-0.5">
        {routing.locales.map((l) => (
          <button
            aria-label={l === locale ? LOCALE_NAMES[l].name : t("switchTo", { language: LOCALE_NAMES[l].name })}
            aria-pressed={l === locale}
            className={`px-2.5 py-0.5 rounded-full transition-colors ${l === locale ? "bg-surface-container-lowest text-on-surface shadow-sm" : "hover:text-on-surface"}`}
            key={l}
            lang={l}
            onClick={() => go(l)}
            type="button"
          >
            {LOCALE_NAMES[l].short}
          </button>
        ))}
      </span>
      <span className="pr-space-sm">$ CAD</span>
    </div>
  );
}

/** Mobile-menu row that switches to the other language. */
export function LanguageRow({ className, iconClassName }: { className: string; iconClassName: string }) {
  const t = useTranslations("common.language");
  const { locale, go, pending } = useSwitch();
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  return (
    <button aria-label={t("switchTo", { language: LOCALE_NAMES[other].name })} className={className} disabled={pending} lang={other} onClick={() => go(other)} type="button">
      <span className={iconClassName}>
        <span className="material-symbols-outlined text-xl">translate</span>
      </span>
      <span className="flex-1 text-left">{LOCALE_NAMES[other].name}</span>
      <span className="font-label-sm text-label-sm text-on-surface-variant">{LOCALE_NAMES[locale].short} → {LOCALE_NAMES[other].short}</span>
    </button>
  );
}

/** Header language menu: shows the CURRENT language ("🌐 EN ▾") and opens a list to pick another. */
export function LanguageButton({ className = "" }: { className?: string }) {
  const t = useTranslations("common.language");
  const { locale, go, pending } = useSwitch();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(false), root.current?.querySelector("button")?.focus());
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={root}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${t("label")}: ${LOCALE_NAMES[locale].name}`}
        className="h-10 pl-3 pr-2 rounded-full inline-flex items-center gap-1 font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-60"
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-xl">language</span>
        {LOCALE_NAMES[locale].short}
        <span aria-hidden="true" className={`material-symbols-outlined text-lg transition-transform ${open ? "rotate-180" : ""}`}>expand_more</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-44 p-1.5 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-[0_20px_36px_-6px_rgba(83,72,62,0.14)] z-50"
          id={menuId}
          role="menu"
        >
          {routing.locales.map((l) => (
            <button
              aria-checked={l === locale}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl font-label-lg text-label-lg text-left transition-colors ${
                l === locale ? "text-primary bg-[#EBF3EF]" : "text-on-surface hover:bg-surface-container-low"
              }`}
              key={l}
              lang={l}
              onClick={() => {
                setOpen(false);
                go(l);
              }}
              role="menuitemradio"
              type="button"
            >
              <span className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant w-6">{LOCALE_NAMES[l].short}</span>
                {LOCALE_NAMES[l].name}
              </span>
              {l === locale && (
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  check
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
