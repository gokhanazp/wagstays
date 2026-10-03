import "server-only";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { pointsReason } from "@/lib/points-labels";
import { formatDateTime } from "@/components/ui";

/** Admin user page: referral info + the last 20 WagPoints ledger entries. Rendered inside the WagPoints card. */
export async function WagPointsLedger({ userId }: { userId: string }) {
  const [user, entries] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referredBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { referrals: true } },
      },
    }),
    db.wagPointsEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  if (!user) return null;

  return (
    <>
      <dl className="px-space-lg grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <div className="flex flex-col min-w-0">
          <dt className="font-label-md text-label-md text-on-surface-variant">Referral code</dt>
          <dd className="font-body-md text-body-md text-on-surface font-mono tracking-wider">{user.referralCode ?? "—"}</dd>
        </div>
        <div className="flex flex-col min-w-0">
          <dt className="font-label-md text-label-md text-on-surface-variant">Referred by</dt>
          <dd className="font-body-md text-body-md text-on-surface truncate">
            {user.referredBy ? (
              <Link className="text-primary hover:underline" href={`/admin/users/${user.referredBy.id}`}>
                {user.referredBy.firstName} {user.referredBy.lastName}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="flex flex-col min-w-0">
          <dt className="font-label-md text-label-md text-on-surface-variant">Friends referred</dt>
          <dd className="font-body-md text-body-md text-on-surface">{user._count.referrals}</dd>
        </div>
      </dl>
      <div className="px-space-lg flex flex-col gap-space-xs">
        <span className="font-label-md text-label-md uppercase tracking-wide text-on-surface-variant">Ledger (last 20)</span>
        {entries.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">No WagPoints activity yet.</p>
        ) : (
          <ul className="flex flex-col rounded-xl border border-[#EFE7DE] divide-y divide-[#EFE7DE] max-h-96 overflow-y-auto">
            {entries.map((e) => {
              const r = pointsReason(e.reason);
              return (
                <li className="flex items-center gap-space-sm px-space-sm py-space-xs" key={e.id}>
                  <span className="material-symbols-outlined text-lg text-primary shrink-0">{r.icon}</span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface truncate">
                      {r.label}
                      {e.note ? <span className="font-normal text-on-surface-variant"> · {e.note}</span> : null}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {formatDateTime(e.createdAt)}
                      {e.bookingId && (
                        <>
                          {" · "}
                          <Link className="text-primary hover:underline" href={`/admin/bookings/${e.bookingId}`}>
                            Booking
                          </Link>
                        </>
                      )}
                    </span>
                  </span>
                  <span className={`font-label-lg text-label-lg whitespace-nowrap ${e.amountCents >= 0 ? "text-primary" : "text-secondary"}`}>
                    {e.amountCents >= 0 ? "+" : "−"}
                    {formatMoney(Math.abs(e.amountCents), { exact: true })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
