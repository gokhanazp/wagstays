import "server-only";
import { getOrigin } from "./origin";
import { createSupabaseAdminClient } from "./supabase/admin";

/**
 * One-time "set your password" link for a user, generated with the service role (no email is sent).
 * Shown to admins (e.g. after approving a new sitter). Supabase expires it per the project's OTP expiry.
 */
export async function createPasswordLink(email: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? "Couldn't create a password link.");
  const url = `${await getOrigin()}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/set-password`;
  return { url, expiresInHours: 1 };
}
