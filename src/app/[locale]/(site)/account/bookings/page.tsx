import { getLocale, getTranslations } from "next-intl/server";
import { bookingPets, petNames } from "@/lib/pets";
import { Link } from "@/i18n/navigation";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { BOOKING_STATUS_LABELS, type BookingStatus, type ServiceType } from "@/lib/constants";
import { BTN, Card, EmptyState, PageHeader, Pager, StatusChip } from "@/components/ui";
import { SERVICE_ICONS, bookingRef, bookingWhen, quantityText } from "../_lib";
import { seriesPositions } from "@/lib/booking-series";
import { isStayService } from "@/lib/availability-core";

export async function generateMetadata() {
  const t = await getTranslations("account.meta");
  return { title: t("bookings") };
}

const PAGE_SIZE = 8;
const TABS = [
  { key: "upcoming", icon: "upcoming" },
  { key: "past", icon: "history" },
  { key: "cancelled", icon: "event_busy" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function whereFor(tab: TabKey, ownerId: string, now: Date): Prisma.BookingWhereInput {
  if (tab === "upcoming") return { ownerId, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: now } };
  if (tab === "past")
    return { ownerId, OR: [{ status: "COMPLETED" }, { status: { in: ["PENDING", "CONFIRMED"] }, startAt: { lt: now } }] };
  return { ownerId, status: { in: ["CANCELLED", "DECLINED"] } };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MyBookingsPage({ searchParams }: PageProps<"/[locale]/account/bookings">) {
  const user = await requireUser();
  const sp = await searchParams;
  const [t, tc, locale] = await Promise.all([getTranslations("account"), getTranslations("common"), getLocale()]);
  const tab: TabKey = TABS.find((t) => t.key === one(sp.tab))?.key ?? "upcoming";
  const requestedPage = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const now = new Date();

  const counts = await Promise.all(TABS.map((t) => db.booking.count({ where: whereFor(t.key, user.id, now) })));
  const total = counts[TABS.findIndex((t) => t.key === tab)];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const bookings = await db.booking.findMany({
    where: whereFor(tab, user.id, now),
    orderBy: { startAt: tab === "upcoming" ? "asc" : "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      sitter: { select: { slug: true, displayName: true, avatarUrl: true, city: { select: { timeZone: true } } } },
      service: { select: { type: true } },
      pet: { select: { id: true, name: true, breed: true } },
      pets: { select: { pet: { select: { id: true, name: true, breed: true } } } },
      review: { select: { id: true } },
    },
  });

  const series = await seriesPositions(bookings);
  const hrefFor = (p: number) => `/account/bookings?tab=${tab}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <>
      <PageHeader
        actions={
          <Link className={BTN.primary} href="/sitters">
            <span className="material-symbols-outlined text-xl">search</span>
            {tc("nav.findSitter")}
          </Link>
        }
        description={t("bookings.description")}
        eyebrow={tc("enums.role.OWNER")}
        title={tc("nav.myBookings")}
      />

      <nav aria-label={t("bookings.filtersLabel")} className="flex gap-space-xs overflow-x-auto -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0 pb-1">
        {TABS.map((tabItem, i) => {
          const active = tabItem.key === tab;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-space-xs h-10 px-space-md rounded-full font-label-lg text-label-lg whitespace-nowrap transition-all ${
                active
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "bg-surface-container-lowest border border-[#EFE7DE] text-on-surface-variant hover:bg-surface-container-low"
              }`}
              href={`/account/bookings?tab=${tabItem.key}`}
              key={tabItem.key}
            >
              <span className="material-symbols-outlined text-lg">{tabItem.icon}</span>
              {t(`bookings.tabs.${tabItem.key}`)}
              <span className={`min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center font-label-sm text-label-sm ${active ? "bg-white/20" : "bg-surface-container-high"}`}>
                {counts[i]}
              </span>
            </Link>
          );
        })}
      </nav>

      {bookings.length === 0 ? (
        <Card>
          <EmptyState
            action={
              tab === "upcoming" ? (
                <Link className={`${BTN.primary} mt-space-sm`} href="/sitters">
                  {tc("nav.findSitter")}
                </Link>
              ) : undefined
            }
            icon={tab === "cancelled" ? "event_busy" : tab === "past" ? "history" : "calendar_add_on"}
            text={t(`bookings.empty.${tab}Text`)}
            title={t(`bookings.empty.${tab}Title`)}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-space-md">
          {bookings.map((b) => {
            const st = BOOKING_STATUS_LABELS[b.status as BookingStatus];
            const status = st ? { label: tc(`enums.bookingStatus.${b.status as BookingStatus}`), tone: st.tone } : { label: b.status, tone: "neutral" as const };
            const needsReview = b.status === "COMPLETED" && !b.review;
            return (
              <Card className="p-space-md md:p-space-lg flex flex-col gap-space-md" key={b.id}>
                <div className="flex items-start gap-space-md">
                  <Link className="shrink-0" href={`/sitters/${b.sitter.slug}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={b.sitter.displayName} className="w-14 h-14 rounded-full object-cover ring-2 ring-primary-fixed" src={b.sitter.avatarUrl} />
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-space-sm gap-y-1">
                      <Link className="font-title-md text-title-md text-on-surface hover:text-primary transition-colors truncate" href={`/sitters/${b.sitter.slug}`}>
                        {b.sitter.displayName}
                      </Link>
                      <StatusChip tone={status.tone}>{status.label}</StatusChip>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 font-body-sm text-body-sm text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base text-primary">{SERVICE_ICONS[b.service.type] ?? "pets"}</span>
                        {tc(`enums.service.${b.service.type as ServiceType}`)}
                        {(isStayService(b.service.type) || b.quantity > 1) && ` · ${quantityText(b.service.type, b.quantity, locale)}`}
                      </span>
                      {series.get(b.id) && (
                        <span className="flex items-center gap-1 text-primary font-semibold">
                          <span className="material-symbols-outlined text-base">repeat</span>
                          {t("shared.weekOf", { index: series.get(b.id)!.index, total: series.get(b.id)!.total })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base text-primary">pets</span>
                        {b.pets.length > 1 ? petNames(bookingPets(b).map((p) => p.name), locale) : `${b.pet.name}${b.pet.breed ? ` (${b.pet.breed})` : ""}`}
                      </span>
                    </div>
                    <span className="flex items-start gap-1 font-body-sm text-body-sm text-on-surface">
                      <span className="material-symbols-outlined text-base text-primary">calendar_month</span>
                      {bookingWhen(b.startAt, b.endAt, b.sitter.city.timeZone, locale)}
                    </span>
                  </div>
                </div>

                {b.sitterNote && (
                  <div className="flex items-start gap-space-sm bg-surface-container-low rounded-xl p-space-sm px-space-md font-body-sm text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-base text-secondary mt-0.5">format_quote</span>
                    <p className="min-w-0">
                      <span className="font-semibold text-on-surface">{b.sitter.displayName.split(" ")[0]}:</span> {b.sitterNote}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-space-sm border-t border-[#EFE7DE] pt-space-md">
                  <div className="flex items-baseline gap-space-sm">
                    <span className="font-title-md text-title-md text-on-surface">{formatMoney(b.totalCents, { exact: true, locale })}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{bookingRef(b.id)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-space-xs">
                    {needsReview && (
                      <Link className={`${BTN.small} bg-tertiary-fixed text-on-tertiary-fixed-variant hover:brightness-95`} href={`/account/bookings/${b.id}#review`}>
                        <span className="material-symbols-outlined text-base">star</span>
                        {t("bookings.leaveReview")}
                      </Link>
                    )}
                    <Link className={`${BTN.small} bg-[#EBF3EF] text-primary-container border border-[#C8DDD4] hover:bg-[#DCECE4]`} href={`/account/bookings/${b.id}`}>
                      {t("bookings.viewDetails")}
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
          <Pager hrefFor={hrefFor} page={page} pageCount={pageCount} />
        </div>
      )}
    </>
  );
}
