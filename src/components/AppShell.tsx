import Link from "next/link";
import Logo from "./Logo";
import NavLink from "./NavLink";
import {
  IconArchive, IconChart, IconHome, IconList, IconLogout, IconMore, IconPlus, IconSettings, IconSwap, IconUsers,
} from "./Icons";
import { logoutAction, switchMemberAction } from "@/actions/auth";
import type { Can } from "@/lib/permissions";

type Item = { href: string; label: string; icon: React.ReactNode; show: boolean };

export default function AppShell({
  children, memberName, familyName, can,
}: {
  children: React.ReactNode;
  memberName: string;
  familyName: string;
  can: Can;
}) {
  const items: Item[] = [
    { href: "/dashboard", label: "لوحة التحكم", icon: <IconHome />, show: true },
    { href: "/transactions", label: "سجل العمليات", icon: <IconList />, show: true },
    { href: "/transactions/new", label: "إضافة عملية", icon: <IconPlus />, show: can.add },
    { href: "/reports", label: "التقارير", icon: <IconChart />, show: can.reports },
    { href: "/archive", label: "الأرشيف", icon: <IconArchive />, show: true },
    { href: "/family", label: "الأفراد", icon: <IconUsers />, show: can.admin },
    { href: "/settings", label: "الإعدادات", icon: <IconSettings />, show: can.admin },
  ].filter((i) => i.show);

  const primary = items.filter((i) => ["/dashboard", "/transactions", "/transactions/new", "/reports"].includes(i.href));
  const more = items.filter((i) => !primary.includes(i));

  return (
    <div className="min-h-dvh md:flex">
      {/* الشريط الجانبي (حاسوب) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-l border-line bg-card/40 p-5 md:flex">
        <Link href="/dashboard" aria-label="الصفحة الرئيسية"><Logo size="sm" /></Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="التنقل الرئيسي">
          {items.map((i) => (
            <NavLink key={i.href} href={i.href} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted transition hover:bg-card hover:text-ink" activeClassName="!bg-accent/10 !text-accent">
              {i.icon}{i.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t border-line pt-4">
          <div className="px-1 text-sm">
            <div className="truncate font-semibold">{memberName}</div>
            <div className="truncate text-xs text-muted">{familyName}</div>
          </div>
          <form action={switchMemberAction}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-sm text-muted transition hover:bg-card hover:text-ink"><IconSwap />تبديل الفرد</button>
          </form>
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-sm text-muted transition hover:bg-card hover:text-danger"><IconLogout />خروج كامل</button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* شريط علوي (هاتف) */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/dashboard" aria-label="الصفحة الرئيسية"><Logo size="sm" /></Link>
          <span className="max-w-[40%] truncate rounded-full border border-line px-3 py-1 text-xs text-muted">{memberName}</span>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-10">{children}</main>

        {/* شريط سفلي (هاتف) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="التنقل السفلي">
          <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
            {primary.map((i) => (
              <li key={i.href} className="flex-1">
                <NavLink href={i.href} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted transition" activeClassName="!text-accent">
                  {i.icon}<span className="max-w-full truncate">{i.label.replace("إضافة عملية", "إضافة").replace("سجل العمليات", "العمليات").replace("لوحة التحكم", "الرئيسية")}</span>
                </NavLink>
              </li>
            ))}
            <li className="relative flex-1">
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-col items-center gap-1 py-2.5 text-[11px] text-muted [&::-webkit-details-marker]:hidden">
                  <IconMore /><span>المزيد</span>
                </summary>
                <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl2 border border-line bg-card p-2 shadow-2xl">
                  {more.map((i) => (
                    <Link key={i.href} href={i.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-bg">{i.icon}{i.label}</Link>
                  ))}
                  <form action={switchMemberAction}>
                    <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-bg"><IconSwap />تبديل الفرد</button>
                  </form>
                  <form action={logoutAction}>
                    <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger hover:bg-bg"><IconLogout />خروج كامل</button>
                  </form>
                </div>
              </details>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
