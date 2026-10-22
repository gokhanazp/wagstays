import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";
import { renderEmail, type EmailContent } from "./layout";
import { oneClickUnsubscribeUrl, type UnsubscribeToken } from "./links";

// The one way the app sends email (transactional notifications via the Resend API).
// - Production (VERCEL_ENV=production, RESEND_API_KEY set): sends.
// - Anywhere else: writes the rendered email to .email-outbox/ (git-ignored) and logs status "dev" — nothing leaves
//   the machine unless EMAIL_DEV_SEND=1 (then only to addresses in EMAIL_DEV_ALLOW, comma-separated).
// - Demo/test domains (EMAIL_SUPPRESS_DOMAINS, default example.ca,wagstays.ca) are never emailed: those inboxes don't
//   exist and bounces hurt the sending domain's reputation.
// Every attempt is recorded in EmailLog (used for de-duplication: see wasSent()).

const FROM = process.env.EMAIL_FROM || "WagStays <no-reply@wagstays.ca>";
const REPLY_TO = process.env.EMAIL_REPLY_TO || undefined;

export type SendInput = EmailContent & {
  to: string;
  subject: string;
  /** stable kind for logs/dedupe, e.g. "booking.request" */
  kind: string;
  userId?: string | null;
  bookingId?: string | null;
  conversationId?: string | null;
  /** adds List-Unsubscribe headers (one-click) — for notification categories, never for account/security mail */
  unsubscribe?: UnsubscribeToken;
  /** Resend idempotency key (same key within 24h is sent once) */
  idempotencyKey?: string;
};

const suppressed = (to: string) => {
  const domains = (process.env.EMAIL_SUPPRESS_DOMAINS ?? "example.ca,wagstays.ca").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  const domain = to.split("@")[1]?.toLowerCase() ?? "";
  return domains.includes(domain);
};

function mode(to: string): "send" | "dev" {
  if (process.env.VERCEL_ENV === "production" && process.env.RESEND_API_KEY) return "send";
  if (process.env.EMAIL_DEV_SEND === "1" && process.env.RESEND_API_KEY) {
    const allow = (process.env.EMAIL_DEV_ALLOW ?? "").split(",").map((s) => s.trim().toLowerCase());
    if (allow.includes(to.toLowerCase())) return "send";
  }
  return "dev";
}

async function log(input: SendInput, status: string, extra: { providerId?: string; error?: string } = {}) {
  await db.emailLog
    .create({
      data: {
        userId: input.userId ?? null,
        to: input.to,
        kind: input.kind,
        bookingId: input.bookingId ?? null,
        conversationId: input.conversationId ?? null,
        status,
        providerId: extra.providerId ?? null,
        error: extra.error?.slice(0, 500) ?? null,
      },
    })
    .catch((e) => console.error("[email] log failed", e));
}

/** True if an email of this kind was already sent (or dev-logged) for the booking/user — for idempotent jobs. */
export async function wasSent(where: { kind: string; bookingId?: string; userId?: string; since?: Date }) {
  const hit = await db.emailLog.findFirst({
    where: {
      kind: where.kind,
      // production only trusts real sends: local dev shares the live database, and its "dev" rows (never delivered)
      // must not suppress a real email later
      status: { in: process.env.VERCEL_ENV === "production" ? ["sent"] : ["sent", "dev"] },
      ...(where.bookingId ? { bookingId: where.bookingId } : {}),
      ...(where.userId ? { userId: where.userId } : {}),
      ...(where.since ? { createdAt: { gte: where.since } } : {}),
    },
    select: { id: true },
  });
  return !!hit;
}

/** Renders and sends one email. Never throws — failures are logged (status "failed"). */
export async function sendEmail(input: SendInput): Promise<{ status: "sent" | "dev" | "skipped" | "failed" }> {
  if (!input.to || suppressed(input.to)) {
    await log(input, "skipped", { error: "suppressed domain" });
    return { status: "skipped" };
  }
  const { html, text } = renderEmail(input);
  const m = mode(input.to);
  if (m === "dev") {
    try {
      const dir = join(process.cwd(), ".email-outbox");
      mkdirSync(dir, { recursive: true });
      const file = `${new Date().toISOString().replace(/[:.]/g, "-")}_${input.kind}_${input.to.replace(/[^a-z0-9@.+-]/gi, "_")}.html`;
      writeFileSync(join(dir, file), html.replace("<title>", `<title>[${input.subject}] `));
    } catch {
      // read-only filesystem (e.g. preview deployments) — the log row is enough
    }
    console.info(`[email:dev] ${input.kind} → ${input.to}: ${input.subject}`);
    await log(input, "dev");
    return { status: "dev" };
  }
  try {
    const headers: Record<string, string> = {};
    if (input.unsubscribe) {
      headers["List-Unsubscribe"] = `<${oneClickUnsubscribeUrl(input.unsubscribe)}>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: FROM,
        to: [input.to],
        subject: input.subject,
        html,
        text,
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
        headers,
        tags: [{ name: "kind", value: input.kind.replace(/[^a-zA-Z0-9_-]/g, "_") }],
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      await log(input, "failed", { error: `${res.status} ${body.message ?? ""}` });
      return { status: "failed" };
    }
    await log(input, "sent", { providerId: body.id });
    return { status: "sent" };
  } catch (e) {
    await log(input, "failed", { error: (e as Error).message });
    return { status: "failed" };
  }
}
