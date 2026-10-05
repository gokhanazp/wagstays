import { useTranslations } from "next-intl";

/** Shown for safety reports: urgent tickets jump the queue, but emergencies should call. */
export function SafetyBanner({ phone }: { phone: string }) {
  const t = useTranslations("account.support.safety");
  return (
    <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-error-container text-on-error-container" role="note">
      <span className="material-symbols-outlined text-2xl shrink-0">emergency</span>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-label-lg text-label-lg">{t("title")}</p>
        <p className="font-body-sm text-body-sm">
          {t.rich("text", {
            phone,
            tel: (c) => (
              <a className="font-bold underline whitespace-nowrap" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
                {c}
              </a>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
