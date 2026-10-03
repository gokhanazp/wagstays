import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { Select } from "@/components/forms/Select";
import { ROLE_LABEL, ROLE_TONE } from "./_components/roles";
import { BTN, Card, EmptyState, INPUT, PageHeader, Pager, StatusChip, TD, TH, Table, formatDate } from "@/components/ui";

export const metadata: Metadata = { title: "Users" };

const PAGE_SIZE = 20;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";


export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const role = (ROLES as readonly string[]).includes(one(sp.role)) ? one(sp.role) : "";
  const status = ["active", "suspended"].includes(one(sp.status)) ? one(sp.status) : "";
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const terms = q.split(/\s+/).filter(Boolean);
  const where: Prisma.UserWhereInput = {
    ...(role && { role }),
    ...(status && { suspended: status === "suspended" }),
    ...(terms.length && {
      AND: terms.map((t) => ({ OR: [{ email: { contains: t, mode: "insensitive" } }, { firstName: { contains: t, mode: "insensitive" } }, { lastName: { contains: t, mode: "insensitive" } }] })),
    }),
  };

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        suspended: true,
        deletedAt: true,
        wagPointsCents: true,
        createdAt: true,
        avatarUrl: true,
        sitter: { select: { id: true } },
        _count: { select: { pets: true, bookings: true } },
      },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (role) qs.set("role", role);
    if (status) qs.set("status", status);
    if (p > 1) qs.set("page", String(p));
    return `/admin/users${qs.size ? `?${qs}` : ""}`;
  };
  const filtered = !!(q || role || status);

  return (
    <>
      <PageHeader description="Find any account, change roles, suspend access or adjust WagPoints." eyebrow="Admin" title="Users" />
      <Card className="p-space-md">
        <form className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px_auto] gap-space-sm items-end" role="search">
          <label className="flex flex-col gap-space-xs">
            <span className="sr-only">Search by name or email</span>
            <span className="relative">
              <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
              <input className={`${INPUT} pl-11`} defaultValue={q} name="q" placeholder="Search name or email" type="search" />
            </span>
          </label>
          <label>
            <span className="sr-only">Role</span>
            <Select
              aria-label="Role"
              defaultValue={role}
              name="role"
              options={[{ value: "", label: "All roles" }, ...ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))]}
            />
          </label>
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
              <Link className={BTN.ghost} href="/admin/users">
                Clear
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-space-sm">
        <div className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
          {total} user{total === 1 ? "" : "s"}
          {filtered ? " match your filters" : ""}
        </div>
        {users.length === 0 ? (
          <EmptyState icon="person_search" text="Try a different name, email or filter." title="No users found" />
        ) : (
          <Table>
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
                        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={TD}>
                    <StatusChip tone={ROLE_TONE[u.role as keyof typeof ROLE_TONE] ?? "neutral"}>{ROLE_LABEL[u.role] ?? u.role}</StatusChip>
                  </td>
                  <td className={TD}>
                    {u.deletedAt ? (
                      <StatusChip icon="person_off" tone="neutral">
                        Deleted
                      </StatusChip>
                    ) : u.suspended ? (
                      <StatusChip icon="block" tone="danger">
                        Suspended
                      </StatusChip>
                    ) : (
                      <StatusChip tone="success">Active</StatusChip>
                    )}
                  </td>
                  <td className={`${TD} text-right`}>{u._count.pets}</td>
                  <td className={`${TD} text-right`}>{u._count.bookings}</td>
                  <td className={`${TD} whitespace-nowrap`}>{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pager hrefFor={hrefFor} page={Math.min(page, pageCount)} pageCount={pageCount} />
      </Card>
    </>
  );
}
