"use client";

import { useActionState, useState } from "react";
import { deletePet, type FormState } from "@/app/actions/account";
import { BTN } from "@/components/ui";

export function DeletePetButton({ petId, petName, disabled }: { petId: string; petName: string; disabled?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(deletePet.bind(null, petId), undefined);

  return (
    <div className="flex flex-col items-stretch md:items-end gap-space-xs shrink-0">
      {confirming ? (
        <form action={action} className="flex flex-col sm:flex-row gap-space-xs">
          <button className={BTN.ghost} disabled={pending} onClick={() => setConfirming(false)} type="button">
            Keep {petName}
          </button>
          <button className={BTN.danger} disabled={pending} type="submit">
            <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "autorenew" : "delete_forever"}</span>
            {pending ? "Deleting…" : "Yes, delete"}
          </button>
        </form>
      ) : (
        <button className={BTN.danger} disabled={disabled} onClick={() => setConfirming(true)} type="button">
          <span className="material-symbols-outlined text-xl">delete</span>
          Delete pet
        </button>
      )}
      {state?.error && (
        <p className="flex items-start gap-1 font-body-sm text-body-sm text-error max-w-sm" role="alert">
          <span className="material-symbols-outlined text-base">error</span>
          {state.error}
        </p>
      )}
    </div>
  );
}
