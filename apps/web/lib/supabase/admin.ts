/**
 * Supabase Admin Client — สำหรับใช้ใน workers / scripts ที่รันนอก Next.js
 *
 * ⚠️ ห้ามใช้ lib/supabase/server.ts ใน worker เด็ดขาด
 * เพราะตัวนั้นเรียก cookies() จาก next/headers ซึ่งมีเฉพาะใน request context
 * ของ Next.js — รันใน tsx worker จะ crash ทันที
 *
 * Lazy-initialized via Proxy so Next.js build doesn't crash when env vars
 * are absent during "Collecting page data" phase.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return _client;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const client = getClient();
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? (val as (...a: unknown[]) => unknown).bind(client) : val;
  },
});
