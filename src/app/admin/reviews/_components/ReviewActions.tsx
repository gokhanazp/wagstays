"use client";

import { useActionState, useState } from "react";
import { moderateReview } from "@/app/actions/admin-bookings";
import { BTN, INPUT } from "@/components/ui";
import { FormNotice } from "@/app/admin/bookings/_components/FormNotice";
import { MAX_FEATURED_REVIEWS } from "../_constants";

const SMALL_SAGE = `${BTN.small} bg-[#EBF3EF] text-primary-container border border-[#C8DDD4] hover:bg-[#DCECE4]`;
const SMALL_GHOST = `${BTN.small} text-on-surface hover:bg-surface-container-low border border-[#EFE7DE]`;
const SMALL_DANGER = `${BTN.small} bg-error-container text-on-error-container hover:brightness-95`;

export function ReviewActions({ reviewId, hidden, featured, featureFull }: { reviewId: string; hidden: boolean; featured: boolean; featureFull: boolean }) {
  const [state, action, pending] = useActionState(moderateReview, undefined);
  const [hiding, setHiding] = useState(false);
  const featureBlocked = !featured && (hidden || featureFull);

  return (
    <div className="flex flex-col gap-space-sm">
      <FormNotice state={state} />
      <div className="flex flex-wrap gap-space-xs lg:justify-end lg:flex-nowrap">
        {hidden ? (
          <OpButton action={action} label="Unhide" icon="visibility" className={SMALL_SAGE} op="unhide" pending={pending} reviewId={reviewId} />
        ) : (
          <button aria-expanded={hiding} className={SMALL_GHOST} disabled={pending} onClick={() => setHiding((v) => !v)} type="button">
            <span className="material-symbols-outlined text-base">visibility_off</span>
            Hide
          </button>
        )}
        {featured ? (
          <OpButton action={action} className={SMALL_GHOST} icon="home" label="Unfeature" op="unfeature" pending={pending} reviewId={reviewId} />
        ) : (
          <OpButton
            action={action}
            className={SMALL_SAGE}
            disabled={featureBlocked}
            icon="home"
            label="Feature"
            op="feature"
            pending={pending}
            reviewId={reviewId}
            title={hidden ? "Hidden reviews can't be featured" : featureFull ? `The home page holds ${MAX_FEATURED_REVIEWS} testimonials — unfeature one first` : "Show on the home page"}
          />
        )}
        <form
          action={action}
          onSubmit={(e) => {
            if (!confirm("Delete this review permanently? This can't be undone — consider hiding it instead.")) e.preventDefault();
          }}
        >
          <input name="op" type="hidden" value="delete" />
          <input name="reviewId" type="hidden" value={reviewId} />
          <input name="confirm" type="hidden" value="yes" />
          <button className={SMALL_DANGER} disabled={pending} type="submit">
            <span className="material-symbols-outlined text-base">delete</span>
            Delete
          </button>
        </form>
      </div>
      {hiding && !hidden && (
        <form action={action} className="flex flex-col gap-space-xs p-space-sm rounded-xl bg-surface-container-low">
          <input name="op" type="hidden" value="hide" />
          <input name="reviewId" type="hidden" value={reviewId} />
          <label className="font-label-md text-label-md text-on-surface" htmlFor={`reason-${reviewId}`}>
            Reason for hiding
          </label>
          <input
            aria-invalid={Boolean(state?.fieldErrors?.reason)}
            className={`${INPUT} h-10`}
            id={`reason-${reviewId}`}
            maxLength={300}
            minLength={5}
            name="reason"
            placeholder="e.g. Contains a phone number"
            required
          />
          <div className="flex gap-space-xs justify-end">
            <button className={SMALL_GHOST} onClick={() => setHiding(false)} type="button">
              Cancel
            </button>
            <button className={`${BTN.small} bg-primary text-on-primary hover:bg-primary-container`} disabled={pending} type="submit">
              {pending ? "Hiding…" : "Hide review"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function OpButton(props: {
  action: (fd: FormData) => void;
  op: string;
  reviewId: string;
  label: string;
  icon: string;
  className: string;
  pending: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <form action={props.action}>
      <input name="op" type="hidden" value={props.op} />
      <input name="reviewId" type="hidden" value={props.reviewId} />
      <button className={props.className} disabled={props.pending || props.disabled} title={props.title} type="submit">
        <span className="material-symbols-outlined text-base">{props.icon}</span>
        {props.label}
      </button>
    </form>
  );
}
