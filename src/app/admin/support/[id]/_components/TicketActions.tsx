"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { adminReopenTicket, adminReplyToTicket, adminResolveTicket, adminUpdateTicket, type SupportFormState } from "@/app/actions/support";
import { Select } from "@/components/forms/Select";
import { BTN, Field, LABEL, TEXTAREA } from "@/components/ui";
import { ADMIN_STATUS_LABELS, BODY_MAX, PRIORITY_LABELS, TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/support";
import { FormStatus } from "../../../_components/FormStatus";
import { ConfirmButton } from "../../../_components/ConfirmButton";

function Spinner() {
  return <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>;
}

export function StatusPriorityForm({ ticketId, status, priority }: { ticketId: string; status: string; priority: string }) {
  const [state, action, pending] = useActionState<SupportFormState, FormData>(adminUpdateTicket, undefined);
  const [s, setS] = useState(status);
  const [p, setP] = useState(priority);
  const dirty = s !== status || p !== priority;

  return (
    <form action={action} className="flex flex-col gap-space-md">
      <input name="ticketId" type="hidden" value={ticketId} />
      <div className="grid grid-cols-[3fr_2fr] gap-space-sm">
        <label className="flex flex-col gap-space-xs min-w-0">
          <span className={LABEL}>Status</span>
          <Select
            aria-label="Status"
            name="status"
            onChange={setS}
            options={TICKET_STATUSES.map((v) => ({ value: v, label: ADMIN_STATUS_LABELS[v].label, icon: ADMIN_STATUS_LABELS[v].icon }))}
            value={s}
          />
        </label>
        <label className="flex flex-col gap-space-xs min-w-0">
          <span className={LABEL}>Priority</span>
          <Select
            aria-label="Priority"
            name="priority"
            onChange={setP}
            options={TICKET_PRIORITIES.map((v) => ({ value: v, label: PRIORITY_LABELS[v].label, icon: PRIORITY_LABELS[v].icon }))}
            panelMinWidth={180}
            value={p}
          />
        </label>
      </div>
      <FormStatus state={state} />
      <button className={BTN.sage} disabled={pending || !dirty} type="submit">
        {pending ? <Spinner /> : <span className="material-symbols-outlined text-xl">save</span>}
        Save changes
      </button>
    </form>
  );
}

export function AdminReplyForm({ ticketId, userFirstName }: { ticketId: string; userFirstName: string }) {
  const [state, action, pending] = useActionState<SupportFormState, FormData>(adminReplyToTicket, undefined);
  const [internal, setInternal] = useState(false);
  const [then, setThen] = useState("WAITING_ON_USER");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-space-md">
      <input name="ticketId" type="hidden" value={ticketId} />
      <input name="internal" type="hidden" value={internal ? "1" : ""} />
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <div aria-label="Message type" className="inline-flex p-1 rounded-full bg-surface-container-low" role="radiogroup">
          {[
            { v: false, label: `Reply to ${userFirstName}`, icon: "reply" },
            { v: true, label: "Internal note", icon: "lock" },
          ].map((o) => (
            <button
              aria-checked={internal === o.v}
              className={`inline-flex items-center gap-1 h-9 px-space-md rounded-full font-label-md text-label-md transition-all ${
                internal === o.v ? (o.v ? "bg-tertiary-fixed text-on-tertiary-fixed-variant shadow-sm" : "bg-primary text-on-primary shadow-sm") : "text-on-surface-variant hover:text-on-surface"
              }`}
              key={String(o.v)}
              onClick={() => setInternal(o.v)}
              role="radio"
              type="button"
            >
              <span className="material-symbols-outlined text-base">{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-space-xs">
        <span className="sr-only">{internal ? "Internal note" : "Reply"}</span>
        <textarea
          className={`${TEXTAREA} ${internal ? "!bg-tertiary-fixed/30 border-dashed" : ""}`}
          maxLength={BODY_MAX}
          name="body"
          placeholder={internal ? "Only admins can see this note." : `Write to ${userFirstName}… they'll be notified.`}
          required
        />
      </label>
      <FormStatus state={state} />
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-space-sm">
        {!internal ? (
          <label className="flex flex-col gap-space-xs sm:w-64">
            <span className="font-label-md text-label-md text-on-surface-variant">Then set status to</span>
            <Select
              aria-label="Then set status to"
              name="then"
              onChange={setThen}
              options={[
                { value: "WAITING_ON_USER", label: "Waiting on user", icon: "hourglass_top" },
                { value: "IN_PROGRESS", label: "In progress", icon: "pending" },
                { value: "KEEP", label: "Keep current status", icon: "remove" },
              ]}
              value={then}
            />
          </label>
        ) : (
          <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-base">visibility_off</span>
            Not visible to {userFirstName}; no notification is sent.
          </span>
        )}
        <button className={internal ? `${BTN.secondary} w-full sm:w-auto` : `${BTN.primary} w-full sm:w-auto`} disabled={pending} type="submit">
          {pending ? <Spinner /> : <span className="material-symbols-outlined text-xl">{internal ? "note_add" : "send"}</span>}
          {internal ? "Add note" : "Send reply"}
        </button>
      </div>
    </form>
  );
}

export function ResolveForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState<SupportFormState, FormData>(adminResolveTicket, undefined);
  return (
    <form action={action} className="flex flex-col gap-space-sm">
      <input name="ticketId" type="hidden" value={ticketId} />
      <Field error={state?.fieldErrors?.resolution} hint="Shown to the user on their ticket." label="Resolve with">
        <textarea className={`${TEXTAREA} min-h-[96px]`} maxLength={1000} name="resolution" placeholder="e.g. Refunded $15 as WagPoints credit and spoke with the sitter." required />
      </Field>
      {!state?.fieldErrors && <FormStatus state={state} />}
      <button className={BTN.secondary} disabled={pending} type="submit">
        {pending ? <Spinner /> : <span className="material-symbols-outlined text-xl">task_alt</span>}
        Resolve ticket
      </button>
    </form>
  );
}

export function ReopenButton({ ticketId }: { ticketId: string }) {
  return (
    <div className="flex flex-col gap-space-xs [&>span]:w-full">
      <ConfirmButton
        action={() => adminReopenTicket(ticketId)}
        className={`${BTN.secondary} w-full`}
        confirm={{ title: "Re-open this ticket?", body: "It goes back to In progress and the user is notified.", confirmLabel: "Re-open" }}
        icon="restart_alt"
        label="Re-open ticket"
      />
    </div>
  );
}
