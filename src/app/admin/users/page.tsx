import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { getPlatformSettings } from "@/lib/settings";
import { isValidNaPhone } from "@/lib/phone";
import { approveUser } from "@/app/actions/admin-approval";
import { Select } from "@/components/forms/Select";
import { APPROVAL_LABEL, ROLE_LABEL, ROLE_TONE } from "./_components/roles";
import { ConfirmButton } from "../_components/ConfirmButton";
import { BTN, Card, EmptyState, INPUT, PageHeader, Pager, StatusChip, TD, TH, Table, formatDate } from "@/components/ui";

export const metadata: Metadata = { title: "Users" };

const PAGE_SIZE = 20;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const TABS = [
  { key: "owners", label: "Pet Parents", icon: "pets" },
  { key: "sitters", label: "Sitters", icon: "volunteer_activism" },
  { key: "admins", label: "Admins", icon: "admin_panel_settings" },
  { key: "pending", label: "Pending approval", icon: "hourglass_top" },
  { key: "all", label: "All", icon: "group" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
const ROLE_TAB: Record<string, TabKey> = { OWNER: "owners", SITTER: "sitters", ADMIN: "admins" };

/** Pet parents who can't book yet: no phone on file or no (non-archived) pet. */
const NOT_READY: Prisma.UserWhereInput = { OR: [{ phone: null }, { phone: "" }, { pets: { none: { archivedAt: null } } }] };
const READY: Prisma.UserWhereInput = { AND: [{ phone: { not: null } }, { phone: { not: "" } }, { pets: { some: { archivedAt: null } } }] };

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  suspended: true,
  deletedAt: true,
  approvalStatus: true,
  createdAt: true,
  avatarUrl: true,
  sitter: { select: { id: true, status: true, rating: true, reviewCount: true, completedBookings: true } },
  _count: { select: { pets: { where: { archivedAt: null } }, bookings: true } },
} satisfies Prisma.UserSelect;
type Row = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function UserCell({ u }: { u: Row }) {
  return (
    <Link className="flex items-center gap-space-sm group" href={`/admin/users/${u.id}`}>
      <span className="w-9 h-9 shrink-0 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-label-md text-label-md overflow-hidden">
        {u.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="w-full h-full object-cover" src={u.avatarUrl} />
        ) : (
          `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`
        )}
      </span>
      <span className="flex flex-col min-w-0">
        <span className="font-label-lg text-label-lg group-hover:text-primary">
          {u.firstName} {u.lastName}
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-[260px]">{u.email}</span>
      </span>
    </Link>
  );
}

function StatusChips({ u }: { u: Row }) {
  const approval = u.approvalStatus !== "APPROVED" ? APPROVAL_LABEL[u.approvalStatus] : null;
  return (
    <span className="flex flex-wrap gap-1">
      {u.deletedAt ? (
        <StatusChip icon="person_off" tone="neutral">
          Deleted
        </StatusChip>
      ) : u.suspended ? (
        <StatusChip icon="block" tone="danger">
          Suspended
        </StatusChip>
      ) : approval ? null : (
        <StatusChip tone="success">Active</StatusChip>
      )}
      {approval && !u.deletedAt && (
        <StatusChip icon={approval.icon} tone={approval.tone}>
          {approval.label}
        </StatusChip>
      )}
    </span>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span aria-label={label} className={`material-symbols-outlined text-xl ${ok ? "text-primary" : "text-error"}`} title={label}>
      {ok ? "check_circle" : "cancel"}
    </span>
  );
}

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const roleParam = (ROLES as readonly string[]).includes(one(sp.role)) ? one(sp.role) : "";
  // Old links (?role=SITTER) land on the matching tab.
  const tabParam = one(sp.tab);
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : roleParam ? ROLE_TAB[roleParam] : "owners";
  const role = tab === "all" ? roleParam : "";
  const status = ["active", "suspended"].includes(one(sp.status)) ? one(sp.status) : "";
  const ready = tab === "owners" && ["yes", "no"].includes(one(sp.ready)) ? one(sp.ready) : "";
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const terms = q.split(/\s+/).filter(Boolean);
  const tabWhere: Prisma.UserWhereInput =
    tab === "owners"
      ? { role: "OWNER" }
      : tab === "sitters"
        ? { role: "SITTER" }
        : tab === "admins"
          ? { role: "ADMIN" }
          : tab === "pending"
            ? { approvalStatus: "PENDING", deletedAt: null }
            : role
              ? { role }
              : {};
  const where: Prisma.UserWhereInput = {
    AND: [
      tabWhere,
      status ? { suspended: status === "suspended" } : {},
      ready === "no" ? { deletedAt: null, ...NOT_READY } : ready === "yes" ? READY : {},
      ...terms.map((t) => ({
        OR: [{ email: { contains: t, mode: "insensitive" as const } }, { firstName: { contains: t, mode: "insensitive" as const } }, { lastName: { contains: t, mode: "insensitive" as const } }],
      })),
    ],
  };

  const [total, users, counts, settings] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: userSelect }),
    Promise.all([
      db.user.count({ where: { role: "OWNER" } }),
      db.user.count({ where: { role: "SITTER" } }),
      db.user.count({ where: { role: "ADMIN" } }),
      db.user.count({ where: { approvalStatus: "PENDING", deletedAt: null } }),
      db.user.count(),
    ]),
    getPlatformSettings(),
  ]);
  const [owners, sitters, admins, pending, all] = counts;
  const tabCount: Record<TabKey, number> = { owners, sitters, admins, pending, all };
  const showPending = pending > 0 || settings.requireOwnerApproval || tab === "pending";

  const ownerRatings =
    tab === "owners" || tab === "pending"
      ? new Map(
          (
            await db.ownerReview.groupBy({
              by: ["ownerId"],
              where: { ownerId: { in: users.map((u) => u.id) }, hidden: false },
              _avg: { rating: true },
              _count: { _all: true },
            })
          ).map((r) => [r.ownerId, { avg: r._avg.rating, count: r._count._all }]),
        )
      : new Map<string, { avg: number | null; count: number }>();

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    if (tab !== "owners") qs.set("tab", tab);
    if (q) qs.set("q", q);
    if (role) qs.set("role", role);
    if (status) qs.set("status", status);
    if (ready) qs.set("ready", ready);
    if (p > 1) qs.set("page", String(p));
    return `/admin/users${qs.size ? `?${qs}` : ""}`;
  };
  const tabHref = (k: TabKey) => (k === "owners" ? "/admin/users" : `/admin/users?tab=${k}`);
  const filtered = !!(q || role || status || ready);
  const noun = tab === "owners" ? "pet parent" : tab === "sitters" ? "sitter" : tab === "admins" ? "admin" : tab === "pending" ? "account awaiting approval" : "user";
  const plural = tab === "pending" ? "accounts awaiting approval" : `${noun}s`;

  return (
    <>
      <PageHeader description="Pet parents and sitters at a glance — find an account, approve new pet parents, change roles or suspend access." eyebrow="Admin" title="Users" />

      <nav aria-label="User groups" className="-mx-margin-mobile md:mx-0 px-margin-mobile md:px-0 overflow-x-auto">
        <ul className="flex gap-space-xs w-max md:w-auto md:flex-wrap">
          {TABS.filter((t) => t.key !== "pending" || showPending).map((t) => {
            const active = t.key === tab;
            return (
              <li key={t.key}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-space-xs h-10 px-space-md rounded-full font-label-lg text-label-lg whitespace-nowrap transition-colors ${
                    active ? "bg-primary text-on-primary" : "bg-surface-container-lowest border border-[#EFE7DE] text-on-surface hover:bg-surface-container-low"
                  }`}
                  href={tabHref(t.key)}
                >
                  <span className="material-symbols-outlined text-lg">{t.icon}</span>
                  {t.label}
                  <span
                    className={`min-w-6 h-6 px-1.5 rounded-full inline-flex items-center justify-center font-label-sm text-label-sm ${
                      t.key === "pending" && tabCount.pending > 0 ? "bg-secondary text-on-secondary" : active ? "bg-on-primary/20" : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {tabCount[t.key]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Card className="p-space-md">
        <form
          className={`grid grid-cols-1 gap-space-sm items-end ${tab === "all" || tab === "owners" ? "md:grid-cols-[1fr_200px_200px_auto]" : "md:grid-cols-[1fr_200px_auto]"}`}
          role="search"
        >
          {tab !== "owners" && <input name="tab" type="hidden" value={tab} />}
          <label className="flex flex-col gap-space-xs">
            <span className="sr-only">Search by name or email</span>
            <span className="relative">
              <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
              <input className={`${INPUT} pl-11`} defaultValue={q} name="q" placeholder="Search name or email" type="search" />
            </span>
          </label>
          {tab === "all" && (
            <label>
              <span className="sr-only">Role</span>
              <Select
                aria-label="Role"
                defaultValue={role}
                name="role"
                options={[{ value: "", label: "All roles" }, ...ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))]}
              />
            </label>
          )}
          {tab === "owners" && (
            <label>
              <span className="sr-only">Ready to book</span>
              <Select
                aria-label="Ready to book"
                defaultValue={ready}
                name="ready"
                options={[
                  { value: "", label: "Any profile" },
                  { value: "yes", label: "Ready to book", icon: "check_circle" },
                  { value: "no", label: "Not ready (no phone / pet)", icon: "pending" },
                ]}
              />
            </label>
          )}
          <label>
            <span className="sr-only">Account status</span>
            <Select
              aria-label="Account status"
              defaultValue={status}
              name="status"
              options={[
                { value: "", label: "Any status" },
                { value: "active", label: "Active", icon: "check_circle" },
                { value: "suspended", label: "Suspended", icon: "block" },
              ]}
            />
          </label>
          <div className="flex gap-space-xs">
            <button className={BTN.sage} type="submit">
              Filter
            </button>
            {filtered && (
              <Link className={BTN.ghost} href={tabHref(tab)}>
                Clear
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-space-sm">
        <div className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
          {total} {total === 1 ? noun : plural}
          {filtered ? " match your filters" : ""}
          {tab === "pending" && !settings.requireOwnerApproval && " · manual approval is currently off in Platform Settings"}
        </div>
        {users.length === 0 ? (
          tab === "pending" ? (
            <EmptyState icon="task_alt" text="New pet parents waiting for approval will show up here." title="You're all caught up" />
          ) : (
            <EmptyState icon="person_search" text="Try a different name, email or filter." title="No users found" />
          )
        ) : (
          <Table>
            {tab === "owners" ? (
              <>
                <thead>
                  <tr>
                    <th className={TH}>Pet parent</th>
                    <th className={`${TH} text-center`}>Phone</th>
                    <th className={`${TH} text-right`}>Pets</th>
                    <th className={`${TH} text-right`}>Bookings</th>
                    <th className={TH}>Rating</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const r = ownerRatings.get(u.id);
                    const phoneOk = isValidNaPhone(u.phone);
                    return (
                      <tr key={u.id} className="hover:bg-surface-container-low/60">
                        <td className={TD}>
                          <UserCell u={u} />
                        </td>
                        <td className={`${TD} text-center`}>
                          <Check label={phoneOk ? `Phone: ${u.phone}` : u.phone ? `Invalid phone: ${u.phone}` : "No phone"} ok={phoneOk} />
                        </td>
                        <td className={`${TD} text-right ${u._count.pets === 0 ? "text-error" : ""}`}>{u._count.pets}</td>
                        <td className={`${TD} text-right`}>{u._count.bookings}</td>
                        <td className={`${TD} whitespace-nowrap`}>
                          {r?.avg != null ? (
                            <span>
                              ★ {r.avg.toFixed(1)} <span className="text-on-surface-variant">({r.count})</span>
                            </span>
                          ) : (
                            <span className="text-on-surface-variant">—</span>
                          )}
                        </td>
                        <td className={TD}>
                          <StatusChips u={u} />
                        </td>
                        <td className={`${TD} whitespace-nowrap`}>{formatDate(u.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            ) : tab === "sitters" ? (
              <>
                <thead>
                  <tr>
                    <th className={TH}>Sitter</th>
                    <th className={TH}>Profile</th>
                    <th className={TH}>Rating</th>
                    <th className={`${TH} text-right`}>Completed</th>
                    <th className={TH}>Account</th>
                    <th className={TH}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-container-low/60">
                      <td className={TD}>
                        <UserCell u={u} />
                      </td>
                      <td className={TD}>
                        {u.sitter ? (
                          <Link className="inline-flex" href={`/admin/sitters/${u.sitter.id}`}>
                            <StatusChip icon={u.sitter.status === "ACTIVE" ? "check_circle" : "pause_circle"} tone={u.sitter.status === "ACTIVE" ? "success" : "warning"}>
                              {u.sitter.status === "ACTIVE" ? "Active" : "Paused"}
                            </StatusChip>
                          </Link>
                        ) : (
                          <span className="font-body-sm text-body-sm text-on-surface-variant">No profile yet</span>
                        )}
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>
                        {u.sitter && u.sitter.reviewCount > 0 ? (
                          <span>
                            ★ {u.sitter.rating.toFixed(2)} <span className="text-on-surface-variant">({u.sitter.reviewCount})</span>
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className={`${TD} text-right`}>{u.sitter?.completedBookings ?? 0}</td>
                      <td className={TD}>
                        <StatusChips u={u} />
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : tab === "pending" ? (
              <>
                <thead>
                  <tr>
                    <th className={TH}>Account</th>
                    <th className={`${TH} text-center`}>Phone</th>
                    <th className={`${TH} text-right`}>Pets</th>
                    <th className={TH}>Signed up</th>
                    <th className={`${TH} text-right`}>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-container-low/60">
                      <td className={TD}>
                        <UserCell u={u} />
                      </td>
                      <td className={`${TD} text-center`}>
                        <Check label={u.phone ? `Phone: ${u.phone}` : "No phone"} ok={isValidNaPhone(u.phone)} />
                      </td>
                      <td className={`${TD} text-right`}>{u._count.pets}</td>
                      <td className={`${TD} whitespace-nowrap`}>{formatDate(u.createdAt)}</td>
                      <td className={TD}>
                        <span className="flex justify-end gap-space-xs">
                          <ConfirmButton
                            action={approveUser.bind(null, u.id)}
                            className={`${BTN.small} bg-primary text-on-primary hover:bg-primary-container`}
                            confirm={{
                              title: `Approve ${u.firstName} ${u.lastName}?`,
                              body: "They'll be able to book sitters straight away (once their phone and pet are added).",
                              confirmLabel: "Approve",
                            }}
                            icon="how_to_reg"
                            label="Approve"
                          />
                          <Link className={`${BTN.small} bg-error-container text-on-error-container hover:brightness-95`} href={`/admin/users/${u.id}#approval`}>
                            Reject…
                          </Link>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th className={TH}>User</th>
                    <th className={TH}>Role</th>
                    <th className={TH}>Status</th>
                    <th className={`${TH} text-right`}>Pets</th>
                    <th className={`${TH} text-right`}>Bookings</th>
                    <th className={TH}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-container-low/60">
                      <td className={TD}>
                        <UserCell u={u} />
                      </td>
                      <td className={TD}>
                        <StatusChip tone={ROLE_TONE[u.role as keyof typeof ROLE_TONE] ?? "neutral"}>{ROLE_LABEL[u.role] ?? u.role}</StatusChip>
                      </td>
                      <td className={TD}>
                        <StatusChips u={u} />
                      </td>
                      <td className={`${TD} text-right`}>{u._count.pets}</td>
                      <td className={`${TD} text-right`}>{u._count.bookings}</td>
                      <td className={`${TD} whitespace-nowrap`}>{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </Table>
        )}
        <Pager hrefFor={hrefFor} page={Math.min(page, pageCount)} pageCount={pageCount} />
      </Card>
    </>
  );
}
