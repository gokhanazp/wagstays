import { Link } from "@/i18n/navigation";

/** WagStays brand mark: a heart-pad paw on a sage squircle, drawn from the design palette. */
export function LogoMark({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ws-mark-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3d7a68" />
          <stop offset="1" stopColor="#226150" />
        </linearGradient>
        <linearGradient id="ws-mark-heart" x1="12" y1="17" x2="28" y2="31" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fd8363" />
          <stop offset="1" stopColor="#f37b5c" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#ws-mark-bg)" />
      <g fill="#ffdbd2">
        <ellipse cx="11.6" cy="17" rx="2.5" ry="3.2" transform="rotate(-24 11.6 17)" />
        <ellipse cx="16.6" cy="11.8" rx="2.6" ry="3.4" transform="rotate(-8 16.6 11.8)" />
        <ellipse cx="23.4" cy="11.8" rx="2.6" ry="3.4" transform="rotate(8 23.4 11.8)" />
        <ellipse cx="28.4" cy="17" rx="2.5" ry="3.2" transform="rotate(24 28.4 17)" />
      </g>
      <path
        d="M20 31c-2.9-2.1-7.6-5.3-7.6-9.2 0-2.4 1.9-4.2 4.1-4.2 1.5 0 2.8.8 3.5 2 .7-1.2 2-2 3.5-2 2.2 0 4.1 1.8 4.1 4.2 0 3.9-4.7 7.1-7.6 9.2Z"
        fill="url(#ws-mark-heart)"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-headline-sm text-[22px] leading-none font-extrabold tracking-tight ${className}`}>
      <span className="text-primary">Wag</span>
      <span className="text-secondary">Stays</span>
    </span>
  );
}

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "sm" | "md" }) {
  return (
    <Link aria-label="WagStays home" className="flex items-center gap-space-sm group shrink-0" href={href}>
      <LogoMark
        className={`${size === "sm" ? "w-8 h-8" : "w-10 h-10"} transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-105`}
      />
      <Wordmark className={size === "sm" ? "!text-headline-sm" : ""} />
    </Link>
  );
}
