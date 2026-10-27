import { NextResponse } from "next/server";
import { getContext } from "@/lib/session";
import { can as canOf } from "@/lib/permissions";
import { db } from "@/lib/supabase/admin";
import { fetchTransactions, listMembers, nameMap } from "@/lib/data";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** نسخة كاملة (JSON) للمشرف فقط. لا تحتوي أي PIN أو هاش. */
export async function GET() {
  const ctx = await getContext().catch(() => null);
  if (!ctx || !ctx.member) return new NextResponse("غير مصرّح", { status: 401 });
  const p = canOf(ctx.member);
  if (!p.admin) return new NextResponse("للمشرف فقط", { status: 403 });

  const scope = { familyId: ctx.family.id, memberId: ctx.member.id, can: p };
  const [txs, members] = await Promise.all([fetchTransactions(scope, { includeVoided: true }), listMembers(ctx.family.id)]);
  const names = nameMap(members);

  const payload = {
    app: "daftar",
    version: 1,
    exported_at: new Date().toISOString(),
    family: ctx.family.name,
    currency: ctx.family.currency,
    members: members.map((m) => ({ name: m.name, role: m.role, active: m.active, permissions: m.permissions })),
    categories: ctx.settings.categories,
    transactions: txs.map((t) => ({
      id: t.id,
      member_name: names.get(t.member_id) ?? "",
      type: t.type,
      title: t.title,
      category: t.category,
      amount: t.amount,
      description: t.description,
      notes: t.notes,
      occurred_at: t.occurred_at,
      deleted_at: t.deleted_at,
      delete_reason: t.delete_reason,
    })),
  };

  await db().from("settings").update({ last_export_at: new Date().toISOString() }).eq("family_id", ctx.family.id);
  await audit({ familyId: ctx.family.id, actor: ctx.member, action: "backup.export", entity: "family", details: { transactions: txs.length } });

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="daftar-backup-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
