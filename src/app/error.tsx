"use client";

import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const missingEnv = /\.env|MEMBER_SESSION_SECRET|SUPABASE/.test(error.message);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
      <div className="card max-w-lg p-8">
        <h1 className="text-xl font-bold">حدث خطأ غير متوقع</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {missingEnv
            ? error.message
            : "تعذر إكمال الطلب. حاول مرة أخرى، وإن استمر الخطأ تحقق من إعدادات Supabase ومن أنك نفّذت ملف قاعدة البيانات."}
        </p>
        {error.digest && <p className="mt-2 text-xs text-muted" dir="ltr">ref: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn-primary !px-6 !py-2.5 !text-sm">إعادة المحاولة</button>
          <Link href="/" className="btn-ghost">الرئيسية</Link>
        </div>
      </div>
    </main>
  );
}
