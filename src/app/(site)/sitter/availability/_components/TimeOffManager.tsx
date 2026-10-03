"use client";

import { useActionState, useState } from "react";
import { addTimeOff, deleteTimeOff } from "@/app/actions/availability";
import { BTN, INPUT } from "@/components/ui";
import { DateRangePicker } from "@/components/forms/DatePicker";
import { daysBetween, formatDayLong } from "@/lib/availability-core";
import { Feedback } from "../../_components/Feedback";
import { useFormAction } from "../../_components/useFormAction";

type Item = { id: string; startDate: string; endDate: string; note: string | null };

function DeleteButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteTimeOff, undefined);
  return (
    <form action={action} className="flex flex-col items-end">
      <input name="id" type="hidden" value={id} />
      <button
        aria-label="Delete time off"
        className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-error disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "progress_activity" : "delete"}</span>
      </button>
      {state?.error && <span className="font-body-sm text-body-sm text-error">{state.error}</span>}
    </form>
  );
}

export function TimeOffManager({ items, today }: { items: Item[]; today: string }) {
  const [range, setRange] = useState({ start: "", end: "" });
  const { form, state, pending, onSubmit } = useFormAction(
    async (s, f) => {
      const res = await addTimeOff(s, f);
      if (res?.ok) setRange({ start: "", end: "" });
      return res;
    },
    { resetOnSuccess: true },
  );
  return (
    <div className="flex flex-col gap-space-md px-space-lg pt-space-md">
      <form className="flex flex-col gap-space-sm" noValidate onSubmit={onSubmit} ref={form}>
        <span className="font-label-lg text-label-lg text-on-surface">Add time off</span>
        {/* a single picked day means one day off */}
        <input name="endDate" type="hidden" value={range.end || range.start} />
        <DateRangePicker
          aria-label="Time off dates"
          inclusive
          min={today}
          onChange={(s, e) => setRange({ start: s, end: e ?? "" })}
          placeholder="Pick the days you're away"
          end={range.end}
          start={range.start}
          startName="startDate"
          unitLabel="day"
        />
        <input aria-label="Note (optional)" className={INPUT} maxLength={120} name="note" placeholder="Note (optional) — e.g. Cottage weekend" />
        <div className="flex flex-wrap items-center gap-space-md">
          <button className={BTN.sage} disabled={pending || !range.start} type="submit">
            <span className="material-symbols-outlined text-lg">event_busy</span>
            {pending ? "Adding…" : "Add time off"}
          </button>
        </div>
        <Feedback state={state} />
      </form>

      <div className="flex flex-col gap-space-xs">
        <span className="font-label-lg text-label-lg text-on-surface">Upcoming time off</span>
        {items.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">None — you&apos;re bookable on all your open days.</p>
        ) : (
          <ul className="flex flex-col gap-space-xs">
            {items.map((t) => {
              const days = daysBetween(t.startDate, t.endDate) + 1;
              return (
                <li className="flex items-center gap-space-sm rounded-xl bg-surface-container-low px-space-md py-space-sm" key={t.id}>
                  <span className="material-symbols-outlined text-xl text-secondary">beach_access</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-label-lg text-label-lg text-on-surface">
                      {formatDayLong(t.startDate)}
                      {t.endDate !== t.startDate && ` – ${formatDayLong(t.endDate)}`}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {days} day{days === 1 ? "" : "s"}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                  <DeleteButton id={t.id} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
