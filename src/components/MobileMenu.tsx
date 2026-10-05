"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { createPortal } from "react-dom";
import { LogoMark, Wordmark } from "./Logo";
import { LanguageRow } from "./LanguageSwitcher";
import { InstallAppButton } from "./pwa/InstallAppButton";

type MenuLink = { href: string; label: string; icon: string; badge?: number; meta?: string; external?: boolean };
type MenuUser = { firstName: string; lastName: string; email: string; avatarUrl: string | null; badge: string };

const MAIN = [
  { href: "/sitters", label: "findSitter", icon: "search" },
  { href: "/sitters?service=dog-walking", label: "dogWalking", icon: "directions_walk" },
  { href: "/#how-it-works", label: "howItWorks", icon: "lightbulb" },
  { href: "/pricing", label: "howPricingWorks", icon: "sell" },
  { href: "/become-a-sitter", label: "becomeSitter", icon: "volunteer_activism" },
] as const;

const ROW =
  "flex items-center gap-space-md min-h-12 px-space-md rounded-2xl font-label-lg text-label-lg text-on-surface hover:bg-surface-container-low active:bg-surface-container transition-colors";
const ICON_BOX = "w-9 h-9 rounded-xl flex items-center justify-center shrink-0";

/**
 * Mobile navigation: a right-hand sheet (portal, so the header's backdrop-filter can't trap it) with the main
 * links, the account section for signed-in users and sign-in / sign-up actions. Locks page scroll while open.
 */
export function MobileMenu({
  user,
  accountLinks = [],
  logoutAction,
}: {
  user: MenuUser | null;
  accountLinks?: MenuLink[];
  logoutAction: () => Promise<void>;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  // portal target only exists in the browser; false during SSR and hydration
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const pathname = usePathname();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  // close after navigating
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const opener = trigger.current;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);
  const isActive = (href: string) => {
    const path = href.split(/[?#]/)[0];
    return path !== "/" && pathname === path;
  };

  const sheet = (
    <div aria-hidden={!open} className={`xl:hidden fixed inset-0 z-[90] ${open ? "" : "pointer-events-none"}`}>
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-on-surface/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      <nav
        aria-label={t("menu.label")}
        className={`absolute right-0 top-0 h-dvh w-[88%] max-w-sm bg-background shadow-[0_20px_60px_-10px_rgba(83,72,62,0.35)] rounded-l-3xl flex flex-col transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
      >
        {/* top bar */}
        <div className="flex items-center justify-between px-space-lg pt-space-lg pb-space-md">
          <Link className="flex items-center gap-space-sm" href="/" onClick={close}>
            <LogoMark className="w-9 h-9" />
            <Wordmark className="!text-[20px]" />
          </Link>
          <button
            aria-label={t("menu.close")}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
            onClick={close}
            ref={closeBtn}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-space-md pb-space-lg flex flex-col gap-space-lg">
          {/* account card */}
          {user ? (
            <Link
              className="mx-space-xs flex items-center gap-space-md p-space-md rounded-3xl bg-surface-container-lowest border border-[#EFE7DE] shadow-[0_4px_16px_-2px_rgba(83,72,62,0.06)]"
              href="/account/settings"
              onClick={close}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-fixed" src={user.avatarUrl} />
              ) : (
                <span className="w-12 h-12 rounded-full bg-primary-container text-on-primary font-title-md text-title-md flex items-center justify-center ring-2 ring-primary-fixed">
                  {user.firstName.charAt(0)}
                </span>
              )}
              <span className="flex flex-col min-w-0 flex-1">
                <span className="font-title-md text-title-md text-on-surface truncate">
                  {user.firstName} {user.lastName.charAt(0)}.
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{user.email}</span>
              </span>
              <span className="shrink-0 inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary bg-surface-container-high px-2 py-1 rounded-full">
                🐾 {user.badge}
              </span>
            </Link>
          ) : (
            <div className="mx-space-xs p-space-md rounded-3xl bg-gradient-to-br from-surface-container to-surface-container-low flex flex-col gap-space-sm">
              <span className="font-title-md text-title-md text-on-surface">{t("menu.welcome")}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{t("menu.welcomeText")}</span>
              <div className="grid grid-cols-2 gap-space-sm pt-space-xs">
                <Link
                  className="h-11 rounded-full bg-surface-container-lowest text-on-surface font-label-lg text-label-lg flex items-center justify-center border border-[#EFE7DE]"
                  href="/login"
                  onClick={close}
                >
                  {t("nav.logIn")}
                </Link>
                <Link
                  className="h-11 rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg flex items-center justify-center shadow-[0_6px_16px_rgba(162,62,36,0.25)]"
                  href="/signup"
                  onClick={close}
                >
                  {t("nav.signUp")}
                </Link>
              </div>
            </div>
          )}

          {/* main links */}
          <div className="flex flex-col gap-1">
            <span className="px-space-md pb-1 font-label-sm text-label-sm uppercase tracking-wider text-outline">{t("menu.explore")}</span>
            {MAIN.map((l) => (
              <Link
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`${ROW} ${isActive(l.href) ? "bg-[#EBF3EF] text-primary" : ""}`}
                href={l.href}
                key={l.href}
                onClick={close}
              >
                <span className={`${ICON_BOX} ${isActive(l.href) ? "bg-primary text-on-primary" : "bg-surface-container text-primary"}`}>
                  <span className="material-symbols-outlined text-xl">{l.icon}</span>
                </span>
                <span className="flex-1">{t(`nav.${l.label}`)}</span>
                <span className="material-symbols-outlined text-lg text-outline-variant">chevron_right</span>
              </Link>
            ))}
          </div>

          {/* account links */}
          {user && accountLinks.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="px-space-md pb-1 font-label-sm text-label-sm uppercase tracking-wider text-outline">{t("menu.yourAccount")}</span>
              {accountLinks.map((l) => {
                const Comp = l.external ? NextLink : Link;
                return (
                <Comp
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`${ROW} ${isActive(l.href) ? "bg-[#EBF3EF] text-primary" : ""}`}
                  href={l.href}
                  key={l.href}
                  onClick={close}
                >
                  <span className={`${ICON_BOX} bg-surface-container-low text-on-surface-variant`}>
                    <span className="material-symbols-outlined text-xl">{l.icon}</span>
                  </span>
                  <span className="flex-1">{l.label}</span>
                  {l.meta && (
                    <span className="font-label-sm text-label-sm text-secondary bg-secondary-fixed/60 px-2 py-0.5 rounded-full">{l.meta}</span>
                  )}
                  {!!l.badge && (
                    <span className="min-w-6 h-6 px-1.5 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm flex items-center justify-center">
                      {l.badge}
                    </span>
                  )}
                </Comp>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <InstallAppButton className={`${ROW} w-full text-left text-primary`} iconClassName={`${ICON_BOX} bg-[#EBF3EF] text-primary`} />
            <Suspense>
              <LanguageRow className={`${ROW} w-full`} iconClassName={`${ICON_BOX} bg-surface-container-low text-on-surface-variant`} />
            </Suspense>
            <Link className={ROW} href="/account/support/new" onClick={close}>
              <span className={`${ICON_BOX} bg-surface-container-low text-on-surface-variant`}>
                <span className="material-symbols-outlined text-xl">support_agent</span>
              </span>
              <span className="flex-1">{t("nav.helpSupport")}</span>
            </Link>
          </div>
        </div>

        {user && (
          <div className="px-space-lg pt-space-sm pb-[max(16px,env(safe-area-inset-bottom))] border-t border-[#EFE7DE]">
            <form action={logoutAction}>
              <button
                className="w-full h-12 rounded-full bg-surface-container-low text-secondary font-label-lg text-label-lg flex items-center justify-center gap-space-xs hover:bg-surface-container"
                type="submit"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                {t("nav.logOut")}
              </button>
            </form>
          </div>
        )}
      </nav>
    </div>
  );

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("menu.open")}
        className="xl:hidden w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors text-on-surface-variant"
        onClick={() => setOpen(true)}
        ref={trigger}
        type="button"
      >
        <span className="material-symbols-outlined text-2xl">menu</span>
      </button>
      {mounted && createPortal(sheet, document.body)}
    </>
  );
}
