import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getActiveCity } from "@/lib/queries";
import { formatMoney, formatRating } from "@/lib/format";
import { UNIT_LABELS } from "@/lib/constants";
import { Card, EmptyState, PageHeader, Pager, SELECT, StatusChip, TD, TH, Table } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { FilterTabs, SearchForm, one, qs } from "../applications/_components/ListControls";

export const metadata: Metadata = { title: "Sitters" };

const PAGE_SIZE = 15;
const SORTS = {
  rating: { label: "Top rated", orderBy: [{ rating: "desc" }, { reviewCount: "desc" }] },
  bookings: { label: "Most bookings", orderBy: [{ completedBookings: "desc" }, { rating: "desc" }] },
  newest: { label: "Newest", orderBy: [{ createdAt: "desc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.SitterProfileOrderByWithRelationInput[] }>;
type SortKey = keyof typeof SORTS;
const SORT_ICONS: Record<SortKey, string> = { rating: "star", bookings: "event_available", newest: "schedule" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminSittersPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const city = await getActiveCity();

  const status = one(sp.status) === "ACTIVE" || one(sp.status) === "PAUSED" ? one(sp.status) : undefined;
  const featured = one(sp.featured) === "1";
  const superSitter = one(sp.super) === "1";
  const hood = city.neighbourhoods.some((n) => n.slug === one(sp.hood)) ? one(sp.hood) : undefined;
  const sort: SortKey = (Object.keys(SORTS) as SortKey[]).includes(one(sp.sort) as SortKey) ? (one(sp.sort) as SortKey) : "rating";
  const q = (one(sp.q) ?? "").trim().slice(0, 80);
  const pageReq = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);

  const base: Prisma.SitterProfileWhereInput = {
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { slug: { contains: q.toLowerCase(), mode: "insensitive" } },
            { user: { email: { contains: q.toLowerCase(), mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(featured ? { featured: true } : {}),
    ...(superSitter ? { isSuperSitter: true } : {}),
    ...(hood ? { neighbourhood: { slug: hood } } : {}),
  };
  const where: Prisma.SitterProfileWhereInput = { ...base, ...(status ? { status } : {}) };

  const [grouped, total] = await Promise.all([
    db.sitterProfile.groupBy({ by: ["status"], where: base, _count: true }),
    db.sitterProfile.count({ where }),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count])) as Record<string, number>;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageReq, pageCount);
  const sitters = await db.sitterProfile.findMany({
    where,
    include: { neighbourhood: true, services: true, user: { select: { email: true } } },
    orderBy: SORTS[sort].orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const params = { status, featured: featured ? "1" : undefined, super: superSitter ? "1" : undefined, hood, sort: sort === "rating" ? undefined : sort, q };
  const href = (over: Partial<typeof params> & { page?: number }) => qs("/admin/sitters", { ...params, ...over });

  return (
    <>
      <PageHeader
        description={`Every sitter profile in ${city.name}. Pause profiles, curate the home page carousel and manage verification badges.`}
        eyebrow="Marketplace"
        title="Sitters"
      />

      <FilterTabs
        tabs={[
          { href: href({ status: undefined, page: 1 }), label: "All", count: (counts.ACTIVE ?? 0) + (counts.PAUSED ?? 0), active: !status },
          { href: href({ status: "ACTIVE", page: 1 }), label: "Active", count: counts.ACTIVE ?? 0, active: status === "ACTIVE" },
          { href: href({ status: "PAUSED", page: 1 }), label: "Paused", count: counts.PAUSED ?? 0, active: status === "PAUSED" },
        ]}
      />

      <Card className="flex flex-col">
        <div className="p-space-lg pb-space-md">
          <SearchForm action="/admin/sitters" hidden={{ status }} placeholder="Search name, slug or email" q={q}>
            <Select
              aria-label="Neighbourhood"
              className={`${SELECT} md:w-52`}
              defaultValue={hood ?? ""}
              name="hood"
              options={[{ value: "", label: "All neighbourhoods" }, ...city.neighbourhoods.map((n) => ({ value: n.slug, label: n.name }))]}
            />
            <Select
              aria-label="Sort"
              className={`${SELECT} md:w-44`}
              defaultValue={sort}
              name="sort"
              options={(Object.keys(SORTS) as SortKey[]).map((k) => ({ value: k, label: SORTS[k].label, icon: SORT_ICONS[k] }))}
            />
            <div className="flex gap-space-sm">
              <CheckPill checked={featured} icon="star" label="Featured" name="featured" />
              <CheckPill checked={superSitter} icon="workspace_premium" label="Super Sitter" name="super" />
            </div>
          </SearchForm>
        </div>

        {sitters.length === 0 ? (
          <EmptyState action={<Link className="font-label-lg text-label-lg text-primary hover:underline" href="/admin/sitters">Clear filters</Link>} icon="person_search" title="No sitters match these filters" />
        ) : (
          <div className="px-space-sm md:px-space-md">
            <Table>
              <thead>
                <tr>
                  <th className={TH}>Sitter</th>
                  <th className={TH}>Neighbourhood</th>
                  <th className={TH}>Services</th>
                  <th className={TH}>Rating</th>
                  <th className={TH}>Bookings</th>
                  <th className={TH}>Badges</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sitters.map((s) => {
                  const active = s.services.filter((x) => x.active);
                  const from = [...active].sort((a, b) => a.priceCents - b.priceCents)[0];
                  return (
                    <tr key={s.id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className={TD}>
                        <div className="flex items-center gap-space-md min-w-[220px]">
                          <Image alt="" className="w-11 h-11 rounded-full object-cover shrink-0" height={44} src={s.avatarUrl} width={44} />
                          <div className="flex flex-col min-w-0">
                            <Link className="font-label-lg text-label-lg text-on-surface hover:text-primary" href={`/admin/sitters/${s.id}`}>
                              {s.displayName}
                            </Link>
                            <Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary inline-flex items-center gap-0.5 whitespace-nowrap" href={`/sitters/${s.slug}`} target="_blank">
                              /sitters/{s.slug}
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>{s.neighbourhood.name}</td>
                      <td className={`${TD} whitespace-nowrap`}>
                        <span className="flex flex-col">
                          <span>
                            {active.length} active{s.services.length > active.length ? ` · ${s.services.length - active.length} off` : ""}
                          </span>
                          {from && (
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                              from {formatMoney(from.priceCents)} / {UNIT_LABELS[from.unit] ?? from.unit}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>
                        {s.reviewCount > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-lg text-[#F5A623]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            {formatRating(s.rating)}
                            <span className="font-body-sm text-body-sm text-on-surface-variant">({s.reviewCount})</span>
                          </span>
                        ) : (
                          <span className="font-body-sm text-body-sm text-outline">New</span>
                        )}
                      </td>
                      <td className={TD}>{s.completedBookings}</td>
                      <td className={TD}>
                        <div className="flex flex-wrap gap-1 min-w-[120px] max-w-[160px]">
                          {s.featured && <Badge icon="star" label="Featured" />}
                          {s.isSuperSitter && <Badge icon="workspace_premium" label="Super Sitter" />}
                          {s.idVerified && <Badge icon="badge" label="ID verified" />}
                          {s.backgroundChecked && <Badge icon="local_police" label="Background checked" />}
                          {s.firstAidCertified && <Badge icon="medical_services" label="First aid" />}
                          {s.instantBook && <Badge icon="bolt" label="Instant book" />}
                        </div>
                      </td>
                      <td className={TD}>
                        <StatusChip tone={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status === "ACTIVE" ? "Active" : "Paused"}</StatusChip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
        <Pager hrefFor={(p) => href({ page: p })} page={page} pageCount={pageCount} />
      </Card>
    </>
  );
}

function Badge({ icon, label }: { icon: string; label: string }) {
  return (
    <span aria-label={label} className="w-7 h-7 rounded-lg bg-[#EBF3EF] text-primary inline-flex items-center justify-center" title={label}>
      <span className="material-symbols-outlined text-base">{icon}</span>
    </span>
  );
}

function CheckPill({ name, label, icon, checked }: { name: string; label: string; icon: string; checked: boolean }) {
  return (
    <label className="relative cursor-pointer">
      <input className="peer sr-only" defaultChecked={checked} name={name} type="checkbox" value="1" />
      <span className="inline-flex items-center gap-1 h-12 px-space-md rounded-xl border-[1.5px] border-[#EFE7DE] bg-surface-container-lowest font-label-lg text-label-lg text-on-surface-variant whitespace-nowrap peer-checked:bg-[#EBF3EF] peer-checked:border-[#C8DDD4] peer-checked:text-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-container/15">
        <span className="material-symbols-outlined text-lg">{icon}</span>
        {label}
      </span>
    </label>
  );
}
