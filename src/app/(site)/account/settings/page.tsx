import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { SERVICE_LABELS, type ServiceType } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { deletionBlockers } from "@/lib/privacy";
import { getPlatformSettings } from "@/lib/settings";
import { BTN, Card, PageHeader, formatDateTime } from "@/components/ui";
import { CloseAccountCard, DataExportCard } from "../_components/PrivacySettings";
import { EmailForm, PasswordForm, ProfileForm } from "../_components/SettingsForms";
import { NotificationsSection } from "@/components/pwa/NotificationsSection";

export const metadata: Metadata = { title: "Account Settings | WagStays" };

export default async function AccountSettingsPage() {
  const user = await requireUser();
  const [settings, blockers, sitter] = await Promise.all([
    getPlatformSettings(),
    deletionBlockers(user.id),
    db.sitterProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
  ]);

  return (
    <>
      <PageHeader description="Update your details, login email and password, download your data or close your account." eyebrow="Pet Parent" title="Account Settings" />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-space-lg items-start">
        <div className="flex flex-col gap-space-lg min-w-0">
          <ProfileForm user={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone, avatarUrl: user.avatarUrl }} />
          <EmailForm email={user.email} />
          <PasswordForm />
          <NotificationsSection />
          <DataExportCard />
          <CloseAccountCard
            blockers={blockers.map(({ startAt, ...b }) => ({ ...b, when: formatDateTime(startAt), service: SERVICE_LABELS[b.service as ServiceType] ?? b.service }))}
            hasSitterProfile={!!sitter}
          />
        </div>

        <div className="flex flex-col gap-space-lg min-w-0">
          <Card className="p-space-lg flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-on-surface-variant">WagPoints Wallet</span>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary-fixed text-secondary">
                <span className="material-symbols-outlined text-xl">savings</span>
              </span>
            </div>
            <div className="font-headline-md text-headline-md text-on-surface">{formatMoney(user.wagPointsCents, { exact: true })}</div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Apply up to {formatMoney(settings.wagPointsDiscountCents, { exact: true })} off at checkout. Points from cancelled bookings come back here automatically.
            </p>
            <Link className={`${BTN.secondary} mt-space-xs`} href="/sitters">
              Book with WagPoints
            </Link>
          </Card>
          <p className="font-body-sm text-body-sm text-on-surface-variant px-space-sm">
            Privacy questions? Read our{" "}
            <Link className="text-primary font-semibold hover:underline" href="/privacy">
              Privacy Policy
            </Link>{" "}
            or email{" "}
            <a className="text-primary font-semibold hover:underline break-words" href={`mailto:${settings.supportEmail}`}>
              {settings.supportEmail}
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
}
