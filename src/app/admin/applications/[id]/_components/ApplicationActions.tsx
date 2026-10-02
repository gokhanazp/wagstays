"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  approveApplication,
  rejectApplication,
  saveReviewNotes,
  scheduleMeetGreet,
  type AdminFormState,
} from "@/app/actions/admin-sitters";
import { BTN, Field, TEXTAREA } from "@/components/ui";
import { DateTimePicker, toIso } from "@/components/forms/DatePicker";

export function Feedback({ state }: { state: AdminFormState }) {
  if (state?.error)
    return (
      <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm" role="alert">
        <span className="material-symbols-outlined text-lg">error</span>
        {state.error}
      </div>
    );
  if (state?.ok && state.message)
    return (
      <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-[#EBF3EF] text-primary font-body-sm text-body-sm" role="status">
        <span className="material-symbols-outlined text-lg">check_circle</span>
        {state.message}
      </div>
    );
  return null;
}

export function MeetGreetForm({ applicationId, defaultValue, hasExisting }: { applicationId: string; defaultValue: string; hasExisting: boolean }) {
  const [state, action, pending] = useActionState(scheduleMeetGreet, undefined);
  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      <input name="applicationId" type="hidden" value={applicationId} />
      <Field error={state?.fieldErrors?.meetGreetAt} hint="Toronto time (ET). The applicant sees it on their status page." label="Date & time">
        <DateTimePicker aria-label="Meet & Greet" defaultValue={defaultValue} min={toIso(new Date())} name="meetGreetAt" />
      </Field>
      <Feedback state={state} />
      <button className={BTN.secondary} disabled={pending} type="submit">
        <span className="material-symbols-outlined text-lg">event</span>
        {pending ? "Saving…" : hasExisting ? "Change Meet & Greet" : "Schedule Meet & Greet"}
      </button>
    </form>
  );
}

export function NotesForm({ applicationId, defaultValue }: { applicationId: string; defaultValue: string }) {
  const [state, action, pending] = useActionState(saveReviewNotes, undefined);
  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      <input name="applicationId" type="hidden" value={applicationId} />
      <Field error={state?.fieldErrors?.reviewNotes} hint="Only visible to admins." label="Internal notes">
        <textarea className={TEXTAREA} defaultValue={defaultValue} maxLength={4000} name="reviewNotes" placeholder="Reference calls, Meet & Greet impressions…" rows={5} />
      </Field>
      <Feedback state={state} />
      <button className={`${BTN.ghost} self-start border border-[#EFE7DE]`} disabled={pending} type="submit">
        <span className="material-symbols-outlined text-lg">save</span>
        {pending ? "Saving…" : "Save notes"}
      </button>
    </form>
  );
}

/** Approve / reject. Stays mounted after the decision so the one-time result message survives revalidation. */
export function DecisionPanel({
  applicationId,
  name,
  hasDocs,
  decided,
  children,
}: {
  applicationId: string;
  name: string;
  hasDocs: boolean;
  decided: boolean;
  children?: React.ReactNode;
}) {
  const [approveState, approve, approving] = useActionState(approveApplication, undefined);
  const [rejectState, reject, rejecting] = useActionState(rejectApplication, undefined);
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");

  if (decided || approveState?.ok || rejectState?.ok)
    return (
      <div className="flex flex-col gap-space-md">
        {approveState?.ok && <Feedback state={approveState} />}
        {rejectState?.ok && <Feedback state={rejectState} />}
        {children}
      </div>
    );

  return (
    <div className="flex flex-col gap-space-md">
      {mode === "idle" && (
        <div className="flex flex-col sm:flex-row gap-space-sm">
          <button className={`${BTN.sage} flex-1`} onClick={() => setMode("approve")} type="button">
            <span className="material-symbols-outlined text-lg">verified</span>
            Approve
          </button>
          <button className={`${BTN.danger} flex-1`} onClick={() => setMode("reject")} type="button">
            <span className="material-symbols-outlined text-lg">block</span>
            Reject
          </button>
        </div>
      )}

      {mode === "approve" && (
        <form action={approve} className="flex flex-col gap-space-md p-space-md rounded-xl bg-[#EBF3EF] border border-[#C8DDD4]">
          <input name="applicationId" type="hidden" value={applicationId} />
          <p className="font-body-sm text-body-sm text-on-surface">
            Approving publishes <strong>{name}</strong> as an active sitter in search and creates their services from the
            application prices. {!hasDocs && <strong className="text-error">No ID document is on file.</strong>}
          </p>
          <Feedback state={approveState} />
          <div className="flex flex-col sm:flex-row gap-space-sm">
            <button className={`${BTN.sage} flex-1`} disabled={approving} type="submit">
              {approving ? "Publishing…" : "Yes, approve & publish"}
            </button>
            <button className={BTN.ghost} disabled={approving} onClick={() => setMode("idle")} type="button">
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "reject" && (
        <form action={reject} className="flex flex-col gap-space-md p-space-md rounded-xl bg-surface-container-low border border-[#EFE7DE]" noValidate>
          <input name="applicationId" type="hidden" value={applicationId} />
          <Field error={rejectState?.fieldErrors?.reason} hint="Saved to the internal notes." label="Reason for rejecting">
            <textarea className={TEXTAREA} maxLength={2000} name="reason" placeholder="e.g. References could not be verified." rows={3} />
          </Field>
          {rejectState?.error && <Feedback state={rejectState} />}
          <div className="flex flex-col sm:flex-row gap-space-sm">
            <button className={`${BTN.danger} flex-1`} disabled={rejecting} type="submit">
              {rejecting ? "Rejecting…" : "Confirm rejection"}
            </button>
            <button className={BTN.ghost} disabled={rejecting} onClick={() => setMode("idle")} type="button">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ViewProfileLinks({ sitterId, slug }: { sitterId: string; slug: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-space-sm">
      <Link className={`${BTN.sage} flex-1`} href={`/admin/sitters/${sitterId}`}>
        <span className="material-symbols-outlined text-lg">manage_accounts</span>
        Manage sitter
      </Link>
      <Link className={`${BTN.secondary} flex-1`} href={`/sitters/${slug}`} target="_blank">
        <span className="material-symbols-outlined text-lg">open_in_new</span>
        Public profile
      </Link>
    </div>
  );
}
