import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin is not configured");
  }

  cachedAdmin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    return Reflect.get(getSupabaseAdmin(), property, receiver);
  },
});
