import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/DashboardShell";
import { requireSitter } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUnreadCount } from "@/lib/messaging";

// Private area: also disallowed in robots.txt.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SitterLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireSitter();
  const [pending, unread, t] = await Promise.all([
    db.booking.count({ where: { sitterId: profile.id, status: "PENDING" } }),
    getUnreadCount(user.id),
    getTranslations("sitter.layout"),
  ]);
  return (
    <DashboardShell
      nav={[
        { href: "/sitter", label: t("nav.overview"), icon: "space_dashboard", exact: true },
        { href: "/sitter/bookings", label: t("nav.bookings"), icon: "event_available", badge: pending },
        { href: "/sitter/profile", label: t("nav.profile"), icon: "badge" },
        { href: "/sitter/services", label: t("nav.services"), icon: "payments" },
        { href: "/sitter/availability", label: t("nav.availability"), icon: "calendar_month" },
        { href: "/sitter/reviews", label: t("nav.reviews"), icon: "reviews" },
        { href: "/messages", label: t("nav.messages"), icon: "chat_bubble", badge: unread },
        { href: "/account/support", label: t("nav.support"), icon: "support_agent" },
      ]}
      subtitle={profile.status === "ACTIVE" ? t("accepting") : t("paused")}
      title={t("title")}
    >
      {children}
    </DashboardShell>
  );
}
