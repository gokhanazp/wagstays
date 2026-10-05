import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { BTN } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { localizedPath } from "@/i18n/server";

export const metadata: Metadata = { title: "New message" };

type Props = { searchParams: Promise<{ sitter?: string | string[]; owner?: string | string[] }> };

const one = (v: string | string[] | undefined) => (typeof v === "string" && v.length <= 64 ? v : undefined);

function Problem({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-space-sm p-space-xl">
      <span className="w-14 h-14 rounded-2xl bg-surface-container-low text-secondary flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl">chat_error</span>
      </span>
      <h2 className="font-title-md text-title-md text-on-surface">{title}</h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">{text}</p>
      <Link className={`${BTN.secondary} mt-space-xs`} href={href}>
        {cta}
      </Link>
    </div>
  );
}

/**
 * Find-or-create a conversation, then redirect to it.
 *  ?sitter=<sitterProfileId> — the signed-in user (as pet parent) starts a chat with a sitter.
 *  ?owner=<userId>           — the signed-in sitter replies to a pet parent who has booked them or already messaged them.
 */
export default async function NewConversationPage({ searchParams }: Props) {
  const user = await requireUser(); // logged-out → /login?next=/messages/new?...
  const sp = await searchParams;
  const sitterParam = one(sp.sitter);
  const ownerParam = one(sp.owner);

  if (sitterParam) {
    const sitter = await db.sitterProfile.findUnique({ where: { id: sitterParam }, select: { id: true, userId: true, slug: true, status: true, displayName: true } });
    if (!sitter) notFound();
    if (sitter.userId === user.id) {
      return <Problem cta="Back to messages" href="/messages" text="This is your own sitter profile — pet parents can message you from it." title="You can't message yourself" />;
    }
    const existing = await db.conversation.findUnique({ where: { ownerId_sitterId: { ownerId: user.id, sitterId: sitter.id } }, select: { id: true } });
    if (existing) redirect(await localizedPath(`/messages/${existing.id}`));
    if (sitter.status !== "ACTIVE") {
      return <Problem cta="Find another sitter" href="/sitters" text={`${sitter.displayName} isn't taking new requests right now.`} title="Messaging is paused" />;
    }
    const conv = await db.conversation.upsert({
      where: { ownerId_sitterId: { ownerId: user.id, sitterId: sitter.id } },
      create: { ownerId: user.id, sitterId: sitter.id },
      update: {},
      select: { id: true },
    });
    redirect(await localizedPath(`/messages/${conv.id}`));
  }

  if (ownerParam) {
    const me = await db.sitterProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!me) notFound();
    if (ownerParam === user.id) {
      return <Problem cta="Back to messages" href="/messages" text="Pick a pet parent you're caring for instead." title="You can't message yourself" />;
    }
    const existing = await db.conversation.findUnique({ where: { ownerId_sitterId: { ownerId: ownerParam, sitterId: me.id } }, select: { id: true } });
    if (existing) redirect(await localizedPath(`/messages/${existing.id}`));
    // Sitters can only open a chat with pet parents who have booked them (no cold outreach).
    const booking = await db.booking.findFirst({ where: { ownerId: ownerParam, sitterId: me.id, status: { not: "DRAFT" } }, select: { id: true } });
    if (!booking) notFound();
    const conv = await db.conversation.upsert({
      where: { ownerId_sitterId: { ownerId: ownerParam, sitterId: me.id } },
      create: { ownerId: ownerParam, sitterId: me.id },
      update: {},
      select: { id: true },
    });
    redirect(await localizedPath(`/messages/${conv.id}`));
  }

  redirect(await localizedPath("/messages"));
}
