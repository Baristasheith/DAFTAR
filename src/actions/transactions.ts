"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/session";
import { parseTxForm } from "@/lib/txForm";
import { UUID_RE } from "@/lib/data";
import type { FormState } from "@/lib/types";

const flash = (path: string, key: "ok" | "err", msg: string) =>
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(msg)}`);

export async function createTransactionAction(_p: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireMember();
  if (!ctx.can.add) return { error: "ليست لديك صلاحية إضافة عمليات." };

  const parsed = parseTxForm(fd);
  if ("error" in parsed) return { error: parsed.error };

  const key = String(fd.get("idempotency_key") ?? "");
  if (!UUID_RE.test(key)) return { error: "انتهت صلاحية النموذج. حدّث الصفحة وأعد المحاولة." };

  const { error } = await db().from("transactions").insert({
    family_id: ctx.family.id,
    member_id: ctx.member.id,
    created_by: ctx.member.id,
    updated_by: ctx.member.id,
    idempotency_key: key,
    ...parsed.value,
  });
  // 23505 = نفس مفتاح الحفظ: ضغطة مكررة على "حفظ". العملية محفوظة مرة واحدة، نعتبره نجاحاً.
  if (error && error.code !== "23505") return { error: "تعذر حفظ العملية. حاول مرة أخرى." };

  redirect("/transactions?ok=" + encodeURIComponent("تم حفظ العملية."));
}

export async function updateTransactionAction(_p: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireMember();
  const id = String(fd.get("id") ?? "");
  const version = String(fd.get("version") ?? "");
  if (!UUID_RE.test(id)) return { error: "عملية غير صالحة." };

  const { data: row } = await db()
    .from("transactions")
    .select("id,member_id,type,deleted_at,updated_at")
    .eq("id", id)
    .eq("family_id", ctx.family.id)
    .maybeSingle();
  if (!row) return { error: "العملية غير موجودة." };
  if (row.type === "opening") return { error: "الرصيد الافتتاحي يُعدَّل من صفحة الإعدادات." };
  if (row.deleted_at) return { error: "هذه العملية ملغاة ولا يمكن تعديلها." };

  const allowed = ctx.can.editAll || (ctx.can.editOwn && row.member_id === ctx.member.id);
  if (!allowed) return { error: "ليست لديك صلاحية تعديل هذه العملية." };

  const parsed = parseTxForm(fd);
  if ("error" in parsed) return { error: parsed.error };

  // تعديل متفائل: إن عدّلها شخص آخر بعد فتح النموذج نرفض بدل الكتابة فوق تعديله
  const { data: updated, error } = await db()
    .from("transactions")
    .update({ ...parsed.value, updated_by: ctx.member.id })
    .eq("id", id)
    .eq("family_id", ctx.family.id)
    .eq("updated_at", version)
    .is("deleted_at", null)
    .select("id");
  if (error) return { error: "تعذر حفظ التعديل. حاول مرة أخرى." };
  if (!updated || updated.length === 0) return { error: "تم تعديل هذه العملية من جهة أخرى. أعد فتحها لرؤية آخر نسخة." };

  redirect("/transactions?ok=" + encodeURIComponent("تم حفظ التعديل وتسجيله في سجل التدقيق."));
}

/** إلغاء عملية (وسم فقط): تبقى في السجل وتُستبعد من الحسابات. لا حذف نهائي. */
export async function voidTransactionAction(fd: FormData): Promise<void> {
  const ctx = await requireMember();
  const back = String(fd.get("back") ?? "/transactions");
  const safeBack = back.startsWith("/") && !back.startsWith("//") ? back : "/transactions";
  const id = String(fd.get("id") ?? "");
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300);
  if (!UUID_RE.test(id)) flash(safeBack, "err", "عملية غير صالحة.");

  const { data: row } = await db()
    .from("transactions")
    .select("id,member_id,type,deleted_at")
    .eq("id", id)
    .eq("family_id", ctx.family.id)
    .maybeSingle();
  if (!row) flash(safeBack, "err", "العملية غير موجودة.");
  if (row!.type === "opening") flash(safeBack, "err", "الرصيد الافتتاحي يُدار من الإعدادات.");
  if (row!.deleted_at) flash(safeBack, "err", "العملية ملغاة مسبقاً.");
  if (!(ctx.can.editAll || (ctx.can.editOwn && row!.member_id === ctx.member.id))) {
    flash(safeBack, "err", "ليست لديك صلاحية إلغاء هذه العملية.");
  }

  const { error } = await db()
    .from("transactions")
    .update({ deleted_at: new Date().toISOString(), deleted_by: ctx.member.id, delete_reason: reason || null, updated_by: ctx.member.id })
    .eq("id", id)
    .eq("family_id", ctx.family.id)
    .is("deleted_at", null);
  if (error) flash(safeBack, "err", "تعذر إلغاء العملية.");
  flash(safeBack, "ok", "تم إلغاء العملية. تبقى ظاهرة في السجل ولا تدخل في الحسابات.");
}

export async function restoreTransactionAction(fd: FormData): Promise<void> {
  const ctx = await requireMember();
  const back = String(fd.get("back") ?? "/transactions");
  const safeBack = back.startsWith("/") && !back.startsWith("//") ? back : "/transactions";
  if (!ctx.can.admin) flash(safeBack, "err", "استعادة العمليات الملغاة للمشرف فقط.");
  const id = String(fd.get("id") ?? "");
  if (!UUID_RE.test(id)) flash(safeBack, "err", "عملية غير صالحة.");

  const { error } = await db()
    .from("transactions")
    .update({ deleted_at: null, deleted_by: null, delete_reason: null, updated_by: ctx.member.id })
    .eq("id", id)
    .eq("family_id", ctx.family.id)
    .not("deleted_at", "is", null);
  if (error) flash(safeBack, "err", "تعذرت الاستعادة.");
  flash(safeBack, "ok", "تمت استعادة العملية.");
}
