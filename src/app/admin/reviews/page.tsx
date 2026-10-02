import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BTN, Card, EmptyState, INPUT, LABEL, PageHeader, Pager, StatusChip, formatDate } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { MAX_FEATURED_REVIEWS } from "./_constants";
import { ReviewActions } from "./_components/ReviewActions";

export const metadata: Metadata = { title: "Reviews" };

const PAGE_SIZE = 20;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

function parse(sp: SP) {
  const rating = Number(one(sp.rating));
  const visibility = one(sp.visibility);
  const featured = one(sp.featured);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    sitter: one(sp.sitter)?.slice(0, 40),
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    visibility: visibility === "hidden" || visibility === "visible" ? visibility : undefined,
    featured: featured === "yes" || featured === "no" ? featured : undefined,
    q: one(sp.q)?.slice(0, 80),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}
type Filters = ReturnType<typeof parse>;

function href(f: Filters, page?: number) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, page: page && page > 1 ? page : undefined })) if (v !== undefined && !(k === "page" && v === 1)) qs.set(k, String(v));
  const s = qs.toString();
  return s ? `/admin/reviews?${s}` : "/admin/reviews";
}

export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  const f = parse(await searchParams);
  const and: Prisma.ReviewWhereInput[] = [];
  if (f.sitter) and.push({ sitterId: f.sitter });
  if (f.rating) and.push({ rating: f.rating });
  if (f.visibility) and.push({ hidden: f.visibility === "hidden" });
  if (f.featured) and.push({ featuredOnHome: f.featured === "yes" });
  if (f.q) and.push({ OR: [{ body: { contains: f.q } }, { authorName: { contains: f.q } }, { petLabel: { contains: f.q } }] });
  const where: Prisma.ReviewWhereInput = and.length ? { AND: and } : {};

  const [total, featuredCount, hiddenCount, sitters] = await Promise.all([
    db.review.count({ where }),
    db.review.count({ where: { featuredOnHome: true } }),
    db.review.count({ where: { hidden: true } }),
    db.sitterProfile.findMany({ where: { reviews: { some: {} } }, select: { id: true, displayName: true }, orderBy: { displayName: "asc" } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  const reviews = await db.review.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { sitter: { select: { displayName: true, slug: true } }, booking: { select: { id: true } } },
  });

  // Last moderation reason for hidden reviews on this page
  const hiddenIds = reviews.filter((r) => r.hidden).map((r) => r.id);
  const hideLogs = hiddenIds.length
    ? await db.auditLog.findMany({ where: { entityType: "Review", action: "review.hide", entityId: { in: hiddenIds } }, orderBy: { createdAt: "desc" } })
    : [];
  const hideReason = new Map<string, string>();
  for (const l of hideLogs) {
    if (hideReason.has(l.entityId)) continue;
    try {
      const r = JSON.parse(l.details ?? "{}").reason;
      if (typeof r === "string") hideReason.set(l.entityId, r);
    } catch {}
  }

  const hasFilters = Boolean(f.sitter || f.rating || f.visibility || f.featured || f.q);
  const slotsLeft = MAX_FEATURED_REVIEWS - featuredCount;

  return (
    <>
      <PageHeader
        description="Moderate what appears on sitter profiles and pick the testimonials shown on the home page."
        eyebrow="Trust & safety"
        title="Reviews"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
        <Link className="flex items-center gap-space-md p-space-md rounded-2xl bg-surface-container-lowest border border-[#EFE7DE] hover:border-primary-container transition-colors" href="/admin/reviews?featured=yes">
          <span className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">home</span>
          </span>
          <span className="flex flex-col">
            <span className="font-label-lg text-label-lg text-on-surface">
              {featuredCount} of {MAX_FEATURED_REVIEWS} home page spots used
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {slotsLeft > 0 ? `${slotsLeft} spot${slotsLeft === 1 ? "" : "s"} free.` : "Full — unfeature one to make room for another."}
            </span>
          </span>
        </Link>
        <Link className="flex items-center gap-space-md p-space-md rounded-2xl bg-surface-container-lowest border border-[#EFE7DE] hover:border-primary-container transition-colors" href="/admin/reviews?visibility=hidden">
          <span className="w-10 h-10 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">visibility_off</span>
          </span>
          <span className="flex flex-col">
            <span className="font-label-lg text-label-lg text-on-surface">{hiddenCount} hidden</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Not shown on the public site.</span>
          </span>
        </Link>
      </div>

      <Card className="p-space-lg">
        <form action="/admin/reviews" className="grid grid-cols-2 lg:grid-cols-6 gap-space-sm md:gap-space-md items-end" method="get">
          <label className="flex flex-col gap-space-xs col-span-2">
            <span className={LABEL}>Search</span>
            <span className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
              <input className={`${INPUT} pl-10`} defaultValue={f.q} name="q" placeholder="Text, author or pet" type="search" />
            </span>
          </label>
          <label className="flex flex-col gap-space-xs">
            <span className={LABEL}>Sitter</span>
            <Select
              aria-label="Sitter"
              defaultValue={f.sitter ?? ""}
              name="sitter"
              options={[{ value: "", label: "All sitters" }, ...sitters.map((s) => ({ value: s.id, label: s.displayName }))]}
            />
          </label>
          <label className="flex flex-col gap-space-xs">
            <span className={LABEL}>Rating</span>
            <Select
              aria-label="Rating"
              defaultValue={f.rating ? String(f.rating) : ""}
              name="rating"
              options={[{ value: "", label: "Any rating" }, ...[5, 4, 3, 2, 1].map((r) => ({ value: String(r), label: `${r} star${r === 1 ? "" : "s"}`, icon: "star" }))]}
            />
          </label>
          <label className="flex flex-col gap-space-xs">
            <span className={LABEL}>Visibility</span>
            <Select
              aria-label="Visibility"
              defaultValue={f.visibility ?? ""}
              name="visibility"
              options={[
                { value: "", label: "All" },
                { value: "visible", label: "Visible", icon: "visibility" },
                { value: "hidden", label: "Hidden", icon: "visibility_off" },
              ]}
            />
          </label>
          <label className="flex flex-col gap-space-xs">
            <span className={LABEL}>Home page</span>
            <Select
              aria-label="Home page"
              defaultValue={f.featured ?? ""}
              name="featured"
              options={[
                { value: "", label: "All" },
                { value: "yes", label: "Featured" },
                { value: "no", label: "Not featured" },
              ]}
            />
          </label>
          <div className="flex flex-wrap gap-space-sm col-span-2 lg:col-span-6 justify-end">
            {hasFilters && (
              <Link className={BTN.ghost} href="/admin/reviews">
                Clear filters
              </Link>
            )}
            <button className={BTN.sage} type="submit">
              <span className="material-symbols-outlined text-xl">filter_list</span>
              Apply
            </button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-space-lg pt-space-lg pb-space-sm">
          <h2 className="font-title-md text-title-md text-on-surface">
            {total} review{total === 1 ? "" : "s"}
          </h2>
        </div>
        {reviews.length === 0 ? (
          <EmptyState icon="rate_review" text="No reviews match these filters." title="Nothing to moderate" />
        ) : (
          <ul className="flex flex-col">
            {reviews.map((r) => (
              <li key={r.id} className={`flex flex-col lg:flex-row gap-space-md px-space-lg py-space-md border-t border-[#EFE7DE] ${r.hidden ? "bg-surface-container-low/60" : ""}`}>
                <div className="flex gap-space-md flex-1 min-w-0">
                  {r.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="w-11 h-11 rounded-full object-cover shrink-0" src={r.authorAvatar} />
                  ) : (
                    <span className="w-11 h-11 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-label-lg text-label-lg shrink-0">
                      {r.authorName.slice(0, 1)}
                    </span>
                  )}
                  <div className="flex flex-col gap-space-xs min-w-0">
                    <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1">
                      <span className="font-label-lg text-label-lg text-on-surface">{r.authorName}</span>
                      <span aria-label={`${r.rating} out of 5`} className="text-secondary tracking-tight">
                        {"★".repeat(r.rating)}
                        <span className="text-outline-variant">{"★".repeat(5 - r.rating)}</span>
                      </span>
                      {r.hidden && (
                        <StatusChip icon="visibility_off" tone="danger">
                          Hidden
                        </StatusChip>
                      )}
                      {r.featuredOnHome && (
                        <StatusChip icon="home" tone="primary">
                          On home page
                        </StatusChip>
                      )}
                      {r.verifiedBooking && (
                        <StatusChip icon="verified" tone="success">
                          Verified
                        </StatusChip>
                      )}
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      for{" "}
                      <Link className="text-primary hover:underline" href={`/sitters/${r.sitter.slug}`}>
                        {r.sitter.displayName}
                      </Link>
                      {r.petLabel ? ` · ${r.petLabel}` : ""} · {formatDate(r.createdAt)}
                      {r.booking && (
                        <>
                          {" · "}
                          <Link className="text-primary hover:underline" href={`/admin/bookings/${r.booking.id}`}>
                            View booking
                          </Link>
                        </>
                      )}
                    </span>
                    <p className={`font-body-md text-body-md ${r.hidden ? "text-on-surface-variant" : "text-on-surface"}`}>{r.body}</p>
                    {r.hidden && hideReason.get(r.id) && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        <span className="font-label-md text-label-md">Moderation note:</span> {hideReason.get(r.id)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="lg:w-[340px] shrink-0">
                  <ReviewActions featured={r.featuredOnHome} featureFull={slotsLeft <= 0} hidden={r.hidden} reviewId={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pager hrefFor={(p) => href(f, p)} page={page} pageCount={pageCount} />
      </Card>
    </>
  );
}
