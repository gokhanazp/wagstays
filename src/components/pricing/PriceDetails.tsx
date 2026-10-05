"use client";

import { useLocale, useTranslations } from "next-intl";
import { holidayDateLabel, priceDetailItems, provinceIn, upcomingHolidays, type DetailService } from "@/lib/price-details";
import { InfoTip } from "./InfoTip";

/**
 * "Price details" list of one service: base price, extra pets (or "One pet per booking"), statutory holiday
 * rate with a "Which days?" popover, puppy surcharge. Used on sitter profiles and in the sitter's
 * "What pet parents will see" preview (/sitter/services).
 */
export function PriceDetails({ service, provinceCode, className = "" }: { service: DetailService; provinceCode?: string | null; className?: string }) {
  const t = useTranslations("booking.priceDetails");
  const locale = useLocale();
  const items = priceDetailItems(service, locale);
  return (
    <div className={className} data-testid="price-details">
      <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">{t("title")}</span>
      <ul className="mt-1 flex flex-col gap-1">
        {items.map((it) => (
          <li
            className={`flex items-start gap-1.5 font-body-sm text-body-sm ${it.muted ? "text-on-surface-variant" : "text-on-surface"}`}
            data-detail={it.key}
            key={it.key}
          >
            <span aria-hidden className={`material-symbols-outlined text-base mt-px ${it.muted ? "text-outline" : "text-primary"}`}>
              {it.icon}
            </span>
            <span className="min-w-0">
              {it.text}
              {it.key === "holiday" && (
                <>
                  {" · "}
                  <InfoTip text={t("whichDays")} title={t("holidaysIn", { inProvince: provinceIn(provinceCode, locale) })}>
                    {/* only rendered while open, so "today" never differs between server and client markup */}
                    <ul className="flex flex-col gap-0.5 font-body-sm text-body-sm" data-testid="holiday-list">
                      {upcomingHolidays(provinceCode, new Date().toISOString().slice(0, 10), 5, locale).map((h) => (
                        <li className="flex justify-between gap-space-sm" key={h.date}>
                          <span className="text-on-surface font-medium">{h.name}</span>
                          <span className="text-on-surface-variant whitespace-nowrap">{holidayDateLabel(h.date, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  </InfoTip>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
