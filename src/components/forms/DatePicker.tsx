"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { intlLocale } from "@/i18n/routing";
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

export function formatIsoDate(
  iso?: string | null,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" },
  locale = "en",
) {
  const d = fromIso(iso);
  return d ? d.toLocaleDateString(intlLocale(locale), opts) : "";
}
export function formatIsoRange(start?: string | null, end?: string | null, locale = "en") {
  const s = fromIso(start);
  const e = fromIso(end);
  if (!s) return "";
  const f = (d: Date) => d.toLocaleDateString(intlLocale(locale), { month: "short", day: "numeric" });
  return e ? `${f(s)} – ${f(e)}` : f(s);
}

/** Two-letter weekday headers starting on Sunday: Su Mo … / di lu … */
const weekdays = (locale: string) =>
  Array.from({ length: 7 }, (_, i) => {
    const w = new Date(2000, 0, 2 + i).toLocaleDateString(intlLocale(locale), { weekday: "short" }).replace(".", "");
    return w.charAt(0).toUpperCase() + w.slice(1, 2);
  });

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
  isDateDisabled,
  dayClassName,
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
  /** Extra per-day rule (e.g. sitter availability); disabled days can't be picked. */
  isDateDisabled?: (iso: string) => boolean;
  /** Extra classes for a day button (e.g. availability colouring in a read-only preview). */
  dayClassName?: (iso: string) => string | undefined;
}) {
  const t = useTranslations("common.forms");
  const locale = useLocale();
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
          {first.toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric" })}
        </div>
        <div className="grid grid-cols-7">
          {weekdays(locale).map((w) => (
            <span className="h-8 flex items-center justify-center font-label-sm text-label-sm text-outline" key={w}>
              {w}
            </span>
          ))}
          {days.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const disabled = (minD && d < minD) || (maxD && d > maxD) || isDateDisabled?.(toIso(d));
            const extra = dayClassName?.(toIso(d));
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
                  aria-label={d.toLocaleDateString(intlLocale(locale), { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  aria-pressed={isStart || isEnd}
                  className={`w-10 h-10 rounded-full font-label-lg text-label-lg transition-all ${
                    isStart || isEnd
                      ? "bg-primary text-on-primary shadow-sm"
                      : disabled
                        ? `text-outline-variant cursor-not-allowed ${isDateDisabled ? "line-through decoration-outline-variant/60" : ""}`
                        : `text-on-surface hover:bg-surface-container ${isToday ? "ring-1 ring-secondary-container text-secondary" : ""}`
                  } ${extra ?? ""}`}
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
        aria-label={t("previousMonth")}
        className="absolute left-space-md top-space-md w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
        disabled={!canPrev}
        onClick={() => setView((v) => addMonths(v, -1))}
        type="button"
      >
        <span className="material-symbols-outlined text-xl">chevron_left</span>
      </button>
      <button
        aria-label={t("nextMonth")}
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
  placeholder,
  className = SELECT_FIELD,
  id,
  "aria-label": ariaLabel,
  format,
  isDateDisabled,
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
  isDateDisabled?: (iso: string) => boolean;
}) {
  const t = useTranslations("common.forms");
  const locale = useLocale();
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
        <span className="block truncate">{current ? formatIsoDate(current, format, locale) : <span className="text-outline">{placeholder ?? t("selectDate")}</span>}</span>
        {fieldIcon("calendar_month")}
      </button>
      <Popover anchor={anchor} label={ariaLabel ?? t("chooseDate")} onClose={() => setOpen(false)} open={open}>
        <Calendar
          isDateDisabled={isDateDisabled}
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
              {t("clear")}
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
  placeholder,
  className = SELECT_FIELD,
  "aria-label": ariaLabel,
  unitLabel = "night",
  isDateDisabled,
  id,
  inclusive,
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
  unitLabel?: "night" | "day";
  isDateDisabled?: (iso: string) => boolean;
  id?: string;
  /** count days inclusively (day care: Oct 18–20 = 3 days) instead of nights */
  inclusive?: boolean;
}) {
  const t = useTranslations("common.forms");
  const locale = useLocale();
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
        id={id}
        onClick={() => setOpen((o) => !o)}
        ref={anchor}
        type="button"
      >
        <span className="block truncate">{s ? formatIsoRange(s, e, locale) : <span className="text-outline">{placeholder ?? t("addDates")}</span>}</span>
        {fieldIcon("date_range")}
      </button>
      <RangePanel
        anchor={anchor}
        end={e}
        inclusive={inclusive}
        isDateDisabled={isDateDisabled}
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
  isDateDisabled,
  inclusive = false,
}: {
  anchor: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  start?: string;
  end?: string;
  min?: string;
  onChange: (start: string, end: string | undefined) => void;
  unitLabel?: "night" | "day";
  title?: string;
  isDateDisabled?: (iso: string) => boolean;
  inclusive?: boolean;
}) {
  const t = useTranslations("common.forms");
  const locale = useLocale();
  // one month on phones so the footer ("Done") stays on screen; two side by side from md up
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const nights = useMemo(() => {
    const a = fromIso(start);
    const b = fromIso(end);
    return a && b ? Math.round((b.getTime() - a.getTime()) / 86_400_000) + (inclusive ? 1 : 0) : 0;
  }, [start, end, inclusive]);
  return (
    <Popover anchor={anchor} label={title ?? t("chooseDates")} onClose={onClose} open={open}>
      {title && <div className="px-space-lg pt-space-md font-label-md text-label-md uppercase tracking-wider text-outline">{title}</div>}
      <Calendar end={end} isDateDisabled={isDateDisabled} min={min} mode="range" months={wide ? 2 : 1} onRangeChange={onChange} start={start} />
      <div className="flex items-center justify-between gap-space-md px-space-lg pb-space-md pt-space-sm border-t border-[#EFE7DE]">
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {!start
            ? t("pickStart")
            : !end
              ? t("pickEnd")
              : t("rangeSummary", { range: formatIsoRange(start, end, locale), unit: unitLabel, count: nights })}
        </span>
        <span className="flex items-center gap-space-sm">
          {start && (
            <button className="h-9 px-space-md rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low" onClick={() => onChange("", undefined)} type="button">
              {t("clear")}
            </button>
          )}
          <button
            className="h-9 px-space-lg rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all"
            onClick={onClose}
            type="button"
          >
            {t("done")}
          </button>
        </span>
      </div>
    </Popover>
  );
}

const timeOptions = (locale: string) =>
  Array.from({ length: 24 * 4 }, (_, i) => {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    const value = `${pad(h)}:${pad(m)}`;
    const label = new Date(2000, 0, 1, h, m).toLocaleTimeString(intlLocale(locale), { hour: "numeric", minute: "2-digit" });
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
  const t = useTranslations("common.forms");
  const locale = useLocale();
  const times = useMemo(() => timeOptions(locale), [locale]);
  const [date, setDate] = useState(defaultValue?.slice(0, 10) ?? "");
  const [time, setTime] = useState(defaultValue?.slice(11, 16) || "10:00");
  return (
    <div className="grid grid-cols-[1fr_140px] gap-space-sm">
      <input name={name} type="hidden" value={date ? `${date}T${time}` : ""} />
      <DatePicker aria-label={ariaLabel ? t("fieldDate", { field: ariaLabel }) : t("date")} min={min} onChange={setDate} value={date} />
      <Select aria-label={ariaLabel ? t("fieldTime", { field: ariaLabel }) : t("time")} onChange={setTime} options={times} panelMinWidth={140} value={time} />
    </div>
  );
}
