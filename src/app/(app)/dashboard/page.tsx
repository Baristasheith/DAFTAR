import Link from "next/link";
import { PageHeader, Stat, BarChart, HBars } from "@/components/Bits";
import TxTable from "@/components/TxTable";
import { IconDown, IconUp } from "@/components/Icons";
import { requireMember } from "@/lib/session";
import { fetchTransactions, listMembers, nameMap } from "@/lib/data";
import { expenseBy, lastMonthsSeries, summarize } from "@/lib/ledger";
import { formatIQD, monthKey, monthLabel } from "@/lib/format";

export const metadata = { title: "لوحة التحكم | DAFTAR" };

export default async function DashboardPage() {
  const ctx = await requireMember();
  const scope = { familyId: ctx.family.id, memberId: ctx.member.id, can: ctx.can };
  const now = new Date();

  const [txs, members] = await Promise.all([fetchTransactions(scope), listMembers(ctx.family.id)]);
  const names = nameMap(members);
  const s = summarize(txs, now);
  const series = lastMonthsSeries(txs, monthKey(now), 6, (k) => monthLabel(k).split(" ")[0]);
  const byCat = expenseBy(
    txs.filter((t) => monthKey(new Date(t.occurred_at)) === monthKey(now)),
    (t) => t.category,
  );
  const recent = txs.filter((t) => t.type !== "opening").slice(0, 8);

  return (
    <>
      <PageHeader
        title={`أهلاً ${ctx.member.name}`}
        subtitle={ctx.can.viewAll ? `الحساب المشترك لعائلة ${ctx.family.name}` : "تعرض هذه الصفحة عملياتك أنت فقط حسب صلاحياتك."}
        actions={
          ctx.can.add && (
            <>
              <Link href="/transactions/new?type=expense" className="btn-primary !px-5 !py-2.5 !text-sm"><IconUp className="h-4 w-4" />إضافة مصروف</Link>
              <Link href="/transactions/new?type=income" className="btn-ghost"><IconDown className="h-4 w-4" />إضافة مبلغ وارد</Link>
            </>
          )
        }
      />

      <section className="card relative mb-4 overflow-hidden p-6 sm:p-8" aria-label="الرصيد الحالي">
        <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <div className="text-sm text-muted">الرصيد الحالي</div>
          <div className={`mt-2 text-4xl font-bold tabular-nums sm:text-5xl ${s.balance < 0 ? "text-danger" : "text-accent"}`} dir="ltr" style={{ textAlign: "right" }}>
            {formatIQD(s.balance)}
          </div>
          <div className="mt-3 text-xs text-muted">
            = رصيد البداية {formatIQD(s.opening)} + الوارد {formatIQD(s.income)} − المصروفات {formatIQD(s.expense)}
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="الإجماليات">
        <Stat label="إجمالي الوارد" value={formatIQD(s.income)} tone="accent" />
        <Stat label="إجمالي المصروفات" value={formatIQD(s.expense)} tone="danger" />
        <Stat label="مصروفات اليوم" value={formatIQD(s.todayExpense)} />
        <Stat label="مصروفات الشهر الحالي" value={formatIQD(s.monthExpense)} hint={monthLabel(monthKey(now))} />
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h2 className="mb-4 font-semibold">آخر 6 أشهر</h2>
          <BarChart data={series} />
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">مصروفات الشهر حسب التصنيف</h2>
          <HBars rows={byCat} empty="لا توجد مصروفات هذا الشهر بعد." />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">آخر العمليات</h2>
          <Link href="/transactions" className="text-sm text-accent hover:underline">عرض الكل</Link>
        </div>
        {recent.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            لم تُسجَّل أي عملية بعد.{ctx.can.add && <> ابدأ بـ <Link href="/transactions/new" className="text-accent hover:underline">إضافة أول عملية</Link>.</>}
          </div>
        ) : (
          <TxTable rows={recent} names={names} can={ctx.can} meId={ctx.member.id} back="/dashboard" />
        )}
      </section>
    </>
  );
}
