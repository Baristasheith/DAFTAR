import { redirect } from "next/navigation";
import { PageHeader } from "@/components/Bits";
import TransactionForm from "@/components/TransactionForm";
import { createTransactionAction } from "@/actions/transactions";
import { requireMember } from "@/lib/session";
import { localInputValue } from "@/lib/format";

export const metadata = { title: "إضافة عملية | DAFTAR" };

export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const ctx = await requireMember();
  if (!ctx.can.add) redirect("/transactions?err=" + encodeURIComponent("ليست لديك صلاحية إضافة عمليات."));
  const { type } = await searchParams;
  const initial = type === "income" ? "income" : "expense";
  // مفتاح فريد لهذا النموذج: يمنع تكرار الحفظ عند الضغط المتكرر
  const key = crypto.randomUUID();

  return (
    <>
      <PageHeader title="إضافة عملية" subtitle="سجّل مصروفاً أو مبلغاً وارداً. تتحدّث الإجماليات تلقائياً بعد الحفظ." />
      <TransactionForm
        action={createTransactionAction}
        idempotencyKey={key}
        categories={ctx.settings.categories}
        memberName={ctx.member.name}
        initialType={initial}
        submitLabel="حفظ العملية"
        defaults={{
          type: initial, title: "", category: initial === "income" ? "مبلغ وارد" : "", amount: "",
          description: "", notes: "", occurred_at: localInputValue(new Date()),
        }}
      />
    </>
  );
}
