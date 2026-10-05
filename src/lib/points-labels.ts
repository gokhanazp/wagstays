import { createTranslator } from "next-intl";
import en from "../../messages/en/account.json";
import fr from "../../messages/fr/account.json";

// Friendly labels/icons for WagPointsEntry.reason (shared by the account wallet page and admin).
export const POINTS_REASONS: Record<string, { label: string; icon: string }> = {
  BOOKING_EARN: { label: "Earned on a booking", icon: "savings" },
  BOOKING_SPEND: { label: "Used at checkout", icon: "shopping_bag" },
  BOOKING_REFUND: { label: "Returned to your wallet", icon: "undo" },
  REFERRAL: { label: "Referral reward", icon: "group_add" },
  ADMIN: { label: "Adjustment by WagStays", icon: "tune" },
  WELCOME: { label: "Welcome bonus", icon: "celebration" },
};

type Reason = keyof typeof en.points.reasons;
const tr = (locale = "en") =>
  createTranslator({ locale: locale === "fr" ? "fr" : "en", messages: { account: locale === "fr" ? fr : en }, namespace: "account.points.reasons" });

/** Label + icon for a reason; translated (English by default, e.g. admin). */
export const pointsReason = (reason: string, locale = "en") => {
  const r = POINTS_REASONS[reason];
  if (!r) return { label: reason, icon: "toll" };
  return { ...r, label: tr(locale)(reason as Reason) };
};
