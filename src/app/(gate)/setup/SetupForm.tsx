"use client";

import { useActionState } from "react";
import { setupFamilyAction } from "@/actions/auth";
import { Message, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/types";

export default function SetupForm() {
  const [state, action] = useActionState<FormState, FormData>(setupFamilyAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <Message error={state.error} />
      <div>
        <label htmlFor="family" className="label">اسم العائلة</label>
        <input id="family" name="family" required maxLength={80} className="input" placeholder="مثال: عائلة أحمد" />
      </div>
      <div>
        <label htmlFor="name" className="label">اسمك (المشرف)</label>
        <input id="name" name="name" required maxLength={50} className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pin" className="label">رمز PIN (4–8 أرقام)</label>
          <input id="pin" name="pin" type="password" inputMode="numeric" autoComplete="off" required maxLength={8} dir="ltr" className="input text-center tracking-[.4em]" />
        </div>
        <div>
          <label htmlFor="pin2" className="label">تأكيد PIN</label>
          <input id="pin2" name="pin2" type="password" inputMode="numeric" autoComplete="off" required maxLength={8} dir="ltr" className="input text-center tracking-[.4em]" />
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted">لا يُخزَّن الـ PIN نصاً أبداً، بل بصيغة مشفّرة لا يمكن استرجاعها. إن نسيته يعيد المشرف تعيينه.</p>
      <SubmitButton className="btn-primary w-full" pendingText="جارٍ الإنشاء…">إنشاء الدفتر</SubmitButton>
    </form>
  );
}
