"use client";

import { useActionState } from "react";
import AuthShell from "@/components/AuthShell";
import { forgotPasswordAction } from "@/actions/auth";
import { Message, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/types";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <AuthShell
      title="استعادة كلمة مرور المشرف"
      subtitle="اكتب بريد المشرف وسنرسل رابطاً لتعيين كلمة مرور جديدة."
      back={{ href: "/login", label: "العودة لتسجيل الدخول" }}
    >
      <form action={action} className="space-y-4" noValidate>
        <Message error={state.error} ok={state.ok} />
        <div>
          <label htmlFor="email" className="label">البريد الإلكتروني</label>
          <input id="email" name="email" type="email" dir="ltr" required autoComplete="email" className="input text-left" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="جارٍ الإرسال…">إرسال الرابط</SubmitButton>
      </form>
    </AuthShell>
  );
}
