import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Brand artwork: public/brand/wagstays-logo-*.png (house + wagging dog + "WagStays" wordmark, 4.35:1) and
// public/brand/wagstays-mark.png (house + dog only). Favicon / app icons are generated from the same artwork.
const LOGO_RATIO = 2087 / 480;

/** Full logo (mark + wordmark) at a given rendered height in px. */
export function LogoFull({ height = 40, className = "", priority = false }: { height?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      alt="WagStays"
      className={`select-none shrink-0 self-start max-w-none ${className}`}
      draggable={false}
      height={height}
      priority={priority}
      src={height > 48 ? "/brand/wagstays-logo-192.png" : "/brand/wagstays-logo-96.png"}
      style={{ height, width: Math.round(height * LOGO_RATIO) }}
      width={Math.round(height * LOGO_RATIO)}
    />
  );
}

/** House + dog mark only (square), for tight spots. */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <Image alt="" aria-hidden="true" className={`select-none ${className}`} draggable={false} height={size} src="/brand/wagstays-mark.png" width={size} />;
}

export function Logo({ href = "/" }: { href?: string }) {
  const t = useTranslations("misc.logo");
  return (
    <Link aria-label={t("home")} className="flex items-center shrink-0 transition-transform duration-300 hover:scale-[1.02]" href={href}>
      {/* 32px on the smallest phones, 36px on phones, 44px from sm up (!important beats the inline size) */}
      <LogoFull className="!h-8 min-[380px]:!h-9 sm:!h-11 !w-auto" height={44} priority />
    </Link>
  );
}
