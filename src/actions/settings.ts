"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { db } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { parseAmount } from "@/lib/format";
import { clearMemberCookie } from "@/lib/session";
import type { FormState } from "@/lib/types";

const back = (key: "ok" | "err", msg: string) => redirect(`/settings?${key}=${encodeURIComponent(msg)}`);

export async function changePasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireAdmin();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (!current) return { error: "أدخل كلمة المرور الحالية." };
  if (next.length < 10) return { error: "كلمة المرور الجديدة يجب ألا تقل عن 10 أحرف." };
  if (next !== confirm) return { error: "كلمتا المرور الجديدتان غير متطابقتين." };
  if (next === current) return { error: "الكلمة الجديدة مطابقة للحالية." };

  // نتحقق من الكلمة الحالية بعميل منفصل لا يكتب كوكيز
  const probe = createSupabase(env.supabaseUrl(), env.supabaseAnon(), { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: bad } = await probe.auth.signInWithPassword({ email: ctx.user.email ?? "", password: current });
  if (bad) return { error: "كلمة المرور الحالية غير صحيحة." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: "تعذر تغيير كلمة المرور. جرّب كلمة أقوى." };
  await audit({ familyId: ctx.family.id, actor: ctx.member, action: "admin.password_change", entity: "family", entityId: ctx.family.id });
  return { ok: "تم تغيير كلمة مرور المشرف." };
}

export async function signOutOthersAction(): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "others" });
  await audit({ familyId: ctx.family.id, actor: ctx.member, action: "admin.signout_others", entity: "family", entityId: ctx.family.id });
  back("ok", "تم تسجيل الخروج من جميع الأجهزة الأخرى.");
}

export async function signOutEverywhereAction(): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  await audit({ familyId: ctx.family.id, actor: ctx.member, action: "admin.signout_all", entity: "family", entityId: ctx.family.id });
  await clearMemberCookie();
  redirect("/login");
}

/** رصيد البداية: عملية افتتاحية موثقة (واحدة فقط لكل عائلة). تعديلها يُسجَّل في التدقيق. */
export async function openingBalanceAction(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const amount = parseAmount(String(fd.get("amount") ?? ""), { allowZero: true });
  if (amount === null) back("err", "المبلغ غير صالح: أدخل عدداً صحيحاً (يمكن أن يكون صفراً).");

  const { data: existing } = await db()
    .from("transactions")
    .select("id")
    .eq("family_id", ctx.family.id)
    .eq("type", "opening")
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    const { error } = await db().from("transactions").update({ amount, updated_by: ctx.member.id }).eq("id", existing.id).eq("family_id", ctx.family.id);
    if (error) back("err", "تعذر تعديل رصيد البداية.");
  } else {
    const { error } = await db().from("transactions").insert({
      family_id: ctx.family.id,
      member_id: ctx.member.id,
      created_by: ctx.member.id,
      updated_by: ctx.member.id,
      type: "opening",
      title: "رصيد البداية",
      category: "رصيد افتتاحي",
      amount,
      idempotency_key: crypto.randomUUID(),
    });
    if (error) back("err", "تعذر تسجيل رصيد البداية.");
  }
  back("ok", "تم حفظ رصيد البداية وتوثيقه كعملية افتتاحية.");
}

export async function categoriesAction(fd: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const list = String(fd.get("categories") ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const unique = [...new Set(list)];
  if (unique.length === 0) back("err", "أضف تصنيفاً واحداً على الأقل.");
  if (unique.length > 40 || unique.some((c) => c.length > 40)) back("err", "الحد الأقصى 40 تصنيفاً وطول كل تصنيف 40 حرفاً.");

  const { error } = await db().from("settings").update({ categories: unique, updated_at: new Date().toISOString() }).eq("family_id", ctx.family.id);
  if (error) back("err", "تعذر حفظ التصنيفات.");
  await audit({ familyId: ctx.family.id, actor: ctx.member, action: "settings.categories", entity: "settings", entityId: ctx.family.id, details: { count: unique.length } });
  back("ok", "تم حفظ التصنيفات. العمليات القديمة تحتفظ بتصنيفاتها.");
}

const backupSchema = z.object({
  app: z.literal("daftar"),
  version: z.literal(1),
  transactions: z
    .array(
      z.object({
        id: z.string().uuid(),
        member_name: z.string().min(1).max(50),
        type: z.enum(["income", "expense", "opening"]),
        title: z.string().min(1).max(120),
        category: z.string().min(1).max(40),
        amount: z.number().int().min(0).max(100_000_000_000),
        description: z.string().max(1000).nullable(),
        notes: z.string().max(1000).nullable(),
        occurred_at: z.string().datetime({ offset: true }),
        deleted_at: z.string().datetime({ offset: true }).nullable().optional(),
        delete_reason: z.string().max(300).nullable().optional(),
      }),
    )
    .max(20_000),
});

/**
 * استعادة آمنة (إضافية فقط): لا تحذف ولا تستبدل شيئاً.
 * تتحقق من صحة الملف كاملاً قبل أي كتابة، وتتخطى العمليات الموجودة (بنفس المعرّف)،
 * وترفض الملف إن كان فيه اسم فرد غير موجود في العائلة.
 */
export async function restoreBackupAction(_p: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "اختر ملف النسخة الاحتياطية (JSON)." };
  if (file.size > 8 * 1024 * 1024) return { error: "الملف كبير جداً (الحد 8 ميجابايت)." };

  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return { error: "الملف ليس JSON صالحاً." };
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) return { error: "بنية الملف غير مطابقة لنسخة دفتر الاحتياطية. لم يتم تغيير أي شيء." };

  const { data: members } = await db().from("members").select("id,name").eq("family_id", ctx.family.id);
  const byName = new Map((members ?? []).map((m) => [m.name.trim().toLowerCase(), m.id as string]));
  const unknown = [...new Set(parsed.data.transactions.map((t) => t.member_name).filter((n) => !byName.has(n.trim().toLowerCase())))];
  if (unknown.length) {
    return { error: `الملف يحتوي أفراداً غير موجودين في هذه العائلة: ${unknown.slice(0, 5).join("، ")}. أضفهم أولاً ثم أعد المحاولة. لم يتم تغيير أي شيء.` };
  }

  const ids = parsed.data.transactions.map((t) => t.id);
  const existing = new Set<string>();
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await db().from("transactions").select("id").eq("family_id", ctx.family.id).in("id", ids.slice(i, i + 500));
    (data ?? []).forEach((r) => existing.add(r.id as string));
  }
  const { data: hasOpening } = await db().from("transactions").select("id").eq("family_id", ctx.family.id).eq("type", "opening").is("deleted_at", null).maybeSingle();

  let openingTaken = !!hasOpening;
  const rows = [];
  let skipped = 0;
  for (const t of parsed.data.transactions) {
    if (existing.has(t.id)) { skipped++; continue; }
    if (t.type !== "opening" && t.amount === 0) { skipped++; continue; }
    if (t.type === "opening" && !t.deleted_at) {
      if (openingTaken) { skipped++; continue; }
      openingTaken = true;
    }
    const mid = byName.get(t.member_name.trim().toLowerCase())!;
    rows.push({
      id: t.id,
      family_id: ctx.family.id,
      member_id: mid,
      created_by: mid,
      updated_by: mid,
      type: t.type,
      title: t.title,
      category: t.category,
      amount: t.amount,
      description: t.description,
      notes: t.notes,
      occurred_at: t.occurred_at,
      idempotency_key: t.id, // يجعل إعادة الاستعادة آمنة (لا تكرار)
      deleted_at: t.deleted_at ?? null,
      deleted_by: t.deleted_at ? mid : null,
      delete_reason: t.delete_reason ?? null,
    });
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await db().from("transactions").insert(chunk);
    if (error) {
      await audit({ familyId: ctx.family.id, actor: ctx.member, action: "backup.restore_failed", entity: "family", details: { inserted, error: error.code } });
      return { error: `توقفت الاستعادة بعد إضافة ${inserted} عملية بسبب خطأ. يمكنك إعادة رفع نفس الملف بأمان، فالعمليات المضافة لن تتكرر.` };
    }
    inserted += chunk.length;
  }
  await audit({ familyId: ctx.family.id, actor: ctx.member, action: "backup.restore", entity: "family", details: { inserted, skipped } });
  return { ok: `اكتملت الاستعادة: أُضيفت ${inserted} عملية، وتم تخطي ${skipped} (موجودة مسبقاً أو غير صالحة).` };
}
