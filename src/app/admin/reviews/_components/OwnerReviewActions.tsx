"use client";

import { startTransition, useActionState, useState } from "react";
import { moderateOwnerReview } from "@/app/actions/reviews";
import { BTN, INPUT } from "@/components/ui";
import type { AdminActionState } from "@/app/actions/admin-bookings";
import { FormNotice } from "@/app/admin/bookings/_components/FormNotice";

const SMALL_SAGE = `${BTN.small} bg-[#EBF3EF] text-primary-container border border-[#C8DDD4] hover:bg-[#DCECE4]`;
const SMALL_GHOST = `${BTN.small} text-on-surface hover:bg-surface-container-low border border-[#EFE7DE]`;

/** Hide / unhide a sitter's private rating of a pet parent. Both directions need a reason (audited). */
export function OwnerReviewActions({ ownerReviewId, hidden }: { ownerReviewId: string; hidden: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: AdminActionState, fd: FormData) => {
    const res = await moderateOwnerReview(prev, fd);
    if (res?.ok) startTransition(() => setOpen(false));
    return res;
  }, undefined);
  const op = hidden ? "unhide" : "hide";

  return (
    <div className="flex flex-col gap-space-sm">
      <FormNotice state={state} />
      {!open && (
        <div className="flex lg:justify-end">
          <button aria-expanded={open} className={hidden ? SMALL_SAGE : SMALL_GHOST} disabled={pending} onClick={() => setOpen(true)} type="button">
            <span className="material-symbols-outlined text-base">{hidden ? "visibility" : "visibility_off"}</span>
            {hidden ? "Unhide" : "Hide"}
          </button>
        </div>
      )}
      {open && (
        <form
          action={action}
          className="flex flex-col gap-space-xs p-space-sm rounded-xl bg-surface-container-low"
        >
          <input name="op" type="hidden" value={op} />
          <input name="ownerReviewId" type="hidden" value={ownerReviewId} />
          <label className="font-label-md text-label-md text-on-surface" htmlFor={`or-reason-${ownerReviewId}`}>
            {hidden ? "Reason for unhiding" : "Reason for hiding"}
          </label>
          <input
            className={`${INPUT} h-10`}
            id={`or-reason-${ownerReviewId}`}
            maxLength={300}
            minLength={5}
            name="reason"
            placeholder={hidden ? "e.g. Dispute resolved in the sitter's favour" : "e.g. Retaliatory rating after a refund dispute"}
            required
          />
          <div className="flex gap-space-xs justify-end">
            <button className={SMALL_GHOST} onClick={() => setOpen(false)} type="button">
              Cancel
            </button>
            <button className={`${BTN.small} bg-primary text-on-primary hover:bg-primary-container`} disabled={pending} type="submit">
              {pending ? "Saving…" : hidden ? "Unhide rating" : "Hide rating"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
