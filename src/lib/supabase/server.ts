import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, REMEMBER_COOKIE } from "../env";

/** عميل Supabase بجلسة المشرف (كوكيز). "تذكرني" = إزالة مدة الصلاحية فتصبح الكوكيز جلسة متصفح. */
export async function createClient(opts?: { remember?: boolean }) {
  const store = await cookies();
  const remember = opts?.remember ?? store.get(REMEMBER_COOKIE)?.value !== "0";
  return createServerClient(env.supabaseUrl(), env.supabaseAnon(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            const o = { ...options };
            if (!remember && value !== "" && o.maxAge !== 0) {
              delete o.maxAge;
              delete o.expires;
            }
            store.set(name, value, o);
          }
        } catch {
          // يُستدعى من Server Component؟ لا مشكلة: الـ middleware يجدّد الجلسة.
        }
      },
    },
  });
}
