"use client";

import { useMemo, useRef, useState } from "react";
import { Popover } from "./Popover";
import { Select } from "./Select";
import { SELECT_FIELD } from "./styles";

// Dates are handled as local "YYYY-MM-DD" strings (what <input type="date"> used to post), so
// server code is unchanged and there are no UTC off-by-one shifts.

const pad = (n: number) => String(n).padStart(2, "0");
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromIso = (s?: string | null) => {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && toIso(a) === toIso(b);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

export function formatIsoDate(iso?: string | null, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" }) {
  const d = fromIso(iso);
  return d ? d.toLocaleDateString("en-CA", opts) : "";
}
export function formatIsoRange(start?: string | null, end?: string | null) {
  const s = fromIso(start);
  const e = fromIso(end);
  if (!s) return "";
  const f = (d: Date) => d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  return e ? `${f(s)} – ${f(e)}` : f(s);
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Inline month calendar in the design language. `mode="range"` selects start → end with a
 * hover preview; `months={2}` shows two months side by side (stacks on narrow screens).
 */
export function Calendar({
  mode = "single",
  value,
  start,
  end,
  min,
  max,
  months = 1,
  onSelect,
  onRangeChange,
}: {
  mode?: "single" | "range";
  value?: string;
  start?: string;
  end?: string;
  min?: string;
  max?: string;
  months?: 1 | 2;
  onSelect?: (iso: string) => void;
  onRangeChange?: (start: string, end: string | undefined) => void;
}) {
  const sel = fromIso(mode === "single" ? value : start);
  const selEnd = fromIso(end);
  const minD = fromIso(min);
  const maxD = fromIso(max);
  const [view, setView] = useState(() => {
    const base = sel ?? minD ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [hover, setHover] = useState<Date | null>(null);
  const today = new Date();

  const pick = (d: Date) => {
    const iso = toIso(d);
    if (mode === "single") return onSelect?.(iso);
    if (!sel || selEnd || d < sel) onRangeChange?.(iso, undefined);
    else onRangeChange?.(toIso(sel), iso);
  };

  const rangeEnd = mode === "range" && sel && !selEnd && hover && hover > sel ? hover : selEnd;

  const month = (offset: number) => {
    const first = addMonths(view, offset);
    const days: (Date | null)[] = Array(first.getDay()).fill(null);
    const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= count; i++) days.push(new Date(first.getFullYear(), first.getMonth(), i));
    return (
      <div className="flex flex-col gap-space-xs w-[280px]" key={offset}>
        <div className="h-9 flex items-center justify-center font-title-md text-title-md text-on-surface">
          {first.toLocaleDateString("en-CA", { month: "long", year: "numeric" })}
        </div>
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <span className="h-8 flex items-center justify-center font-label-sm text-label-sm text-outline" key={w}>
              {w}
            </span>
          ))}
          {days.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const disabled = (minD && d < minD) || (maxD && d > maxD);
            const isStart = sameDay(d, sel);
            const isEnd = sameDay(d, rangeEnd);
            const inRange = mode === "range" && sel && rangeEnd && d > sel && d < rangeEnd;
            const isToday = sameDay(d, today);
            return (
              <div
                className={`h-10 flex items-center justify-center ${inRange ? "bg-[#EBF3EF]" : ""} ${
                  mode === "range" && isStart && rangeEnd ? "bg-gradient-to-r from-transparent from-50% to-[#EBF3EF] to-50%" : ""
                } ${mode === "range" && isEnd && sel && !isStart ? "bg-gradient-to-l from-transparent from-50% to-[#EBF3EF] to-50%" : ""}`}
                key={i}
              >
                <button
                  aria-label={d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  aria-pressed={isStart || isEnd}
                  className={`w-10 h-10 rounded-full font-label-lg text-label-lg transition-all ${
                    isStart || isEnd
                      ? "bg-primary text-on-primary shadow-sm"
                      : disabled
                        ? "text-outline-variant cursor-not-allowed"
                        : `text-on-surface hover:bg-surface-container ${isToday ? "ring-1 ring-secondary-container text-secondary" : ""}`
                  }`}
                  disabled={!!disabled}
                  onClick={() => pick(d)}
                  onMouseEnter={() => setHover(d)}
                  onMouseLeave={() => setHover(null)}
                  type="button"
                >
                  {d.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const canPrev = !minD || addMonths(view, -1) >= new Date(minD.getFullYear(), minD.getMonth(), 1);
  return (
    <div className="relative p-space-md">
      <button
        aria-label="Previous month"
        className="absolute left-space-md top-space-md w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
        disabled={!canPrev}
        onClick={() => setView((v) => addMonths(v, -1))}
        type="button"
      >
        <span className="material-symbols-outlined text-xl">chevron_left</span>
      </button>
      <button
        aria-label="Next month"
        className="absolute right-space-md top-space-md w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
        onClick={() => setView((v) => addMonths(v, 1))}
        type="button"
      >
        <span className="material-symbols-outlined text-xl">chevron_right</span>
      </button>
      <div className="flex flex-col md:flex-row gap-space-lg">{Array.from({ length: months }, (_, i) => month(i))}</div>
    </div>
  );
}

const fieldIcon = (icon: string) => (
  <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant">
    {icon}
  </span>
);

/** Single date field (replaces <input type="date">). Posts YYYY-MM-DD via `name`. */
export function DatePicker({
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  placeholder = "Select a date",
  className = SELECT_FIELD,
  id,
  "aria-label": ariaLabel,
  format,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
  format?: Intl.DateTimeFormatOptions;
}) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <>
      {name && <input name={name} type="hidden" value={current} />}
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className={`relative ${className}`}
        id={id}
        onClick={() => setOpen((o) => !o)}
        ref={anchor}
        type="button"
      >
        <span className="block truncate">{current ? formatIsoDate(current, format) : <span className="text-outline">{placeholder}</span>}</span>
        {fieldIcon("calendar_month")}
      </button>
      <Popover anchor={anchor} label={ariaLabel ?? "Choose a date"} onClose={() => setOpen(false)} open={open}>
        <Calendar
          max={max}
          min={min}
          onSelect={(iso) => {
            if (value === undefined) setInner(iso);
            onChange?.(iso);
            setOpen(false);
            anchor.current?.focus();
          }}
          value={current}
        />
        {current && !value && (
          <div className="flex justify-end px-space-md pb-space-md -mt-space-xs">
            <button
              className="font-label-md text-label-md text-on-surface-variant hover:text-secondary"
              onClick={() => (setInner(""), onChange?.(""), setOpen(false))}
              type="button"
            >
              Clear
            </button>
          </div>
        )}
      </Popover>
    </>
  );
}

/** Two-month range picker field. Posts `startName` / `endName` as YYYY-MM-DD. */
export function DateRangePicker({
  startName,
  endName,
  start,
  end,
  defaultStart,
  defaultEnd,
  onChange,
  min,
  placeholder = "Add dates",
  className = SELECT_FIELD,
  "aria-label": ariaLabel,
  unitLabel = "night",
}: {
  startName?: string;
  endName?: string;
  start?: string;
  end?: string;
  defaultStart?: string;
  defaultEnd?: string;
  onChange?: (start: string, end: string | undefined) => void;
  min?: string;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  unitLabel?: string;
}) {
  const [inner, setInner] = useState({ start: defaultStart ?? "", end: defaultEnd ?? "" });
  const s = start ?? inner.start;
  const e = end ?? inner.end;
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <>
      {startName && <input name={startName} type="hidden" value={s} />}
      {endName && <input name={endName} type="hidden" value={e} />}
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className={`relative ${className}`}
        onClick={() => setOpen((o) => !o)}
        ref={anchor}
        type="button"
      >
        <span className="block truncate">{s ? formatIsoRange(s, e) : <span className="text-outline">{placeholder}</span>}</span>
        {fieldIcon("date_range")}
      </button>
      <RangePanel
        anchor={anchor}
        end={e}
        min={min}
        onChange={(ns, ne) => {
          if (start === undefined) setInner({ start: ns, end: ne ?? "" });
          onChange?.(ns, ne);
        }}
        onClose={() => setOpen(false)}
        open={open}
        start={s}
        unitLabel={unitLabel}
      />
    </>
  );
}

/**
 * The popover used by DateRangePicker — exported so custom tiles (home & search bars) can anchor
 * it to their own trigger.
 */
export function RangePanel({
  anchor,
  open,
  onClose,
  start,
  end,
  min,
  onChange,
  unitLabel = "night",
  title,
}: {
  anchor: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  start?: string;
  end?: string;
  min?: string;
  onChange: (start: string, end: string | undefined) => void;
  unitLabel?: string;
  title?: string;
}) {
  const nights = useMemo(() => {
    const a = fromIso(start);
    const b = fromIso(end);
    return a && b ? Math.round((b.getTime() - a.getTime()) / 86_400_000) : 0;
  }, [start, end]);
  return (
    <Popover anchor={anchor} label={title ?? "Choose dates"} onClose={onClose} open={open}>
      {title && <div className="px-space-lg pt-space-md font-label-md text-label-md uppercase tracking-wider text-outline">{title}</div>}
      <Calendar end={end} min={min} mode="range" months={2} onRangeChange={onChange} start={start} />
      <div className="flex items-center justify-between gap-space-md px-space-lg pb-space-md pt-space-sm border-t border-[#EFE7DE]">
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {!start
            ? "Pick a start date"
            : !end
              ? "Now pick an end date"
              : `${formatIsoRange(start, end)} · ${nights} ${unitLabel}${nights === 1 ? "" : "s"}`}
        </span>
        <span className="flex items-center gap-space-sm">
          {start && (
            <button className="h-9 px-space-md rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low" onClick={() => onChange("", undefined)} type="button">
              Clear
            </button>
          )}
          <button
            className="h-9 px-space-lg rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </span>
      </div>
    </Popover>
  );
}

const TIMES = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const value = `${pad(h)}:${pad(m)}`;
  const label = new Date(2000, 0, 1, h, m).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
  return { value, label };
});

/** Date + 15-minute time select. Posts `YYYY-MM-DDTHH:mm` (the old datetime-local format). */
export function DateTimePicker({
  name,
  defaultValue,
  min,
  "aria-label": ariaLabel,
}: {
  name: string;
  defaultValue?: string;
  min?: string;
  "aria-label"?: string;
}) {
  const [date, setDate] = useState(defaultValue?.slice(0, 10) ?? "");
  const [time, setTime] = useState(defaultValue?.slice(11, 16) || "10:00");
  return (
    <div className="grid grid-cols-[1fr_140px] gap-space-sm">
      <input name={name} type="hidden" value={date ? `${date}T${time}` : ""} />
      <DatePicker aria-label={ariaLabel ? `${ariaLabel} date` : "Date"} min={min} onChange={setDate} value={date} />
      <Select aria-label={ariaLabel ? `${ariaLabel} time` : "Time"} onChange={setTime} options={TIMES} panelMinWidth={140} value={time} />
    </div>
  );
}
