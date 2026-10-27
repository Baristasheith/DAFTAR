import Link from "next/link";
import { PageHeader, Pager } from "@/components/Bits";
import TxTable from "@/components/TxTable";
import { requireMember } from "@/lib/session";
import { fetchTransactions, listMembers, nameMap, queryTransactions } from "@/lib/data";
import { monthlyRollup } from "@/lib/ledger";
import { formatIQD, monthLabel } from "@/lib/format";

export const metadata = { title: "الأرشيف | DAFTAR" };

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireMember();
  const scope = { familyId: ctx.family.id, memberId: ctx.member.id, can: ctx.can };
  const q = (sp.q ?? "").trim();

  const search = (
    <form method="get" className="mb-6 flex flex-wrap gap-2" role="search">
      <label htmlFor="q" className="sr-only">بحث في الأرشيف</label>
      <input id="q" name="q" defaultValue={q} placeholder="ابحث في كل العمليات القديمة…" className="input max-w-md flex-1" />
      <button className="btn-primary !px-6 !py-2.5 !text-sm">بحث</button>
      {q && <Link href="/archive" className="btn-ghost">مسح</Link>}
    </form>
  );

  if (q) {
    const [res, members] = await Promise.all([queryTransactions(scope, { q, page: Number(sp.page) || 1, showVoided: true }), listMembers(ctx.family.id)]);
    return (
      <>
        <PageHeader title="الأرشيف" subtitle={`نتائج البحث عن «${q.slice(0, 60)}»: ${res.count.toLocaleString("en-US")}`} />
        {search}
        <TxTable rows={res.rows} names={nameMap(members)} can={ctx.can} meId={ctx.member.id} back={`/archive?q=${encodeURIComponent(q)}`} />
        <Pager page={res.page} pageSize={res.pageSize} count={res.count} params={{ q }} base="/archive" />
      </>
    );
  }

  const months = monthlyRollup(await fetchTransactions(scope));
  return (
    <>
      <PageHeader title="الأرشيف" subtitle="كل الأشهر محفوظة. لا تُحذف البيانات ولا تُصفَّر الحسابات عند بداية شهر جديد." />
      {search}
      {months.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">لا توجد عمليات مؤرشفة بعد.</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((m) => (
            <li key={m.month}>
              <Link href={`/archive/${m.month}`} className="card block p-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent/60">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{monthLabel(m.month)}</span>
                  <span className="text-xs text-muted">{m.count.toLocaleString("en-US")} عملية</span>
                </div>
                <dl className="mt-4 space-y-1.5 text-sm" dir="rtl">
                  <div className="flex justify-between"><dt className="text-muted">الوارد</dt><dd className="tabular-nums text-accent" dir="ltr">{formatIQD(m.income)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">المصروف</dt><dd className="tabular-nums text-danger" dir="ltr">{formatIQD(m.expense)}</dd></div>
                  <div className="flex justify-between border-t border-line pt-1.5"><dt className="text-muted">الصافي</dt><dd className="font-semibold tabular-nums" dir="ltr">{formatIQD(m.net)}</dd></div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
