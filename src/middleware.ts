import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const REMEMBER = "daftar_remember";
const PUBLIC = ["/", "/login", "/forgot-password", "/auth/callback"];

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // بدون إعدادات Supabase: نترك الصفحات تعرض رسالة الخطأ الواضحة بدل تعطّل الـ middleware
  if (!url || !anon) return NextResponse.next();

  const remember = req.cookies.get(REMEMBER)?.value !== "0";
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) {
          const o = { ...options };
          if (!remember && value !== "" && o.maxAge !== 0) {
            delete o.maxAge;
            delete o.expires;
          }
          res.cookies.set(name, value, o);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.includes(path);

  const redirectTo = (to: string) => {
    const r = NextResponse.redirect(new URL(to, req.url));
    for (const c of res.cookies.getAll()) r.cookies.set(c);
    return r;
  };

  if (!data.user && !isPublic) return redirectTo("/login");
  if (data.user && path === "/login") return redirectTo("/who");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
