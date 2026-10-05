"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/forms/DatePicker";
import {
  WEEKDAY_LABELS,
  addDays,
  formatMinuteRange,
  isDayBookable,
  isOpenDay,
  isTimeOff,
  todayIn,
  type AvailabilitySnapshot,
} from "@/lib/availability-core";
import { SERVICE_LABELS, type ServiceType } from "@/lib/constants";

type Service = { type: string; durationMins: number | null };
type DayState = "available" | "full" | "away" | "closed" | "past";

const DAY_CLASS: Record<DayState, string> = {
  available: "!bg-[#EBF3EF] !text-primary font-bold hover:!bg-primary-fixed",
  full: "!bg-secondary-fixed/50 !text-on-secondary-fixed-variant line-through",
  away: "!bg-tertiary-fixed/60 !text-on-tertiary-fixed-variant",
  closed: "!text-outline-variant",
  past: "",
};

const LEGEND: { state: DayState; label: string; swatch: string }[] = [
  { state: "available", label: "Available", swatch: "bg-[#EBF3EF] ring-1 ring-primary/30" },
  { state: "full", label: "Fully booked", swatch: "bg-secondary-fixed/70" },
  { state: "away", label: "Away", swatch: "bg-tertiary-fixed" },
  { state: "closed", label: "Not working", swatch: "bg-surface-container-high" },
];

/** "Mon–Fri 7:00 AM – 9:00 PM · Sat 9:00 AM – 1:00 PM · Sun closed" from the weekly hours. */
function weeklySummary(snap: AvailabilitySnapshot) {
  const byDay = Array.from({ length: 7 }, (_, d) =>
    snap.hours
      .filter((h) => h.weekday === d)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map((h) => formatMinuteRange(h.startMinute, h.endMinute))
      .join(", "),
  );
  // Monday-first, grouping consecutive days with the same hours
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups: { from: number; to: number; text: string }[] = [];
  for (const d of order) {
    const last = groups.at(-1);
    if (last && last.text === byDay[d]) last.to = d;
    else groups.push({ from: d, to: d, text: byDay[d] });
  }
  const short = (d: number) => WEEKDAY_LABELS[d].slice(0, 3);
  return groups.map((g) => ({
    days: g.from === g.to ? short(g.from) : `${short(g.from)}–${short(g.to)}`,
    hours: g.text || "Closed",
  }));
}

/**
 * Read-only month calendar on the public profile showing when the sitter can be booked, per service.
 * Clicking an available day scrolls to the booking widget (#book).
 */
export function AvailabilityCalendar({ snapshot, services, firstName, nowMs }: { snapshot: AvailabilitySnapshot; services: Service[]; firstName: string; nowMs: number }) {
  const types = useMemo(() => [...new Set(services.map((s) => s.type))], [services]);
  const [type, setType] = useState<string>("ANY");
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const today = todayIn(snapshot.timeZone, nowMs);
  const horizon = addDays(today, 179);
  const stateOf = (iso: string): DayState => {
    if (iso < today || iso > horizon) return "past";
    if (isTimeOff(snapshot, iso)) return "away";
    if (!isOpenDay(snapshot, iso)) return "closed";
    const check = (t: string) => isDayBookable(snapshot, iso, t, services.find((s) => s.type === t)?.durationMins, nowMs);
    const ok = type === "ANY" ? types.some(check) : check(type);
    return ok ? "available" : "full";
  };

  const nextFree = useMemo(() => {
    for (let d = today; d <= horizon; d = addDays(d, 1)) if (stateOf(d) === "available") return d;
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, snapshot, nowMs]);

  const summary = weeklySummary(snapshot);

  return (
    <div className="w-full min-w-0 bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-md" id="availability">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">calendar_month</span>
          Availability
        </h2>
        {nextFree && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF3EF] text-primary font-label-md text-label-md">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Next available: {new Date(`${nextFree}T12:00:00`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {types.length > 1 && (
        <div className="flex gap-space-xs overflow-x-auto -mx-1 px-1 pb-1" role="tablist">
          {["ANY", ...types].map((t) => (
            <button
              aria-selected={type === t}
              className={`h-9 px-space-md rounded-full font-label-md text-label-md whitespace-nowrap transition-all ${
                type === t ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
              key={t}
              onClick={() => setType(t)}
              role="tab"
              type="button"
            >
              {t === "ANY" ? "Any service" : SERVICE_LABELS[t as ServiceType] ?? t}
            </button>
          ))}
        </div>
      )}

      <div className="-mx-space-md sm:mx-0 flex justify-center rounded-2xl sm:border sm:border-[#EFE7DE]">
        <Calendar
          dayClassName={(iso) => DAY_CLASS[stateOf(iso)]}
          isDateDisabled={(iso) => stateOf(iso) !== "available"}
          key={type}
          max={horizon}
          min={today}
          months={wide ? 2 : 1}
          onSelect={() => document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
      </div>

      <div className="flex flex-wrap gap-x-space-md gap-y-space-xs">
        {LEGEND.map((l) => (
          <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant" key={l.state}>
            <span className={`w-3.5 h-3.5 rounded-full ${l.swatch}`} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="rounded-2xl bg-surface-container-low p-space-md flex flex-col gap-space-xs">
        <span className="font-label-lg text-label-lg text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-lg text-primary">schedule</span>
          {firstName}&apos;s usual hours
        </span>
        <dl className="grid grid-cols-[auto_1fr] gap-x-space-md gap-y-1 font-body-sm text-body-sm">
          {summary.map((g) => (
            <div className="contents" key={g.days}>
              <dt className="text-on-surface-variant">{g.days}</dt>
              <dd className={g.hours === "Closed" ? "text-outline" : "text-on-surface"}>{g.hours}</dd>
            </div>
          ))}
        </dl>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Times are in {snapshot.timeZone.split("/").pop()?.replace("_", " ")} time · book at least {snapshot.noticeHours} h ahead.
        </p>
      </div>
    </div>
  );
}
