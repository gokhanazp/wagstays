"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { deletePet, type FormState } from "@/app/actions/account";
import { BTN } from "@/components/ui";

export function DeletePetButton({ petId, petName, disabled }: { petId: string; petName: string; disabled?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(deletePet.bind(null, petId), undefined);
  const t = useTranslations("account.deletePet");

  return (
    <div className="flex flex-col items-stretch md:items-end gap-space-xs shrink-0">
      {confirming ? (
        <form action={action} className="flex flex-col sm:flex-row gap-space-xs">
          <button className={BTN.ghost} disabled={pending} onClick={() => setConfirming(false)} type="button">
            {t("keep", { name: petName })}
          </button>
          <button className={BTN.danger} disabled={pending} type="submit">
            <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "autorenew" : "delete_forever"}</span>
            {pending ? t("deleting") : t("confirm")}
          </button>
        </form>
      ) : (
        <button className={BTN.danger} disabled={disabled} onClick={() => setConfirming(true)} type="button">
          <span className="material-symbols-outlined text-xl">delete</span>
          {t("delete")}
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
