"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState, useState } from "react";
import { replyToReview } from "@/app/actions/reviews";
import type { SitterActionState } from "@/app/actions/sitter";
import { BTN, TEXTAREA } from "@/components/ui";
import { REPLY_MAX } from "@/lib/review-rules";
import { Feedback } from "./Feedback";

/**
 * The sitter's public reply under one review: shows the reply (with Edit while the 7-day window is open),
 * or a "Reply" button that opens the editor. Hidden reviews can't be replied to.
 */
export function ReviewReply({
  reviewId,
  reply,
  repliedAgo,
  canEdit,
  hidden,
  compact = false,
}: {
  reviewId: string;
  reply: string | null;
  repliedAgo: string | null;
  canEdit: boolean;
  hidden: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("sitter.reviewReply");
  const tc = useTranslations("common.actions");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reply ?? "");
  const [state, dispatch, pending] = useActionState(async (prev: SitterActionState, fd: FormData) => {
    const res = await replyToReview(prev, fd);
    if (res?.ok) startTransition(() => setEditing(false)); // commit together with the refreshed reply
    return res;
  }, undefined);
  const small = `${BTN.small} max-sm:h-10`;

  if (hidden) {
    return (
      <p className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-base">visibility_off</span>
        {t("hidden")}
      </p>
    );
  }

  if (editing) {
    const over = text.trim().length > REPLY_MAX;
    return (
      <form
        className={`flex flex-col gap-space-sm rounded-2xl bg-surface-container-low ${compact ? "p-space-sm" : "p-space-md"}`}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => dispatch(fd));
        }}
      >
        <input name="reviewId" type="hidden" value={reviewId} />
        <label className="flex flex-col gap-space-xs">
          <span className="font-label-lg text-label-lg text-on-surface">{reply ? t("editLabel") : t("newLabel")}</span>
          <textarea
            autoFocus
            className={`${TEXTAREA} ${compact ? "min-h-[96px]" : "min-h-[110px]"}`}
            maxLength={REPLY_MAX + 50}
            name="body"
            onChange={(e) => setText(e.target.value)}
            placeholder={t("placeholder")}
            required
            value={text}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <span className={`font-label-sm text-label-sm ${over ? "text-error" : "text-on-surface-variant"}`}>
            {text.trim().length}/{REPLY_MAX}
            {!reply && t("editFor7Days")}
          </span>
          <div className="flex gap-space-xs">
            <button
              className={`${small} text-on-surface hover:bg-surface-container`}
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setText(reply ?? "");
              }}
              type="button"
            >
              {tc("cancel")}
            </button>
            <button className={`${small} bg-primary text-on-primary hover:bg-primary-container`} disabled={pending || over || !text.trim()} type="submit">
              {pending ? tc("saving") : reply ? t("save") : t("post")}
            </button>
          </div>
        </div>
        <Feedback state={state} />
      </form>
    );
  }

  if (reply) {
    return (
      <div className="flex flex-col gap-space-xs">
        <div className="flex flex-col gap-1 pl-space-md border-l-2 border-primary-fixed-dim">
          <span className="font-label-md text-label-md text-on-surface">
            {t("yourReply")}{repliedAgo ? <span className="font-normal text-on-surface-variant"> · {repliedAgo}</span> : null}
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line break-words">{reply}</p>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm">
          {canEdit ? (
            <button className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline" onClick={() => setEditing(true)} type="button">
              <span className="material-symbols-outlined text-base">edit</span>{t("edit")}
            </button>
          ) : (
            <span className="font-label-sm text-label-sm text-outline">{t("windowClosed")}</span>
          )}
          <Feedback state={state} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-space-sm">
      <button
        className={`${small} bg-[#EBF3EF] text-primary-container border border-[#C8DDD4] hover:bg-[#DCECE4]`}
        onClick={() => setEditing(true)}
        type="button"
      >
        <span className="material-symbols-outlined text-base">reply</span>{t("reply")}
      </button>
      <Feedback state={state} />
    </div>
  );
}
