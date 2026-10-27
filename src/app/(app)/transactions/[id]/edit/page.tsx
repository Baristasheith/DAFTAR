import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/Bits";
import TransactionForm from "@/components/TransactionForm";
import { updateTransactionAction } from "@/actions/transactions";
import { requireMember } from "@/lib/session";
import { db } from "@/lib/supabase/admin";
import { UUID_RE, listMembers, nameMap } from "@/lib/data";
import { localInputValue } from "@/lib/format";
import { TX_COLS, type Tx } from "@/lib/types";

export const metadata = { title: "تعديل عملية | DAFTAR" };

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const ctx = await requireMember();

  const { data } = await db().from("transactions").select(TX_COLS).eq("id", id).eq("family_id", ctx.family.id).maybeSingle();
  const t = data as Tx | null;
  if (!t) notFound();
  if (t.type === "opening") redirect("/settings");
  if (t.deleted_at) redirect("/transactions?err=" + encodeURIComponent("هذه العملية ملغاة."));
  if (!(ctx.can.editAll || (ctx.can.editOwn && t.member_id === ctx.member.id))) {
    redirect("/transactions?err=" + encodeURIComponent("ليست لديك صلاحية تعديل هذه العملية."));
  }
  const owner = nameMap(await listMembers(ctx.family.id)).get(t.member_id) ?? "—";

  return (
    <>
      <PageHeader title="تعديل عملية" subtitle="كل تعديل يُسجَّل في سجل التدقيق باسم من عدّل ومتى." />
      <TransactionForm
        action={updateTransactionAction}
        hidden={{ id: t.id, version: t.updated_at }}
        categories={ctx.settings.categories}
        memberName={owner}
        submitLabel="حفظ التعديل"
        defaults={{
          type: t.type as "income" | "expense", title: t.title, category: t.category,
          amount: t.amount.toLocaleString("en-US"), description: t.description ?? "", notes: t.notes ?? "",
          occurred_at: localInputValue(new Date(t.occurred_at)),
        }}
      />
    </>
  );
}
