import type { Metadata } from "next";
import { petKindLabel } from "@/lib/pets";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { BOOKING_STATUS_LABELS, SERVICE_LABELS, type BookingStatus, type ServiceType } from "@/lib/constants";
import { BTN, Card, CardHeader, EmptyState, PageHeader, StatusChip, TD, TH, Table, formatDate, formatDateTime } from "@/components/ui";
import { ConfirmButton } from "../../_components/ConfirmButton";
import { AuditList } from "../../_components/AuditList";
import { auditInclude, toAuditRows } from "../../_components/audit-rows";
import { setUserSuspended } from "@/app/actions/admin-core";
import { PasswordLink } from "../_components/PasswordLink";
import { RoleForm, WagPointsForm } from "../_components/UserControls";
import { ROLE_LABEL, ROLE_TONE } from "../_components/roles";

export const metadata: Metadata = { title: "User" };


export default async function UserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const admin = await requireAdmin();
  const user = await db.user.findUnique({
    where: { id },
    include: {
      pets: { orderBy: { createdAt: "asc" } },
      sitter: { select: { id: true, slug: true, displayName: true, status: true, rating: true, reviewCount: true, completedBookings: true, city: { select: { name: true } } } },
      bookings: {
        orderBy: { startAt: "desc" },
        take: 20,
        include: { sitter: { select: { displayName: true } }, service: { select: { type: true } }, pet: { select: { name: true } } },
      },
      _count: { select: { bookings: true, favorites: true, reviews: true } },
    },
  });
  if (!user) notFound();
  const [activeAdmins, logs] = await Promise.all([
    db.user.count({ where: { role: "ADMIN", suspended: false } }),
    db.auditLog.findMany({ where: { entityType: "User", entityId: user.id }, orderBy: { createdAt: "desc" }, take: 10, include: auditInclude }),
  ]);

  const isSelf = user.id === admin.id;
  const lastAdmin = user.role === "ADMIN" && !user.suspended && activeAdmins <= 1;
  const roleLocked = isSelf ? "You can't change your own role." : lastAdmin ? "This is the last active admin — promote someone else first." : undefined;
  const suspendLocked = isSelf ? "You can't suspend your own account." : lastAdmin && !user.suspended ? "The last active admin can't be suspended." : undefined;
  const name = `${user.firstName} ${user.lastName}`;

  return (
    <>
      <Link className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline w-fit" href="/admin/users">
        <span className="material-symbols-outlined text-base">arrow_back</span>All users
      </Link>
      <PageHeader
        actions={
          user.suspended ? (
            <ConfirmButton
              action={setUserSuspended.bind(null, user.id, false)}
              className={BTN.sage}
              confirm={{ title: `Reinstate ${name}?`, body: "They'll be able to sign in and use WagStays again straight away.", confirmLabel: "Unsuspend" }}
              icon="lock_open"
              label="Unsuspend account"
            />
          ) : (
            <ConfirmButton
              action={setUserSuspended.bind(null, user.id, true)}
              className={BTN.danger}
              confirm={{
                title: `Suspend ${name}?`,
                body: (
                  <>
                    They&apos;ll be signed out of every page and sent to a suspension notice with support contact details. Existing bookings are not cancelled
                    {user.sitter ? " — review their sitter profile and upcoming bookings separately" : ""}.
                  </>
                ),
                confirmLabel: "Suspend",
                danger: true,
              }}
              disabled={!!suspendLocked}
              disabledReason={suspendLocked}
              icon="block"
              label="Suspend account"
            />
          )
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-space-sm">
            <StatusChip tone={ROLE_TONE[user.role as keyof typeof ROLE_TONE] ?? "neutral"}>{ROLE_LABEL[user.role] ?? user.role}</StatusChip>
            {user.suspended ? (
              <StatusChip icon="block" tone="danger">
                Suspended
              </StatusChip>
            ) : (
              <StatusChip tone="success">Active</StatusChip>
            )}
            {isSelf && <StatusChip tone="primary">You</StatusChip>}
          </span>
        }
        eyebrow="Users"
        title={name}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-space-lg items-start">
        <Card className="flex flex-col gap-space-md pb-space-lg">
          <CardHeader icon="person" title="Profile" />
          <dl className="px-space-lg grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            {[
              ["Email", user.email],
              ["Phone", user.phone ?? "—"],
              ["Joined", formatDate(user.createdAt)],
              ["User ID", user.id],
              ["Bookings", String(user._count.bookings)],
              ["Favourites · Reviews", `${user._count.favorites} · ${user._count.reviews}`],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col min-w-0">
                <dt className="font-label-md text-label-md text-on-surface-variant">{k}</dt>
                <dd className="font-body-md text-body-md text-on-surface break-words">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="px-space-lg">
            <RoleForm locked={roleLocked} role={user.role} userId={user.id} />
          </div>
          <PasswordLink userId={user.id} />
          {user.sitter ? (
            <div className="mx-space-lg p-space-md rounded-xl bg-surface-container-low flex flex-wrap items-center justify-between gap-space-sm">
              <span className="flex flex-col">
                <span className="font-label-lg text-label-lg text-on-surface">{user.sitter.displayName}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {user.sitter.city.name} · {user.sitter.status === "ACTIVE" ? "Active" : "Paused"} · ★ {user.sitter.rating.toFixed(2)} ({user.sitter.reviewCount}) · {user.sitter.completedBookings} completed
                </span>
              </span>
              <span className="flex gap-space-xs">
                <Link className={`${BTN.small} bg-primary text-on-primary`} href={`/admin/sitters/${user.sitter.id}`}>
                  Sitter admin
                </Link>
                <Link className={`${BTN.small} hover:bg-surface-container text-primary`} href={`/sitters/${user.sitter.slug}`} target="_blank">
                  Public profile<span className="material-symbols-outlined text-base">open_in_new</span>
                </Link>
              </span>
            </div>
          ) : (
            user.role === "SITTER" && (
              <p className="mx-space-lg font-body-sm text-body-sm text-on-surface-variant">This user has the sitter role but no sitter profile yet.</p>
            )
          )}
        </Card>

        <Card className="flex flex-col gap-space-md pb-space-lg">
          <CardHeader icon="toll" title="WagPoints Wallet" />
          <div className="px-space-lg flex items-baseline gap-space-sm">
            <span className="font-headline-md text-headline-md text-on-surface">{formatMoney(user.wagPointsCents, { exact: true })}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">current balance</span>
          </div>
          <div className="px-space-lg">
            <WagPointsForm userId={user.id} />
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-space-md pb-space-sm">
        <CardHeader icon="pets" title={`Pets (${user.pets.length})`} />
        {user.pets.length === 0 ? (
          <EmptyState icon="pets" title="No pets added" />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm px-space-lg pb-space-md">
            {user.pets.map((p) => (
              <li key={p.id} className="flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container-low">
                <span className="w-12 h-12 shrink-0 rounded-xl bg-primary-fixed text-primary flex items-center justify-center overflow-hidden">
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="w-full h-full object-cover" src={p.photoUrl} />
                  ) : (
                    <span className="material-symbols-outlined">pets</span>
                  )}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-label-lg text-label-lg text-on-surface">{p.name}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    {[petKindLabel(p), p.breed, p.ageYears != null ? `${p.ageYears} yrs` : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-space-md pb-space-sm">
        <CardHeader icon="event_note" title={`Bookings as pet parent (${user._count.bookings})`} />
        {user.bookings.length === 0 ? (
          <EmptyState icon="event_busy" title="No bookings yet" />
        ) : (
          <div className="px-space-sm">
            <Table>
              <thead>
                <tr>
                  <th className={TH}>When</th>
                  <th className={TH}>Service</th>
                  <th className={TH}>Sitter</th>
                  <th className={TH}>Status</th>
                  <th className={`${TH} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {user.bookings.map((b) => {
                  const s = BOOKING_STATUS_LABELS[b.status as BookingStatus];
                  return (
                    <tr key={b.id}>
                      <td className={`${TD} whitespace-nowrap`}>
                        <Link className="text-primary hover:underline" href={`/admin/bookings/${b.id}`}>
                          {formatDateTime(b.startAt)}
                        </Link>
                      </td>
                      <td className={TD}>
                        {SERVICE_LABELS[b.service.type as ServiceType] ?? b.service.type}
                        <span className="text-on-surface-variant"> · {b.pet.name}</span>
                      </td>
                      <td className={TD}>{b.sitter.displayName}</td>
                      <td className={TD}>{s ? <StatusChip tone={s.tone}>{s.label}</StatusChip> : b.status}</td>
                      <td className={`${TD} text-right`}>{formatMoney(b.totalCents, { exact: true })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-space-md pb-space-sm">
        <CardHeader
          action={
            <Link className="font-label-md text-label-md text-primary hover:underline" href={`/admin/audit?entityType=User&entityId=${user.id}`}>
              Full history
            </Link>
          }
          icon="history"
          title="Admin history"
        />
        {logs.length === 0 ? <EmptyState icon="history" title="No admin changes to this account" /> : <AuditList compact rows={toAuditRows(logs)} />}
      </Card>
    </>
  );
}
