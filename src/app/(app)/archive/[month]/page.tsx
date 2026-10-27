import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Pager, Stat } from "@/components/Bits";
import TxTable from "@/components/TxTable";
import { requireMember } from "@/lib/session";
import { fetchTransactions, listMembers, nameMap, queryTransactions } from "@/lib/data";
import { flowTotals } from "@/lib/ledger";
import { formatIQD, monthLabel, periodRange } from "@/lib/format";

export const metadata = { title: "سجل شهر | DAFTAR" };

export default async function ArchiveMonthPage({
  params, searchParams,
}: {
  params: Promise<{ month: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { month } = await params;
  const sp = await searchParams;
  const range = periodRange("month", month);
  if (!range) notFound();

  const ctx = await requireMember();
  const scope = { familyId: ctx.family.id, memberId: ctx.member.id, can: ctx.can };
  const [res, members, monthTxs] = await Promise.all([
    queryTransactions(scope, { q: sp.q, page: Number(sp.page) || 1, showVoided: true }, range),
    listMembers(ctx.family.id),
    fetchTransactions(scope, { from: range.from, to: range.to }),
  ]);
  const totals = flowTotals(monthTxs);
  const q = (sp.q ?? "").trim();

  return (
    <>
      <PageHeader title={monthLabel(month)} subtitle="سجل الشهر الكامل (بما فيه العمليات الملغاة)" actions={<Link href="/archive" className="btn-ghost">كل الأشهر</Link>} />
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="الوارد" value={formatIQD(totals.income)} tone="accent" />
        <Stat label="المصروف" value={formatIQD(totals.expense)} tone="danger" />
        <Stat label="الصافي" value={formatIQD(totals.net)} tone={totals.net < 0 ? "danger" : "accent"} />
        <Stat label="العمليات" value={totals.count.toLocaleString("en-US")} />
      </section>
      <form method="get" className="mb-5 flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">بحث في هذا الشهر</label>
        <input id="q" name="q" defaultValue={q} placeholder="بحث داخل هذا الشهر…" className="input max-w-md flex-1" />
        <button className="btn-primary !px-6 !py-2.5 !text-sm">بحث</button>
        {q && <Link href={`/archive/${month}`} className="btn-ghost">مسح</Link>}
      </form>
      <TxTable rows={res.rows} names={nameMap(members)} can={ctx.can} meId={ctx.member.id} back={`/archive/${month}${q ? `?q=${encodeURIComponent(q)}` : ""}`} />
      <Pager page={res.page} pageSize={res.pageSize} count={res.count} params={{ q }} base={`/archive/${month}`} />
    </>
  );
}
