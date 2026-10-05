import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { DashboardShell } from "@/components/DashboardShell";
import { requireUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messaging";
import { getOwnerReadiness } from "@/lib/owner-readiness";

// Private area: also disallowed in robots.txt.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const locale = await getLocale();
  const [unread, readiness, t, tNav] = await Promise.all([
    getUnreadCount(user.id),
    getOwnerReadiness(user.id, locale),
    getTranslations("account.layout"),
    getTranslations("common.nav"),
  ]);
  const pendingApproval = readiness.steps.some((s) => s.key === "approval" && s.status === "PENDING");
  return (
    <DashboardShell
      nav={[
        { href: "/account/bookings", label: tNav("myBookings"), icon: "event_note" },
        { href: "/account/pets", label: tNav("myPets"), icon: "pets" },
        { href: "/favourites", label: tNav("favourites"), icon: "favorite" },
        { href: "/messages", label: tNav("messages"), icon: "chat_bubble", badge: unread },
        { href: "/account/wagpoints", label: tNav("wagPoints"), icon: "toll" },
        { href: "/account/settings", label: tNav("accountSettings"), icon: "manage_accounts" },
        { href: "/account/support", label: tNav("helpSupport"), icon: "support_agent" },
      ]}
      subtitle={user.email}
      title={`${user.firstName} ${user.lastName}`}
    >
      {pendingApproval && (
        <div className="flex items-start gap-space-sm p-space-md rounded-2xl bg-tertiary-fixed/60 text-on-tertiary-fixed-variant" role="status">
          <span className="material-symbols-outlined text-xl shrink-0">hourglass_top</span>
          <p className="font-body-md text-body-md">{t.rich("pendingApproval", { b: (c) => <strong className="font-semibold">{c}</strong> })}</p>
        </div>
      )}
      {children}
    </DashboardShell>
  );
}
