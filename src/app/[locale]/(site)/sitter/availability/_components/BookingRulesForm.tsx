"use client";

import { useTranslations } from "next-intl";
import { saveBookingRules } from "@/app/actions/availability";
import { BTN, Field } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { AVAILABILITY_LIMITS } from "@/lib/availability-core";
import { Feedback } from "../../_components/Feedback";
import { useFormAction } from "../../_components/useFormAction";

const NOTICE = [0, 2, 4, 8, 12, 24, 48, 72, 168];

export function BookingRulesForm({ boardingCapacity, noticeHours }: { boardingCapacity: number; noticeHours: number }) {
  const t = useTranslations("sitter.bookingRules");
  const tc = useTranslations("common.actions");
  const noticeLabel = (h: number) => (h === 0 ? t("noMinimum") : h < 24 ? t("hours", { count: h }) : h === 168 ? t("week") : t("days", { count: h / 24 }));
  const { state, pending, onSubmit } = useFormAction(saveBookingRules);
  const notices = NOTICE.includes(noticeHours) ? NOTICE : [...NOTICE, noticeHours].sort((a, b) => a - b);
  return (
    <form className="flex flex-col gap-space-md px-space-lg pt-space-md" noValidate onSubmit={onSubmit}>
      <Field error={state?.fieldErrors?.boardingCapacity} hint={t("capacityHint")} label={t("capacity")}>
        <Select
          aria-label={t("capacityAria")}
          defaultValue={String(boardingCapacity)}
          name="boardingCapacity"
          options={Array.from({ length: AVAILABILITY_LIMITS.maxCapacity }, (_, i) => ({ value: String(i + 1), label: t("capacityOption", { count: i + 1 }) }))}
        />
      </Field>
      <Field error={state?.fieldErrors?.noticeHours} hint={t("noticeHint")} label={t("notice")}>
        <Select aria-label={t("notice")} defaultValue={String(noticeHours)} name="noticeHours" options={notices.map((h) => ({ value: String(h), label: noticeLabel(h) }))} />
      </Field>
      <div className="flex flex-wrap items-center gap-space-md">
        <button className={BTN.sage} disabled={pending} type="submit">
          {pending ? tc("saving") : t("save")}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
