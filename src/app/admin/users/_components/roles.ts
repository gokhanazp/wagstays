export const ROLE_TONE = { OWNER: "neutral", SITTER: "primary", ADMIN: "warning" } as const;
export const ROLE_LABEL: Record<string, string> = { OWNER: "Pet parent", SITTER: "Sitter", ADMIN: "Admin" };
export const APPROVAL_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger"; icon: string }> = {
  APPROVED: { label: "Approved", tone: "success", icon: "verified" },
  PENDING: { label: "Pending approval", tone: "warning", icon: "hourglass_top" },
  REJECTED: { label: "Rejected", tone: "danger", icon: "person_cancel" },
};

/**
 * Roles combine: every account can book care (pet parent), `role: "SITTER"` adds sitting, `isAdmin` adds the admin
 * panel. Lists show "Pet parent" for non-sitters and for sitters who also have pets, so badges stay meaningful.
 */
export function roleKeys(u: { role: string; isAdmin: boolean; petCount?: number }) {
  const keys: ("OWNER" | "SITTER" | "ADMIN")[] = [];
  if (u.role !== "SITTER" || (u.petCount ?? 0) > 0) keys.push("OWNER");
  if (u.role === "SITTER") keys.push("SITTER");
  if (u.isAdmin) keys.push("ADMIN");
  return keys;
}
