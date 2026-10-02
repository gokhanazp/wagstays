import { DashboardNav, type NavItem } from "./DashboardNav";

/** Two-column dashboard layout used inside the public site (account + sitter areas). */
export function DashboardShell({ title, subtitle, nav, children }: { title: string; subtitle?: string; nav: NavItem[]; children: React.ReactNode }) {
  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <div className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin pt-space-xl grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-space-lg lg:gap-space-xl items-start">
        <aside className="lg:sticky lg:top-28 flex flex-col gap-space-md min-w-0">
          <div className="hidden lg:flex flex-col px-space-md">
            <span className="font-title-md text-title-md text-on-surface">{title}</span>
            {subtitle && <span className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</span>}
          </div>
          <DashboardNav items={nav} />
        </aside>
        <div className="flex flex-col gap-space-lg min-w-0">{children}</div>
      </div>
    </main>
  );
}
