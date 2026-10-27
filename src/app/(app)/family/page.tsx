import Link from "next/link";
import { PageHeader, Flash } from "@/components/Bits";
import { SubmitButton } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { listMembers } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { PERMISSION_LABELS } from "@/lib/permissions";
import { addMemberAction, resetPinAction, toggleActiveAction, updateMemberAction } from "@/actions/members";
import type { Member, Permissions } from "@/lib/types";

export const metadata = { title: "الأفراد | DAFTAR" };

function PermChecks({ p, disabled }: { p: Permissions; disabled?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(Object.keys(PERMISSION_LABELS) as (keyof Permissions)[]).map((k) => (
        <label key={k} className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name={k} defaultChecked={disabled ? true : p[k]} disabled={disabled} className="h-4 w-4 accent-[#D6FF3F]" />
          {PERMISSION_LABELS[k]}
        </label>
      ))}
    </div>
  );
}

function MemberCard({ m }: { m: Member }) {
  const locked = !!m.locked_until && new Date(m.locked_until) > new Date();
  const isAdmin = m.role === "admin";
  return (
    <li className={`card p-5 ${m.active ? "" : "opacity-70"}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bg text-lg font-bold text-accent" aria-hidden="true">{m.name.trim().charAt(0)}</span>
          <div>
            <div className="font-semibold">{m.name}</div>
            <div className="text-xs text-muted">
              {isAdmin ? "مشرف" : "فرد"} · {m.active ? "فعّال" : "معطّل"}{locked && " · مقفل مؤقتاً"}
              {m.last_login_at && ` · آخر دخول ${formatDateTime(m.last_login_at)}`}
            </div>
          </div>
        </div>
        <Link href={`/family/${m.id}`} className="text-sm text-accent hover:underline">سجل النشاط</Link>
      </div>

      <form action={updateMemberAction} className="space-y-3">
        <input type="hidden" name="id" value={m.id} />
        <div>
          <label className="label" htmlFor={`n-${m.id}`}>الاسم</label>
          <input id={`n-${m.id}`} name="name" defaultValue={m.name} required maxLength={50} className="input" />
        </div>
        <PermChecks p={m.permissions} disabled={isAdmin} />
        {isAdmin && <p className="text-xs text-muted">المشرف يملك كل الصلاحيات دائماً.</p>}
        <SubmitButton className="btn-ghost" pendingText="جارٍ الحفظ…">حفظ الاسم والصلاحيات</SubmitButton>
      </form>

      <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <form action={resetPinAction} className="flex items-end gap-2">
          <input type="hidden" name="id" value={m.id} />
          <div className="flex-1">
            <label className="label" htmlFor={`p-${m.id}`}>PIN جديد (4–8 أرقام)</label>
            <input id={`p-${m.id}`} name="pin" type="password" inputMode="numeric" maxLength={8} autoComplete="off" required dir="ltr" className="input text-center tracking-[.3em]" />
          </div>
          <SubmitButton className="btn-ghost shrink-0" pendingText="…">تعيين</SubmitButton>
        </form>
        {!isAdmin && (
          <form action={toggleActiveAction} className="flex items-end sm:justify-end">
            <input type="hidden" name="id" value={m.id} />
            <SubmitButton className={`btn-ghost ${m.active ? "hover:!border-danger hover:!text-danger" : ""}`} pendingText="…">
              {m.active ? "تعطيل الحساب" : "تفعيل الحساب"}
            </SubmitButton>
          </form>
        )}
      </div>
    </li>
  );
}

export default async function FamilyPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireAdmin();
  const members = await listMembers(ctx.family.id);

  return (
    <>
      <PageHeader title="أفراد العائلة" subtitle="أضف الأفراد وحدّد رمز PIN وصلاحيات كل واحد. التعطيل لا يحذف عملياته القديمة." />
      <Flash ok={sp.ok} err={sp.err} />

      <section className="card mb-6 p-5 sm:p-6" aria-labelledby="add-h">
        <h2 id="add-h" className="mb-4 font-semibold">إضافة فرد جديد</h2>
        <form action={addMemberAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="new-name">الاسم</label>
              <input id="new-name" name="name" required maxLength={50} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="new-pin">رمز PIN (4–8 أرقام)</label>
              <input id="new-pin" name="pin" type="password" inputMode="numeric" maxLength={8} autoComplete="off" required dir="ltr" className="input text-center tracking-[.3em]" />
            </div>
          </div>
          <PermChecks p={{ add: true, edit_own: true, view_all: true, reports: true }} />
          <SubmitButton pendingText="جارٍ الإضافة…">إضافة الفرد</SubmitButton>
        </form>
      </section>

      <ul className="grid gap-4 lg:grid-cols-2">
        {members.map((m) => <MemberCard key={m.id} m={m} />)}
      </ul>
    </>
  );
}
