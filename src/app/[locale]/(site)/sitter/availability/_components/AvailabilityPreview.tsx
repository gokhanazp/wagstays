"use client";

import { useMemo, useState } from "react";
import { Calendar } from "@/components/forms/DatePicker";
import { formatDayLong, formatMinuteRange } from "@/lib/availability-core";

type Day = { date: string; status: "open" | "closed" | "timeoff" | "booked" | "full"; ranges: { start: number; end: number }[]; visits: number; stays: number };

// Only backgrounds/decoration here so the Calendar's own text colours (today, disabled) still apply.
const LOOK: Record<Day["status"], { cls: string; label: string; swatch: string }> = {
  open: { cls: "bg-[#EBF3EF]", label: "Open", swatch: "bg-[#EBF3EF] border border-[#C8DDD4]" },
  booked: { cls: "bg-secondary-fixed", label: "Has bookings", swatch: "bg-secondary-fixed" },
  full: { cls: "bg-secondary-fixed-dim line-through", label: "Stays full", swatch: "bg-secondary-fixed-dim" },
  timeoff: { cls: "bg-tertiary-fixed line-through decoration-2", label: "Time off", swatch: "bg-tertiary-fixed" },
  closed: { cls: "opacity-50", label: "Closed", swatch: "bg-surface-container-high" },
};

export function AvailabilityPreview({ days, today }: { days: Day[]; today: string }) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const [selected, setSelected] = useState(today);
  const day = byDate.get(selected);

  return (
    <div className="flex flex-col gap-space-sm px-space-sm sm:px-space-md pt-space-xs">
      <div className="flex flex-wrap gap-x-space-md gap-y-1 px-space-sm">
        {(Object.keys(LOOK) as Day["status"][]).map((k) => (
          <span className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant" key={k}>
            <span className={`w-3.5 h-3.5 rounded-full ${LOOK[k].swatch}`} />
            {LOOK[k].label}
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
        <span className="font-label-lg text-label-lg text-on-surface">{formatDayLong(selected)}</span>
        {!day ? (
          <span className="font-body-sm text-body-sm text-on-surface-variant">Outside the preview window.</span>
        ) : (
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {day.status === "timeoff"
              ? "Time off — no bookings."
              : day.status === "closed"
                ? "Closed — no hours set for this weekday."
                : `Open ${day.ranges.map((r) => formatMinuteRange(r.start, r.end)).join(", ")}`}
            {day.visits > 0 && ` · ${day.visits} walk${day.visits === 1 ? "" : "s"} / visit${day.visits === 1 ? "" : "s"} booked`}
            {day.stays > 0 && ` · ${day.stays} boarding / day-care pet${day.stays === 1 ? "" : "s"}`}
          </span>
        )}
      </div>
    </div>
  );
}
