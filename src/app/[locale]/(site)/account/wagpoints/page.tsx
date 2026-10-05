import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getOrigin } from "@/lib/origin";
import { getPlatformSettings } from "@/lib/settings";
import { ensureReferralCode } from "@/lib/referrals";
import { pointsReason } from "@/lib/points-labels";
import { BTN, Card, CardHeader, EmptyState, PageHeader, Pager, formatDate } from "@/components/ui";
import { intlLocale } from "@/i18n/routing";
import { bookingRef } from "../_lib";
import { ReferralShare } from "./_components/ReferralShare";

export async function generateMetadata() {
  const t = await getTranslations("account.meta");
  return { title: t("wagpoints") };
}

const PAGE_SIZE = 10;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pct = (bps: number, locale: string) => new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 2 }).format(bps / 10000);

export default async function WagPointsPage({ searchParams }: PageProps<"/[locale]/account/wagpoints">) {
  const user = await requireUser();
  const sp = await searchParams;
  const requestedPage = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const [t, tc, locale] = await Promise.all([getTranslations("account.wagpoints"), getTranslations("common"), getLocale()]);
  const money = (cents: number, exact = false) => formatMoney(cents, { exact, locale });

  const [settings, code, origin, total, referrals, referralSum, rewardedEntries] = await Promise.all([
    getPlatformSettings(),
    ensureReferralCode(user.id),
    getOrigin(),
    db.wagPointsEntry.count({ where: { userId: user.id } }),
    db.user.findMany({ where: { referredById: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, firstName: true, lastName: true, createdAt: true } }),
    db.wagPointsEntry.aggregate({ where: { userId: user.id, reason: "REFERRAL" }, _sum: { amountCents: true } }),
    // REFERRAL rows on a friend's booking = that friend completed their first stay
    db.wagPointsEntry.findMany({ where: { userId: user.id, reason: "REFERRAL", booking: { ownerId: { not: user.id } } }, select: { booking: { select: { ownerId: true } } } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const entries = await db.wagPointsEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: { id: true, amountCents: true, reason: true, note: true, createdAt: true, bookingId: true, booking: { select: { ownerId: true } } },
  });

  const rewardedIds = new Set(rewardedEntries.map((e) => e.booking?.ownerId));
  const shareUrl = `${origin}/r/${code}`;
  const reward = money(settings.referralRewardCents);
  const earnRate = pct(settings.pointsEarnRateBps, locale);
  const maxOff = money(settings.wagPointsDiscountCents, true);
  const hrefFor = (p: number) => `/account/wagpoints${p > 1 ? `?page=${p}` : ""}#history`;

  return (
    <>
      <PageHeader
        description={t("description")}
        eyebrow={tc("enums.role.OWNER")}
        title={tc("nav.wagPoints")}
      />

      <section className="relative overflow-hidden rounded-3xl bg-primary text-on-primary p-space-lg md:p-space-xl shadow-[0_12px_32px_-8px_rgba(34,97,80,0.45)]">
        <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-primary-container/60 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-secondary/25 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-space-lg">
          <div className="flex flex-col gap-space-xs">
            <span className="inline-flex items-center gap-1.5 font-label-md text-label-md uppercase tracking-wide text-on-primary/80">
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                toll
              </span>
              {t("balance")}
            </span>
            <span className="font-headline-lg text-[44px] leading-none md:text-[56px] font-extrabold tracking-tight" data-testid="points-balance">
              {money(user.wagPointsCents, true)}
            </span>
            <span className="font-body-md text-body-md text-on-primary/85 max-w-md">
              {t("balanceText", { amount: maxOff })}
            </span>
          </div>
          <Link className={`${BTN.primary} w-full md:w-auto`} href="/sitters">
            <span className="material-symbols-outlined text-xl">search</span>
            {t("bookEarn")}
          </Link>
        </div>
      </section>

      <Card className="flex flex-col gap-space-md pb-space-lg">
        <CardHeader icon="tips_and_updates" title={t("howToEarn")} />
        <ul className="px-space-lg grid grid-cols-1 md:grid-cols-3 gap-space-sm">
          {[
            { icon: "savings", title: t("earnTitle", { rate: earnRate }), text: t("earnText", { rate: earnRate }) },
            { icon: "group_add", title: t("friendTitle", { reward }), text: t("friendText", { reward }) },
            { icon: "local_offer", title: t("saveTitle"), text: t("saveText", { amount: maxOff }) },
          ].map((s) => (
            <li className="flex md:flex-col items-start gap-space-sm p-space-md rounded-2xl bg-surface-container-low" key={s.icon}>
              <span className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">{s.icon}</span>
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-label-lg text-label-lg text-on-surface">{s.title}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{s.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-space-md pb-space-lg">
        <CardHeader icon="redeem" title={t("giveGet", { reward })} />
        <div className="px-space-lg grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-space-lg items-start">
          <div className="flex flex-col gap-space-md min-w-0">
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t.rich("shareText", { reward, b: (c) => <strong className="text-on-surface">{c}</strong> })}
            </p>
            <ReferralShare rewardLabel={reward} url={shareUrl} />
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {t.rich("yourCode", { code, b: (c) => <strong className="font-mono tracking-wider text-on-surface">{c}</strong> })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-space-sm">
            {[
              { label: t("invited"), value: String(referrals.length) },
              { label: t("booked"), value: String(rewardedIds.size) },
              { label: t("rewards"), value: money(referralSum._sum.amountCents ?? 0) },
            ].map((s) => (
              <div className="flex flex-col gap-1 p-space-sm sm:p-space-md rounded-2xl bg-surface-container-low text-center" key={s.label}>
                <span className="font-headline-sm text-headline-sm md:font-headline-md md:text-headline-md text-primary font-bold">{s.value}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        {referrals.length > 0 && (
          <ul className="mx-space-lg flex flex-col divide-y divide-[#EFE7DE] rounded-2xl border border-[#EFE7DE]">
            {referrals.map((f) => {
              const done = rewardedIds.has(f.id);
              return (
                <li className="flex items-center justify-between gap-space-sm px-space-md py-space-sm" key={f.id}>
                  <span className="flex items-center gap-space-sm min-w-0">
                    <span className="w-9 h-9 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center font-label-lg text-label-lg shrink-0">
                      {f.firstName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span className="font-label-lg text-label-lg text-on-surface truncate">
                        {f.firstName} {f.lastName.slice(0, 1)}.
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{t("joined", { date: formatDate(f.createdAt, undefined, locale) })}</span>
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 h-7 px-3 rounded-full font-label-md text-label-md whitespace-nowrap ${
                      done ? "bg-[#EBF3EF] text-primary" : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{done ? "check_circle" : "hourglass_top"}</span>
                    {done ? t("earned", { reward }) : t("awaiting")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-space-sm pb-space-sm">
        <span className="scroll-mt-28" id="history" />
        <CardHeader icon="receipt_long" title={t("history")} />
        {entries.length === 0 ? (
          <EmptyState icon="toll" text={t("emptyText")} title={t("emptyTitle")} />
        ) : (
          <ul className="flex flex-col px-space-sm md:px-space-md">
            {entries.map((e) => {
              const r = pointsReason(e.reason, locale);
              const positive = e.amountCents > 0;
              const ownBooking = e.bookingId && e.booking?.ownerId === user.id;
              return (
                <li className="flex items-center gap-space-sm md:gap-space-md px-space-sm py-space-sm border-b border-[#EFE7DE] last:border-b-0" key={e.id}>
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${positive ? "bg-primary-fixed text-primary" : "bg-secondary-fixed text-secondary"}`}
                  >
                    <span className="material-symbols-outlined text-xl">{r.icon}</span>
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface truncate">{r.label}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant flex flex-wrap gap-x-space-sm">
                      <span>{formatDate(e.createdAt, undefined, locale)}</span>
                      {e.reason === "REFERRAL" && e.note ? <span>{/^Referral:\s*/.test(e.note) ? t("referralWith", { name: e.note.replace(/^Referral:\s*/, "") }) : e.note}</span> : null}
                      {e.reason === "ADMIN" && e.note ? <span className="truncate">{e.note}</span> : null}
                      {ownBooking && (
                        <Link className="text-primary hover:underline" href={`/account/bookings/${e.bookingId}`}>
                          {t("booking", { ref: bookingRef(e.bookingId!) })}
                        </Link>
                      )}
                    </span>
                  </span>
                  <span className={`font-title-md text-title-md whitespace-nowrap ${positive ? "text-primary" : "text-secondary"}`}>
                    {positive ? "+" : "−"}
                    {money(Math.abs(e.amountCents), true)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <Pager hrefFor={hrefFor} page={page} pageCount={pageCount} />
      </Card>
    </>
  );
}
