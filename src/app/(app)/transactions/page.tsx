import Link from "next/link";
import { PageHeader, Flash, Pager } from "@/components/Bits";
import TxTable from "@/components/TxTable";
import { IconPlus } from "@/components/Icons";
import { requireMember } from "@/lib/session";
import { listMembers, nameMap, queryTransactions } from "@/lib/data";

export const metadata = { title: "سجل العمليات | DAFTAR" };

type SP = { q?: string; type?: string; category?: string; member?: string; from?: string; to?: string; voided?: string; page?: string; ok?: string; err?: string };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireMember();
  const scope = { familyId: ctx.family.id, memberId: ctx.member.id, can: ctx.can };
  const filters = { q: sp.q, type: sp.type, category: sp.category, member: sp.member, from: sp.from, to: sp.to, showVoided: sp.voided === "1", page: Number(sp.page) || 1 };

  const [{ rows, count, page, pageSize }, members] = await Promise.all([queryTransactions(scope, filters), listMembers(ctx.family.id)]);
  const names = nameMap(members);

  const keep = { q: sp.q, type: sp.type, category: sp.category, member: sp.member, from: sp.from, to: sp.to, voided: sp.voided };
  const qs = new URLSearchParams(Object.entries(keep).filter(([, v]) => v) as [string, string][]).toString();
  const back = `/transactions${qs ? `?${qs}` : ""}`;

  return (
    <>
      <PageHeader
        title="سجل العمليات"
        subtitle={`${count.toLocaleString("en-US")} عملية`}
        actions={ctx.can.add && <Link href="/transactions/new" className="btn-primary !px-5 !py-2.5 !text-sm"><IconPlus className="h-4 w-4" />إضافة عملية</Link>}
      />
      <Flash ok={sp.ok} err={sp.err} />

      <form method="get" className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" role="search">
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="q" className="label">بحث</label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="اسم الغرض، الوصف، الملاحظات…" className="input" />
        </div>
        {ctx.can.viewAll && (
          <div>
            <label htmlFor="member" className="label">الشخص</label>
            <select id="member" name="member" defaultValue={sp.member ?? ""} className="input">
              <option value="">الكل</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="type" className="label">النوع</label>
          <select id="type" name="type" defaultValue={sp.type ?? ""} className="input">
            <option value="">الكل</option>
            <option value="expense">مصروف</option>
            <option value="income">وارد</option>
            <option value="opening">رصيد افتتاحي</option>
          </select>
        </div>
        <div>
          <label htmlFor="category" className="label">التصنيف</label>
          <select id="category" name="category" defaultValue={sp.category ?? ""} className="input">
            <option value="">الكل</option>
            {ctx.settings.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="from" className="label">من تاريخ</label>
          <input id="from" name="from" type="date" defaultValue={sp.from} dir="ltr" className="input text-left" />
        </div>
        <div>
          <label htmlFor="to" className="label">إلى تاريخ</label>
          <input id="to" name="to" type="date" defaultValue={sp.to} dir="ltr" className="input text-left" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2 lg:col-span-2">
          <input type="checkbox" name="voided" value="1" defaultChecked={sp.voided === "1"} className="h-4 w-4 accent-[#D6FF3F]" />
          إظهار العمليات الملغاة
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-2 lg:justify-end">
          <button className="btn-primary !px-6 !py-2.5 !text-sm">تطبيق</button>
          <Link href="/transactions" className="btn-ghost">مسح</Link>
        </div>
      </form>

      <TxTable rows={rows} names={names} can={ctx.can} meId={ctx.member.id} back={back} />
      <Pager page={page} pageSize={pageSize} count={count} params={keep} base="/transactions" />
    </>
  );
}
