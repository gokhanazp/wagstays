"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendPush } from "@/lib/push";

// Manual approval of pet parents (PlatformSettings.requireOwnerApproval). Approve / reject are audited.

export type ApprovalState = { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;
type SimpleResult = { ok?: boolean; error?: string };

const NOT_ALLOWED = "You don't have permission to do that.";

function revalidateApproval(userId: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/account", "layout");
  revalidatePath("/book/[slug]", "page");
}

export async function approveUser(userId: string): Promise<SimpleResult> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: NOT_ALLOWED };
  const parsed = z.string().min(1).max(64).safeParse(userId);
  if (!parsed.success) return { error: "Invalid request." };
  const user = await db.user.findUnique({ where: { id: parsed.data }, select: { id: true, email: true, approvalStatus: true, deletedAt: true } });
  if (!user || user.deletedAt) return { error: "User not found." };
  if (user.approvalStatus === "APPROVED") return { ok: true };

  await db.user.update({ where: { id: user.id }, data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvalNote: null } });
  await audit(admin.id, "user.approve", "User", user.id, { email: user.email, before: { approvalStatus: user.approvalStatus }, after: { approvalStatus: "APPROVED" } });
  await sendPush(user.id, { title: "You're approved 🐾", body: "You're approved — you can now book sitters on WagStays.", url: "/sitters", tag: "account-approval" });
  revalidateApproval(user.id);
  return { ok: true };
}

const RejectSchema = z.object({
  userId: z.string().min(1).max(64),
  reason: z.string().trim().min(5, "Add a short reason (at least 5 characters).").max(500, "Please keep the reason under 500 characters."),
});

export async function rejectUser(_: ApprovalState, formData: FormData): Promise<ApprovalState> {
  const admin = await getAdminOrNull();
  if (!admin) return { error: NOT_ALLOWED };
  const parsed = RejectSchema.safeParse({ userId: formData.get("userId"), reason: formData.get("reason") ?? "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { userId, reason } = parsed.data;
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, approvalStatus: true, deletedAt: true } });
  if (!user || user.deletedAt) return { error: "User not found." };
  if (user.id === admin.id || user.role === "ADMIN") return { error: "Admin accounts can't be rejected." };

  await db.user.update({ where: { id: user.id }, data: { approvalStatus: "REJECTED", approvedAt: null, approvalNote: reason } });
  await audit(admin.id, "user.reject", "User", user.id, { email: user.email, reason, before: { approvalStatus: user.approvalStatus }, after: { approvalStatus: "REJECTED" } });
  revalidateApproval(user.id);
  return { ok: true, message: "Account rejected — they can browse but can't book." };
}
