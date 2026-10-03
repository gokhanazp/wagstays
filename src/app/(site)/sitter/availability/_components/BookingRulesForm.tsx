"use client";

import { saveBookingRules } from "@/app/actions/availability";
import { BTN, Field } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { AVAILABILITY_LIMITS } from "@/lib/availability-core";
import { Feedback } from "../../_components/Feedback";
import { useFormAction } from "../../_components/useFormAction";

const NOTICE = [0, 2, 4, 8, 12, 24, 48, 72, 168];
const noticeLabel = (h: number) => (h === 0 ? "No minimum" : h < 24 ? `${h} hours` : h === 168 ? "1 week" : `${h / 24} day${h === 24 ? "" : "s"}`);

export function BookingRulesForm({ boardingCapacity, noticeHours }: { boardingCapacity: number; noticeHours: number }) {
  const { state, pending, onSubmit } = useFormAction(saveBookingRules);
  const notices = NOTICE.includes(noticeHours) ? NOTICE : [...NOTICE, noticeHours].sort((a, b) => a - b);
  return (
    <form className="flex flex-col gap-space-md px-space-lg pt-space-md" noValidate onSubmit={onSubmit}>
      <Field error={state?.fieldErrors?.boardingCapacity} hint="How many pets can board or attend day care with you at the same time." label="Boarding & day care capacity">
        <Select
          aria-label="Boarding and day care capacity"
          defaultValue={String(boardingCapacity)}
          name="boardingCapacity"
          options={Array.from({ length: AVAILABILITY_LIMITS.maxCapacity }, (_, i) => ({ value: String(i + 1), label: `${i + 1} pet${i ? "s" : ""} at a time` }))}
        />
      </Field>
      <Field error={state?.fieldErrors?.noticeHours} hint="Owners can't book anything that starts sooner than this." label="Minimum notice">
        <Select aria-label="Minimum notice" defaultValue={String(noticeHours)} name="noticeHours" options={notices.map((h) => ({ value: String(h), label: noticeLabel(h) }))} />
      </Field>
      <div className="flex flex-wrap items-center gap-space-md">
        <button className={BTN.sage} disabled={pending} type="submit">
          {pending ? "Saving…" : "Save rules"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
