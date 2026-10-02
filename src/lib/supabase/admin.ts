import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role client: bypasses RLS. Server-only — never import from client components. */
export function createSupabaseAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const STORAGE_BUCKETS = {
  /** pet, sitter and avatar photos — public read */
  media: "media",
  /** ID / police-check documents — private, served through signed URLs */
  documents: "documents",
} as const;

/** Checks a password without touching the request's session (isolated, non-persisting client). */
export async function verifyPassword(email: string, password: string) {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (!error) await client.auth.signOut({ scope: "local" });
  return !error;
}
