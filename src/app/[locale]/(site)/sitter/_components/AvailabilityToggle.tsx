"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { setAvailability } from "@/app/actions/sitter";
import { Feedback } from "./Feedback";

export function AvailabilityToggle({ status }: { status: string }) {
  const [state, action, pending] = useActionState(setAvailability, undefined);
  const t = useTranslations("sitter.availabilityToggle");
  const active = status === "ACTIVE";
  return (
    <form action={action} className="flex flex-col gap-space-xs">
      <input name="status" type="hidden" value={active ? "PAUSED" : "ACTIVE"} />
      <button
        aria-checked={active}
        className="flex items-center gap-space-md p-space-md rounded-2xl bg-surface-container-low text-left disabled:opacity-60 hover:bg-surface-container transition-colors"
        disabled={pending}
        role="switch"
        type="submit"
      >
        <span className="flex flex-col flex-1 min-w-0">
          <span className="font-label-lg text-label-lg text-on-surface">{active ? t("accepting") : t("paused")}</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {active ? t("acceptingText") : t("pausedText")}
          </span>
        </span>
        <span
          className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${active ? "bg-primary-container" : "bg-outline-variant"} after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform ${active ? "after:translate-x-5" : ""}`}
        />
      </button>
      <Feedback state={state} />
    </form>
  );
}
