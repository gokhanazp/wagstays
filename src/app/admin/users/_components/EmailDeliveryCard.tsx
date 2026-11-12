import { Card, CardHeader, StatusChip, formatDateTime } from "@/components/ui";
import { adminConfirmEmail, adminResendConfirmation } from "@/app/actions/admin-email";
import { db } from "@/lib/db";
import { ConfirmButton } from "../../_components/ConfirmButton";

// Email status for one user: confirmation state, the latest delivery events from Resend (auth + app emails)
// and the two fixes for "never got the confirmation email".

const EVENT: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral"; icon: string }> = {
  "email.delivered": { label: "Delivered", tone: "success", icon: "mark_email_read" },
  "email.sent": { label: "Sent — waiting for their provider", tone: "neutral", icon: "send" },
  "email.delivery_delayed": { label: "Delayed by their provider", tone: "warning", icon: "schedule" },
  "email.bounced": { label: "Bounced", tone: "danger", icon: "error" },
  "email.complained": { label: "Marked as spam", tone: "danger", icon: "report" },
  "email.failed": { label: "Failed", tone: "danger", icon: "error" },
};

export async function EmailDeliveryCard({ user }: { user: { id: string; email: string; emailConfirmedAt: Date | null; createdAt: Date } }) {
  const events = await db.emailEvent.findMany({ where: { to: user.email.toLowerCase() }, orderBy: { occurredAt: "desc" }, take: 40 });
  // one row per email: its latest event
  const latest = new Map<string, (typeof events)[number]>();
  for (const e of events) if (!latest.has(e.providerId)) latest.set(e.providerId, e);
  const rows = [...latest.values()].slice(0, 8);
  const unconfirmed = !user.emailConfirmedAt;

  return (
    <Card className="flex flex-col gap-space-md pb-space-lg">
      <CardHeader icon="mail" title="Email & delivery" />
      <div className="px-space-lg flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm">
          {unconfirmed ? (
            <StatusChip icon="unsubscribe" tone="warning">
              Email not confirmed — signed up {formatDateTime(user.createdAt)}
            </StatusChip>
          ) : (
            <StatusChip icon="verified" tone="success">
              Confirmed {formatDateTime(user.emailConfirmedAt!)}
            </StatusChip>
          )}
        </div>
        {unconfirmed && (
          <>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              They can&apos;t log in until the address is confirmed. Ask them to check Junk/Spam first. If the mail never arrives (often Hotmail/Outlook with
              a new domain), resend it — or, once you&apos;re sure the address belongs to them, confirm it here.
            </p>
            <div className="flex flex-wrap gap-space-sm">
              <ConfirmButton action={adminResendConfirmation.bind(null, user.id)} icon="forward_to_inbox" label="Resend confirmation email" />
              <ConfirmButton
                action={adminConfirmEmail.bind(null, user.id)}
                confirm={{
                  title: "Confirm this email address?",
                  body: `Only do this if you've verified that ${user.email} belongs to this person (e.g. they contacted you from it). They'll be able to log in right away.`,
                  confirmLabel: "Confirm email",
                }}
                icon="verified"
                label="Confirm email manually"
              />
            </div>
          </>
        )}
        <div className="flex flex-col gap-space-xs">
          <span className="font-label-md text-label-md text-on-surface-variant">Recent emails to {user.email}</span>
          {rows.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">No delivery events recorded yet (tracking started Nov 13, 2026).</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#EFE7DE]">
              {rows.map((e) => {
                const ev = EVENT[e.type] ?? { label: e.type, tone: "neutral" as const, icon: "mail" };
                return (
                  <li className="py-space-xs flex flex-wrap items-center justify-between gap-x-space-md gap-y-1" key={e.id}>
                    <span className="flex flex-col min-w-0">
                      <span className="font-body-sm text-body-sm text-on-surface truncate">{e.subject ?? "(no subject)"}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {formatDateTime(e.occurredAt)}
                        {e.detail ? ` · ${e.detail}` : ""}
                      </span>
                    </span>
                    <StatusChip icon={ev.icon} tone={ev.tone}>
                      {ev.label}
                    </StatusChip>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
