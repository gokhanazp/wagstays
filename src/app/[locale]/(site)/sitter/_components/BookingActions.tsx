"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { respondToBooking, type SitterActionState } from "@/app/actions/sitter";
import { BTN, TEXTAREA } from "@/components/ui";
import { Feedback } from "./Feedback";

type Intent = "accept" | "decline" | "complete" | "cancel";

/**
 * Accept / Decline / Mark completed / Cancel controls for one booking.
 * `allowed` comes from allowedTransitions(status, "SITTER") on the server; the action re-checks everything.
 */
export function BookingActions({
  bookingId,
  allowed,
  started,
  ownerFirstName,
  compact = false,
}: {
  bookingId: string;
  allowed: string[];
  started: boolean;
  ownerFirstName: string;
  compact?: boolean;
}) {
  const t = useTranslations("sitter.bookingActions");
  const tc = useTranslations("common.actions");
  const [open, setOpen] = useState<Intent | null>(null);
  const [state, action, pending] = useActionState(async (prev: SitterActionState, fd: FormData) => {
    const res = await respondToBooking(prev, fd);
    if (res?.ok) setOpen(null);
    return res;
  }, undefined);
  const err = (k: string) => state?.fieldErrors?.[k]?.[0];

  const canAccept = allowed.includes("CONFIRMED");
  const canDecline = allowed.includes("DECLINED");
  const canComplete = allowed.includes("COMPLETED");
  const canCancel = allowed.includes("CANCELLED");
  if (!canAccept && !canDecline && !canComplete && !canCancel) return <Feedback state={state} />;

  // Compact variant (overview list) uses the small pill size with the same colours (a touch taller on phones).
  const small = `${BTN.small} max-sm:h-10`;
  const SMALL: Record<string, string> = {
    [BTN.sage]: `${small} bg-primary text-on-primary hover:bg-primary-container`,
    [BTN.primary]: `${small} bg-secondary text-on-secondary hover:brightness-95`,
    [BTN.danger]: `${small} bg-error-container text-on-error-container hover:brightness-95`,
    [BTN.ghost]: `${small} text-on-surface hover:bg-surface-container-low`,
  };
  const btn = (base: string) => (compact ? SMALL[base] : base);

  return (
    <div className="flex flex-col gap-space-sm">
      {!open && (
        <div className="flex flex-wrap gap-space-sm">
          {canAccept && (
            <button className={btn(BTN.sage)} onClick={() => setOpen("accept")} type="button">
              <span className="material-symbols-outlined text-lg">check</span>{t("accept")}
            </button>
          )}
          {canDecline && (
            <button className={btn(BTN.ghost) + " border border-[#EFE7DE]"} onClick={() => setOpen("decline")} type="button">
              <span className="material-symbols-outlined text-lg">close</span>{t("decline")}
            </button>
          )}
          {canComplete && (
            <button
              className={btn(BTN.sage)}
              disabled={!started}
              onClick={() => setOpen("complete")}
              title={started ? undefined : t("availableOnceStarted")}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">task_alt</span>{t("markCompleted")}
            </button>
          )}
          {canCancel && (
            <button className={btn(BTN.danger)} onClick={() => setOpen("cancel")} type="button">
              <span className="material-symbols-outlined text-lg">event_busy</span>{t("cancelBooking")}
            </button>
          )}
        </div>
      )}
      {canComplete && !started && !open && !compact && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t("completeHint")}</p>
      )}

      {open && (
        <form action={action} className={`flex flex-col gap-space-sm rounded-2xl bg-surface-container-low ${compact ? "p-space-md" : "p-space-lg"}`}>
          <input name="bookingId" type="hidden" value={bookingId} />
          <input name="intent" type="hidden" value={open} />
          {open === "accept" && (
            <label className="flex flex-col gap-space-xs">
              <span className="font-label-lg text-label-lg text-on-surface">{t("noteTo", { name: ownerFirstName })}</span>
              <textarea className={`${TEXTAREA} min-h-[88px]`} maxLength={500} name="note" placeholder={t("notePlaceholder")} />
              {err("note") && <span className="font-body-sm text-body-sm text-error">{err("note")}</span>}
            </label>
          )}
          {(open === "decline" || open === "cancel") && (
            <label className="flex flex-col gap-space-xs">
              <span className="font-label-lg text-label-lg text-on-surface">
                {open === "decline" ? t("reasonFor", { name: ownerFirstName }) : t("whyCancel")} <span className="text-error">*</span>
              </span>
              <textarea
                className={`${TEXTAREA} min-h-[88px]`}
                maxLength={500}
                minLength={5}
                name="reason"
                placeholder={open === "decline" ? t("declinePlaceholder") : t("cancelPlaceholder")}
                required
              />
              {err("reason") && <span className="font-body-sm text-body-sm text-error">{err("reason")}</span>}
            </label>
          )}
          {open === "cancel" && (
            <p className="flex items-start gap-space-xs p-space-sm rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-base">warning</span>
              {t("cancelWarning")}
            </p>
          )}
          {open === "complete" && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t("completeConfirm", { name: ownerFirstName })}
            </p>
          )}
          <div className="flex flex-wrap gap-space-sm">
            <button
              className={btn(open === "cancel" ? BTN.danger : open === "decline" ? BTN.primary : BTN.sage)}
              disabled={pending}
              type="submit"
            >
              {pending ? tc("saving") : t(`submit.${open}`)}
            </button>
            <button className={btn(BTN.ghost)} disabled={pending} onClick={() => setOpen(null)} type="button">
              {tc("back")}
            </button>
          </div>
        </form>
      )}
      <Feedback state={state} />
    </div>
  );
}
