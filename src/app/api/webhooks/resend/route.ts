import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

// Resend delivery webhook (Svix-signed). Stores sent / delivered / delayed / bounced / complained events so admins can
// see whether a user ever received their confirmation or notification emails. Secret: RESEND_WEBHOOK_SECRET (whsec_…).

const TRACKED = new Set(["email.sent", "email.delivered", "email.delivery_delayed", "email.bounced", "email.complained", "email.failed"]);

function verify(body: string, req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = req.headers.get("svix-id");
  const ts = req.headers.get("svix-timestamp");
  const sigs = req.headers.get("svix-signature");
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) return false; // replay window
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return sigs.split(" ").some((s) => {
    const [, b64] = s.split(",");
    const got = Buffer.from(b64 ?? "", "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

type Payload = {
  type: string;
  created_at?: string;
  data?: { email_id?: string; to?: string[]; subject?: string; created_at?: string; bounce?: { message?: string; type?: string; subType?: string }; failed?: { reason?: string } };
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!verify(body, req)) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  const p = JSON.parse(body) as Payload;
  if (!TRACKED.has(p.type) || !p.data?.email_id) return NextResponse.json({ ok: true, ignored: true });
  const occurredAt = new Date(p.created_at ?? p.data.created_at ?? Date.now());
  const detail = p.data.bounce ? [p.data.bounce.type, p.data.bounce.subType, p.data.bounce.message].filter(Boolean).join(" · ") : (p.data.failed?.reason ?? null);
  await db.emailEvent.createMany({
    data: (p.data.to ?? []).map((to) => ({
      providerId: p.data!.email_id!,
      to: to.toLowerCase(),
      type: p.type,
      subject: p.data!.subject?.slice(0, 200) ?? null,
      detail: detail?.slice(0, 500) ?? null,
      occurredAt,
    })),
  });
  return NextResponse.json({ ok: true });
}
