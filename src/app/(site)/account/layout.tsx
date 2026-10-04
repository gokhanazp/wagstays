import type { Metadata } from "next";
import { DashboardShell } from "@/components/DashboardShell";
import { requireUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messaging";
import { getOwnerReadiness } from "@/lib/owner-readiness";

// Private area: also disallowed in robots.txt.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [unread, readiness] = await Promise.all([getUnreadCount(user.id), getOwnerReadiness(user.id)]);
  const pendingApproval = readiness.steps.some((s) => s.key === "approval" && s.status === "PENDING");
  return (
    <DashboardShell
      nav={[
        { href: "/account/bookings", label: "My Bookings", icon: "event_note" },
        { href: "/account/pets", label: "My Pets", icon: "pets" },
        { href: "/favourites", label: "Favourites", icon: "favorite" },
        { href: "/messages", label: "Messages", icon: "chat_bubble", badge: unread },
        { href: "/account/wagpoints", label: "WagPoints", icon: "toll" },
        { href: "/account/settings", label: "Account Settings", icon: "manage_accounts" },
        { href: "/account/support", label: "Help & Support", icon: "support_agent" },
      ]}
      subtitle={user.email}
      title={`${user.firstName} ${user.lastName}`}
    >
      {pendingApproval && (
        <div className="flex items-start gap-space-sm p-space-md rounded-2xl bg-tertiary-fixed/60 text-on-tertiary-fixed-variant" role="status">
          <span className="material-symbols-outlined text-xl shrink-0">hourglass_top</span>
          <p className="font-body-md text-body-md">
            <strong className="font-semibold">Your account is being reviewed</strong> — usually within a few hours. You can browse sitters and set up your pets in the
            meantime; we&apos;ll let you know as soon as you can book.
          </p>
        </div>
      )}
      {children}
    </DashboardShell>
  );
}
