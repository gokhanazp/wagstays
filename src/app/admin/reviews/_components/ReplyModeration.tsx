"use client";

import { startTransition, useActionState, useState } from "react";
import { removeReviewReply } from "@/app/actions/reviews";
import type { AdminActionState } from "@/app/actions/admin-bookings";
import { BTN, INPUT } from "@/components/ui";
import { FormNotice } from "@/app/admin/bookings/_components/FormNotice";

const SMALL_GHOST = `${BTN.small} text-on-surface hover:bg-surface-container-low border border-[#EFE7DE]`;

/** Shows a sitter's public reply under a review in the admin list, with "Remove reply" (reason required, audited). */
export function ReplyModeration({ reviewId, reply, repliedOn, sitterName }: { reviewId: string; reply: string | null; repliedOn: string | null; sitterName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: AdminActionState, fd: FormData) => {
    const res = await removeReviewReply(prev, fd);
    if (res?.ok) startTransition(() => setOpen(false));
    return res;
  }, undefined);

  if (!reply) return state?.ok ? <FormNotice state={state} /> : null;

  return (
    <div className="flex flex-col gap-space-xs mt-space-xs pl-space-md border-l-2 border-primary-fixed-dim">
      <div className="flex flex-wrap items-center justify-between gap-space-xs">
        <span className="font-label-md text-label-md text-on-surface">
          Reply from {sitterName}
          {repliedOn && <span className="font-normal text-on-surface-variant"> · {repliedOn}</span>}
        </span>
        {!open && (
          <button className="inline-flex items-center gap-1 font-label-md text-label-md text-error hover:underline" onClick={() => setOpen(true)} type="button">
            <span className="material-symbols-outlined text-base">delete</span>Remove reply
          </button>
        )}
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line break-words">{reply}</p>
      {open && (
        <form action={action} className="flex flex-col gap-space-xs p-space-sm rounded-xl bg-surface-container-low">
          <input name="reviewId" type="hidden" value={reviewId} />
          <label className="font-label-md text-label-md text-on-surface" htmlFor={`reply-reason-${reviewId}`}>
            Reason for removing the reply
          </label>
          <input
            className={`${INPUT} h-10`}
            id={`reply-reason-${reviewId}`}
            maxLength={300}
            minLength={5}
            name="reason"
            placeholder="e.g. Shares the pet parent's address"
            required
          />
          <div className="flex gap-space-xs justify-end">
            <button className={SMALL_GHOST} onClick={() => setOpen(false)} type="button">
              Cancel
            </button>
            <button className={`${BTN.small} bg-error-container text-on-error-container hover:brightness-95`} disabled={pending} type="submit">
              {pending ? "Removing…" : "Remove reply"}
            </button>
          </div>
        </form>
      )}
      <FormNotice state={state} />
    </div>
  );
}
