import Link from "next/link";
import { TypeBadge } from "./Bits";
import { formatDateTime, formatIQD } from "@/lib/format";
import { restoreTransactionAction, voidTransactionAction } from "@/actions/transactions";
import type { Can } from "@/lib/permissions";
import type { Tx } from "@/lib/types";

type Props = {
  rows: Tx[];
  names: Map<string, string>;
  can: Can;
  meId: string;
  back: string; // مسار العودة بعد الإجراء
  compact?: boolean;
};

function Amount({ t }: { t: Tx }) {
  const sign = t.type === "income" ? "+" : t.type === "expense" ? "−" : "";
  const color = t.deleted_at ? "text-muted line-through" : t.type === "income" ? "text-accent" : t.type === "expense" ? "text-danger" : "text-ink";
  return <span className={`whitespace-nowrap font-semibold tabular-nums ${color}`} dir="ltr">{sign}{formatIQD(t.amount)}</span>;
}

function Actions({ t, can, meId, back }: { t: Tx; can: Can; meId: string; back: string }) {
  if (t.type === "opening") return null;
  const mine = t.member_id === meId;
  const canEdit = can.editAll || (can.editOwn && mine);

  if (t.deleted_at) {
    return can.admin ? (
      <form action={restoreTransactionAction}>
        <input type="hidden" name="id" value={t.id} />
        <input type="hidden" name="back" value={back} />
        <button className="text-xs font-semibold text-accent hover:underline">استعادة</button>
      </form>
    ) : null;
  }
  if (!canEdit) return null;
  return (
    <div className="flex items-center gap-3">
      <Link href={`/transactions/${t.id}/edit`} className="text-xs font-semibold text-accent hover:underline">تعديل</Link>
      <details className="relative">
        <summary className="cursor-pointer list-none text-xs font-semibold text-danger hover:underline [&::-webkit-details-marker]:hidden">إلغاء</summary>
        <form action={voidTransactionAction} className="absolute left-0 z-10 mt-2 w-64 space-y-2 rounded-xl border border-line bg-card p-3 shadow-2xl">
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="back" value={back} />
          <label className="label !mb-0 text-xs" htmlFor={`r-${t.id}`}>سبب الإلغاء (اختياري)</label>
          <input id={`r-${t.id}`} name="reason" maxLength={300} className="input !py-2 text-sm" />
          <p className="text-[11px] leading-relaxed text-muted">لا تُحذف العملية؛ تبقى في السجل وتُستبعد من الحسابات.</p>
          <button className="btn-primary w-full !bg-danger !py-2 text-sm">تأكيد الإلغاء</button>
        </form>
      </details>
    </div>
  );
}

export default function TxTable({ rows, names, can, meId, back }: Props) {
  if (rows.length === 0) {
    return <div className="card p-8 text-center text-sm text-muted">لا توجد عمليات مطابقة.</div>;
  }
  return (
    <>
      {/* جدول (شاشات متوسطة فأكبر) */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-right text-xs text-muted">
              <th className="px-4 py-3 font-medium">التاريخ والوقت</th>
              <th className="px-4 py-3 font-medium">الشخص</th>
              <th className="px-4 py-3 font-medium">الغرض</th>
              <th className="px-4 py-3 font-medium">النوع</th>
              <th className="px-4 py-3 font-medium">التصنيف</th>
              <th className="px-4 py-3 font-medium">المبلغ</th>
              <th className="px-4 py-3 font-medium"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className={`border-b border-line/60 align-top last:border-0 ${t.deleted_at ? "opacity-60" : ""}`}>
                <td className="whitespace-nowrap px-4 py-3 text-muted" dir="ltr" style={{ textAlign: "right" }}>{formatDateTime(t.occurred_at)}</td>
                <td className="px-4 py-3">{names.get(t.member_id) ?? "—"}</td>
                <td className="max-w-[260px] px-4 py-3">
                  <div className="font-medium">{t.title}</div>
                  {t.description && <div className="mt-0.5 line-clamp-2 text-xs text-muted">{t.description}</div>}
                  {t.deleted_at && t.delete_reason && <div className="mt-0.5 text-xs text-danger">سبب الإلغاء: {t.delete_reason}</div>}
                </td>
                <td className="px-4 py-3"><TypeBadge type={t.type} voided={!!t.deleted_at} /></td>
                <td className="px-4 py-3 text-muted">{t.category}</td>
                <td className="px-4 py-3"><Amount t={t} /></td>
                <td className="px-4 py-3"><Actions t={t} can={can} meId={meId} back={back} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* بطاقات (هاتف) */}
      <ul className="space-y-3 md:hidden">
        {rows.map((t) => (
          <li key={t.id} className={`card p-4 ${t.deleted_at ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{t.title}</div>
                <div className="mt-0.5 text-xs text-muted">{names.get(t.member_id) ?? "—"} · {t.category}</div>
              </div>
              <Amount t={t} />
            </div>
            {t.description && <p className="mt-2 line-clamp-2 text-xs text-muted">{t.description}</p>}
            {t.deleted_at && t.delete_reason && <p className="mt-1 text-xs text-danger">سبب الإلغاء: {t.delete_reason}</p>}
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TypeBadge type={t.type} voided={!!t.deleted_at} />
                <span className="text-[11px] text-muted" dir="ltr">{formatDateTime(t.occurred_at)}</span>
              </div>
              <Actions t={t} can={can} meId={meId} back={back} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
