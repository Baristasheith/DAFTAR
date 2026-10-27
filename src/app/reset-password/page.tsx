"use client";

import { useActionState } from "react";
import AuthShell from "@/components/AuthShell";
import { resetPasswordAction } from "@/actions/auth";
import { Message, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/types";

export default function ResetPasswordPage() {
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <AuthShell title="كلمة مرور جديدة" subtitle="اختر كلمة مرور قوية لا تقل عن 10 أحرف." back={{ href: "/login", label: "العودة لتسجيل الدخول" }}>
      <form action={action} className="space-y-4" noValidate>
        <Message error={state.error} />
        <div>
          <label htmlFor="password" className="label">كلمة المرور الجديدة</label>
          <input id="password" name="password" type="password" dir="ltr" autoComplete="new-password" required minLength={10} className="input text-left" />
        </div>
        <div>
          <label htmlFor="confirm" className="label">تأكيد كلمة المرور</label>
          <input id="confirm" name="confirm" type="password" dir="ltr" autoComplete="new-password" required className="input text-left" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="جارٍ الحفظ…">حفظ كلمة المرور</SubmitButton>
      </form>
    </AuthShell>
  );
}
