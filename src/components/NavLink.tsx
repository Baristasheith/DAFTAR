"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href, className = "", activeClassName = "", children,
}: {
  href: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  // "/transactions" لا يُفعَّل داخل "/transactions/new"
  const exact = href === "/transactions" ? path === href || /^\/transactions\/[0-9a-f-]{36}/.test(path) : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} aria-current={exact ? "page" : undefined} className={`${className} ${exact ? activeClassName : ""}`}>
      {children}
    </Link>
  );
}
