"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { hashPin, pinProblem } from "@/lib/pin";
import { UUID_RE } from "@/lib/data";

const back = (key: "ok" | "err", msg: string) => redirect(`/family?${key}=${encodeURIComponent(msg)}`);
const on = (fd: FormData, k: string) => fd.get(k) === "on";

export async function addMemberAction(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  const pin = String(fd.get("pin") ?? "");
  if (!name || name.length > 50) back("err", "اكتب اسم الفرد (حتى 50 حرفاً).");
  const problem = pinProblem(pin);
  if (problem) back("err", problem);

  const { data, error } = await db()
    .from("members")
    .insert({
      family_id: ctx.family.id,
      name,
      role: "member",
      pin_hash: await hashPin(pin),
      permissions: { add: on(fd, "add"), edit_own: on(fd, "edit_own"), view_all: on(fd, "view_all"), reports: on(fd, "reports") },
    })
    .select("id")
    .single();
  if (error) back("err", error.code === "23505" ? "يوجد فرد بنفس الاسم." : "تعذرت إضافة الفرد.");
  await audit({ familyId: ctx.family.id, actor: ctx.member, action: "member.add", entity: "member", entityId: data!.id, details: { name } });
  back("ok", `تمت إضافة ${name}. أخبره برمز PIN شخصياً.`);
}

export async function updateMemberAction(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (!UUID_RE.test(id)) back("err", "فرد غير صالح.");
  if (!name || name.length > 50) back("err", "الاسم غير صالح.");

  const { data: m } = await db().from("members").select("id,name,role,permissions").eq("id", id).eq("family_id", ctx.family.id).maybeSingle();
  if (!m) back("err", "الفرد غير موجود.");

  const patch: Record<string, unknown> = { name };
  // صلاحيات المشرف ثابتة ولا تُقلَّص
  if (m!.role !== "admin") {
    patch.permissions = { add: on(fd, "add"), edit_own: on(fd, "edit_own"), view_all: on(fd, "view_all"), reports: on(fd, "reports") };
  }
  const { error } = await db().from("members").update(patch).eq("id", id).eq("family_id", ctx.family.id);
  if (error) back("err", error.code === "23505" ? "يوجد فرد بنفس الاسم." : "تعذر حفظ التعديل.");
  await audit({
    familyId: ctx.family.id, actor: ctx.member, action: "member.update", entity: "member", entityId: id,
    details: { before: { name: m!.name, permissions: m!.permissions }, after: patch },
  });
  back("ok", "تم حفظ التعديلات.");
}

export async function resetPinAction(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const pin = String(fd.get("pin") ?? "");
  if (!UUID_RE.test(id)) back("err", "فرد غير صالح.");
  const problem = pinProblem(pin);
  if (problem) back("err", problem);

  const { data: m } = await db().from("members").select("id,name").eq("id", id).eq("family_id", ctx.family.id).maybeSingle();
  if (!m) back("err", "الفرد غير موجود.");
  const { error } = await db()
    .from("members")
    .update({ pin_hash: await hashPin(pin), failed_attempts: 0, locked_until: null })
    .eq("id", id)
    .eq("family_id", ctx.family.id);
  if (error) back("err", "تعذر تغيير الـ PIN.");
  // لا يُسجَّل الـ PIN نفسه في أي مكان
  await audit({ familyId: ctx.family.id, actor: ctx.member, action: "member.pin_reset", entity: "member", entityId: id, details: { name: m!.name } });
  back("ok", `تم تعيين PIN جديد لـ ${m!.name}.`);
}

export async function toggleActiveAction(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!UUID_RE.test(id)) back("err", "فرد غير صالح.");
  const { data: m } = await db().from("members").select("id,name,role,active").eq("id", id).eq("family_id", ctx.family.id).maybeSingle();
  if (!m) back("err", "الفرد غير موجود.");
  if (m!.role === "admin") back("err", "لا يمكن تعطيل حساب المشرف.");

  const next = !m!.active;
  const { error } = await db().from("members").update({ active: next }).eq("id", id).eq("family_id", ctx.family.id);
  if (error) back("err", "تعذر تغيير الحالة.");
  await audit({ familyId: ctx.family.id, actor: ctx.member, action: next ? "member.activate" : "member.deactivate", entity: "member", entityId: id, details: { name: m!.name } });
  back("ok", next ? `تم تفعيل ${m!.name}.` : `تم تعطيل ${m!.name}. تبقى عملياته القديمة محفوظة.`);
}
