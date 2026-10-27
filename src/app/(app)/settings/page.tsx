import { PageHeader, Flash } from "@/components/Bits";
import { SubmitButton } from "@/components/ui";
import { IconDownload } from "@/components/Icons";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/supabase/admin";
import { formatDateTime, formatIQD } from "@/lib/format";
import { categoriesAction, openingBalanceAction, signOutEverywhereAction, signOutOthersAction } from "@/actions/settings";
import ChangePasswordForm from "./ChangePasswordForm";
import RestoreForm from "./RestoreForm";

export const metadata = { title: "الإعدادات | DAFTAR" };

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section className="card mb-5 p-5 sm:p-6" aria-labelledby={id}>
      <h2 id={id} className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireAdmin();

  const { data: opening } = await db()
    .from("transactions").select("amount,occurred_at")
    .eq("family_id", ctx.family.id).eq("type", "opening").is("deleted_at", null).maybeSingle();

  return (
    <>
      <PageHeader title="الإعدادات والنسخ الاحتياطي" subtitle={`حساب المشرف: ${ctx.user.email ?? ""}`} />
      <Flash ok={sp.ok} err={sp.err} />

      <Section id="opening" title="رصيد البداية">
        <p className="mb-4 text-sm leading-relaxed text-muted">
          يُسجَّل كعملية افتتاحية موثّقة (واحدة فقط) ويدخل في معادلة الرصيد: رصيد البداية + الوارد − المصروفات. تعديله يُسجَّل في سجل التدقيق.
          {opening ? <> الحالي: <b className="text-ink" dir="ltr">{formatIQD(Number(opening.amount))}</b>.</> : " لم يُحدَّد بعد (يبدأ الحساب من صفر)."}
        </p>
        <form action={openingBalanceAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label htmlFor="opening" className="label">المبلغ (دينار عراقي)</label>
            <input id="opening" name="amount" inputMode="numeric" dir="ltr" required defaultValue={opening ? Number(opening.amount).toLocaleString("en-US") : ""} className="input text-left tabular-nums" placeholder="0" />
          </div>
          <SubmitButton className="btn-ghost" pendingText="جارٍ الحفظ…">حفظ</SubmitButton>
        </form>
      </Section>

      <Section id="cats" title="التصنيفات">
        <form action={categoriesAction} className="space-y-3">
          <label htmlFor="categories" className="label">تصنيف في كل سطر</label>
          <textarea id="categories" name="categories" rows={8} required defaultValue={ctx.settings.categories.join("\n")} className="input resize-y" />
          <SubmitButton className="btn-ghost" pendingText="جارٍ الحفظ…">حفظ التصنيفات</SubmitButton>
        </form>
      </Section>

      <Section id="pw" title="كلمة مرور المشرف">
        <ChangePasswordForm />
      </Section>

      <Section id="sessions" title="الجلسات">
        <p className="mb-4 text-sm leading-relaxed text-muted">
          جلسة الفرد (بعد إدخال PIN) تنتهي تلقائياً بعد 12 ساعة. هنا تتحكم بجلسة حساب المشرف على الأجهزة.
        </p>
        <div className="flex flex-wrap gap-3">
          <form action={signOutOthersAction}><SubmitButton className="btn-ghost" pendingText="…">خروج من الأجهزة الأخرى</SubmitButton></form>
          <form action={signOutEverywhereAction}><SubmitButton className="btn-ghost hover:!border-danger hover:!text-danger" pendingText="…">خروج من كل الأجهزة (وهذا الجهاز)</SubmitButton></form>
        </div>
      </Section>

      <Section id="backup" title="النسخ الاحتياطي والتصدير">
        <div className="mb-5 rounded-xl border border-line bg-bg p-4 text-sm leading-relaxed">
          <div className="mb-2 font-semibold">ما هو مُعدّ فعلياً في التطبيق</div>
          <ul className="list-disc space-y-1 pr-5 text-muted">
            <li>تصدير يدوي كامل (JSON) تحمّله وتحتفظ به بنفسك. آخر تصدير: <b className="text-ink">{ctx.settings.last_export_at ? formatDateTime(ctx.settings.last_export_at) : "لم يتم بعد"}</b>.</li>
            <li>استعادة آمنة من ملف التصدير: إضافة فقط، لا تحذف ولا تستبدل شيئاً، وتتخطى ما هو موجود.</li>
            <li>حماية من الحذف: لا يمكن حذف العمليات نهائياً من التطبيق ولا من قاعدة البيانات (الإلغاء فقط).</li>
          </ul>
          <div className="mb-2 mt-4 font-semibold text-danger">ما لا يعمل تلقائياً ويحتاج تفعيلك أنت</div>
          <ul className="list-disc space-y-1 pr-5 text-muted">
            <li>
              النسخ الاحتياطية التلقائية لقاعدة البيانات يوفّرها <b>Supabase</b> نفسه حسب خطتك، وليس هذا التطبيق. في الخطة المجانية لا توجد نسخ تلقائية يمكنك الاعتماد عليها؛ تحقق من
              Project Settings ← Database ← Backups.
            </li>
            <li>التصدير اليدوي ليس بديلاً عن النسخ التلقائية. اقتراح: صدّر نسخة أسبوعياً واحفظها خارج الجهاز.</li>
            <li>لا تثق بأي نسخة قبل اختبار استعادتها فعلياً على مشروع تجريبي.</li>
          </ul>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold">تصدير البيانات</h3>
            <p className="mb-3 text-sm text-muted">ملف JSON بكل العمليات (بما فيها الملغاة) وأسماء الأفراد. لا يحتوي أي PIN.</p>
            <a href="/api/export" className="btn-primary !px-5 !py-2.5 !text-sm"><IconDownload className="h-4 w-4" />تحميل نسخة كاملة</a>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">استعادة نسخة</h3>
            <p className="mb-3 text-sm text-muted">يجب أن تكون أسماء الأفراد في الملف موجودة في العائلة. يُفحص الملف كاملاً قبل أي كتابة.</p>
            <RestoreForm />
          </div>
        </div>
      </Section>
    </>
  );
}
