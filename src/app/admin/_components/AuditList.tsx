"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { TD, TH } from "@/components/ui";

export type AuditRowData = {
  id: string;
  when: string;
  actorName: string;
  actorHref: string;
  action: string;
  entityType: string;
  entityId: string;
  entityHref: string | null;
  details: string | null;
};

function pretty(details: string | null) {
  if (!details) return null;
  try {
    return JSON.stringify(JSON.parse(details), null, 2);
  } catch {
    return details;
  }
}

/** Audit log table with expandable JSON details. Reusable by other admin screens. */
export function AuditList({
  rows,
  compact = false,
}: {
  rows: AuditRowData[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full text-left ${compact ? "min-w-[420px]" : "min-w-[760px]"}`}
      >
        <thead>
          <tr>
            <th className={TH}>When</th>
            <th className={TH}>Action</th>
            {!compact && <th className={TH}>Admin</th>}
            {!compact && <th className={TH}>Entity</th>}
            <th className={`${TH} text-right`}>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const json = pretty(r.details);
            const isOpen = open === r.id;
            return (
              <Fragment key={r.id}>
                <tr>
                  <td
                    className={`${TD} whitespace-nowrap font-body-sm text-body-sm text-on-surface-variant`}
                  >
                    {r.when}
                  </td>
                  <td className={TD}>
                    <code className="px-2 py-0.5 rounded-lg bg-surface-container-low font-label-md text-label-md text-on-surface">
                      {r.action}
                    </code>
                    {compact && (
                      <span className="block mt-1 font-body-sm text-body-sm text-on-surface-variant">
                        {r.entityType}
                        {r.entityHref && (
                          <>
                            {" · "}
                            <Link
                              className="text-primary hover:underline"
                              href={r.entityHref}
                            >
                              Open
                            </Link>
                          </>
                        )}
                      </span>
                    )}
                  </td>
                  {!compact && (
                    <td className={TD}>
                      <Link
                        className="text-primary hover:underline"
                        href={r.actorHref}
                      >
                        {r.actorName}
                      </Link>
                    </td>
                  )}
                  {!compact && (
                    <td className={TD}>
                      <span className="flex flex-col">
                        <span className="font-label-lg text-label-lg">
                          {r.entityType}
                        </span>
                        {r.entityHref ? (
                          <Link
                            className="font-body-sm text-body-sm text-primary hover:underline truncate max-w-[200px]"
                            href={r.entityHref}
                          >
                            {r.entityId}
                          </Link>
                        ) : (
                          <span className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-[200px]">
                            {r.entityId}
                          </span>
                        )}
                      </span>
                    </td>
                  )}
                  <td className={`${TD} text-right`}>
                    {json ? (
                      <button
                        aria-controls={`audit-${r.id}`}
                        aria-expanded={isOpen}
                        className="inline-flex items-center gap-1 h-9 px-space-md rounded-full font-label-md text-label-md text-primary hover:bg-surface-container-low"
                        onClick={() => setOpen(isOpen ? null : r.id)}
                        type="button"
                      >
                        {isOpen ? "Hide" : "View"}
                        <span
                          className={`material-symbols-outlined text-base transition-transform ${isOpen ? "rotate-180" : ""}`}
                        >
                          expand_more
                        </span>
                      </button>
                    ) : (
                      <span className="font-body-sm text-body-sm text-outline">
                        —
                      </span>
                    )}
                  </td>
                </tr>
                {isOpen && json && (
                  <tr id={`audit-${r.id}`}>
                    <td
                      className="px-space-lg pb-space-md border-b border-[#EFE7DE]"
                      colSpan={compact ? 3 : 5}
                    >
                      <pre className="p-space-md rounded-xl bg-surface-container-low font-mono text-[13px] leading-relaxed text-on-surface overflow-x-auto whitespace-pre-wrap break-words">
                        {json}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
