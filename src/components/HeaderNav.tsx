"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const NAV = [
  { href: "/sitters", label: "Find a Sitter", key: "find" },
  { href: "/sitters?service=dog-walking", label: "Dog Walking", key: "walk" },
  { href: "/#how-it-works", label: "How It Works", key: "how" },
  { href: "/become-a-sitter", label: "Become a Sitter", key: "become" },
] as const;

const BASE =
  "px-space-md py-space-sm rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-all";
const ACTIVE = "bg-primary-container text-on-primary-container font-label-lg text-label-lg rounded-full shadow-sm";

function useActiveKey() {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname.startsWith("/become-a-sitter")) return "become";
  if (pathname.startsWith("/sitters") || pathname.startsWith("/book")) {
    return params.get("service") === "dog-walking" ? "walk" : "find";
  }
  return null;
}

export function HeaderNav() {
  const active = useActiveKey();
  return (
    <nav className="hidden lg:flex items-center gap-space-xs p-space-xs bg-surface-container rounded-full">
      {NAV.map((item) => (
        <Link
          key={item.key}
          aria-current={active === item.key ? "page" : undefined}
          className={active === item.key ? `px-space-md py-space-sm ${ACTIVE}` : BASE}
          href={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Soft pill everywhere, coral CTA on the sitter-application pages (matches the design). */
export function BecomeSitterPill() {
  const pathname = usePathname();
  const coral = pathname.startsWith("/become-a-sitter");
  return (
    <Link
      className={
        coral
          ? "hidden xl:inline-flex items-center px-space-md py-space-sm rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container transition-all shadow-[0_4px_12px_rgba(162,62,36,0.2)]"
          : "hidden xl:inline-flex items-center px-space-md py-space-sm rounded-full bg-surface-container-low text-primary font-label-lg text-label-lg hover:bg-surface-container-high hover:text-on-surface transition-all"
      }
      href="/become-a-sitter"
    >
      <span className={`material-symbols-outlined text-base ${coral ? "mr-1.5" : "mr-1"}`}>pets</span>
      Become a Sitter
    </Link>
  );
}
