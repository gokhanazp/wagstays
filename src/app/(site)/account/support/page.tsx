import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/settings";
import { ACTIVE_TICKET_STATUSES, categoryLabel, statusLabel } from "@/lib/support";
import { BTN, Card, EmptyState, PageHeader, StatusChip, formatDate } from "@/components/ui";

export const metadata: Metadata = { title: "Help & Support | WagStays" };

export default async function SupportListPage() {
  const user = await requireUser();
  const [tickets, settings] = await Promise.all([
    db.supportTicket.findMany({
      where: { openedById: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        reference: true,
        subject: true,
        category: true,
        status: true,
        updatedAt: true,
      },
    }),
    getPlatformSettings(),
  ]);
  const active = tickets.filter((t) => (ACTIVE_TICKET_STATUSES as string[]).includes(t.status));
  const past = tickets.filter((t) => !(ACTIVE_TICKET_STATUSES as string[]).includes(t.status));

  return (
    <>
      <PageHeader
        actions={
          <Link className={BTN.primary} href="/account/support/new">
            <span className="material-symbols-outlined text-xl">add</span>
            New request
          </Link>
        }
        description="Questions about a booking, a payment or your account? Our Toronto team usually replies within a few hours."
        eyebrow="Help & Support"
        title="Support requests"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
        <a className="flex items-center gap-space-md p-space-md rounded-2xl bg-error-container/60 text-on-error-container hover:brightness-[0.98] transition-all" href={`tel:${settings.supportPhone.replace(/[^\d+]/g, "")}`}>
          <span className="w-11 h-11 shrink-0 rounded-xl bg-error-container flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">emergency</span>
          </span>
          <span className="flex flex-col min-w-0">
            <span className="font-label-lg text-label-lg">Pet emergency? Call 24/7</span>
            <span className="font-body-md text-body-md font-semibold">{settings.supportPhone}</span>
          </span>
        </a>
        <a className="flex items-center gap-space-md p-space-md rounded-2xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-all" href={`mailto:${settings.supportEmail}`}>
          <span className="w-11 h-11 shrink-0 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">mail</span>
          </span>
          <span className="flex flex-col min-w-0">
            <span className="font-label-lg text-label-lg">Prefer email?</span>
            <span className="font-body-md text-body-md text-on-surface-variant truncate">{settings.supportEmail}</span>
          </span>
        </a>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <EmptyState
            action={
              <Link className={`${BTN.sage} mt-space-sm`} href="/account/support/new">
                Contact support
              </Link>
            }
            icon="support_agent"
            text="If something isn't right with a booking, a payment or your account, send us a request and we'll take it from there."
            title="No support requests yet"
          />
        </Card>
      ) : (
        <>
          <TicketSection empty="Nothing open right now." tickets={active} title="Open requests" />
          {past.length > 0 && <TicketSection tickets={past} title="Resolved & closed" />}
        </>
      )}
    </>
  );
}

type Row = { id: string; reference: string; subject: string; category: string; status: string; updatedAt: Date };

function TicketSection({ title, tickets, empty }: { title: string; tickets: Row[]; empty?: string }) {
  return (
    <section className="flex flex-col gap-space-sm">
      <h2 className="font-title-md text-title-md text-on-surface">{title}</h2>
      {tickets.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-space-sm">
          {tickets.map((t) => {
            const st = statusLabel(t.status);
            const cat = categoryLabel(t.category);
            return (
              <li key={t.id}>
                <Link
                  className="flex items-start sm:items-center gap-space-md p-space-md rounded-2xl bg-surface-container-lowest border border-[#EFE7DE] shadow-[0_4px_16px_-2px_rgba(83,72,62,0.05)] hover:border-primary-container/40 transition-all"
                  href={`/account/support/${t.id}`}
                >
                  <span className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${t.category === "SAFETY" ? "bg-error-container text-on-error-container" : "bg-surface-container-low text-primary"}`}>
                    <span className="material-symbols-outlined text-xl">{cat.icon}</span>
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="font-label-lg text-label-lg text-on-surface truncate">{t.subject}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {t.reference} · {cat.label} · Updated {formatDate(t.updatedAt)}
                    </span>
                    <span className="sm:hidden pt-1">
                      <StatusChip icon={st.icon} tone={st.tone}>
                        {st.label}
                      </StatusChip>
                    </span>
                  </span>
                  <span className="hidden sm:inline-flex">
                    <StatusChip icon={st.icon} tone={st.tone}>
                      {st.label}
                    </StatusChip>
                  </span>
                  <span className="material-symbols-outlined text-outline self-center">chevron_right</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
