import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { StatusChip, formatDate } from "@/components/ui";
import { db } from "@/lib/db";
import { splitOwnerNote } from "@/lib/review-rules";
import { OwnerReviewActions } from "./OwnerReviewActions";

export const ownerReviewInclude = {
  owner: { select: { id: true, firstName: true, lastName: true } },
  sitter: { select: { id: true, displayName: true, slug: true } },
} satisfies Prisma.OwnerReviewInclude;
export type OwnerReviewRowData = Prisma.OwnerReviewGetPayload<{ include: typeof ownerReviewInclude }>;

/** Latest hide/unhide reason per owner review (from the audit log). */
export async function ownerReviewModerationNotes(ids: string[]) {
  const notes = new Map<string, string>();
  if (!ids.length) return notes;
  const logs = await db.auditLog.findMany({
    where: { entityType: "OwnerReview", action: { in: ["ownerReview.hide", "ownerReview.unhide"] }, entityId: { in: ids } },
    orderBy: { createdAt: "desc" },
  });
  for (const l of logs) {
    if (notes.has(l.entityId)) continue;
    try {
      const r = JSON.parse(l.details ?? "{}").reason;
      if (typeof r === "string") notes.set(l.entityId, `${l.action === "ownerReview.hide" ? "Hidden" : "Unhidden"}: ${r}`);
    } catch {}
  }
  return notes;
}

/** One sitter → pet parent rating in admin lists. `showOwner` = false on the user's own page. */
export function OwnerReviewRow({ r, note, showOwner = true }: { r: OwnerReviewRowData; note?: string; showOwner?: boolean }) {
  const { tags, note: text } = splitOwnerNote(r.body);
  return (
    <li className={`flex flex-col lg:flex-row gap-space-md px-space-lg py-space-md border-t border-[#EFE7DE] ${r.hidden ? "bg-surface-container-low/60" : ""}`}>
      <div className="flex flex-col gap-space-xs flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1">
          {showOwner && (
            <Link className="font-label-lg text-label-lg text-on-surface hover:text-primary hover:underline" href={`/admin/users/${r.owner.id}`}>
              {r.owner.firstName} {r.owner.lastName}
            </Link>
          )}
          <span aria-label={`${r.rating} out of 5`} className="text-secondary tracking-tight">
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
          by{" "}
          <Link className="text-primary hover:underline" href={`/admin/sitters/${r.sitter.id}`}>
            {r.sitter.displayName}
          </Link>{" "}
          · {formatDate(r.createdAt)} ·{" "}
          <Link className="text-primary hover:underline" href={`/admin/bookings/${r.bookingId}`}>
            View booking
          </Link>
        </span>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-space-xs">
            {tags.map((t) => (
              <StatusChip key={t} tone="primary">
                {t}
              </StatusChip>
            ))}
          </div>
        )}
        {text ? (
          <p className={`font-body-md text-body-md whitespace-pre-line break-words ${r.hidden ? "text-on-surface-variant" : "text-on-surface"}`}>{text}</p>
        ) : (
          !tags.length && <p className="font-body-sm text-body-sm text-outline">No note.</p>
        )}
        {note && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            <span className="font-label-md text-label-md">Moderation note:</span> {note}
          </p>
        )}
      </div>
      <div className="lg:w-[300px] shrink-0">
        <OwnerReviewActions hidden={r.hidden} ownerReviewId={r.id} />
      </div>
    </li>
  );
}
