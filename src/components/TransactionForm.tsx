"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Message, SubmitButton } from "./ui";
import type { FormState } from "@/lib/types";

type Defaults = {
  type: "income" | "expense";
  title: string;
  category: string;
  amount: string;
  description: string;
  notes: string;
  occurred_at: string;
};

export default function TransactionForm({
  action, defaults, categories, memberName, idempotencyKey, hidden, submitLabel, initialType,
}: {
  action: (p: FormState, fd: FormData) => Promise<FormState>;
  defaults: Defaults;
  categories: string[];
  memberName: string;
  idempotencyKey?: string;
  hidden?: Record<string, string>;
  submitLabel: string;
  initialType?: "income" | "expense";
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [type, setType] = useState<"income" | "expense">(initialType ?? defaults.type);
  const [amount, setAmount] = useState(defaults.amount);

  const cats = categories.includes(defaults.category) || !defaults.category ? categories : [defaults.category, ...categories];

  // تنسيق المبلغ بفواصل أثناء الكتابة (والخادم يعيد التحقق دائماً)
  const onAmount = (v: string) => {
    const digits = v.replace(/[^\d٠-٩۰-۹]/g, "").replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)));
    setAmount(digits ? Number(digits).toLocaleString("en-US") : "");
  };

  return (
    <form action={formAction} className="card space-y-5 p-5 sm:p-7" noValidate>
      <Message error={state.error} />
      {idempotencyKey && <input type="hidden" name="idempotency_key" value={idempotencyKey} />}
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}

      <fieldset>
        <legend className="label">نوع العملية</legend>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-bg p-1">
          {([["expense", "مصروف"], ["income", "مبلغ وارد"]] as const).map(([v, label]) => (
            <label
              key={v}
              className={`cursor-pointer rounded-lg py-2.5 text-center text-sm font-semibold transition ${
                type === v ? (v === "income" ? "bg-accent text-bg" : "bg-danger text-bg") : "text-muted hover:text-ink"
              }`}
            >
              <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <span className="label">الشخص</span>
        <div className="input cursor-not-allowed text-muted" aria-readonly="true">{memberName}</div>
        <p className="mt-1 text-xs text-muted">يُؤخذ تلقائياً من هويتك الموثّقة ولا يمكن تغييره.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className="label">اسم الغرض أو السلعة</label>
          <input id="title" name="title" required maxLength={120} defaultValue={defaults.title} className="input" placeholder="مثال: شراء حليب" />
        </div>
        <div>
          <label htmlFor="category" className="label">التصنيف</label>
          <select id="category" name="category" required defaultValue={defaults.category || cats[0]} className="input">
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="amount" className="label">المبلغ (دينار عراقي)</label>
          <div className="relative">
            <input
              id="amount" name="amount" required inputMode="numeric" autoComplete="off" dir="ltr"
              value={amount} onChange={(e) => onAmount(e.target.value)}
              className="input pl-14 text-left text-lg font-semibold tabular-nums" placeholder="50,000"
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted">د.ع</span>
          </div>
        </div>
        <div>
          <label htmlFor="occurred_at" className="label">التاريخ والوقت</label>
          <input id="occurred_at" name="occurred_at" type="datetime-local" required defaultValue={defaults.occurred_at} dir="ltr" className="input text-left" />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="label">وصف تفصيلي (اختياري)</label>
        <textarea id="description" name="description" rows={2} maxLength={1000} defaultValue={defaults.description} className="input resize-y" />
      </div>
      <div>
        <label htmlFor="notes" className="label">ملاحظات (اختياري)</label>
        <textarea id="notes" name="notes" rows={2} maxLength={1000} defaultValue={defaults.notes} className="input resize-y" />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SubmitButton pendingText="جارٍ الحفظ…">{submitLabel}</SubmitButton>
        <Link href="/transactions" className="btn-ghost">إلغاء</Link>
      </div>
    </form>
  );
}
