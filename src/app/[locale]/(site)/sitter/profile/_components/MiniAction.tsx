"use client";

import { useActionState } from "react";
import type { SitterActionState } from "@/app/actions/sitter";

type Action = (s: SitterActionState, f: FormData) => Promise<SitterActionState>;

/** One-button form (delete / move …) with pending state, optional confirmation and inline error. */
export function MiniAction({
  action,
  fields,
  confirm,
  className,
  label,
  children,
}: {
  action: Action;
  fields: Record<string, string>;
  confirm?: string;
  className: string;
  label: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      className="inline-flex flex-col"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} name={k} type="hidden" value={v} />
      ))}
      <button aria-label={label} className={className} disabled={pending} title={label} type="submit">
        {children}
      </button>
      {state?.error && <span className="font-body-sm text-body-sm text-error">{state.error}</span>}
    </form>
  );
}
