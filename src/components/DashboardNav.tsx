"use client";

import { Link, usePathname } from "@/i18n/navigation";

export type NavItem = { href: string; label: string; icon: string; badge?: number; exact?: boolean };

/** Side navigation for dashboard areas; becomes a horizontal pill scroller on mobile. */
export function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex lg:flex-col gap-space-xs overflow-x-auto lg:overflow-visible -mx-margin-mobile px-margin-mobile lg:mx-0 lg:px-0 pb-1 lg:pb-0">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-full lg:rounded-xl font-label-lg text-label-lg whitespace-nowrap transition-all ${
              active ? "bg-primary-container text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
            href={item.href}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {!!item.badge && (
              <span className={`min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center font-label-sm text-label-sm ${active ? "bg-white/20 text-on-primary" : "bg-secondary text-on-secondary"}`}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
