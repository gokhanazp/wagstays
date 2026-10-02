import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/conversations";
import { InboxShell, type InboxItem } from "./_components/InboxShell";
import { shortRelative } from "./_components/time";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const rows = await listConversations(user.id);
  const now = new Date();
  const items: InboxItem[] = rows.map((c) => ({
    id: c.id,
    side: c.side,
    name: c.other.name,
    avatarUrl: c.other.avatarUrl,
    initial: c.other.initial,
    preview: c.preview,
    when: shortRelative(c.at, undefined, now),
    whenIso: c.at.toISOString(),
    unread: c.unread,
  }));
  // Label each row's role only when the viewer has conversations on both sides.
  const showSide = new Set(items.map((i) => i.side)).size > 1;

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <div className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin pt-space-md md:pt-space-lg">
        <InboxShell items={items} showSide={showSide}>
          {children}
        </InboxShell>
      </div>
    </main>
  );
}
