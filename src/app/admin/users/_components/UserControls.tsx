"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { adjustWagPoints, setUserRoles } from "@/app/actions/admin-core";
import { BTN, Field, INPUT } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { FormStatus } from "../../_components/FormStatus";
import { keepValuesOnSubmit } from "../../_components/form-utils";

function RoleRow({ icon, label, text, name, defaultChecked, disabled }: { icon: string; label: string; text: string; name?: string; defaultChecked?: boolean; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-space-sm p-space-sm rounded-xl border border-[#EFE7DE] ${disabled ? "bg-surface-container-low" : "bg-surface-container-lowest cursor-pointer hover:bg-surface-container-low"}`}>
      <input
        className="mt-1 w-5 h-5 accent-[#226150] shrink-0"
        defaultChecked={defaultChecked}
        disabled={disabled}
        name={name}
        type="checkbox"
      />
      <span className="material-symbols-outlined text-xl text-primary mt-0.5">{icon}</span>
      <span className="flex flex-col">
        <span className="font-label-lg text-label-lg text-on-surface">{label}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">{text}</span>
      </span>
    </label>
  );
}

/** Roles combine — pet parent is built in, sitter and admin are added on top. */
export function RolesForm({ userId, sitter, admin, adminLocked }: { userId: string; sitter: boolean; admin: boolean; adminLocked?: string }) {
  const [state, action, pending] = useActionState(setUserRoles, undefined);
  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-space-sm">
      <input name="userId" type="hidden" value={userId} />
      <span className="font-label-lg text-label-lg text-on-surface">Roles</span>
      <div className="grid grid-cols-1 gap-space-xs">
        <RoleRow defaultChecked disabled icon="pets" label="Pet parent" text="Every account can add pets and book care." />
        <RoleRow defaultChecked={sitter} icon="volunteer_activism" label="Sitter" name="sitter" text="Sitter dashboard and public profile. Turning it off pauses their profile." />
        {adminLocked ? (
          <>
            {/* keep the current value when the checkbox can't be changed */}
            {admin && <input name="admin" type="hidden" value="on" />}
            <RoleRow defaultChecked={admin} disabled icon="admin_panel_settings" label="Admin" text={adminLocked} />
          </>
        ) : (
          <RoleRow defaultChecked={admin} icon="admin_panel_settings" label="Admin" name="admin" text="Full access to this admin panel." />
        )}
      </div>
      <button className={`${BTN.sage} w-fit`} disabled={pending} type="submit">
        {pending ? "Saving…" : "Save roles"}
      </button>
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
