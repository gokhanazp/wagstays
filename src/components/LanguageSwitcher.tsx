"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_NAMES, routing, type Locale } from "@/i18n/routing";

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

/** Header button: globe + the other language's code ("FR" on English pages, "EN" on French ones). */
export function LanguageButton({ className = "" }: { className?: string }) {
  const t = useTranslations("common.language");
  const { locale, go, pending } = useSwitch();
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  return (
    <button
      aria-label={t("switchTo", { language: LOCALE_NAMES[other].name })}
      className={`h-10 px-3 rounded-full items-center gap-1 font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-60 ${className}`}
      disabled={pending}
      lang={other}
      onClick={() => go(other)}
      title={LOCALE_NAMES[other].name}
      type="button"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-xl">language</span>
      {LOCALE_NAMES[other].short}
    </button>
  );
}
