"use client";

import { useActionState, useState } from "react";
import { approveUser, rejectUser } from "@/app/actions/admin-approval";
import { BTN, Field, TEXTAREA } from "@/components/ui";
import { ConfirmButton } from "../../_components/ConfirmButton";
import { FormStatus } from "../../_components/FormStatus";
import { keepValuesOnSubmit } from "../../_components/form-utils";

/** Approve (one click, confirmed) or reject (reason required) a pet parent. */
export function ApprovalControls({ userId, name, status }: { userId: string; name: string; status: string }) {
  const [state, action, pending] = useActionState(rejectUser, undefined);
  const [rejecting, setRejecting] = useState(false);
  const fe = state?.fieldErrors ?? {};
  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex flex-wrap gap-space-sm">
        {status !== "APPROVED" && (
          <ConfirmButton
            action={approveUser.bind(null, userId)}
            className={BTN.sage}
            confirm={{ title: `Approve ${name}?`, body: "They'll be able to book sitters straight away (once their phone and pet are added).", confirmLabel: "Approve" }}
            icon="how_to_reg"
            label="Approve"
          />
        )}
        {status !== "REJECTED" && !rejecting && (
          <button className={BTN.danger} onClick={() => setRejecting(true)} type="button">
            <span className="material-symbols-outlined text-xl">person_cancel</span>
            Reject
          </button>
        )}
      </div>
      {rejecting && status !== "REJECTED" && (
        <form className="flex flex-col gap-space-sm" onSubmit={keepValuesOnSubmit(action)}>
          <input name="userId" type="hidden" value={userId} />
          <Field error={fe.reason} hint="Saved on the account and in the audit log. The person can still browse but can't book." label="Reason for rejecting">
            <textarea className={TEXTAREA} maxLength={500} name="reason" placeholder="e.g. Details couldn't be verified" required />
          </Field>
          <FormStatus state={state} />
          <div className="flex gap-space-sm">
            <button className={BTN.danger} disabled={pending} type="submit">
              {pending ? "Rejecting…" : "Reject account"}
            </button>
            <button className={BTN.ghost} onClick={() => setRejecting(false)} type="button">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
