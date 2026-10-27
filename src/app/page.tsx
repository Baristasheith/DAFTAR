import Link from "next/link";
import Logo from "@/components/Logo";

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* خلفية هادئة: توهج خفيف بلون التمييز */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(#F4F7F0 1px, transparent 1px), linear-gradient(90deg, #F4F7F0 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6">
        <Logo size="sm" />
        <Link href="/login" className="btn-ghost">
          تسجيل الدخول
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 pb-24 text-center">
        <div className="animate-rise">
          <Logo />
        </div>

        <h1
          className="mt-10 animate-rise text-4xl font-bold leading-tight sm:text-6xl"
          style={{ animationDelay: ".08s" }}
        >
          حساب عائلتك،
          <br />
          <span className="text-accent">في دفتر واحد واضح.</span>
        </h1>

        <p
          className="mt-6 max-w-xl animate-rise text-base leading-relaxed text-muted sm:text-lg"
          style={{ animationDelay: ".16s" }}
        >
          سجّلوا مشترياتكم ومصروفاتكم والمبالغ الواردة معاً، واعرفوا من سجّل كل عملية،
          والرصيد يُحسب تلقائياً بالدينار العراقي.
        </p>

        <div className="mt-10 animate-rise" style={{ animationDelay: ".24s" }}>
          <Link href="/login" className="btn-primary">
            ابدأ الآن
          </Link>
        </div>

        <p
          className="mt-8 animate-rise text-xs text-muted"
          style={{ animationDelay: ".32s" }}
        >
          دفتر لا ينفّذ تحويلات مالية، وظيفته التسجيل والحساب فقط.
        </p>
      </section>
    </main>
  );
}
