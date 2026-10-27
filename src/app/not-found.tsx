import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
      <div className="text-6xl font-bold text-accent" dir="ltr">404</div>
      <p className="text-muted">الصفحة غير موجودة.</p>
      <Link href="/" className="btn-primary !px-6 !py-2.5 !text-sm">العودة للرئيسية</Link>
    </main>
  );
}
