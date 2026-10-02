import "server-only";
import { db } from "@/lib/db";
import { auditEntityHref } from "@/lib/admin-core";
import { formatDateTime } from "@/components/ui";
import type { AuditRowData } from "./AuditList";

type Log = Awaited<ReturnType<typeof db.auditLog.findMany<{ include: { actor: { select: { id: true; firstName: true; lastName: true } } } }>>>[number];

export const auditInclude = { actor: { select: { id: true, firstName: true, lastName: true } } } as const;

/** Serialises audit rows for <AuditList>. */
export function toAuditRows(logs: Log[]): AuditRowData[] {
  return logs.map((l) => {
    let parsed: unknown = null;
    try {
      parsed = l.details ? JSON.parse(l.details) : null;
    } catch {}
    return {
      id: l.id,
      when: formatDateTime(l.createdAt),
      actorName: `${l.actor.firstName} ${l.actor.lastName}`,
      actorHref: `/admin/users/${l.actor.id}`,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      entityHref: auditEntityHref(l.entityType, l.entityId, parsed),
      details: l.details,
    };
  });
}
