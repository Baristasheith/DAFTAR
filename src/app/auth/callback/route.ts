import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// رابط استعادة كلمة المرور من البريد يمر من هنا لتبديل الرمز بجلسة.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/who";
  // منع إعادة التوجيه لموقع خارجي
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/who";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, req.url));
  }
  return NextResponse.redirect(new URL("/login?e=link", req.url));
}
