"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { selectMemberAction } from "@/actions/auth";
import { Message, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/types";

type M = { id: string; name: string; role: "admin" | "member"; locked: boolean };

export default function MemberPicker({ members }: { members: M[] }) {
  const [selected, setSelected] = useState<M | null>(null);
  const [state, action] = useActionState<FormState, FormData>(selectMemberAction, {});
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected) pinRef.current?.focus();
  }, [selected]);
  // بعد رفض الـ PIN نفرّغ الحقل ونعيد التركيز
  useEffect(() => {
    if (state.error && pinRef.current) {
      pinRef.current.value = "";
      pinRef.current.focus();
    }
  }, [state]);

  if (members.length === 0) {
    return <p className="text-sm text-muted">لا يوجد أفراد فعّالون. تواصل مع المشرف.</p>;
  }

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="list">
        {members.map((m) => {
          const active = selected?.id === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setSelected(m)}
                aria-pressed={active}
                className={`group flex w-full flex-col items-center gap-2 rounded-xl2 border p-4 transition duration-200 hover:-translate-y-0.5 ${
                  active ? "border-accent bg-accent/10" : "border-line bg-bg hover:border-accent/60"
                }`}
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold transition ${
                    active ? "bg-accent text-bg" : "bg-card text-ink group-hover:text-accent"
                  }`}
                  aria-hidden="true"
                >
                  {m.name.trim().charAt(0)}
                </span>
                <span className="max-w-full truncate text-sm font-semibold">{m.name}</span>
                {m.role === "admin" && <span className="text-[11px] text-accent">مشرف</span>}
                {m.locked && <span className="text-[11px] text-danger">مقفل مؤقتاً</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <form action={action} className="mt-6 space-y-4 rounded-xl2 border border-line bg-bg p-5 animate-rise">
          <input type="hidden" name="member_id" value={selected.id} />
          <label htmlFor="pin" className="label">
            رمز PIN لـ <span className="text-ink">{selected.name}</span>
          </label>
          <input
            ref={pinRef}
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            required
            dir="ltr"
            className="input text-center text-2xl tracking-[.5em]"
            aria-describedby="pin-msg"
          />
          <div id="pin-msg"><Message error={state.error} /></div>
          <SubmitButton className="btn-primary w-full" pendingText="جارٍ التحقق…">دخول</SubmitButton>
        </form>
      )}
    </div>
  );
}
