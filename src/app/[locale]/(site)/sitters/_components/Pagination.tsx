import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const btn = "w-9 h-9 rounded-full flex items-center justify-center font-label-md text-label-md transition-colors";

/** 1 … (p-1) p (p+1) … last */
function pageList(page: number, count: number): (number | "gap")[] {
  const set = new Set([1, count, page - 1, page, page + 1].filter((n) => n >= 1 && n <= count));
  if (page <= 2 && count >= 3) set.add(3);
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  const t = useTranslations("search.pagination");
  const nav = (p: number, icon: string, label: string, disabled: boolean) =>
    disabled ? (
      <span aria-disabled className={`${btn} text-outline/50`}>
        <span className="material-symbols-outlined text-base">{icon}</span>
      </span>
    ) : (
      <Link aria-label={label} className={`${btn} text-on-surface hover:bg-surface-container`} href={hrefFor(p)} scroll={false}>
        <span className="material-symbols-outlined text-base">{icon}</span>
      </Link>
    );

  return (
    <nav aria-label={t("label")} className="flex items-center gap-1 bg-surface-container-lowest p-1.5 rounded-full shadow-sm">
      {nav(page - 1, "chevron_left", t("prev"), page <= 1)}
      {pageList(page, pageCount).map((n, i) =>
        n === "gap" ? (
          <span className="w-6 text-center text-outline" key={`gap-${i}`}>
            ...
          </span>
        ) : n === page ? (
          <span aria-current="page" className={`${btn} bg-primary text-on-primary shadow-xs`} key={n}>
            {n}
          </span>
        ) : (
          <Link className={`${btn} hover:bg-surface-container text-on-surface`} href={hrefFor(n)} key={n} scroll={false}>
            {n}
          </Link>
        ),
      )}
      {nav(page + 1, "chevron_right", t("next"), page >= pageCount)}
    </nav>
  );
}
