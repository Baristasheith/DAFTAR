"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/settings";
import { Message, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/types";

export default function ChangePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <Message error={state.error} ok={state.ok} />
      <div>
        <label htmlFor="current" className="label">كلمة المرور الحالية</label>
        <input id="current" name="current" type="password" dir="ltr" autoComplete="current-password" required className="input text-left" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="next" className="label">كلمة المرور الجديدة (10 أحرف فأكثر)</label>
          <input id="next" name="next" type="password" dir="ltr" autoComplete="new-password" required minLength={10} className="input text-left" />
        </div>
        <div>
          <label htmlFor="confirm" className="label">تأكيد الجديدة</label>
          <input id="confirm" name="confirm" type="password" dir="ltr" autoComplete="new-password" required className="input text-left" />
        </div>
      </div>
      <SubmitButton className="btn-ghost" pendingText="جارٍ الحفظ…">تغيير كلمة المرور</SubmitButton>
    </form>
  );
}
