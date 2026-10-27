import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

// بدون أنواع مولَّدة من Supabase: نستخدم any للمخطط، ونفرض الأنواع يدوياً عند القراءة (انظر types.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;
let client: Db | null = null;

/**
 * عميل بصلاحية service_role: يتجاوز RLS. للخادم فقط ولا يُستورد أبداً من مكوّن عميل.
 * كل استدعاء له يجب أن يسبقه فحص هوية المشرف والفرد وصلاحياته (انظر session.ts).
 */
export function db(): Db {
  if (!client) {
    client = createClient(env.supabaseUrl(), env.serviceRole(), {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as Db;
  }
  return client;
}
