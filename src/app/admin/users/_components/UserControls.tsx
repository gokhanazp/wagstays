"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { adjustWagPoints, setUserRole } from "@/app/actions/admin-core";
import { BTN, Field, INPUT } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { FormStatus } from "../../_components/FormStatus";
import { ROLE_LABEL } from "./roles";
import { keepValuesOnSubmit } from "../../_components/form-utils";

const ROLE_ICONS: Record<string, string> = { OWNER: "pets", SITTER: "volunteer_activism", ADMIN: "admin_panel_settings" };

export function RoleForm({ userId, role, locked }: { userId: string; role: string; locked?: string }) {
  const [state, action, pending] = useActionState(setUserRole, undefined);
  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-space-sm">
      <input name="userId" type="hidden" value={userId} />
      <Field hint={locked} label="Role">
        <span className="flex flex-wrap gap-space-sm">
          <span className="flex-1 min-w-[160px]">
            <Select
              aria-label="Role"
              defaultValue={role}
              disabled={!!locked}
              name="role"
              options={["OWNER", "SITTER", "ADMIN"].map((r) => ({ value: r, label: ROLE_LABEL[r], icon: ROLE_ICONS[r] }))}
            />
          </span>
          <button className={BTN.sage} disabled={pending || !!locked} type="submit">
            {pending ? "Saving…" : "Update role"}
          </button>
        </span>
      </Field>
      <FormStatus state={state} />
    </form>
  );
}

export function WagPointsForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(adjustWagPoints, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [direction, setDirection] = useState("add");
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  const fe = state?.fieldErrors ?? {};
  return (
    <form ref={formRef} onReset={() => setDirection("add")} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-space-md">
      <input name="userId" type="hidden" value={userId} />
      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-space-md">
        <Field error={fe.direction} label="Adjustment">
          <Select
            aria-label="Adjustment"
            name="direction"
            onChange={setDirection}
            options={[
              { value: "add", label: "Add (+)", icon: "add_circle" },
              { value: "remove", label: "Remove (−)", icon: "do_not_disturb_on" },
            ]}
            panelMinWidth={180}
            value={direction}
          />
        </Field>
        <Field error={fe.amount} label="Amount (CAD)">
          <span className="relative">
            <span className="absolute left-space-md top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
            <input className={`${INPUT} pl-8`} inputMode="decimal" name="amount" placeholder="5.00" required type="text" />
          </span>
        </Field>
      </div>
      <Field error={fe.reason} hint="Saved in the audit log." label="Reason">
        <input className={INPUT} maxLength={200} name="reason" placeholder="e.g. Goodwill credit for late walk on Sept 12" required />
      </Field>
      <FormStatus state={state} />
      <div>
        <button className={BTN.secondary} disabled={pending} type="submit">
          <span className="material-symbols-outlined text-xl">toll</span>
          {pending ? "Applying…" : "Apply adjustment"}
        </button>
      </div>
    </form>
  );
}
