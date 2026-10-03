import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BTN, Card, EmptyState, INPUT, LABEL, Pager } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { db } from "@/lib/db";
import { OwnerReviewRow, ownerReviewInclude, ownerReviewModerationNotes } from "./OwnerReviewRow";

const PAGE_SIZE = 20;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** Tabs at the top of /admin/reviews: public sitter reviews vs. private pet parent ratings. */
export function ReviewTabs({ active, ownerCount, hiddenOwnerCount }: { active: "sitters" | "owners"; ownerCount: number; hiddenOwnerCount: number }) {
  const tabs = [
    { key: "sitters", label: "Reviews of sitters", icon: "reviews", href: "/admin/reviews" },
    { key: "owners", label: "Ratings of pet parents", icon: "person_check", href: "/admin/reviews?tab=owners", count: ownerCount, hidden: hiddenOwnerCount },
  ] as const;
  return (
    <nav aria-label="Review type" className="flex gap-space-xs overflow-x-auto p-space-xs rounded-full bg-surface-container-lowest border border-[#EFE7DE] w-fit max-w-full">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            aria-current={on ? "page" : undefined}
            className={`flex items-center gap-space-xs h-10 px-space-md rounded-full font-label-lg text-label-lg whitespace-nowrap transition-colors ${
              on ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
            href={t.href}
            key={t.key}
          >
            <span className="material-symbols-outlined text-lg">{t.icon}</span>
            {t.label}
            {"count" in t && (
              <span className={`min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center font-label-sm text-label-sm ${on ? "bg-white/20" : "bg-surface-container-high"}`}>
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function parse(sp: SP) {
  const rating = Number(one(sp.rating));
  const visibility = one(sp.visibility);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    visibility: visibility === "hidden" || visibility === "visible" ? visibility : undefined,
    q: one(sp.q)?.slice(0, 80),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}
type Filters = ReturnType<typeof parse>;

function href(f: Filters, page?: number) {
  const qs = new URLSearchParams({ tab: "owners" });
  if (f.q) qs.set("q", f.q);
  if (f.rating) qs.set("rating", String(f.rating));
  if (f.visibility) qs.set("visibility", f.visibility);
  if (page && page > 1) qs.set("page", String(page));
  return `/admin/reviews?${qs}`;
}

/** /admin/reviews?tab=owners — private sitter ratings of pet parents, with hide / unhide moderation. */
export async function OwnerReviewsPanel({ searchParams }: { searchParams: SP }) {
  const f = parse(searchParams);
  const and: Prisma.OwnerReviewWhereInput[] = [];
  if (f.rating) and.push({ rating: f.rating });
  if (f.visibility) and.push({ hidden: f.visibility === "hidden" });
  if (f.q) {
    const words = f.q.split(/\s+/).filter(Boolean).slice(0, 3);
    and.push({
      OR: [
        { body: { contains: f.q, mode: "insensitive" } },
        { sitter: { displayName: { contains: f.q, mode: "insensitive" } } },
        { owner: { email: { contains: f.q, mode: "insensitive" } } },
        { owner: { AND: words.map((w) => ({ OR: [{ firstName: { contains: w, mode: "insensitive" as const } }, { lastName: { contains: w, mode: "insensitive" as const } }] })) } },
      ],
    });
  }
  const where: Prisma.OwnerReviewWhereInput = and.length ? { AND: and } : {};
  const total = await db.ownerReview.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  const rows = await db.ownerReview.findMany({
    where,
    include: ownerReviewInclude,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const notes = await ownerReviewModerationNotes(rows.map((r) => r.id));
  const hasFilters = Boolean(f.rating || f.visibility || f.q);

  return (
    <>
      <Card className="p-space-lg">
        <form action="/admin/reviews" className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm md:gap-space-md items-end" method="get">
          <input name="tab" type="hidden" value="owners" />
          <label className="flex flex-col gap-space-xs col-span-2">
            <span className={LABEL}>Search</span>
            <span className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
              <input className={`${INPUT} pl-10`} defaultValue={f.q} name="q" placeholder="Pet parent, sitter or note" type="search" />
            </span>
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
                { value: "visible", label: "Counted", icon: "visibility" },
                { value: "hidden", label: "Hidden", icon: "visibility_off" },
              ]}
            />
          </label>
          <div className="flex flex-wrap gap-space-sm col-span-2 lg:col-span-4 justify-end">
            {hasFilters && (
              <Link className={BTN.ghost} href="/admin/reviews?tab=owners">
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
        <div className="px-space-lg pt-space-lg pb-space-sm flex flex-col gap-1">
          <h2 className="font-title-md text-title-md text-on-surface">
            {total} pet parent rating{total === 1 ? "" : "s"}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Private — visible to admins only. Sitters see just the average of non-hidden ratings and the stay count.
          </p>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon="person_check" text="No sitter ratings of pet parents match these filters." title="Nothing to moderate" />
        ) : (
          <ul className="flex flex-col">
            {rows.map((r) => (
              <OwnerReviewRow key={r.id} note={notes.get(r.id)} r={r} />
            ))}
          </ul>
        )}
        <Pager hrefFor={(p) => href(f, p)} page={page} pageCount={pageCount} />
      </Card>
    </>
  );
}
