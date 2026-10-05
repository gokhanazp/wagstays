"use server";

import { getTranslations } from "next-intl/server";
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

const schema = (t: Awaited<ReturnType<typeof getTranslations<"account.errors">>>) =>
  z.object({
    confirm: z.literal("DELETE", t("close.confirm")),
    password: z.string().min(1, t("currentPassword")).max(200),
  });

/** Closes the signed-in user's account: anonymises their data, deletes the auth user and signs them out. */
export async function closeAccount(_: CloseAccountState, formData: FormData): Promise<CloseAccountState> {
  const t = await getTranslations("account.errors");
  const user = await getCurrentUser();
  if (!user) return { error: t("logInAgain") };
  const parsed = schema(t).safeParse({ confirm: formData.get("confirm"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  if (!(await verifyPassword(user.email, parsed.data.password))) {
    return { fieldErrors: { password: [t("wrongPassword")] } };
  }
  if ((await deletionBlockers(user.id)).length) {
    revalidatePath("/account/settings");
    return { blocked: true, error: t("close.blocked") };
  }

  try {
    await anonymiseAccount(user.id);
  } catch (e) {
    console.error("closeAccount: anonymise failed", e);
    return { error: t("close.failed") };
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
