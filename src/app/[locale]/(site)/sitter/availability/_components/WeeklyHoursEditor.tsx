"use client";

import { useLocale, useTranslations } from "next-intl";
import { startTransition, useActionState, useMemo, useState } from "react";
import { saveWeeklyHours } from "@/app/actions/availability";
import { BTN } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { AVAILABILITY_LIMITS, formatMinute, type WeeklyRange } from "@/lib/availability-core";
import { Feedback } from "../../_components/Feedback";

type Range = { start: number; end: number };
// Monday first, like most Canadian calendars for work schedules.
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const STEPS = Array.from({ length: 49 }, (_, i) => i * 30); // 0:00 … 24:00
const FIELD =
  "w-full h-10 pl-3 pr-9 rounded-xl bg-surface-container-lowest border-[1.5px] border-[#EFE7DE] font-body-sm text-body-sm text-on-surface text-left focus:outline-none focus-visible:border-primary-container focus-visible:ring-[3px] focus-visible:ring-primary-container/15";

function problems(ranges: Range[]) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  if (sorted.some((r) => r.start >= r.end)) return "endAfterStart" as const;
  for (let i = 1; i < sorted.length; i++) if (sorted[i].start < sorted[i - 1].end) return "overlap" as const;
  return null;
}

export function WeeklyHoursEditor({ initial }: { initial: WeeklyRange[] }) {
  const t = useTranslations("sitter.weeklyHours");
  const tc = useTranslations("common");
  const dayName = (wd: number) => tc(`enums.weekday.${String(wd) as "0"}`);
  const locale = useLocale();
  const option = (m: number) => ({ value: String(m), label: m === 1440 ? t("midnight", { time: formatMinute(m, locale) }) : formatMinute(m, locale) });
  const [days, setDays] = useState<Range[][]>(() =>
    Array.from({ length: 7 }, (_, wd) =>
      initial
        .filter((r) => r.weekday === wd)
        .sort((a, b) => a.startMinute - b.startMinute)
        .map((r) => ({ start: r.startMinute, end: r.endMinute })),
    ),
  );
  const [dirty, setDirty] = useState(false);
  const [state, dispatch, pending] = useActionState(async (s: Parameters<typeof saveWeeklyHours>[0], f: FormData) => {
    const res = await saveWeeklyHours(s, f);
    if (res?.ok) setDirty(false);
    return res;
  }, undefined);

  const errors = useMemo(() => days.map(problems), [days]);
  const hasErrors = errors.some(Boolean);

  const update = (wd: number, fn: (r: Range[]) => Range[]) => {
    setDays((d) => d.map((r, i) => (i === wd ? fn(r) : r)));
    setDirty(true);
  };
  const addRange = (wd: number) =>
    update(wd, (r) => {
      const last = r.at(-1);
      const start = last ? Math.min(last.end + 60, 1380) : 9 * 60;
      return [...r, { start, end: Math.min(start + 180, 1440) }];
    });
  const copyToAll = (wd: number) => {
    setDays((d) => d.map(() => d[wd].map((r) => ({ ...r }))));
    setDirty(true);
  };

  const submit = () => {
    const fd = new FormData();
    fd.set("hours", JSON.stringify(days.flatMap((r, weekday) => r.map((x) => ({ weekday, startMinute: x.start, endMinute: x.end })))));
    startTransition(() => dispatch(fd));
  };

  return (
    <div className="flex flex-col gap-space-md px-space-lg pt-space-md">
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        {t("intro")}
      </p>
      <ul className="flex flex-col divide-y divide-[#EFE7DE]">
        {ORDER.map((wd) => {
          const ranges = days[wd];
          const open = ranges.length > 0;
          return (
            <li className="flex flex-col md:flex-row md:items-start gap-space-sm py-space-md" key={wd}>
              <div className="flex items-center justify-between md:justify-start gap-space-sm md:w-48 md:pt-1.5 shrink-0">
                <label className="flex items-center gap-space-sm cursor-pointer">
                  <input
                    aria-label={t("openOn", { day: dayName(wd) })}
                    checked={open}
                    className="peer sr-only"
                    onChange={(e) => update(wd, () => (e.target.checked ? [{ start: 9 * 60, end: 17 * 60 }] : []))}
                    type="checkbox"
                  />
                  <span className="relative w-11 h-6 rounded-full bg-outline-variant peer-checked:bg-primary-container peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-container/20 transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 shrink-0" />
                  <span className="font-label-lg text-label-lg text-on-surface w-24">{dayName(wd)}</span>
                </label>
                {!open && <span className="md:hidden font-body-sm text-body-sm text-outline">{t("closed")}</span>}
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-space-xs">
                {!open && <span className="hidden md:block font-body-sm text-body-sm text-outline pt-2">{t("closed")}</span>}
                {ranges.map((r, i) => (
                  <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-space-xs" key={i}>
                    <Select
                      aria-label={t("rangeStart", { day: dayName(wd), n: i + 1 })}
                      className={FIELD}
                      onChange={(v) => update(wd, (rs) => rs.map((x, j) => (j === i ? { ...x, start: Number(v) } : x)))}
                      options={STEPS.slice(0, -1).map(option)}
                      panelMinWidth={160}
                      value={String(r.start)}
                    />
                    <span className="text-on-surface-variant font-body-sm text-body-sm">{t("to")}</span>
                    <Select
                      aria-label={t("rangeEnd", { day: dayName(wd), n: i + 1 })}
                      className={FIELD}
                      onChange={(v) => update(wd, (rs) => rs.map((x, j) => (j === i ? { ...x, end: Number(v) } : x)))}
                      options={STEPS.slice(1).map((m) => ({ ...option(m), disabled: m <= r.start }))}
                      panelMinWidth={160}
                      value={String(r.end)}
                    />
                    <button
                      aria-label={t("removeRange", { day: dayName(wd), n: i + 1 })}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-error"
                      onClick={() => update(wd, (rs) => rs.filter((_, j) => j !== i))}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                ))}
                {errors[wd] && (
                  <span className="flex items-center gap-1 font-body-sm text-body-sm text-error">
                    <span className="material-symbols-outlined text-base">error</span>
                    {t(errors[wd]!)}
                  </span>
                )}
                {open && (
                  <div className="flex flex-wrap gap-x-space-md gap-y-1">
                    {ranges.length < AVAILABILITY_LIMITS.maxRangesPerDay && (
                      <button className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline" onClick={() => addRange(wd)} type="button">
                        <span className="material-symbols-outlined text-base">add</span>{t("addHours")}
                      </button>
                    )}
                    <button
                      className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary hover:underline"
                      onClick={() => copyToAll(wd)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base">content_copy</span>{t("copyAll")}
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-space-md">
        <button className={BTN.sage} disabled={pending || hasErrors || !dirty} onClick={submit} type="button">
          <span className="material-symbols-outlined text-lg">{pending ? "progress_activity" : "save"}</span>
          {pending ? tc("actions.saving") : t("save")}
        </button>
        {dirty && !pending && <span className="font-body-sm text-body-sm text-on-surface-variant">{t("unsaved")}</span>}
        <Feedback state={state} />
      </div>
    </div>
  );
}
