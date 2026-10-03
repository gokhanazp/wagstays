import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/settings";
import { formatDateTime, PageHeader } from "@/components/ui";
import { SettingsForm } from "./_components/SettingsForm";

export const metadata: Metadata = { title: "Platform Settings" };

export default async function SettingsPage() {
  const [s, ontario] = await Promise.all([getPlatformSettings(), db.city.findFirst({ where: { provinceCode: "ON" }, orderBy: { isActive: "desc" } })]);
  return (
    <>
      <PageHeader
        description={`Fees apply to every new booking as soon as you save. Existing bookings keep the price they were booked at. Last updated ${formatDateTime(s.updatedAt).replace(/\.$/, "")}.`}
        eyebrow="Admin"
        title="Platform Settings"
      />
      <SettingsForm
        settings={{
          wagShieldFeeCents: s.wagShieldFeeCents,
          serviceFeeCents: s.serviceFeeCents,
          wagPointsDiscountCents: s.wagPointsDiscountCents,
          vetCoverageCents: s.vetCoverageCents,
          pointsEarnRateBps: s.pointsEarnRateBps,
          referralRewardCents: s.referralRewardCents,
          supportEmail: s.supportEmail,
          supportPhone: s.supportPhone,
        }}
        taxRateBps={ontario?.taxRateBps ?? 1300}
      />
    </>
  );
}
