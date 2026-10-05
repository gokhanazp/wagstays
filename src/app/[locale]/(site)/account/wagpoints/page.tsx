import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getOrigin } from "@/lib/origin";
import { getPlatformSettings } from "@/lib/settings";
import { ensureReferralCode } from "@/lib/referrals";
import { pointsReason } from "@/lib/points-labels";
import { BTN, Card, CardHeader, EmptyState, PageHeader, Pager, formatDate } from "@/components/ui";
import { bookingRef } from "../_lib";
import { ReferralShare } from "./_components/ReferralShare";

export const metadata: Metadata = { title: "WagPoints | WagStays" };

const PAGE_SIZE = 10;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 ? 2 : 0).replace(/0$/, "")}%`;

export default async function WagPointsPage({ searchParams }: PageProps<"/[locale]/account/wagpoints">) {
  const user = await requireUser();
  const sp = await searchParams;
  const requestedPage = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);

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
  const reward = formatMoney(settings.referralRewardCents);
  const earnRate = pct(settings.pointsEarnRateBps);
  const hrefFor = (p: number) => `/account/wagpoints${p > 1 ? `?page=${p}` : ""}#history`;

  return (
    <>
      <PageHeader
        description="Your rewards wallet — earn on every completed booking, invite friends, and save at checkout."
        eyebrow="Pet Parent"
        title="WagPoints"
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
              Available balance
            </span>
            <span className="font-headline-lg text-[44px] leading-none md:text-[56px] font-extrabold tracking-tight" data-testid="points-balance">
              {formatMoney(user.wagPointsCents, { exact: true })}
            </span>
            <span className="font-body-md text-body-md text-on-primary/85 max-w-md">
              Use up to {formatMoney(settings.wagPointsDiscountCents, { exact: true })} off each booking at checkout. Points never expire while your account is open.
            </span>
          </div>
          <Link className={`${BTN.primary} w-full md:w-auto`} href="/sitters">
            <span className="material-symbols-outlined text-xl">search</span>
            Book &amp; earn
          </Link>
        </div>
      </section>

      <Card className="flex flex-col gap-space-md pb-space-lg">
        <CardHeader icon="tips_and_updates" title="How to earn" />
        <ul className="px-space-lg grid grid-cols-1 md:grid-cols-3 gap-space-sm">
          {[
            { icon: "savings", title: `${earnRate} back on bookings`, text: `Every completed walk, stay or visit earns ${earnRate} of the booking subtotal.` },
            { icon: "group_add", title: `${reward} per friend`, text: `Invite a friend — you both get ${reward} once their first booking is completed.` },
            { icon: "local_offer", title: "Save at checkout", text: `Tick "Apply WagPoints" when you book to take up to ${formatMoney(settings.wagPointsDiscountCents, { exact: true })} off.` },
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
        <CardHeader icon="redeem" title={`Give ${reward}, get ${reward}`} />
        <div className="px-space-lg grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-space-lg items-start">
          <div className="flex flex-col gap-space-md min-w-0">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Share your link with friends who have pets. When they sign up and their first booking is completed, you each get{" "}
              <strong className="text-on-surface">{reward} in WagPoints</strong>.
            </p>
            <ReferralShare rewardLabel={reward} url={shareUrl} />
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Your code: <strong className="font-mono tracking-wider text-on-surface">{code}</strong>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-space-sm">
            {[
              { label: "Friends invited", value: String(referrals.length) },
              { label: "Friends booked", value: String(rewardedIds.size) },
              { label: "Rewards earned", value: formatMoney(referralSum._sum.amountCents ?? 0) },
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
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Joined {formatDate(f.createdAt)}</span>
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 h-7 px-3 rounded-full font-label-md text-label-md whitespace-nowrap ${
                      done ? "bg-[#EBF3EF] text-primary" : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{done ? "check_circle" : "hourglass_top"}</span>
                    {done ? `+${reward} earned` : "Awaiting first stay"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-space-sm pb-space-sm">
        <span className="scroll-mt-28" id="history" />
        <CardHeader icon="receipt_long" title="History" />
        {entries.length === 0 ? (
          <EmptyState icon="toll" text="Points you earn, use or receive will appear here." title="No WagPoints activity yet" />
        ) : (
          <ul className="flex flex-col px-space-sm md:px-space-md">
            {entries.map((e) => {
              const r = pointsReason(e.reason);
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
                      <span>{formatDate(e.createdAt)}</span>
                      {e.reason === "REFERRAL" && e.note ? <span>{e.note.replace(/^Referral:\s*/, "with ")}</span> : null}
                      {e.reason === "ADMIN" && e.note ? <span className="truncate">{e.note}</span> : null}
                      {ownBooking && (
                        <Link className="text-primary hover:underline" href={`/account/bookings/${e.bookingId}`}>
                          Booking {bookingRef(e.bookingId!)}
                        </Link>
                      )}
                    </span>
                  </span>
                  <span className={`font-title-md text-title-md whitespace-nowrap ${positive ? "text-primary" : "text-secondary"}`}>
                    {positive ? "+" : "−"}
                    {formatMoney(Math.abs(e.amountCents), { exact: true })}
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
