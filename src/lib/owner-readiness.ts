import "server-only";
import { cache } from "react";
import { db } from "./db";
import { getPlatformSettings } from "./settings";
import { normalizeNaPhone } from "./phone";
import { bookingT } from "./booking-messages";

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

/** `locale` translates the step labels (default English). */
export const getOwnerReadiness = cache(async (userId: string, locale: string = "en"): Promise<OwnerReadiness> => {
  const t = bookingT(locale);
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
      ? { key: "phone", done: true, label: t("readiness.phoneDone"), detail: phone }
      : {
          key: "phone",
          done: false,
          label: user.phone ? t("readiness.phoneCheck") : t("readiness.phoneAdd"),
          detail: user.phone ? t("readiness.phoneInvalid", { phone: user.phone }) : t("readiness.phoneWhy"),
          href: "/account/settings",
        },
    user._count.pets > 0
      ? { key: "pet", done: true, label: t("readiness.petDone", { count: user._count.pets }) }
      : { key: "pet", done: false, label: t("readiness.petAdd"), detail: t("readiness.petWhy"), href: "/account/pets/new" },
  ];

  // Manual approval only applies while the admin switch is on — but an explicit rejection always blocks booking.
  const status = (["APPROVED", "PENDING", "REJECTED"].includes(user.approvalStatus) ? user.approvalStatus : "APPROVED") as ReadinessStep["status"];
  if (settings.requireOwnerApproval || status === "REJECTED") {
    steps.push(
      status === "APPROVED"
        ? { key: "approval", done: true, label: t("readiness.approved"), status }
        : status === "PENDING"
          ? { key: "approval", done: false, status, label: t("readiness.pending"), detail: t("readiness.pendingDetail") }
          : {
              key: "approval",
              done: false,
              status,
              label: t("readiness.rejected"),
              detail: t("readiness.rejectedDetail"),
              href: "/account/support/new",
            },
    );
  }
  return { ready: steps.every((s) => s.done), steps, phone: phone ?? user.phone };
});

/** Friendly one-liner for server actions that refuse a booking. */
export function readinessMessage(r: OwnerReadiness, locale = "en"): string {
  const t = bookingT(locale);
  const approval = r.steps.find((s) => s.key === "approval" && !s.done);
  if (approval?.status === "REJECTED") return t("readiness.msgRejected");
  const todo = r.steps.filter((s) => !s.done && s.key !== "approval").map((s) => s.key);
  if (todo.length) return t("readiness.msgTodo", { todo: todo.length > 1 ? "both" : todo[0] });
  if (approval) return t("readiness.msgPending");
  return t("readiness.msgIncomplete");
}
