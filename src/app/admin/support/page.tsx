import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  ACTIVE_TICKET_STATUSES,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  adminStatusLabel,
  categoryLabel,
  priorityLabel,
  type TicketStatus,
} from "@/lib/support";
import { BTN, Card, EmptyState, INPUT, LABEL, PageHeader, Pager, StatusChip, TD, TH, Table, formatDateTime } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { PAGE_SIZE, ago, baseWhere, filterHref, findTickets, parseTicketFilters, ticketWhere, waitingSince } from "./_lib";

export const metadata: Metadata = { title: "Support" };

const th = TH.replace("px-space-lg", "px-space-md");
const td = TD.replace("px-space-lg", "px-space-md");

export default async function AdminSupportPage({ searchParams }: PageProps<"/admin/support">) {
  const f = parseTicketFilters(await searchParams);
  const [groups, total, urgentOpen] = await Promise.all([
    db.supportTicket.groupBy({ by: ["status"], where: baseWhere(f), _count: true }),
    db.supportTicket.count({ where: ticketWhere(f) }),
    db.supportTicket.count({ where: { priority: "URGENT", status: { in: ACTIVE_TICKET_STATUSES } } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  const rows = await findTickets(f, (page - 1) * PAGE_SIZE, PAGE_SIZE);

  const counts = Object.fromEntries(groups.map((g) => [g.status, g._count])) as Partial<Record<TicketStatus, number>>;
  const allCount = groups.reduce((n, g) => n + g._count, 0);
  const activeCount = ACTIVE_TICKET_STATUSES.reduce((n, s) => n + (counts[s] ?? 0), 0);
  const hasFilters = Boolean(f.priority || f.category || f.q || f.sort !== "priority");

  return (
    <>
      <PageHeader
        description="Questions and disputes from owners and sitters. Urgent and safety reports are listed first, then whoever has been waiting longest."
        eyebrow="Operations"
        title="Support"
      />

      {urgentOpen > 0 && (
        <Link
          className="flex items-center gap-space-sm p-space-md rounded-2xl bg-error-container text-on-error-container font-label-lg text-label-lg hover:brightness-[0.98] w-full"
          href={filterHref({ ...f, status: "active", priority: "URGENT", page: 1 })}
        >
          <span className="material-symbols-outlined text-xl">emergency</span>
          <span className="flex-1">
            {urgentOpen} urgent ticket{urgentOpen === 1 ? "" : "s"} need{urgentOpen === 1 ? "s" : ""} attention
          </span>
          <span className="material-symbols-outlined text-xl">chevron_right</span>
        </Link>
      )}

      <nav aria-label="Filter by status" className="flex gap-space-xs overflow-x-auto pb-1 -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
        <StatusTab active={f.status === "active"} count={activeCount} href={filterHref(f, { status: undefined, page: undefined })} label="Active" />
        {TICKET_STATUSES.map((s) => (
          <StatusTab key={s} active={f.status === s} count={counts[s] ?? 0} href={filterHref(f, { status: s, page: undefined })} label={adminStatusLabel(s).label} />
        ))}
        <StatusTab active={f.status === "all"} count={allCount} href={filterHref(f, { status: "all", page: undefined })} label="All" />
      </nav>

      <Card className="p-space-lg">
        <form action="/admin/support" className="grid grid-cols-2 lg:grid-cols-6 gap-space-sm md:gap-space-md items-end" method="get">
          {f.status !== "active" && <input name="status" type="hidden" value={f.status} />}
          <label className="flex flex-col gap-space-xs col-span-2">
            <span className={LABEL}>Search</span>
            <span className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
              <input className={`${INPUT} pl-10`} defaultValue={f.q} name="q" placeholder="Reference, subject, name or email" type="search" />
            </span>
          </label>
          <label className="flex flex-col gap-space-xs">
            <span className={LABEL}>Priority</span>
            <Select
              aria-label="Priority"
              defaultValue={f.priority ?? ""}
              name="priority"
              options={[{ value: "", label: "Any priority" }, ...TICKET_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p].label, icon: PRIORITY_LABELS[p].icon }))]}
            />
          </label>
          <label className="flex flex-col gap-space-xs">
            <span className={LABEL}>Category</span>
            <Select
              aria-label="Category"
              defaultValue={f.category ?? ""}
              name="category"
              options={[{ value: "", label: "All categories" }, ...TICKET_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c].label, icon: CATEGORY_LABELS[c].icon }))]}
              panelMinWidth={240}
            />
          </label>
          <label className="flex flex-col gap-space-xs col-span-2 lg:col-span-1">
            <span className={LABEL}>Sort</span>
            <Select
              aria-label="Sort"
              defaultValue={f.sort}
              name="sort"
              options={[
                { value: "priority", label: "Urgent first", hint: "Then longest waiting", icon: "priority_high" },
                { value: "updated", label: "Recently updated", icon: "update" },
                { value: "newest", label: "Newest first", icon: "schedule" },
              ]}
            />
          </label>
          <div className="flex flex-wrap gap-space-sm col-span-2 lg:col-span-1 justify-end">
            {hasFilters && (
              <Link className={BTN.ghost} href={filterHref({ status: f.status, sort: "priority", page: 1 })}>
                Clear
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
        <div className="flex items-center justify-between px-space-lg pt-space-lg pb-space-sm">
          <h2 className="font-title-md text-title-md text-on-surface">
            {total} ticket{total === 1 ? "" : "s"}
          </h2>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon="support_agent" text={hasFilters ? "Nothing matches these filters." : "The queue is clear — nice work."} title="No tickets" />
        ) : (
          <div className="px-space-sm pb-space-sm">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Ticket</th>
                  <th className={th}>From</th>
                  <th className={th}>Category</th>
                  <th className={th}>Priority</th>
                  <th className={th}>Status</th>
                  <th className={th}>Waiting</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const st = adminStatusLabel(t.status);
                  const pr = priorityLabel(t.priority);
                  const cat = categoryLabel(t.category);
                  const active = (ACTIVE_TICKET_STATUSES as string[]).includes(t.status);
                  const since = waitingSince(t);
                  const userTurn = t.messages[0]?.authorId === t.openedById;
                  return (
                    <tr key={t.id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className={`${td} max-w-[340px]`}>
                        <Link className="flex flex-col group" href={`/admin/support/${t.id}`}>
                          <span className="font-label-lg text-label-lg text-primary group-hover:underline whitespace-nowrap">{t.reference}</span>
                          <span className="font-body-sm text-body-sm text-on-surface truncate">{t.subject}</span>
                        </Link>
                      </td>
                      <td className={td}>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">
                            {t.openedBy.firstName} {t.openedBy.lastName}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">{t.openedBy.email}</span>
                        </div>
                      </td>
                      <td className={td}>
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <span className="material-symbols-outlined text-lg text-on-surface-variant">{cat.icon}</span>
                          {cat.label}
                        </span>
                        {t.booking && <span className="block font-body-sm text-body-sm text-on-surface-variant">Booking attached</span>}
                      </td>
                      <td className={td}>
                        <StatusChip icon={pr.icon} tone={pr.tone}>
                          {pr.label}
                        </StatusChip>
                      </td>
                      <td className={td}>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </td>
                      <td className={td}>
                        {active ? (
                          <div className="flex flex-col whitespace-nowrap" title={formatDateTime(since)}>
                            <span className={userTurn ? "font-semibold text-on-surface" : "text-on-surface-variant"}>{ago(since)}</span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">{userTurn ? "Awaiting us" : "Awaiting user"}</span>
                          </div>
                        ) : (
                          <span className="font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">{t.resolvedAt ? `Done ${formatDateTime(t.resolvedAt)}` : "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
        <Pager hrefFor={(p) => filterHref(f, { page: p })} page={page} pageCount={pageCount} />
      </Card>
    </>
  );
}

function StatusTab({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-space-xs h-10 px-space-md rounded-full font-label-lg text-label-lg whitespace-nowrap border transition-all ${
        active ? "bg-primary-container text-on-primary border-transparent shadow-sm" : "bg-surface-container-lowest text-on-surface-variant border-[#EFE7DE] hover:text-on-surface"
      }`}
      href={href}
    >
      {label}
      <span className={`min-w-6 h-6 px-1.5 rounded-full inline-flex items-center justify-center font-label-sm text-label-sm ${active ? "bg-white/20" : "bg-surface-container-high"}`}>
        {count}
      </span>
    </Link>
  );
}
