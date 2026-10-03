"use client";

import { startTransition, useActionState, useState } from "react";
import { rateOwner } from "@/app/actions/reviews";
import type { SitterActionState } from "@/app/actions/sitter";
import { BTN, TEXTAREA } from "@/components/ui";
import { OWNER_NOTE_MAX, OWNER_REVIEW_TAGS } from "@/lib/review-rules";
import { Feedback } from "./Feedback";

const LABELS = ["", "Difficult", "Could be better", "Okay", "Good", "Wonderful"];

/**
 * Private rating of the pet parent after a completed booking (stars + quick tags + optional note).
 * `prompt` renders a collapsed one-line invitation (booking cards) that expands into the form.
 */
export function RateOwnerForm({ bookingId, ownerFirstName, prompt = false }: { bookingId: string; ownerFirstName: string; prompt?: boolean }) {
  const [open, setOpen] = useState(!prompt);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, dispatch, pending] = useActionState(async (prev: SitterActionState, fd: FormData) => rateOwner(prev, fd), undefined);
  const small = `${BTN.small} max-sm:h-10`;

  if (state?.ok) return <Feedback state={state} />;

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-sm pl-space-md rounded-2xl bg-tertiary-fixed/50">
        <span className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface">
          <span className="material-symbols-outlined text-xl text-secondary">rate_review</span>
          How was {ownerFirstName} as a pet parent?
        </span>
        <button className={`${small} bg-secondary text-on-secondary hover:brightness-95`} onClick={() => setOpen(true)} type="button">
          <span className="material-symbols-outlined text-base">star</span>Rate {ownerFirstName}
        </button>
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form
      className="flex flex-col gap-space-md p-space-md sm:p-space-lg rounded-2xl bg-surface-container-low"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      <input name="bookingId" type="hidden" value={bookingId} />
      <div className="flex flex-col gap-1">
        <span className="font-title-md text-title-md text-on-surface">Rate {ownerFirstName}</span>
        <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-base">lock</span>
          Private — {ownerFirstName} never sees it. Other sitters only see the average rating.
        </span>
      </div>

      <fieldset className="flex flex-col gap-space-xs">
        <legend className="sr-only">Star rating</legend>
        <div className="flex items-center gap-space-sm flex-wrap" onMouseLeave={() => setHover(0)}>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <label className="cursor-pointer p-0.5" key={n} onMouseEnter={() => setHover(n)}>
                <input checked={rating === n} className="sr-only peer" name="rating" onChange={() => setRating(n)} required type="radio" value={n} />
                <span
                  aria-hidden
                  className={`material-symbols-outlined text-[32px] rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${n <= shown ? "text-tertiary-container" : "text-outline-variant"}`}
                  style={{ fontVariationSettings: n <= shown ? "'FILL' 1" : "'FILL' 0" }}
                >
                  star
                </span>
                <span className="sr-only">
                  {n} star{n === 1 ? "" : "s"}
                </span>
              </label>
            ))}
          </div>
          <span className="font-label-lg text-label-lg text-on-surface-variant min-h-6">{LABELS[shown]}</span>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-space-xs">
        <legend className="font-label-lg text-label-lg text-on-surface mb-space-xs">What stood out? (optional)</legend>
        <div className="flex flex-wrap gap-space-xs">
          {OWNER_REVIEW_TAGS.map((t) => (
            <label className="cursor-pointer" key={t}>
              <input className="sr-only peer" name="tags" type="checkbox" value={t} />
              <span className="inline-flex items-center gap-1 h-9 px-space-md rounded-full border border-[#EFE7DE] bg-surface-container-lowest font-label-md text-label-md text-on-surface-variant transition-colors peer-checked:bg-primary-fixed peer-checked:border-primary-fixed-dim peer-checked:text-on-primary-fixed peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                {t}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-space-xs">
        <span className="font-label-lg text-label-lg text-on-surface">Private note for WagStays (optional)</span>
        <textarea
          className={`${TEXTAREA} min-h-[88px]`}
          maxLength={OWNER_NOTE_MAX}
          name="note"
          placeholder="Anything our team should know? This is never shown to other sitters."
        />
      </label>

      <div className="flex flex-wrap gap-space-sm">
        <button className={`${small} bg-primary text-on-primary hover:bg-primary-container`} disabled={pending || !rating} type="submit">
          {pending ? "Saving…" : "Submit rating"}
        </button>
        {prompt && (
          <button className={`${small} text-on-surface hover:bg-surface-container`} disabled={pending} onClick={() => setOpen(false)} type="button">
            Not now
          </button>
        )}
      </div>
      <Feedback state={state} />
    </form>
  );
}
