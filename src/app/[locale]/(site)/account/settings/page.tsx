import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { SERVICE_TYPES, type ServiceType } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { deletionBlockers } from "@/lib/privacy";
import { getPlatformSettings } from "@/lib/settings";
import { BTN, Card, PageHeader, formatDateTime } from "@/components/ui";
import { CloseAccountCard, DataExportCard } from "../_components/PrivacySettings";
import { EmailForm, PasswordForm, ProfileForm } from "../_components/SettingsForms";
import { NotificationsSection } from "@/components/pwa/NotificationsSection";

export async function generateMetadata() {
  const t = await getTranslations("account.meta");
  return { title: t("settings") };
}

export default async function AccountSettingsPage() {
  const user = await requireUser();
  const [settings, blockers, sitter, t, tc, locale] = await Promise.all([
    getPlatformSettings(),
    deletionBlockers(user.id),
    db.sitterProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
    getTranslations("account.settings"),
    getTranslations("common"),
    getLocale(),
  ]);
  const serviceName = (s: string) => ((SERVICE_TYPES as readonly string[]).includes(s) ? tc(`enums.service.${s as ServiceType}`) : s);

  return (
    <>
      <PageHeader description={t("description")} eyebrow={tc("enums.role.OWNER")} title={tc("nav.accountSettings")} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-space-lg items-start">
        <div className="flex flex-col gap-space-lg min-w-0">
          <ProfileForm user={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone, avatarUrl: user.avatarUrl }} />
          <EmailForm email={user.email} />
          <PasswordForm />
          <NotificationsSection />
          <DataExportCard />
          <CloseAccountCard
            blockers={blockers.map(({ startAt, ...b }) => ({ ...b, when: formatDateTime(startAt, undefined, locale), service: serviceName(b.service) }))}
            hasSitterProfile={!!sitter}
          />
        </div>

        <div className="flex flex-col gap-space-lg min-w-0">
          <Card className="p-space-lg flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-on-surface-variant">{t("wallet")}</span>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary-fixed text-secondary">
                <span className="material-symbols-outlined text-xl">savings</span>
              </span>
            </div>
            <div className="font-headline-md text-headline-md text-on-surface">{formatMoney(user.wagPointsCents, { exact: true, locale })}</div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t("walletText", { amount: formatMoney(settings.wagPointsDiscountCents, { exact: true, locale }) })}
            </p>
            <Link className={`${BTN.secondary} mt-space-xs`} href="/sitters">
              {t("bookWithPoints")}
            </Link>
          </Card>
          <p className="font-body-sm text-body-sm text-on-surface-variant px-space-sm">
            {t.rich("privacy", {
              email: settings.supportEmail,
              link: (c) => (
                <Link className="text-primary font-semibold hover:underline" href="/privacy">
                  {c}
                </Link>
              ),
              mail: (c) => (
                <a className="text-primary font-semibold hover:underline break-words" href={`mailto:${settings.supportEmail}`}>
                  {c}
                </a>
              ),
            })}
          </p>
        </div>
      </div>
    </>
  );
}
