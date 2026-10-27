import Link from "next/link";
import Logo from "./Logo";

export default function AuthShell({
  title,
  subtitle,
  children,
  back = { href: "/", label: "العودة للبداية" },
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  back?: { href: string; label: string } | null;
  wide?: boolean;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative z-10 mb-8">
        <Logo />
      </div>
      <div className={`card relative z-10 w-full ${wide ? "max-w-2xl" : "max-w-md"} animate-rise p-6 sm:p-8`}>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {back && (
        <Link href={back.href} className="relative z-10 mt-6 text-sm text-muted transition hover:text-accent">
          {back.label}
        </Link>
      )}
    </main>
  );
}
