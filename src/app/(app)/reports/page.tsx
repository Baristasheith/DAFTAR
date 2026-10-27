import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Stat, BarChart, HBars } from "@/components/Bits";
import { IconDownload } from "@/components/Icons";
import { requireMember } from "@/lib/session";
import { fetchTransactions, listMembers, nameMap } from "@/lib/data";
import { daysOfMonthSeries, expenseBy, flowTotals, monthsOfYearSeries } from "@/lib/ledger";
import {
  dayKey, formatIQD, monthKey, monthLabel, periodLabel, periodRange, shiftKey, yearKey, type Period,
} from "@/lib/format";

export const metadata = { title: "التقارير | DAFTAR" };

const TABS: { id: Period; label: string }[] = [
  { id: "day", label: "يومي" },
  { id: "month", label: "شهري" },
  { id: "year", label: "سنوي" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ p?: string; k?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireMember();
  if (!ctx.can.reports) redirect("/dashboard");

  const period: Period = sp.p === "day" || sp.p === "year" ? sp.p : "month";
  const now = new Date();
  const defaultKey = period === "day" ? dayKey(now) : period === "year" ? yearKey(now) : monthKey(now);
  let key = sp.k ?? defaultKey;
  let range = periodRange(period, key);
  if (!range) { key = defaultKey; range = periodRange(period, key)!; }

  const scope = { familyId: ctx.family.id, memberId: ctx.member.id, can: ctx.can };
  const [txs, members] = await Promise.all([fetchTransactions(scope, { from: range.from, to: range.to }), listMembers(ctx.family.id)]);
  const names = nameMap(members);

  const totals = flowTotals(txs);
  const byMember = expenseBy(txs, (t) => names.get(t.member_id) ?? "—");
  const byCat = expenseBy(txs, (t) => t.category);
  const series =
    period === "month" ? daysOfMonthSeries(txs, key) : period === "year" ? monthsOfYearSeries(txs, key, (k) => monthLabel(k).split(" ")[0]) : null;

  const link = (p: Period, k?: string) => `/reports?p=${p}${k ? `&k=${k}` : ""}`;
  const exportHref = `/api/export/csv?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}&label=${encodeURIComponent(key)}`;

  return (
    <>
      <PageHeader
        title="التقارير"
        subtitle={periodLabel(period, key)}
        actions={<a href={exportHref} className="btn-ghost"><IconDownload className="h-4 w-4" />تصدير CSV</a>}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-line bg-card p-1" role="tablist" aria-label="نوع التقرير">
          {TABS.map((t) => (
            <Link key={t.id} href={link(t.id)} role="tab" aria-selected={period === t.id}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${period === t.id ? "bg-accent text-bg" : "text-muted hover:text-ink"}`}>
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={link(period, shiftKey(period, key, -1))} className="btn-ghost !px-4 !py-2" aria-label="الفترة السابقة">السابق</Link>
          <Link href={link(period, shiftKey(period, key, 1))} className="btn-ghost !px-4 !py-2" aria-label="الفترة التالية">التالي</Link>
        </div>
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="إجمالي الوارد" value={formatIQD(totals.income)} tone="accent" />
        <Stat label="إجمالي المصروف" value={formatIQD(totals.expense)} tone="danger" />
        <Stat label="صافي الحركة" value={formatIQD(totals.net)} tone={totals.net < 0 ? "danger" : "accent"} hint="الوارد − المصروف" />
        <Stat label="عدد العمليات" value={totals.count.toLocaleString("en-US")} />
      </section>

      {series && (
        <section className="card mb-5 p-5">
          <h2 className="mb-4 font-semibold">{period === "month" ? "الحركة اليومية" : "الحركة الشهرية"}</h2>
          <BarChart data={series} />
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold">المصروفات حسب الشخص</h2>
          <HBars rows={byMember} empty="لا توجد مصروفات في هذه الفترة." />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-semibold">المصروفات حسب التصنيف</h2>
          <HBars rows={byCat} empty="لا توجد مصروفات في هذه الفترة." />
        </div>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        تقارير الفترة تعرض حركة الوارد والمصروف فقط (بدون رصيد البداية). الرصيد الحالي الكامل في لوحة التحكم. العمليات الملغاة لا تدخل في أي رقم.
        {!ctx.can.viewAll && " تُعرض هنا عملياتك أنت فقط حسب صلاحياتك."}
      </p>
    </>
  );
}
