import { DashboardShell } from "@/components/DashboardShell";
import { requireSitter } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUnreadCount } from "@/lib/messaging";

export default async function SitterLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireSitter();
  const [pending, unread] = await Promise.all([
    db.booking.count({ where: { sitterId: profile.id, status: "PENDING" } }),
    getUnreadCount(user.id),
  ]);
  return (
    <DashboardShell
      nav={[
        { href: "/sitter", label: "Overview", icon: "space_dashboard", exact: true },
        { href: "/sitter/bookings", label: "Requests & Bookings", icon: "event_available", badge: pending },
        { href: "/sitter/profile", label: "My Profile", icon: "badge" },
        { href: "/sitter/services", label: "Services & Rates", icon: "payments" },
        { href: "/messages", label: "Messages", icon: "chat_bubble", badge: unread },
      ]}
      subtitle={profile.status === "ACTIVE" ? "Accepting bookings" : "Bookings paused"}
      title="Sitter Dashboard"
    >
      {children}
    </DashboardShell>
  );
}
