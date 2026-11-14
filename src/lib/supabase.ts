import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return value;
}

let publicClient: SupabaseClient | undefined;
let adminClient: SupabaseClient | undefined;

/** Read-only client (anon key): RLS only allows reading offers. */
export function getPublicClient(): SupabaseClient {
  publicClient ??= createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } }
  );
  return publicClient;
}

/**
 * Service-role client that bypasses RLS. Server-side only: the key is not
 * prefixed with NEXT_PUBLIC_, so it is never shipped to the browser.
 */
export function getAdminClient(): SupabaseClient {
  adminClient ??= createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
  return adminClient;
}
