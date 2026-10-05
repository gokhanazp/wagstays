"use client";

import { useTranslations } from "next-intl";
import { ConfirmButton } from "@/app/admin/_components/ConfirmButton";
import { resolveTicketAsUser } from "@/app/actions/support";
import { BTN } from "@/components/ui";

export function ResolveTicketButton({ ticketId }: { ticketId: string }) {
  const t = useTranslations("account.support.resolve");
  return (
    <div className="flex flex-col gap-space-xs [&>span]:w-full">
      <ConfirmButton
        action={() => resolveTicketAsUser(ticketId)}
        className={`${BTN.secondary} w-full`}
        confirm={{
          title: t("title"),
          body: t("body"),
          confirmLabel: t("label"),
        }}
        icon="task_alt"
        label={t("label")}
      />
    </div>
  );
}
