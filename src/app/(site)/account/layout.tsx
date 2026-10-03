import type { Metadata } from "next";
import { DashboardShell } from "@/components/DashboardShell";
import { requireUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messaging";

// Private area: also disallowed in robots.txt.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await getUnreadCount(user.id);
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
      {children}
    </DashboardShell>
  );
}
