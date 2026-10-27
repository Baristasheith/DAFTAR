import Link from "next/link";
import { formatIQD } from "@/lib/format";
import type { SeriesPoint } from "@/lib/ledger";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** رسائل النجاح/الخطأ القادمة من إعادة التوجيه (?ok= / ?err=). */
export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <div
      role={err ? "alert" : "status"}
      className={`mb-5 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
        err ? "border-danger/40 bg-danger/10 text-danger" : "border-accent/40 bg-accent/10 text-accent"
      }`}
    >
      {(err ?? ok)!.slice(0, 300)}
    </div>
  );
}

export function Stat({ label, value, tone = "default", hint }: { label: string; value: string; tone?: "default" | "accent" | "danger"; hint?: string }) {
  const color = tone === "accent" ? "text-accent" : tone === "danger" ? "text-danger" : "text-ink";
  return (
    <div className="card p-4 sm:p-5">
      <div className="text-xs text-muted sm:text-sm">{label}</div>
      <div className={`mt-2 text-xl font-bold tabular-nums sm:text-2xl ${color}`} dir="ltr" style={{ textAlign: "right" }}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function TypeBadge({ type, voided }: { type: string; voided?: boolean }) {
  if (voided) return <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">ملغاة</span>;
  const map: Record<string, string> = {
    income: "border-accent/40 bg-accent/10 text-accent",
    expense: "border-danger/40 bg-danger/10 text-danger",
    opening: "border-line bg-bg text-muted",
  };
  const label: Record<string, string> = { income: "وارد", expense: "مصروف", opening: "رصيد افتتاحي" };
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[type] ?? ""}`}>{label[type] ?? type}</span>;
}

/** مخطط أعمدة مزدوج (وارد/مصروف) بلا مكتبات خارجية. */
export function BarChart({ data, height = 160 }: { data: SeriesPoint[]; height?: number }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const dense = data.length > 12;
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-accent" />وارد</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-danger" />مصروف</span>
      </div>
      <div className="flex items-end gap-1 sm:gap-2" style={{ height }} role="img" aria-label="مخطط الوارد والمصروف">
        {data.map((d, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end justify-center gap-0.5" title={`${d.label}\nوارد: ${formatIQD(d.income)}\nمصروف: ${formatIQD(d.expense)}`}>
            <div className="w-full max-w-3 rounded-t bg-accent/90 transition-all duration-500" style={{ height: `${(d.income / max) * 100}%`, minHeight: d.income ? 2 : 0 }} />
            <div className="w-full max-w-3 rounded-t bg-danger/90 transition-all duration-500" style={{ height: `${(d.expense / max) * 100}%`, minHeight: d.expense ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1 sm:gap-2" aria-hidden="true">
        {data.map((d, i) => (
          <div key={i} className={`flex-1 truncate text-center text-muted ${dense ? "text-[9px]" : "text-[10px] sm:text-xs"}`}>
            {dense && i % 2 === 1 ? "" : d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HBars({ rows, empty = "لا توجد بيانات." }: { rows: { label: string; value: number }[]; empty?: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="space-y-3">
      {rows.slice(0, 8).map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted" dir="ltr">{formatIQD(r.value)} · {Math.round((r.value / total) * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Pager({ page, pageSize, count, params, base }: { page: number; pageSize: number; count: number; params: Record<string, string | undefined>; base: string }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${base}?${sp.toString()}`;
  };
  return (
    <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="الصفحات">
      {page > 1 ? <Link className="btn-ghost" href={href(page - 1)}>السابق</Link> : <span />}
      <span className="text-muted">صفحة {page} من {pages}</span>
      {page < pages ? <Link className="btn-ghost" href={href(page + 1)}>التالي</Link> : <span />}
    </nav>
  );
}
