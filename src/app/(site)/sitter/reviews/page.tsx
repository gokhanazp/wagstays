import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BTN, Card, EmptyState, PageHeader, Pager, StatCard, StatusChip, formatDate } from "@/components/ui";
import { requireSitter } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRating, timeAgo } from "@/lib/format";
import { canEditReply } from "@/lib/review-rules";
import { ReviewReply } from "../_components/ReviewReply";

export const metadata: Metadata = { title: "Reviews | WagStays" };

const PAGE_SIZE = 10;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const TABS = {
  all: { label: "All", icon: "reviews", where: {} },
  "needs-reply": { label: "Needs a reply", icon: "mark_chat_unread", where: { sitterReply: null, hidden: false } },
  replied: { label: "Replied", icon: "mark_chat_read", where: { sitterReply: { not: null } } },
} satisfies Record<string, { label: string; icon: string; where: Prisma.ReviewWhereInput }>;
type TabKey = keyof typeof TABS;

export default async function SitterReviewsPage({ searchParams }: PageProps<"/sitter/reviews">) {
  const { profile } = await requireSitter();
  const sp = await searchParams;
  const tab: TabKey = (one(sp.tab) as TabKey) in TABS ? (one(sp.tab) as TabKey) : "all";
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const tz = profile.city.timeZone;
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
            <span className="material-symbols-outlined text-lg">visibility</span>See them on your profile
          </Link>
        }
        description="Thank pet parents for their kind words or add context. Replies appear under the review on your public profile and can be edited for 7 days."
        eyebrow="Sitter Dashboard"
        title="Reviews"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-space-md [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <StatCard hint={`${profile.reviewCount} review${profile.reviewCount === 1 ? "" : "s"}`} icon="star" label="Rating" tone="tertiary" value={profile.reviewCount ? formatRating(profile.rating) : "—"} />
        <StatCard hint="Visible reviews without a reply" icon="mark_chat_unread" label="Awaiting reply" tone="secondary" value={needsReply} />
        <StatCard hint="Of visible reviews" icon="forum" label="Reply rate" value={visible ? `${replyRate}%` : "—"} />
      </div>

      <Card>
        <nav aria-label="Review filter" className="flex gap-space-xs overflow-x-auto p-space-sm border-b border-[#EFE7DE]">
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
                {TABS[k].label}
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
                      <span aria-label={`${r.rating} out of 5`} className="text-tertiary-container tracking-tight">
                        {"★".repeat(r.rating)}
                        <span className="text-outline-variant">{"★".repeat(5 - r.rating)}</span>
                      </span>
                      {r.hidden && (
                        <StatusChip icon="visibility_off" tone="danger">
                          Hidden
                        </StatusChip>
                      )}
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {r.petLabel ? `${r.petLabel} · ` : ""}
                      <span title={formatDate(r.createdAt, tz)}>{timeAgo(r.createdAt)}</span>
                      {r.bookingId && (
                        <>
                          {" · "}
                          <Link className="text-primary hover:underline" href={`/sitter/bookings/${r.bookingId}`}>
                            View booking
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
                  repliedAgo={r.sitterRepliedAt ? timeAgo(r.sitterRepliedAt) : null}
                  reply={r.sitterReply}
                  reviewId={r.id}
                />
              </article>
            ))
          ) : (
            <EmptyState
              icon={TABS[tab].icon}
              text={tab === "needs-reply" ? "You've replied to every review. Nice work!" : "Reviews from completed bookings will appear here."}
              title={tab === "needs-reply" ? "All caught up" : "No reviews yet"}
            />
          )}
        </div>
        <Pager hrefFor={(p) => `/sitter/reviews?${tab === "all" ? "" : `tab=${tab}&`}page=${p}`} page={current} pageCount={pageCount} />
      </Card>
    </>
  );
}
