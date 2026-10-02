import "server-only";
import { db } from "./db";

/** Records an admin action. Call after the mutation succeeds. */
export async function audit(actorId: string, action: string, entityType: string, entityId: string, details?: unknown) {
  await db.auditLog.create({
    data: { actorId, action, entityType, entityId, details: details === undefined ? null : JSON.stringify(details) },
  });
}
