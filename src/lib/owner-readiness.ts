import "server-only";
import { cache } from "react";
import { db } from "./db";
import { getPlatformSettings } from "./settings";
import { normalizeNaPhone } from "./phone";

// "Ready to book" checks for pet parents (and sitters booking as pet parents). Admins are exempt.
// Email verification is implied by being signed in (Supabase blocks unconfirmed logins).

export type ReadinessKey = "phone" | "pet" | "approval";
export type ReadinessStep = {
  key: ReadinessKey;
  done: boolean;
  label: string;
  /** one-line explanation shown under the label */
  detail?: string;
  href?: string;
  /** approval step only */
  status?: "APPROVED" | "PENDING" | "REJECTED";
};
export type OwnerReadiness = {
  ready: boolean;
  steps: ReadinessStep[];
  /** current phone, normalised when valid (for pre-filling the inline form) */
  phone: string | null;
};

export const getOwnerReadiness = cache(async (userId: string): Promise<OwnerReadiness> => {
  const [user, settings] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { role: true, phone: true, approvalStatus: true, _count: { select: { pets: { where: { archivedAt: null } } } } },
    }),
    getPlatformSettings(),
  ]);
  if (!user) return { ready: false, steps: [], phone: null };
  if (user.role === "ADMIN") return { ready: true, steps: [], phone: user.phone };

  const phone = normalizeNaPhone(user.phone);
  const steps: ReadinessStep[] = [
    phone
      ? { key: "phone", done: true, label: "Phone number added", detail: phone }
      : {
          key: "phone",
          done: false,
          label: user.phone ? "Check your phone number" : "Add your phone number",
          detail: user.phone
            ? `“${user.phone}” doesn't look like a Canadian or US number.`
            : "So your sitter can reach you during a booking. Canadian or US numbers only.",
          href: "/account/settings",
        },
    user._count.pets > 0
      ? { key: "pet", done: true, label: user._count.pets === 1 ? "Pet profile added" : `${user._count.pets} pet profiles added` }
      : { key: "pet", done: false, label: "Add your pet", detail: "Tell your sitter who they'll be caring for.", href: "/account/pets/new" },
  ];

  // Manual approval only applies while the admin switch is on — but an explicit rejection always blocks booking.
  const status = (["APPROVED", "PENDING", "REJECTED"].includes(user.approvalStatus) ? user.approvalStatus : "APPROVED") as ReadinessStep["status"];
  if (settings.requireOwnerApproval || status === "REJECTED") {
    steps.push(
      status === "APPROVED"
        ? { key: "approval", done: true, label: "Account approved", status }
        : status === "PENDING"
          ? { key: "approval", done: false, status, label: "Your account is being reviewed — usually within a few hours", detail: "We'll let you know as soon as you can book." }
          : {
              key: "approval",
              done: false,
              status,
              label: "We couldn't approve your account",
              detail: "Contact our support team and we'll help sort it out.",
              href: "/account/support/new",
            },
    );
  }
  return { ready: steps.every((s) => s.done), steps, phone: phone ?? user.phone };
});

/** Friendly one-liner for server actions that refuse a booking. */
export function readinessMessage(r: OwnerReadiness): string {
  const approval = r.steps.find((s) => s.key === "approval" && !s.done);
  if (approval?.status === "REJECTED") return "We couldn't approve your account for bookings — please contact support and we'll help.";
  const todo = r.steps.filter((s) => !s.done && s.key !== "approval").map((s) => (s.key === "phone" ? "add a phone number" : "add your pet"));
  if (todo.length) return `Almost there — before your first booking, please ${todo.join(" and ")}.`;
  if (approval) return "Your account is still being reviewed — you'll be able to book as soon as it's approved (usually within a few hours).";
  return "Please complete your profile before booking.";
}
