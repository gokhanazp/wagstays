import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AUDIT_ENTITY_TYPES } from "@/lib/admin-core";
import { BTN, Card, EmptyState, INPUT, PageHeader, Pager } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { AuditList } from "../_components/AuditList";
import { auditInclude, toAuditRows } from "../_components/audit-rows";

export const metadata: Metadata = { title: "Audit Log" };

const PAGE_SIZE = 25;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80);
  const actor = one(sp.actor).slice(0, 40);
  const entityId = one(sp.entityId).trim().slice(0, 40);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const [actors, entityTypesInLog] = await Promise.all([
    db.user.findMany({ where: { auditLogs: { some: {} } }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
    db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true } }),
  ]);
  const entityTypes = [...new Set<string>([...AUDIT_ENTITY_TYPES, ...entityTypesInLog.map((e) => e.entityType)])].sort();
  const entityType = entityTypes.includes(one(sp.entityType)) ? one(sp.entityType) : "";

  const where: Prisma.AuditLogWhereInput = {
    ...(entityType && { entityType }),
    ...(actor && { actorId: actor }),
    ...(entityId && { entityId }),
    ...(q && { action: { contains: q, mode: "insensitive" } }),
  };
  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: auditInclude }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (actor) qs.set("actor", actor);
    if (entityType) qs.set("entityType", entityType);
    if (entityId) qs.set("entityId", entityId);
    if (p > 1) qs.set("page", String(p));
    return `/admin/audit${qs.size ? `?${qs}` : ""}`;
  };
  const filtered = !!(q || actor || entityType || entityId);

  return (
    <>
      <PageHeader description="Every change made from the admin panel, newest first. Expand a row to see the before/after details." eyebrow="Admin" title="Audit Log" />
      <Card className="p-space-md">
        <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_200px_220px_auto] gap-space-sm items-end" role="search">
          <label>
            <span className="sr-only">Action contains</span>
            <span className="relative block">
              <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
              <input className={`${INPUT} pl-11`} defaultValue={q} name="q" placeholder="Action, e.g. city.update" type="search" />
            </span>
          </label>
          <label>
            <span className="sr-only">Entity type</span>
            <Select
              aria-label="Entity type"
              defaultValue={entityType}
              name="entityType"
              options={[{ value: "", label: "All entities" }, ...entityTypes.map((t) => ({ value: t, label: t }))]}
            />
          </label>
          <label>
            <span className="sr-only">Admin</span>
            <Select
              aria-label="Admin"
              defaultValue={actor}
              name="actor"
              options={[{ value: "", label: "All admins" }, ...actors.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}` }))]}
            />
          </label>
          {entityId && <input name="entityId" type="hidden" value={entityId} />}
          <div className="flex gap-space-xs">
            <button className={BTN.sage} type="submit">
              Filter
            </button>
            {filtered && (
              <Link className={BTN.ghost} href="/admin/audit">
                Clear
              </Link>
            )}
          </div>
        </form>
        {entityId && (
          <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
            Showing entries for <code className="px-1.5 rounded bg-surface-container-low">{entityId}</code> only.
          </p>
        )}
      </Card>
      <Card className="p-space-sm">
        <div className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
          {total} entr{total === 1 ? "y" : "ies"}
          {filtered ? " match your filters" : ""}
        </div>
        {logs.length === 0 ? <EmptyState icon="history" text="Admin changes will be recorded here." title="No audit entries" /> : <AuditList rows={toAuditRows(logs)} />}
        <Pager hrefFor={hrefFor} page={Math.min(page, pageCount)} pageCount={pageCount} />
      </Card>
    </>
  );
}
