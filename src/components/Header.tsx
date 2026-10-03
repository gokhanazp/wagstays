import { AccountMenu } from "./AccountMenu";
import { InboxLive } from "./InboxLive";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/actions/auth";
import { getUnreadCount } from "@/lib/messaging";
import { getCurrentUser } from "@/lib/session";
import { Logo } from "./Logo";
import { BecomeSitterPill, HeaderNav, MobileMenu } from "./HeaderNav";

const ICON_BTN =
  "w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors";

export async function Header() {
  const user = await getCurrentUser();
  const unread = user ? await getUnreadCount(user.id) : 0;
  const menu = user
    ? [
        ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Admin Panel", icon: "admin_panel_settings" }] : []),
        ...(user.role === "SITTER" ? [{ href: "/sitter", label: "Sitter Dashboard", icon: "space_dashboard" }] : []),
        { href: "/account/bookings", label: "My Bookings", icon: "event_note" },
        { href: "/account/pets", label: "My Pets", icon: "pets" },
        { href: "/messages", label: "Messages", icon: "chat_bubble" },
        { href: "/favourites", label: "Favourites", icon: "favorite" },
        { href: "/account/settings", label: "Account Settings", icon: "manage_accounts" },
      ]
    : [];

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
            <Link aria-label="Help" className={`${ICON_BTN} hidden sm:flex`} href="/#how-it-works">
              <span className="material-symbols-outlined text-xl">help</span>
            </Link>
            <Link aria-label="Favourites" className={`${ICON_BTN} relative`} href={user ? "/favourites" : "/login?next=/favourites"}>
              <span className="material-symbols-outlined text-xl">favorite</span>
              {!!user?._count.favorites && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary" />}
            </Link>
            <Link aria-label="Messages" className={`${ICON_BTN} hidden sm:flex relative`} href="/messages">
              <span className="material-symbols-outlined text-xl">chat_bubble</span>
              {unread > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary" />}
            </Link>
            <MobileMenu signedIn={!!user} />
          </div>
          {user ? (
            <AccountMenu
              trigger={
                <>
                  <div className="text-right hidden sm:block">
                    <div className="font-label-lg text-label-lg text-on-surface leading-tight">
                      {user.firstName} {user.lastName.charAt(0)}.
                    </div>
                    <div className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary bg-surface-container-high px-2 py-0.5 rounded-full mt-0.5">
                      <span className="text-xs">🐾</span>{" "}
                      {user.role === "ADMIN" && !user._count.pets
                        ? "Admin"
                        : user.role === "SITTER" && !user._count.pets
                          ? "Sitter"
                          : `${user._count.pets} ${user._count.pets === 1 ? "Pet" : "Pets"}`}
                    </div>
                  </div>
                  {user.avatarUrl ? (
                    <Image
                      alt={`${user.firstName}'s profile`}
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
              {menu.map((m) => (
                <Link key={m.href} className="flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-lg text-label-lg text-on-surface hover:bg-surface-container-low" href={m.href}>
                  <span className="material-symbols-outlined text-lg text-on-surface-variant">{m.icon}</span>
                  {m.label}
                </Link>
              ))}
              <form action={logout}>
                <button className="w-full flex items-center gap-space-sm text-left px-space-md py-space-sm rounded-xl font-label-lg text-label-lg text-secondary hover:bg-surface-container-low" type="submit">
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Log out
                </button>
              </form>
            </AccountMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-space-sm pl-space-sm">
              <Link className="px-space-md py-space-sm rounded-full font-label-lg text-label-lg text-on-surface hover:bg-surface-container transition-all" href="/login">
                Log in
              </Link>
              <Link className="px-space-md py-space-sm rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container transition-all" href="/signup">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
