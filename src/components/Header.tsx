import { AccountMenu } from "./AccountMenu";
import { InboxLive } from "./InboxLive";
import Image from "next/image";
import NextLink from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { logout } from "@/app/actions/auth";
import { getUnreadCount } from "@/lib/messaging";
import { formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { Logo } from "./Logo";
import { BecomeSitterPill, HeaderNav } from "./HeaderNav";
import { LanguageButton } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { InstallAppButton } from "./pwa/InstallAppButton";

const ICON_BTN =
  "w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors";

export async function Header() {
  const user = await getCurrentUser();
  const unread = user ? await getUnreadCount(user.id) : 0;
  const [t, locale] = await Promise.all([getTranslations("common"), getLocale()]);
  const badge = user
    ? user.role === "ADMIN" && !user._count.pets
      ? t("header.badgeAdmin")
      : user.role === "SITTER" && !user._count.pets
        ? t("header.badgeSitter")
        : t("header.badgePets", { count: user._count.pets })
    : "";
  const menu = user
    ? [
        ...(user.role === "SITTER" ? [{ href: "/sitter", label: t("nav.sitterDashboard"), icon: "space_dashboard" }] : []),
        { href: "/account/bookings", label: t("nav.myBookings"), icon: "event_note" },
        { href: "/account/pets", label: t("nav.myPets"), icon: "pets" },
        { href: "/messages", label: t("nav.messages"), icon: "chat_bubble" },
        { href: "/favourites", label: t("nav.favourites"), icon: "favorite" },
        { href: "/account/wagpoints", label: t("nav.wagPoints"), icon: "toll", meta: formatMoney(user.wagPointsCents, { exact: true, locale }) },
        { href: "/account/settings", label: t("nav.accountSettings"), icon: "manage_accounts" },
      ]
    : [];
  // the admin panel is English-only and lives outside the locale routes, so it gets a plain link
  const adminLink = user?.role === "ADMIN" ? { href: "/admin", label: t("nav.adminPanel"), icon: "admin_panel_settings", external: true } : null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(83,72,62,0.05)]">
      {user && <InboxLive channel={`inbox:${user.id}`} />}
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between gap-space-lg">
        <div className="flex items-center gap-space-xl">
          <Logo />
          <Suspense>
            <HeaderNav />
          </Suspense>
        </div>
        <div className="flex items-center gap-space-md">
          <BecomeSitterPill />
          <div className="flex items-center gap-space-xs text-on-surface-variant">
            <Suspense>
              <LanguageButton className="hidden lg:inline-flex" />
            </Suspense>
            <Link aria-label={t("nav.favourites")} className={`${ICON_BTN} relative`} href={user ? "/favourites" : "/login?next=/favourites"}>
              <span className="material-symbols-outlined text-xl">favorite</span>
              {!!user?._count.favorites && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary" />}
            </Link>
            {user && (
              <Link aria-label={t("nav.messages")} className={`${ICON_BTN} hidden sm:flex relative`} href="/messages">
                <span className="material-symbols-outlined text-xl">chat_bubble</span>
                {unread > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary" />}
              </Link>
            )}
            <MobileMenu
              accountLinks={[...(adminLink ? [adminLink] : []), ...menu.map((m) => (m.href === "/messages" ? { ...m, badge: unread } : m))]}
              logoutAction={logout}
              user={
                user
                  ? {
                      firstName: user.firstName,
                      lastName: user.lastName,
                      email: user.email,
                      avatarUrl: user.avatarUrl,
                      badge,
                    }
                  : null
              }
            />
          </div>
          {user ? (
            <div className="hidden lg:block">
            <AccountMenu
              trigger={
                <>
                  <div className="text-right hidden sm:block">
                    <div className="font-label-lg text-label-lg text-on-surface leading-tight">
                      {user.firstName} {user.lastName.charAt(0)}.
                    </div>
                    <div className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary bg-surface-container-high px-2 py-0.5 rounded-full mt-0.5">
                      <span className="text-xs">🐾</span> {badge}
                    </div>
                  </div>
                  {user.avatarUrl ? (
                    <Image
                      alt={t("header.profilePhotoAlt", { name: user.firstName })}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-fixed"
                      height={32}
                      src={user.avatarUrl}
                      width={32}
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center ring-2 ring-primary-fixed">
                      {user.firstName.charAt(0)}
                    </span>
                  )}
                </>
              }
            >
              <div className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant truncate">{user.email}</div>
              {adminLink && (
                <NextLink className="flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-lg text-label-lg text-on-surface hover:bg-surface-container-low" href={adminLink.href}>
                  <span className="material-symbols-outlined text-lg text-on-surface-variant">{adminLink.icon}</span>
                  {adminLink.label}
                </NextLink>
              )}
              {menu.map((m) => (
                <Link key={m.href} className="flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-lg text-label-lg text-on-surface hover:bg-surface-container-low" href={m.href}>
                  <span className="material-symbols-outlined text-lg text-on-surface-variant">{m.icon}</span>
                  <span className="flex-1">{m.label}</span>
                  {"meta" in m && (
                    <span className="font-label-sm text-label-sm text-secondary bg-secondary-fixed/60 px-2 py-0.5 rounded-full">{m.meta}</span>
                  )}
                </Link>
              ))}
              <InstallAppButton />
              <form action={logout}>
                <button className="w-full flex items-center gap-space-sm text-left px-space-md py-space-sm rounded-xl font-label-lg text-label-lg text-secondary hover:bg-surface-container-low" type="submit">
                  <span className="material-symbols-outlined text-lg">logout</span>
                  {t("nav.logOut")}
                </button>
              </form>
            </AccountMenu>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-space-sm pl-space-sm">
              <Link className="whitespace-nowrap px-space-md py-space-sm rounded-full font-label-lg text-label-lg text-on-surface hover:bg-surface-container transition-all" href="/login">
                {t("nav.logIn")}
              </Link>
              <Link className="whitespace-nowrap px-space-md py-space-sm rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container transition-all" href="/signup">
                {t("nav.signUp")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
