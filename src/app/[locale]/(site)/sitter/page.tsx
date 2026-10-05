import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { bookingPets, petNames } from "@/lib/pets";
import { Link } from "@/i18n/navigation";
import { BTN, Card, CardHeader, EmptyState, PageHeader, StatCard, formatDate } from "@/components/ui";
import { requireSitter } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney, formatRating, timeAgo } from "@/lib/format";
import { AvailabilityToggle } from "./_components/AvailabilityToggle";
import { BookingCard, bookingCardInclude } from "./_components/BookingCard";
import { PetPhoto } from "./_components/PetPhoto";
import { ReviewReply } from "./_components/ReviewReply";
import { canEditReply } from "@/lib/review-rules";
import { bookingWhen, ownerShortName, SERVICE_ICONS, serviceKey, startOfMonthInZone } from "./_lib";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sitter.meta");
  return { title: `${t("overview")}` };
}

function greeting(tz: string) {
  const h = +new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date());
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

export default async function SitterOverviewPage() {
  const { user, profile } = await requireSitter();
  const [t, tc, locale] = await Promise.all([getTranslations("sitter"), getTranslations("common"), getLocale()]);
  const tz = profile.city.timeZone;
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const monthStart = startOfMonthInZone(tz, now);

  const [pending, upcomingWeek, upcoming, earnings, reviews, photoCount, activeServices] = await Promise.all([
    db.booking.findMany({ where: { sitterId: profile.id, status: "PENDING" }, include: bookingCardInclude, orderBy: { startAt: "asc" } }),
    db.booking.count({ where: { sitterId: profile.id, status: "CONFIRMED", startAt: { gte: now, lt: weekAhead } } }),
    db.booking.findMany({
      where: { sitterId: profile.id, status: "CONFIRMED", endAt: { gte: now } },
      include: bookingCardInclude,
      orderBy: { startAt: "asc" },
      take: 5,
    }),
    db.booking.aggregate({
      where: { sitterId: profile.id, status: "COMPLETED", startAt: { gte: monthStart, lte: now } },
      _sum: { subtotalCents: true },
      _count: true,
    }),
    db.review.findMany({ where: { sitterId: profile.id, hidden: false }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.sitterPhoto.count({ where: { sitterId: profile.id } }),
    db.service.count({ where: { sitterId: profile.id, active: true } }),
  ]);

  const checklist = [
    { done: !!profile.avatarUrl, label: t("overview.checklist.photo"), href: "/sitter/profile#photos" },
    { done: (profile.about ?? "").trim().length >= 150, label: t("overview.checklist.about"), href: "/sitter/profile#about" },
    { done: photoCount >= 3, label: t("overview.checklist.gallery", { count: photoCount }), href: "/sitter/profile#gallery" },
    { done: activeServices >= 1, label: t("overview.checklist.service"), href: "/sitter/services" },
    { done: profile.idVerified, label: t("badges.idVerified"), href: "/sitter/profile#verification", admin: true },
    { done: profile.backgroundChecked, label: t("badges.backgroundChecked"), href: "/sitter/profile#verification", admin: true },
    { done: profile.firstAidCertified, label: t("badges.firstAid"), href: "/sitter/profile#verification", admin: true },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);

  return (
    <>
      <PageHeader
        actions={
          <Link className={BTN.secondary} href={`/sitters/${profile.slug}`}>
            <span className="material-symbols-outlined text-lg">visibility</span>{t("viewPublicProfile")}
          </Link>
        }
        description={
          pending.length
            ? t("overview.pendingDescription", { count: pending.length, mins: profile.responseTimeMins })
            : t("overview.caughtUp")
        }
        eyebrow={t("eyebrow")}
        title={t(`overview.greeting.${greeting(tz)}`, { name: user.firstName })}
      />

      <Card className="p-space-lg flex flex-col gap-space-sm">
        <AvailabilityToggle status={profile.status} />
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-space-md [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <StatCard hint={t("overview.stats.pendingHint")} icon="mark_email_unread" label={t("overview.stats.pending")} tone="tertiary" value={pending.length} />
        <StatCard hint={t("overview.stats.upcomingHint")} icon="event_upcoming" label={t("overview.stats.upcoming")} value={upcomingWeek} />
        <StatCard hint={t("overview.stats.completedHint")} icon="task_alt" label={t("overview.stats.completed")} tone="primary" value={profile.completedBookings} />
        <StatCard
          hint={t("overview.stats.earnedHint", { count: earnings._count })}
          icon="payments"
          label={t("overview.stats.earned")}
          tone="secondary"
          value={formatMoney(earnings._sum.subtotalCents ?? 0, { locale })}
        />
        <StatCard
          hint={t("overview.stats.ratingHint", { count: profile.reviewCount })}
          icon="star"
          label={t("overview.stats.rating")}
          tone="tertiary"
          value={profile.reviewCount ? formatRating(profile.rating, locale) : "—"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-space-lg items-start">
        <div className="flex flex-col gap-space-lg min-w-0">
          <Card>
            <CardHeader
              action={
                <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/sitter/bookings">
                  {t("overview.allRequests")}
                </Link>
              }
              icon="mark_email_unread"
              title={t("needsResponse")}
            />
            <div className="flex flex-col gap-space-md p-space-lg">
              {pending.length ? (
                pending.slice(0, 5).map((b) => <BookingCard booking={b} key={b.id} tz={tz} withActions />)
              ) : (
                <EmptyState icon="inbox" text={t("overview.noPendingText")} title={t("overview.noPendingTitle")} />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              action={
                <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/sitter/bookings?tab=upcoming">
                  {t("overview.seeAll")}
                </Link>
              }
              icon="event_available"
              title={t("overview.comingUp")}
            />
            <div className="flex flex-col p-space-lg pt-space-md">
              {upcoming.length ? (
                upcoming.map((b) => (
                  <Link
                    className="flex items-center gap-space-md py-space-sm border-b border-[#EFE7DE] last:border-0 hover:bg-surface-container-low -mx-space-sm px-space-sm rounded-xl transition-colors"
                    href={`/sitter/bookings/${b.id}`}
                    key={b.id}
                  >
                    <PetPhoto className="w-11 h-11 rounded-full" name={b.pet.name} url={b.pet.photoUrl} />
                    <span className="flex flex-col min-w-0 flex-1">
                      <span className="font-label-lg text-label-lg text-on-surface truncate">
                        {petNames(bookingPets(b).map((p) => p.name), locale)} · {ownerShortName(b.owner)}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{bookingWhen(b.startAt, b.endAt, tz, locale)}</span>
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-lg">{SERVICE_ICONS[b.service.type]}</span>
                      {tc(serviceKey(b.service.type))}
                    </span>
                    <span className="font-label-lg text-label-lg text-primary">{formatMoney(b.subtotalCents, { locale })}</span>
                  </Link>
                ))
              ) : (
                <EmptyState icon="event" text={t("overview.nothingBookedText")} title={t("overview.nothingBookedTitle")} />
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-space-lg min-w-0">
          <Card className="pb-space-lg">
            <CardHeader icon="checklist" title={t("overview.strength")} />
            <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
              <div className="flex flex-col gap-space-xs">
                <div className="flex justify-between font-label-md text-label-md text-on-surface-variant">
                  <span>{t("overview.strengthProgress", { done: doneCount, total: checklist.length })}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full rounded-full bg-primary-container" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <ul className="flex flex-col gap-space-xs">
                {checklist.map((c) => (
                  <li key={c.label}>
                    <Link className="flex items-center gap-space-sm p-space-xs -mx-space-xs rounded-xl hover:bg-surface-container-low transition-colors" href={c.href}>
                      <span className={`material-symbols-outlined text-xl ${c.done ? "text-primary" : "text-outline"}`}>
                        {c.done ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      <span className={`flex-1 font-body-sm text-body-sm ${c.done ? "text-on-surface" : "text-on-surface-variant"}`}>{c.label}</span>
                      {c.admin && !c.done && <span className="font-label-sm text-label-sm text-on-surface-variant">{t("overview.byWagStays")}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader
              action={
                <Link className="font-label-lg text-label-lg text-primary hover:underline" href="/sitter/reviews">
                  {t("overview.allReviews")}
                </Link>
              }
              icon="reviews"
              title={t("overview.latestReviews")}
            />
            <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
              {reviews.length ? (
                reviews.map((r) => (
                  <div className="flex flex-col gap-1 pb-space-md border-b border-[#EFE7DE] last:border-0 last:pb-0" key={r.id}>
                    <div className="flex items-center justify-between gap-space-sm">
                      <span className="font-label-lg text-label-lg text-on-surface truncate">{r.authorName}</span>
                      <span className="flex items-center gap-0.5 text-secondary font-label-md text-label-md shrink-0">
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                          star
                        </span>
                        {r.rating}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">{r.body}</p>
                    <span className="font-label-sm text-label-sm text-outline" title={formatDate(r.createdAt, tz, locale)}>
                      {timeAgo(r.createdAt, undefined, locale)}
                    </span>
                    <div className="pt-space-xs">
                      <ReviewReply
                        canEdit={canEditReply(r.sitterRepliedAt)}
                        compact
                        hidden={r.hidden}
                        repliedAgo={r.sitterRepliedAt ? timeAgo(r.sitterRepliedAt, undefined, locale) : null}
                        reply={r.sitterReply}
                        reviewId={r.id}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="font-body-sm text-body-sm text-on-surface-variant">{t("overview.noReviews")}</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
