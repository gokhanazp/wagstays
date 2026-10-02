import type { Metadata } from "next";
import Link from "next/link";
import { DashboardNav } from "@/components/DashboardNav";
import { LogoMark, Wordmark } from "@/components/Logo";
import { logout } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · WagStays Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [applications, pendingBookings] = await Promise.all([
    db.sitterApplication.count({ where: { status: { in: ["IN_REVIEW", "MEET_GREET"] } } }),
    db.booking.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="lg:sticky lg:top-0 lg:h-screen bg-surface-container-low border-b lg:border-b-0 lg:border-r border-[#EFE7DE] flex flex-col gap-space-lg p-space-md lg:p-space-lg">
        <div className="flex items-center justify-between">
          <Link className="flex items-center gap-space-sm" href="/admin">
            <LogoMark className="w-9 h-9" />
            <span className="flex flex-col leading-none">
              <Wordmark className="!text-[19px]" />
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mt-1">Admin</span>
            </span>
          </Link>
          <Link className="lg:hidden font-label-md text-label-md text-primary" href="/">
            View site
          </Link>
        </div>
        <DashboardNav
          items={[
            { href: "/admin", label: "Dashboard", icon: "space_dashboard", exact: true },
            { href: "/admin/applications", label: "Applications", icon: "assignment_ind", badge: applications },
            { href: "/admin/sitters", label: "Sitters", icon: "volunteer_activism" },
            { href: "/admin/bookings", label: "Bookings", icon: "event_note", badge: pendingBookings },
            { href: "/admin/users", label: "Users", icon: "group" },
            { href: "/admin/reviews", label: "Reviews", icon: "reviews" },
            { href: "/admin/cities", label: "Cities", icon: "location_city" },
            { href: "/admin/settings", label: "Platform Settings", icon: "tune" },
            { href: "/admin/audit", label: "Audit Log", icon: "history" },
          ]}
        />
        <div className="hidden lg:flex mt-auto flex-col gap-space-sm p-space-md rounded-2xl bg-surface-container">
          <span className="font-label-lg text-label-lg text-on-surface truncate">
            {admin.firstName} {admin.lastName}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{admin.email}</span>
          <div className="flex items-center gap-space-sm pt-space-xs">
            <Link className="font-label-md text-label-md text-primary hover:underline" href="/">
              View site
            </Link>
            <span className="text-outline-variant">·</span>
            <form action={logout}>
              <button className="font-label-md text-label-md text-secondary hover:underline" type="submit">
                Log out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-margin-mobile md:px-margin py-space-xl flex flex-col gap-space-lg max-w-[1280px] w-full">{children}</main>
    </div>
  );
}
