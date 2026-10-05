"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/favorites";

/**
 * Heart toggle used on sitter cards and the profile page.
 * Pass the design's exact classes via `className`; `activeClassName` is appended when favourited.
 * Render-prop `children` lets callers keep custom markup (e.g. icon + "Add to Favourites" label).
 */
export function FavoriteButton({
  sitterId,
  initial,
  className,
  activeClassName = "",
  children,
  label,
}: {
  sitterId: string;
  initial: boolean;
  className: string;
  activeClassName?: string;
  label?: string;
  children?: (isFavorite: boolean) => React.ReactNode;
}) {
  const t = useTranslations("search.favorite");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [fav, setFav] = useOptimistic(initial);

  return (
    <button
      aria-label={label ?? t("save")}
      aria-pressed={fav}
      className={`${className} ${fav ? activeClassName : ""}`}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        start(async () => {
          setFav(!fav);
          const res = await toggleFavorite(sitterId);
          if (res.needsLogin) router.push(`/login?next=${encodeURIComponent(pathname)}`);
        });
      }}
      type="button"
    >
      {children ? (
        children(fav)
      ) : (
        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: fav ? "'FILL' 1" : "'FILL' 0" }}>
          favorite
        </span>
      )}
    </button>
  );
}
