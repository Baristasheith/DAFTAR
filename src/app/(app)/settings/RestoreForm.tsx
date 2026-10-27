"use client";

import { useActionState } from "react";
import { restoreBackupAction } from "@/actions/settings";
import { Message, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/types";

export default function RestoreForm() {
  const [state, action] = useActionState<FormState, FormData>(restoreBackupAction, {});
  return (
    <form action={action} className="space-y-4">
      <Message error={state.error} ok={state.ok} />
      <div>
        <label htmlFor="file" className="label">ملف النسخة الاحتياطية (.json) المُصدَّر من دفتر</label>
        <input id="file" name="file" type="file" accept="application/json,.json" required className="input file:ml-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-bg" />
      </div>
      <SubmitButton className="btn-ghost" pendingText="جارٍ الاستعادة…">استعادة (إضافة فقط)</SubmitButton>
    </form>
  );
}
