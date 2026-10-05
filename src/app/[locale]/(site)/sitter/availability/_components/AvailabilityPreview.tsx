"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Calendar } from "@/components/forms/DatePicker";
import { formatDayLong, formatMinuteRange } from "@/lib/availability-core";

type Day = { date: string; status: "open" | "closed" | "timeoff" | "booked" | "full"; ranges: { start: number; end: number }[]; visits: number; stays: number };

// Only backgrounds/decoration here so the Calendar's own text colours (today, disabled) still apply.
const LOOK: Record<Day["status"], { cls: string; swatch: string }> = {
  open: { cls: "bg-[#EBF3EF]", swatch: "bg-[#EBF3EF] border border-[#C8DDD4]" },
  booked: { cls: "bg-secondary-fixed", swatch: "bg-secondary-fixed" },
  full: { cls: "bg-secondary-fixed-dim line-through", swatch: "bg-secondary-fixed-dim" },
  timeoff: { cls: "bg-tertiary-fixed line-through decoration-2", swatch: "bg-tertiary-fixed" },
  closed: { cls: "opacity-50", swatch: "bg-surface-container-high" },
};

export function AvailabilityPreview({ days, today }: { days: Day[]; today: string }) {
  const t = useTranslations("sitter.calendar");
  const locale = useLocale();
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const [selected, setSelected] = useState(today);
  const day = byDate.get(selected);

  return (
    <div className="flex flex-col gap-space-sm px-space-sm sm:px-space-md pt-space-xs">
      <div className="flex flex-wrap gap-x-space-md gap-y-1 px-space-sm">
        {(Object.keys(LOOK) as Day["status"][]).map((k) => (
          <span className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant" key={k}>
            <span className={`w-3.5 h-3.5 rounded-full ${LOOK[k].swatch}`} />
            {t(k)}
          </span>
        ))}
      </div>
      <div className="flex justify-center">
        <Calendar
          dayClassName={(iso) => {
            const d = byDate.get(iso);
            return d && iso !== selected ? LOOK[d.status].cls : undefined;
          }}
          min={today}
          months={2}
          onSelect={setSelected}
          value={selected}
        />
      </div>
      <div className="mx-space-sm rounded-xl bg-surface-container-low p-space-md flex flex-col gap-1" role="status">
        <span className="font-label-lg text-label-lg text-on-surface">{formatDayLong(selected, locale)}</span>
        {!day ? (
          <span className="font-body-sm text-body-sm text-on-surface-variant">{t("outside")}</span>
        ) : (
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {day.status === "timeoff"
              ? t("timeoffDay")
              : day.status === "closed"
                ? t("closedDay")
                : t("openDay", { ranges: day.ranges.map((r) => formatMinuteRange(r.start, r.end, locale)).join(", ") })}
            {day.visits > 0 && t("visits", { count: day.visits })}
            {day.stays > 0 && t("stays", { count: day.stays })}
          </span>
        )}
      </div>
    </div>
  );
}
