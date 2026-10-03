// Friendly labels/icons for WagPointsEntry.reason (shared by the account wallet page and admin).
export const POINTS_REASONS: Record<string, { label: string; icon: string }> = {
  BOOKING_EARN: { label: "Earned on a booking", icon: "savings" },
  BOOKING_SPEND: { label: "Used at checkout", icon: "shopping_bag" },
  BOOKING_REFUND: { label: "Returned to your wallet", icon: "undo" },
  REFERRAL: { label: "Referral reward", icon: "group_add" },
  ADMIN: { label: "Adjustment by WagStays", icon: "tune" },
  WELCOME: { label: "Welcome bonus", icon: "celebration" },
};

export const pointsReason = (reason: string) => POINTS_REASONS[reason] ?? { label: reason, icon: "toll" };
