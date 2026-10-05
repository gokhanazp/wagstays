"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { bookMeetGreet } from "@/app/actions/meet-greet";
import type { MeetGreetSlot } from "@/lib/meet-greet";

const SLOT_BASE = "py-3 sm:py-2 px-3 rounded-lg text-center font-label-md text-label-md";
const SLOT_IDLE = `${SLOT_BASE} bg-surface-container hover:bg-primary hover:text-on-primary transition-all text-on-surface`;
const SLOT_ACTIVE = `${SLOT_BASE} bg-primary text-on-primary shadow-sm`;

type Props = {
  code: string;
  slots: MeetGreetSlot[];
  defaultIndex: number;
  /** "Tomorrow, 4:15 PM" when a Meet & Greet is already booked. */
  bookedLabel: string | null;
  canBook: boolean;
};

export function MeetGreetPicker({ code, slots, defaultIndex, bookedLabel, canBook }: Props) {
  const t = useTranslations("apply.meetGreet.picker");
  const [selected, setSelected] = useState(defaultIndex);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justBooked, setJustBooked] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const label = justBooked ?? bookedLabel;

  if (label && !editing) {
    return (
      <div className="mt-space-xs p-space-md bg-surface-container-lowest rounded-xl flex flex-col gap-space-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-label-md text-label-md text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              event_available
            </span>
            <span>{t.rich("booked", { label, b: (c) => <strong className="text-primary">{c}</strong> })}</span>
          </span>
          {canBook && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setEditing(true);
              }}
              className="font-label-sm text-label-sm text-primary cursor-pointer hover:underline"
            >
              {t("change")}
            </button>
          )}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-secondary">videocam</span>
          {t("emailNote")}
        </p>
      </div>
    );
  }

  function confirm() {
    const slot = slots[selected];
    setError(null);
    startTransition(async () => {
      const res = await bookMeetGreet(code, slot.iso);
      if (res.ok) {
        setJustBooked(res.label);
        setEditing(false);
      } else setError(res.error);
    });
  }

  return (
    <div className="mt-space-xs p-space-md bg-surface-container-lowest rounded-xl flex flex-col gap-space-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-label-md text-label-md text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-secondary">calendar_month</span>
          {t("suggested")}
        </span>
        {editing ? (
          <button type="button" onClick={() => setEditing(false)} className="font-label-sm text-label-sm text-primary cursor-pointer hover:underline">
            {t("keep")}
          </button>
        ) : (
          <a
            href={`mailto:sitters@wagstays.ca?subject=${encodeURIComponent(`Meet & Greet time – ${code}`)}`}
            className="font-label-sm text-label-sm text-primary cursor-pointer hover:underline"
          >
            {t("another")}
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label={t("groupAria")}>
        {slots.map((s, i) => (
          <button
            key={s.iso}
            type="button"
            role="radio"
            aria-checked={i === selected}
            onClick={() => setSelected(i)}
            className={i === selected ? SLOT_ACTIVE : SLOT_IDLE}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {t.rich("selected", { time: slots[selected].label, b: (c) => <strong className="text-on-surface">{c}</strong> })}
        </span>
        <button
          type="button"
          onClick={confirm}
          disabled={pending || !canBook}
          className="px-space-md py-2 rounded-full bg-secondary text-on-secondary font-label-md text-label-md hover:bg-secondary-container hover:text-on-secondary-container transition-all flex items-center gap-1 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span>{pending ? t("booking") : t("confirm")}</span>
          <span className="material-symbols-outlined text-sm">{pending ? "progress_activity" : "arrow_forward"}</span>
        </button>
      </div>
      {error && (
        <p role="alert" className="font-body-sm text-body-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
