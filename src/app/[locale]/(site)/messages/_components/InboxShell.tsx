"use client";

import { Link } from "@/i18n/navigation";
import { useSelectedLayoutSegment } from "next/navigation";
import { Avatar } from "./Avatar";

export type InboxItem = {
  id: string;
  side: "owner" | "sitter";
  name: string;
  avatarUrl: string | null;
  initial: string;
  preview: string;
  when: string;
  whenIso: string;
  unread: boolean;
};

/**
 * Two-pane inbox: list on the left, thread (children) on the right. On mobile only one pane shows —
 * the list on /messages, the thread on /messages/<id>.
 */
export function InboxShell({ items, showSide, children }: { items: InboxItem[]; showSide: boolean; children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const threadOpen = !!segment;

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-[#EFE7DE] shadow-[0_4px_16px_-2px_rgba(83,72,62,0.05)] overflow-hidden md:grid md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] md:h-[calc(100dvh-10rem)] md:min-h-[560px]">
      <aside className={`${threadOpen ? "hidden md:flex" : "flex"} flex-col min-h-0 md:border-r border-[#EFE7DE]`}>
        <div className="px-space-lg pt-space-lg pb-space-md flex items-center justify-between gap-space-sm">
          <h1 className="font-headline-sm text-headline-sm text-on-surface">Messages</h1>
          {items.some((i) => i.unread) && (
            <span className="h-7 px-3 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md inline-flex items-center">
              {items.filter((i) => i.unread).length} new
            </span>
          )}
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-space-sm py-space-xl px-space-lg">
            <span className="w-14 h-14 rounded-2xl bg-surface-container-low text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">forum</span>
            </span>
            <h2 className="font-title-md text-title-md text-on-surface">No conversations yet</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
              Message a sitter from their profile to ask about availability, your pet&apos;s routine or a Meet &amp; Greet.
            </p>
            <Link className="mt-space-xs inline-flex items-center justify-center h-11 px-space-lg rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg" href="/sitters">
              Find a Sitter
            </Link>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto px-space-sm pb-space-sm flex flex-col gap-1">
            {items.map((c) => {
              const active = segment === c.id;
              const unread = c.unread && !active;
              return (
                <li key={c.id}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-space-md p-space-md rounded-xl transition-colors ${
                      active ? "bg-[#EBF3EF]" : "hover:bg-surface-container-low"
                    }`}
                    href={`/messages/${c.id}`}
                  >
                    <Avatar alt={c.name} initial={c.initial} src={c.avatarUrl} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-space-sm">
                        <span className={`truncate font-label-lg text-label-lg ${unread ? "text-on-surface font-bold" : "text-on-surface"}`}>{c.name}</span>
                        <time className={`shrink-0 font-label-sm text-label-sm ${unread ? "text-secondary font-bold" : "text-outline"}`} dateTime={c.whenIso} suppressHydrationWarning>
                          {c.when}
                        </time>
                      </div>
                      <div className="flex items-center gap-space-sm">
                        <p className={`flex-1 truncate font-body-sm text-body-sm ${unread ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>{c.preview}</p>
                        {unread && <span aria-label="Unread" className="w-2.5 h-2.5 rounded-full bg-secondary shrink-0" />}
                      </div>
                      {showSide && (
                        <span className="font-label-sm text-label-sm text-outline">{c.side === "owner" ? "Your sitter" : "Pet parent"}</span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
      <section className={`${threadOpen ? "flex" : "hidden md:flex"} flex-col min-h-0 min-w-0 h-[calc(100dvh-7rem)] md:h-auto`}>{children}</section>
    </div>
  );
}
