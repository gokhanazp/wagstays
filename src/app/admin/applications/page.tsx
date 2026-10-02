import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getActiveCity } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import {
  APPLICATION_STATUS_LABELS,
  DEFAULT_TIME_ZONE,
  SERVICE_LABELS,
  SERVICE_TYPES,
  type ApplicationStatus,
  type ServiceType,
} from "@/lib/constants";
import { EXPERIENCE_LABELS } from "@/lib/sitter-approval";
import { Card, EmptyState, PageHeader, Pager, StatusChip, TD, TH, Table, formatDate, formatDateTime } from "@/components/ui";
import { FilterTabs, SearchForm, one, qs } from "./_components/ListControls";

export const metadata: Metadata = { title: "Sitter Applications" };

const PAGE_SIZE = 15;
const TABS = [
  { key: "in-review", label: "In review", status: "IN_REVIEW" },
  { key: "meet-greet", label: "Meet & Greet", status: "MEET_GREET" },
  { key: "approved", label: "Approved", status: "APPROVED" },
  { key: "rejected", label: "Rejected", status: "REJECTED" },
  { key: "all", label: "All", status: undefined },
] as const;

const SERVICE_SHORT: Record<ServiceType, string> = {
  DOG_WALKING: "Walk",
  BOARDING: "Boarding",
  DAY_CARE: "Day care",
  DROP_IN: "Drop-in",
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ApplicationsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const tabKey = TABS.some((t) => t.key === one(sp.status)) ? one(sp.status)! : "all";
  const tab = TABS.find((t) => t.key === tabKey)!;
  const q = (one(sp.q) ?? "").trim().slice(0, 80);
  const pageReq = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);

  const search: Prisma.SitterApplicationWhereInput = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q.toLowerCase(), mode: "insensitive" } },
          { trackingCode: { contains: q.toUpperCase().replace(/^#/, ""), mode: "insensitive" } },
          ...(q.includes(" ")
            ? [{ AND: [{ firstName: { contains: q.split(/\s+/)[0], mode: "insensitive" } }, { lastName: { contains: q.split(/\s+/).slice(1).join(" "), mode: "insensitive" } }] }]
            : []),
        ],
      }
    : {};
  const where: Prisma.SitterApplicationWhereInput = { ...search, ...(tab.status ? { status: tab.status } : {}) };

  const [grouped, total, city] = await Promise.all([
    db.sitterApplication.groupBy({ by: ["status"], where: search, _count: true }),
    db.sitterApplication.count({ where }),
    getActiveCity(),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count])) as Record<string, number>;
  const allCount = grouped.reduce((n, g) => n + g._count, 0);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageReq, pageCount);

  const apps = await db.sitterApplication.findMany({
    where,
    include: { services: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const hoodName = (v: string | null) =>
    v ? (city.neighbourhoods.find((n) => n.slug === v || n.name === v)?.name ?? v) : "—";
  const tz = city.timeZone ?? DEFAULT_TIME_ZONE;
  const open = (counts.IN_REVIEW ?? 0) + (counts.MEET_GREET ?? 0);

  return (
    <>
      <PageHeader
        description={`Review new sitters for ${city.name}, book their Meet & Greet and publish approved profiles.`}
        eyebrow="Sitter onboarding"
        title="Applications"
        actions={<StatusChip icon="pending_actions" tone={open ? "warning" : "success"}>{open} awaiting a decision</StatusChip>}
      />

      <FilterTabs
        tabs={TABS.map((t) => ({
          href: qs("/admin/applications", { status: t.key === "all" ? undefined : t.key, q }),
          label: t.label,
          count: t.status ? (counts[t.status] ?? 0) : allCount,
          active: t.key === tabKey,
        }))}
      />

      <Card className="flex flex-col">
        <div className="p-space-lg pb-space-md">
          <SearchForm action="/admin/applications" hidden={{ status: tab.status ? tabKey : undefined }} placeholder="Search name, email or code (WS-31877)" q={q} />
        </div>
        {apps.length === 0 ? (
          <EmptyState
            icon="assignment_ind"
            text={q ? `Nothing matches “${q}”. Try another name, email or tracking code.` : "New applications from Become a Sitter will appear here."}
            title={q ? "No matching applications" : "No applications here yet"}
          />
        ) : (
          <div className="px-space-sm md:px-space-md">
            <Table>
              <thead>
                <tr>
                  <th className={TH}>Code</th>
                  <th className={TH}>Applicant</th>
                  <th className={TH}>Neighbourhood</th>
                  <th className={TH}>Services</th>
                  <th className={TH}>Experience</th>
                  <th className={TH}>Docs</th>
                  <th className={TH}>Meet &amp; Greet</th>
                  <th className={TH}>Submitted</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => {
                  const st = APPLICATION_STATUS_LABELS[a.status as ApplicationStatus] ?? APPLICATION_STATUS_LABELS.IN_REVIEW;
                  const services = [...a.services].sort(
                    (x, y) => SERVICE_TYPES.indexOf(x.type as ServiceType) - SERVICE_TYPES.indexOf(y.type as ServiceType),
                  );
                  const href = `/admin/applications/${a.id}`;
                  return (
                    <tr key={a.id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className={TD}>
                        <Link className="font-label-lg text-label-lg text-primary hover:underline whitespace-nowrap" href={href}>
                          {a.trackingCode}
                        </Link>
                      </td>
                      <td className={TD}>
                        <Link className="flex flex-col min-w-[160px] group" href={href}>
                          <span className="font-label-lg text-label-lg text-on-surface group-hover:text-primary">
                            {a.firstName} {a.lastName}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">{a.email}</span>
                        </Link>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>{hoodName(a.neighbourhood)}</td>
                      <td className={TD}>
                        <div className="flex flex-wrap gap-1 min-w-[180px]">
                          {services.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center h-6 px-2 rounded-full bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap"
                              title={SERVICE_LABELS[s.type as ServiceType]}
                            >
                              {SERVICE_SHORT[s.type as ServiceType] ?? s.type} · {formatMoney(s.priceCents)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>{EXPERIENCE_LABELS[a.experience] ?? a.experience}</td>
                      <td className={TD}>
                        <div className="flex items-center gap-1">
                          <DocIcon icon="badge" label="Photo ID" present={!!a.idDocumentName} />
                          <DocIcon icon="local_police" label="Police check" present={!!a.backgroundCheckName} />
                        </div>
                      </td>
                      <td className={`${TD} whitespace-nowrap font-body-sm text-body-sm`}>
                        {a.meetGreetAt ? formatDateTime(a.meetGreetAt, tz) : <span className="text-outline">Not booked</span>}
                      </td>
                      <td className={`${TD} whitespace-nowrap font-body-sm text-body-sm`}>{formatDate(a.createdAt, tz)}</td>
                      <td className={TD}>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
        <Pager hrefFor={(p) => qs("/admin/applications", { status: tab.status ? tabKey : undefined, q, page: p })} page={page} pageCount={pageCount} />
      </Card>
    </>
  );
}

function DocIcon({ icon, label, present }: { icon: string; label: string; present: boolean }) {
  return (
    <span
      aria-label={`${label}: ${present ? "provided" : "missing"}`}
      className={`w-8 h-8 rounded-lg inline-flex items-center justify-center ${
        present ? "bg-[#EBF3EF] text-primary" : "bg-surface-container text-outline"
      }`}
      title={`${label}: ${present ? "provided" : "missing"}`}
    >
      <span className="material-symbols-outlined text-lg">{present ? icon : "remove"}</span>
    </span>
  );
}
