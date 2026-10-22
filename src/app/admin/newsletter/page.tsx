import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { BTN, Card, EmptyState, PageHeader, Pager, StatCard, StatusChip, TD, TH, Table, formatDateTime } from "@/components/ui";

export const metadata: Metadata = { title: "Newsletter" };

const PAGE_SIZE = 50;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const SOURCE_LABEL: Record<string, string> = { "coming-soon": "Coming soon page", footer: "Site footer" };

export default async function AdminNewsletterPage({ searchParams }: PageProps<"/admin/newsletter">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = ["active", "unsubscribed"].includes(one(sp.status)) ? one(sp.status) : "";
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  const where: Prisma.NewsletterSubscriberWhereInput = status === "active" ? { unsubscribedAt: null } : status === "unsubscribed" ? { unsubscribedAt: { not: null } } : {};

  const [total, rows, active, unsubscribed, fr] = await Promise.all([
    db.newsletterSubscriber.count({ where }),
    db.newsletterSubscriber.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    db.newsletterSubscriber.count({ where: { unsubscribedAt: { not: null } } }),
    db.newsletterSubscriber.count({ where: { unsubscribedAt: null, locale: "fr" } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (p > 1) qs.set("page", String(p));
    return `/admin/newsletter${qs.size ? `?${qs}` : ""}`;
  };
  const tabs = [
    { key: "", label: "All", count: active + unsubscribed },
    { key: "active", label: "Subscribed", count: active },
    { key: "unsubscribed", label: "Unsubscribed", count: unsubscribed },
  ];

  return (
    <>
      <PageHeader
        actions={
          <a className={BTN.secondary} download href="/admin/newsletter/export">
            <span className="material-symbols-outlined text-xl">download</span>
            Export CSV
          </a>
        }
        description="People who asked for WagStays news by email, with the CASL consent record (when, where, language and the exact wording)."
        eyebrow="Admin"
        title="Newsletter"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <StatCard icon="mark_email_read" label="Subscribed" value={active} />
        <StatCard hint={`${active - fr} English · ${fr} French`} icon="translate" label="By language" tone="tertiary" value={`${active ? Math.round((fr / active) * 100) : 0}% FR`} />
        <StatCard icon="unsubscribe" label="Unsubscribed" tone="secondary" value={unsubscribed} />
      </div>

      <nav aria-label="Subscriber status" className="-mx-margin-mobile md:mx-0 px-margin-mobile md:px-0 overflow-x-auto">
        <ul className="flex gap-space-xs w-max md:w-auto md:flex-wrap">
          {tabs.map((t) => {
            const isActive = t.key === status;
            return (
              <li key={t.key || "all"}>
                <a
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-space-xs h-10 px-space-md rounded-full font-label-lg text-label-lg whitespace-nowrap transition-colors ${
                    isActive ? "bg-primary text-on-primary" : "bg-surface-container-lowest border border-[#EFE7DE] text-on-surface hover:bg-surface-container-low"
                  }`}
                  href={t.key ? `/admin/newsletter?status=${t.key}` : "/admin/newsletter"}
                >
                  {t.label}
                  <span className={`min-w-6 h-6 px-1.5 rounded-full inline-flex items-center justify-center font-label-sm text-label-sm ${isActive ? "bg-on-primary/20" : "bg-surface-container-high text-on-surface-variant"}`}>
                    {t.count}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <Card className="p-space-sm">
        {rows.length === 0 ? (
          <EmptyState icon="mail" text="Sign-ups from the coming-soon page and the site footer will show up here." title="No subscribers yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={TH}>Email</th>
                <th className={TH}>Language</th>
                <th className={TH}>Source</th>
                <th className={TH}>Subscribed</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr className="hover:bg-surface-container-low/60" key={s.id}>
                  <td className={`${TD} whitespace-nowrap`} title={s.consentText ?? undefined}>
                    {s.email}
                  </td>
                  <td className={TD}>{s.locale === "fr" ? "French" : "English"}</td>
                  <td className={TD}>{s.source ? (SOURCE_LABEL[s.source] ?? s.source) : <span className="text-on-surface-variant">—</span>}</td>
                  <td className={`${TD} whitespace-nowrap`}>{formatDateTime(s.createdAt)}</td>
                  <td className={TD}>
                    {s.unsubscribedAt ? (
                      <span className="flex flex-col items-start gap-1">
                        <StatusChip tone="neutral">Unsubscribed</StatusChip>
                        <span className="font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">{formatDateTime(s.unsubscribedAt)}</span>
                      </span>
                    ) : (
                      <StatusChip tone="success">Subscribed</StatusChip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pager hrefFor={hrefFor} page={page} pageCount={pageCount} />
      </Card>
    </>
  );
}
