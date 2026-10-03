"use client";

import { useActionState, useEffect, useRef } from "react";
import { replyToTicket, type SupportFormState } from "@/app/actions/support";
import { BTN, TEXTAREA } from "@/components/ui";
import { BODY_MAX } from "@/lib/support";
import { FormStatus } from "@/app/admin/_components/FormStatus";

export function TicketReplyForm({ ticketId, resolved }: { ticketId: string; resolved: boolean }) {
  const [state, action, pending] = useActionState<SupportFormState, FormData>(replyToTicket.bind(null, ticketId), undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-space-sm">
      <label className="flex flex-col gap-space-xs">
        <span className="font-label-lg text-label-lg text-on-surface">{resolved ? "Still need help? Reply to re-open" : "Add a reply"}</span>
        <textarea aria-invalid={!!state?.error} className={TEXTAREA} maxLength={BODY_MAX} name="body" placeholder="Write your message…" required />
      </label>
      <FormStatus state={state} />
      <div className="flex justify-end">
        <button className={`${BTN.sage} w-full sm:w-auto`} disabled={pending} type="submit">
          {pending ? <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-xl">send</span>}
          Send reply
        </button>
      </div>
    </form>
  );
}
