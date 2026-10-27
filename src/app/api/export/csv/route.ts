import { NextResponse, type NextRequest } from "next/server";
import { getContext } from "@/lib/session";
import { can as canOf } from "@/lib/permissions";
import { fetchTransactions, listMembers, nameMap } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// حماية من حقن الصيغ عند فتح الملف في Excel
const cell = (v: string | number | null) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  const ctx = await getContext().catch(() => null);
  if (!ctx || !ctx.member) return new NextResponse("غير مصرّح", { status: 401 });
  const p = canOf(ctx.member);
  if (!p.reports) return new NextResponse("غير مصرّح", { status: 403 });

  const from = new Date(req.nextUrl.searchParams.get("from") ?? "");
  const to = new Date(req.nextUrl.searchParams.get("to") ?? "");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return new NextResponse("نطاق غير صالح", { status: 400 });
  const label = (req.nextUrl.searchParams.get("label") ?? "report").replace(/[^0-9A-Za-z-]/g, "").slice(0, 12) || "report";

  const scope = { familyId: ctx.family.id, memberId: ctx.member.id, can: p };
  const [txs, members] = await Promise.all([fetchTransactions(scope, { from, to, includeVoided: true }), listMembers(ctx.family.id)]);
  const names = nameMap(members);
  const typeAr = { income: "وارد", expense: "مصروف", opening: "رصيد افتتاحي" } as const;

  const head = ["التاريخ والوقت", "الشخص", "النوع", "الغرض", "التصنيف", "المبلغ (د.ع)", "الوصف", "الملاحظات", "الحالة"];
  const lines = txs.map((t) =>
    [formatDateTime(t.occurred_at), names.get(t.member_id) ?? "", typeAr[t.type], t.title, t.category, t.amount, t.description, t.notes, t.deleted_at ? "ملغاة" : "فعّالة"].map(cell).join(","),
  );
  const body = "﻿" + [head.map(cell).join(","), ...lines].join("\r\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="daftar-${label}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
