"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText = "جارٍ التنفيذ…",
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      )}
      {pending ? pendingText : children}
    </button>
  );
}

export function Message({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
        error ? "border-danger/40 bg-danger/10 text-danger" : "border-accent/40 bg-accent/10 text-accent"
      }`}
    >
      {error ?? ok}
    </div>
  );
}
