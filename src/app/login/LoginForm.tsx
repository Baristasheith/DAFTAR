"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { Message, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/types";

export default function LoginForm({ notice }: { notice?: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4" noValidate>
      <Message error={state.error ?? notice} />
      <div>
        <label htmlFor="email" className="label">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" dir="ltr" autoComplete="username" required className="input text-left" placeholder="admin@example.com" />
      </div>
      <div>
        <label htmlFor="password" className="label">كلمة المرور</label>
        <div className="relative">
          <input id="password" name="password" type={show ? "text" : "password"} dir="ltr" autoComplete="current-password" required className="input pl-20 text-left" />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-accent"
          >
            {show ? "إخفاء" : "إظهار"}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-muted">
          <input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-[#D6FF3F]" />
          تذكرني على هذا الجهاز
        </label>
        <Link href="/forgot-password" className="text-muted transition hover:text-accent">نسيت كلمة المرور؟</Link>
      </div>
      <SubmitButton className="btn-primary w-full" pendingText="جارٍ الدخول…">دخول</SubmitButton>
    </form>
  );
}
