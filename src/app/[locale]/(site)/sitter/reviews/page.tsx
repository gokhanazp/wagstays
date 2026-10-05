import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Prisma } from "@prisma/client";
import { BTN, Card, EmptyState, PageHeader, Pager, StatCard, StatusChip, formatDate } from "@/components/ui";
import { requireSitter } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRating, timeAgo } from "@/lib/format";
import { canEditReply } from "@/lib/review-rules";
import { intlLocale } from "@/i18n/routing";
import { ReviewReply } from "../_components/ReviewReply";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sitter.meta");
  return { title: `${t("reviews")}` };
}

const PAGE_SIZE = 10;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const TABS = {
  all: { label: "all", icon: "reviews", where: {} },
  "needs-reply": { label: "needsReply", icon: "mark_chat_unread", where: { sitterReply: null, hidden: false } },
  replied: { label: "replied", icon: "mark_chat_read", where: { sitterReply: { not: null } } },
} satisfies Record<string, { label: "all" | "needsReply" | "replied"; icon: string; where: Prisma.ReviewWhereInput }>;
type TabKey = keyof typeof TABS;

export default async function SitterReviewsPage({ searchParams }: PageProps<"/[locale]/sitter/reviews">) {
  const { profile } = await requireSitter();
  const sp = await searchParams;
  const tab: TabKey = (one(sp.tab) as TabKey) in TABS ? (one(sp.tab) as TabKey) : "all";
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const tz = profile.city.timeZone;
  const [t, locale] = await Promise.all([getTranslations("sitter"), getLocale()]);
  const base = { sitterId: profile.id };

  const [all, needsReply, replied, total] = await Promise.all([
    db.review.count({ where: base }),
    db.review.count({ where: { ...base, ...TABS["needs-reply"].where } }),
    db.review.count({ where: { ...base, ...TABS.replied.where } }),
    db.review.count({ where: { ...base, ...TABS[tab].where } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const reviews = await db.review.findMany({
    where: { ...base, ...TABS[tab].where },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const counts: Record<TabKey, number> = { all, "needs-reply": needsReply, replied };
  const visible = all - (await db.review.count({ where: { ...base, hidden: true } }));
  const replyRate = visible ? Math.round((replied / visible) * 100) : 0;

  return (
    <>
      <PageHeader
        actions={
          <Link className={BTN.secondary} href={`/sitters/${profile.slug}#reviews`}>
            <span className="material-symbols-outlined text-lg">visibility</span>{t("reviews.seeOnProfile")}
          </Link>
        }
        description={t("reviews.description")}
        eyebrow={t("eyebrow")}
        title={t("meta.reviews")}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-space-md [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <StatCard hint={t("reviews.ratingHint", { count: profile.reviewCount })} icon="star" label={t("reviews.rating")} tone="tertiary" value={profile.reviewCount ? formatRating(profile.rating, locale) : "—"} />
        <StatCard hint={t("reviews.awaitingHint")} icon="mark_chat_unread" label={t("reviews.awaiting")} tone="secondary" value={needsReply} />
        <StatCard hint={t("reviews.replyRateHint")} icon="forum" label={t("reviews.replyRate")} value={visible ? new Intl.NumberFormat(intlLocale(locale), { style: "percent" }).format(replyRate / 100) : "—"} />
      </div>

      <Card>
        <nav aria-label={t("reviews.filterLabel")} className="flex gap-space-xs overflow-x-auto p-space-sm border-b border-[#EFE7DE]">
          {(Object.keys(TABS) as TabKey[]).map((k) => {
            const active = k === tab;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-space-xs h-10 px-space-md rounded-full font-label-lg text-label-lg whitespace-nowrap transition-colors ${
                  active ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
                href={k === "all" ? "/sitter/reviews" : `/sitter/reviews?tab=${k}`}
                key={k}
              >
                <span className="material-symbols-outlined text-lg">{TABS[k].icon}</span>
                {t(`reviews.tabs.${TABS[k].label}`)}
                <span className={`min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center font-label-sm text-label-sm ${active ? "bg-white/20" : "bg-surface-container-high"}`}>
                  {counts[k]}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
          {reviews.length ? (
            reviews.map((r) => (
              <article
                className={`flex flex-col gap-space-sm p-space-md sm:p-space-lg rounded-2xl border border-[#EFE7DE] ${r.hidden ? "bg-surface-container-low" : "bg-surface-container-lowest"}`}
                key={r.id}
              >
                <div className="flex items-start gap-space-md">
                  {r.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="w-11 h-11 rounded-full object-cover shrink-0" src={r.authorAvatar} />
                  ) : (
                    <span className="w-11 h-11 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-title-md text-title-md shrink-0">
                      {r.authorName.charAt(0)}
                    </span>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1">
                      <span className="font-label-lg text-label-lg text-on-surface">{r.authorName}</span>
                      <span aria-label={t("outOfFive", { rating: r.rating })} className="text-tertiary-container tracking-tight">
                        {"★".repeat(r.rating)}
                        <span className="text-outline-variant">{"★".repeat(5 - r.rating)}</span>
                      </span>
                      {r.hidden && (
                        <StatusChip icon="visibility_off" tone="danger">
                          {t("reviews.hidden")}
                        </StatusChip>
                      )}
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {r.petLabel ? `${r.petLabel} · ` : ""}
                      <span title={formatDate(r.createdAt, tz, locale)}>{timeAgo(r.createdAt, undefined, locale)}</span>
                      {r.bookingId && (
                        <>
                          {" · "}
                          <Link className="text-primary hover:underline" href={`/sitter/bookings/${r.bookingId}`}>
                            {t("reviews.viewBooking")}
                          </Link>
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <p className="font-body-md text-body-md text-on-surface whitespace-pre-line break-words">{r.body}</p>
                <ReviewReply
                  canEdit={canEditReply(r.sitterRepliedAt)}
                  hidden={r.hidden}
                  repliedAgo={r.sitterRepliedAt ? timeAgo(r.sitterRepliedAt, undefined, locale) : null}
                  reply={r.sitterReply}
                  reviewId={r.id}
                />
              </article>
            ))
          ) : (
            <EmptyState
              icon={TABS[tab].icon}
              text={tab === "needs-reply" ? t("reviews.caughtUpText") : t("reviews.noReviewsText")}
              title={tab === "needs-reply" ? t("reviews.caughtUpTitle") : t("reviews.noReviewsTitle")}
            />
          )}
        </div>
        <Pager hrefFor={(p) => `/sitter/reviews?${tab === "all" ? "" : `tab=${tab}&`}page=${p}`} page={current} pageCount={pageCount} />
      </Card>
    </>
  );
}
