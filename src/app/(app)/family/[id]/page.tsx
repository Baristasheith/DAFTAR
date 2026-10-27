import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Stat } from "@/components/Bits";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/supabase/admin";
import { UUID_RE, fetchTransactions } from "@/lib/data";
import { flowTotals } from "@/lib/ledger";
import { formatDateTime, formatIQD } from "@/lib/format";
import { MEMBER_COLS, type AuditRow, type Member } from "@/lib/types";

export const metadata = { title: "سجل نشاط فرد | DAFTAR" };

const ACTIONS: Record<string, string> = {
  "transaction.create": "أضاف عملية",
  "transaction.update": "عدّل عملية",
  "transaction.void": "ألغى عملية",
  "transaction.restore": "استعاد عملية",
  "opening.set": "سجّل رصيد البداية",
  "opening.update": "عدّل رصيد البداية",
  "member.login": "سجّل الدخول",
  "member.pin_failed": "محاولة PIN خاطئة",
  "member.add": "أضاف فرداً",
  "member.update": "عدّل فرداً",
  "member.pin_reset": "أعاد تعيين PIN",
  "member.activate": "فعّل فرداً",
  "member.deactivate": "عطّل فرداً",
  "settings.categories": "عدّل التصنيفات",
  "backup.export": "صدّر نسخة احتياطية",
  "backup.restore": "استعاد نسخة احتياطية",
  "admin.password_change": "غيّر كلمة مرور المشرف",
  "family.setup": "أنشأ الدفتر",
};

function summary(a: AuditRow): string {
  const d = a.details as { after?: { title?: string; amount?: number }; before?: { amount?: number }; name?: string };
  if (a.action.startsWith("transaction") || a.action.startsWith("opening")) {
    const title = d.after?.title;
    const amount = d.after?.amount;
    const before = d.before?.amount;
    const bits = [title, amount != null ? formatIQD(Number(amount)) : null, before != null ? `(كان ${formatIQD(Number(before))})` : null].filter(Boolean);
    return bits.join(" · ");
  }
  return d.name ?? "";
}

export default async function MemberActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const ctx = await requireAdmin();

  const { data: m } = await db().from("members").select(MEMBER_COLS).eq("id", id).eq("family_id", ctx.family.id).maybeSingle();
  if (!m) notFound();
  const member = m as unknown as Member;

  // نشاط الفرد نفسه + أحداث المحاولات الخاطئة المسجَّلة باسمه (details.name) لأنها بلا هوية موثّقة
  const { data: rows } = await db()
    .from("audit_log")
    .select("id,actor_member_id,actor_name,action,entity,entity_id,details,created_at")
    .eq("family_id", ctx.family.id)
    .or(`actor_member_id.eq.${id},and(action.eq.member.pin_failed,entity_id.eq.${id})`)
    .order("created_at", { ascending: false })
    .limit(100);
  const log = (rows ?? []) as unknown as AuditRow[];

  const txs = await fetchTransactions({ familyId: ctx.family.id, memberId: ctx.member.id, can: ctx.can });
  const mine = flowTotals(txs.filter((t) => t.member_id === id));

  return (
    <>
      <PageHeader title={`نشاط ${member.name}`} subtitle="آخر 100 حدث (سجل التدقيق للإضافة فقط ولا يُعدَّل)" actions={<Link href="/family" className="btn-ghost">رجوع</Link>} />
      <section className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="عمليات سجّلها" value={mine.count.toLocaleString("en-US")} />
        <Stat label="مصروفاته" value={formatIQD(mine.expense)} tone="danger" />
        <Stat label="وارداته" value={formatIQD(mine.income)} tone="accent" />
      </section>
      {log.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">لا يوجد نشاط مسجّل بعد.</div>
      ) : (
        <ol className="card divide-y divide-line">
          {log.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <div>
                <span className="font-medium">{ACTIONS[a.action] ?? a.action}</span>
                {summary(a) && <span className="mr-2 text-muted"> — {summary(a)}</span>}
              </div>
              <span className="text-xs text-muted" dir="ltr">{formatDateTime(a.created_at)}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
