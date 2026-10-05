import "server-only";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { formatMoney } from "@/lib/format";
import { getPlatformSettings } from "@/lib/settings";
import { REF_COOKIE, findReferrer } from "@/lib/referrals";

/** Signup page: "Maple's pet parent Emily invited you…" when a valid ws_ref cookie is present. */
export async function ReferralBanner() {
  const referrer = await findReferrer((await cookies()).get(REF_COOKIE)?.value);
  if (!referrer) return null;
  const { referralRewardCents } = await getPlatformSettings();
  const pet = referrer.pets[0]?.name;
  const [t, locale] = await Promise.all([getTranslations("account.points"), getLocale()]);
  const who = pet ? t("referrerWithPet", { pet, name: referrer.firstName }) : referrer.firstName;
  const b = (c: React.ReactNode) => <strong className="font-semibold">{c}</strong>;
  return (
    <div className="flex items-start gap-space-sm p-space-md rounded-2xl bg-secondary-fixed/60 border border-secondary-fixed text-on-surface" data-testid="referral-banner">
      <span className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          redeem
        </span>
      </span>
      <p className="font-body-md text-body-md">
        {referralRewardCents > 0
          ? t.rich("invitedReward", {
              who,
              amount: formatMoney(referralRewardCents, { locale }),
              b,
              reward: (c) => <strong className="font-semibold text-secondary">{c}</strong>,
            })
          : t.rich("invited", { who, b })}
      </p>
    </div>
  );
}
