"use server";

import { revalidatePath } from "@/i18n/revalidate";
import { z } from "zod";
import { anonymiseAccount, deletionBlockers } from "@/lib/privacy";
import { getCurrentUser } from "@/lib/session";
import { createSupabaseAdminClient, verifyPassword } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";

export type CloseAccountState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined>; blocked?: boolean }
  | undefined;

const Schema = z.object({
  confirm: z.literal("DELETE", "Type DELETE (in capitals) to confirm."),
  password: z.string().min(1, "Please enter your current password.").max(200),
});

/** Closes the signed-in user's account: anonymises their data, deletes the auth user and signs them out. */
export async function closeAccount(_: CloseAccountState, formData: FormData): Promise<CloseAccountState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };
  const parsed = Schema.safeParse({ confirm: formData.get("confirm"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  if (!(await verifyPassword(user.email, parsed.data.password))) {
    return { fieldErrors: { password: ["That password isn't right."] } };
  }
  if ((await deletionBlockers(user.id)).length) {
    revalidatePath("/account/settings");
    return { blocked: true, error: "You still have upcoming bookings. Cancel or finish them before closing your account." };
  }

  try {
    await anonymiseAccount(user.id);
  } catch (e) {
    console.error("closeAccount: anonymise failed", e);
    return { error: "We couldn't close your account just now — nothing was changed. Please try again or contact support." };
  }

  // Clear this browser's session first (the auth user is about to disappear), then remove the login itself.
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => null);
  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(user.id);
  // The User row is already anonymised and flagged deletedAt, so sessions are refused even if this fails.
  if (error) console.error("closeAccount: auth user delete failed", user.id, error.message);

  revalidatePath("/", "layout");
  redirect(await localizedPath("/account-closed"));
}
