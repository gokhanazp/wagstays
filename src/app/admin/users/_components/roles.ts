export const ROLE_TONE = { OWNER: "neutral", SITTER: "primary", ADMIN: "warning" } as const;
export const ROLE_LABEL: Record<string, string> = { OWNER: "Pet parent", SITTER: "Sitter", ADMIN: "Admin" };
export const APPROVAL_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger"; icon: string }> = {
  APPROVED: { label: "Approved", tone: "success", icon: "verified" },
  PENDING: { label: "Pending approval", tone: "warning", icon: "hourglass_top" },
  REJECTED: { label: "Rejected", tone: "danger", icon: "person_cancel" },
};
