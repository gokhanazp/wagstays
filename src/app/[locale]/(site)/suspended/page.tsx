import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { logout } from "@/app/actions/auth";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { getPlatformSettings } from "@/lib/settings";
import { BTN, Card, formatDateTime } from "@/components/ui";
import { type ServiceType } from "@/lib/constants";
import { db } from "@/lib/db";
import { deletionBlockers } from "@/lib/privacy";
import { CloseAccountCard, DataExportCard } from "../account/_components/PrivacySettings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("misc.suspended");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function SuspendedPage() {
  const [user, settings, t, tc, locale] = await Promise.all([getCurrentUser(), getPlatformSettings(), getTranslations("misc.suspended"), getTranslations("common"), getLocale()]);
  const suspended = !!user?.suspended;
  // Suspended people can still close their account themselves (PIPEDA right to erasure).
  const [blockers, sitter] = suspended
    ? await Promise.all([deletionBlockers(user!.id), db.sitterProfile.findUnique({ where: { userId: user!.id }, select: { id: true } })])
    : [[], null];
  const tel = settings.supportPhone.replace(/[^\d+]/g, "");

  return (
    <main className="w-full pt-28 pb-space-xl px-margin-mobile md:px-margin bg-background min-h-[calc(100vh-320px)] flex flex-col items-center gap-space-lg">
      <Card className="w-full max-w-lg p-space-lg md:p-space-xl flex flex-col items-center text-center gap-space-md h-fit">
        <span className="w-16 h-16 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl">{suspended ? "lock_person" : "verified_user"}</span>
        </span>
        <h1 className="font-headline-md text-headline-md text-on-surface">{suspended ? t("titleSuspended") : t("titleOk")}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {suspended ? t("textSuspended") : t("textOk")}
        </p>
        {suspended && (
          <div className="w-full flex flex-col gap-space-sm p-space-md rounded-xl bg-surface-container-low text-left">
            <a className="flex items-center gap-space-sm font-label-lg text-label-lg text-primary hover:underline" href={`mailto:${settings.supportEmail}`}>
              <span className="material-symbols-outlined text-xl">mail</span>
              {settings.supportEmail}
            </a>
            <a className="flex items-center gap-space-sm font-label-lg text-label-lg text-primary hover:underline" href={`tel:${tel}`}>
              <span className="material-symbols-outlined text-xl">call</span>
              {settings.supportPhone}
            </a>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-space-sm">
          {suspended ? (
            <form action={logout}>
              <button className={BTN.secondary} type="submit">
                <span className="material-symbols-outlined text-xl">logout</span>{tc("nav.logOut")}
              </button>
            </form>
          ) : null}
          <Link className={BTN.primary} href="/">
            {tc("actions.backToHome")}
          </Link>
        </div>
      </Card>
      {suspended && (
        <div className="w-full max-w-lg flex flex-col gap-space-lg">
          <DataExportCard />
          <CloseAccountCard
            blockers={blockers.map(({ startAt, ...b }) => ({ ...b, when: formatDateTime(startAt, undefined, locale), service: tc(`enums.service.${b.service as ServiceType}`) }))}
            hasSitterProfile={!!sitter}
          />
        </div>
      )}
    </main>
  );
}
