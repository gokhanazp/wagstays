"use client";

import { ConfirmButton } from "@/app/admin/_components/ConfirmButton";
import { resolveTicketAsUser } from "@/app/actions/support";
import { BTN } from "@/components/ui";

export function ResolveTicketButton({ ticketId }: { ticketId: string }) {
  return (
    <div className="flex flex-col gap-space-xs [&>span]:w-full">
      <ConfirmButton
        action={() => resolveTicketAsUser(ticketId)}
        className={`${BTN.secondary} w-full`}
        confirm={{
          title: "Mark this request as resolved?",
          body: "Let us know everything's sorted. You can still reply later to re-open it.",
          confirmLabel: "Mark as resolved",
        }}
        icon="task_alt"
        label="Mark as resolved"
      />
    </div>
  );
}
