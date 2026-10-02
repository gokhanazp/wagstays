"use client";

import { useActionState, useState } from "react";
import { createReview, type FormState } from "@/app/actions/account";
import { BTN, LABEL, TEXTAREA } from "@/components/ui";

const WORDS = ["", "Poor", "Fair", "Good", "Great", "Outstanding"];

export function ReviewForm({ bookingId, sitterFirstName }: { bookingId: string; sitterFirstName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createReview.bind(null, bookingId), undefined);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const shown = hover || rating;
  const len = body.trim().length;
  const ratingErr = state?.fieldErrors?.rating?.[0];
  const bodyErr = state?.fieldErrors?.body?.[0];


  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      <fieldset className="flex flex-col gap-space-xs">
        <legend className={`${LABEL} mb-space-xs`}>Your rating</legend>
        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="flex" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <label className="cursor-pointer p-0.5 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary" key={n} onMouseEnter={() => setHover(n)}>
                <input
                  checked={rating === n}
                  className="sr-only"
                  name="rating"
                  onChange={() => setRating(n)}
                  type="radio"
                  value={n}
                />
                <span className="sr-only">
                  {n} star{n === 1 ? "" : "s"} — {WORDS[n]}
                </span>
                <span
                  aria-hidden
                  className={`material-symbols-outlined text-[32px] transition-colors ${n <= shown ? "text-tertiary-container" : "text-outline-variant"}`}
                  style={{ fontVariationSettings: `'FILL' ${n <= shown ? 1 : 0}` }}
                >
                  star
                </span>
              </label>
            ))}
          </div>
          <span className="font-label-lg text-label-lg text-on-surface-variant min-w-[90px]">{shown ? WORDS[shown] : "Tap to rate"}</span>
        </div>
        {ratingErr && (
          <span className="flex items-center gap-1 font-body-sm text-body-sm text-error">
            <span className="material-symbols-outlined text-base">error</span>
            {ratingErr}
          </span>
        )}
      </fieldset>

      <label className="flex flex-col gap-space-xs">
        <span className={LABEL}>Your review</span>
        <textarea
          aria-invalid={!!bodyErr}
          className={TEXTAREA}
          maxLength={1000}
          minLength={20}
          name="body"
          onChange={(e) => setBody(e.target.value)}
          placeholder={`What did ${sitterFirstName} do well? Other pet parents will read this.`}
          required
          value={body}
        />
        <span className={`flex justify-between gap-space-sm font-body-sm text-body-sm ${bodyErr ? "text-error" : "text-on-surface-variant"}`}>
          <span>{bodyErr ?? (len < 20 ? `At least ${20 - len} more character${20 - len === 1 ? "" : "s"}` : "Looks good!")}</span>
          <span>{len}/1000</span>
        </span>
      </label>

      {state?.error && (
        <p className="flex items-center gap-1 font-body-sm text-body-sm text-error" role="alert">
          <span className="material-symbols-outlined text-base">error</span>
          {state.error}
        </p>
      )}
      <button className={`${BTN.primary} self-start`} disabled={pending} type="submit">
        <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "autorenew" : "rate_review"}</span>
        {pending ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}
