import "server-only";

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `المتغير ${name} غير موجود. انسخ .env.example إلى .env.local واملأ القيم ثم أعد تشغيل npm run dev.`,
    );
  }
  return v;
}

export const env = {
  supabaseUrl: () => need("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnon: () => need("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  serviceRole: () => need("SUPABASE_SERVICE_ROLE_KEY"),
  sessionSecret: () => {
    const s = need("MEMBER_SESSION_SECRET");
    if (s.length < 32) throw new Error("MEMBER_SESSION_SECRET يجب ألا يقل عن 32 حرفاً.");
    return new TextEncoder().encode(s);
  },
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL || "",
};

export const REMEMBER_COOKIE = "daftar_remember";
