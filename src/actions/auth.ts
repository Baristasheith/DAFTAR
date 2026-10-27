"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";
import { env, REMEMBER_COOKIE } from "@/lib/env";
import { audit } from "@/lib/audit";
import { hashPin, pinProblem, verifyPin, MAX_FAILED, LOCK_MINUTES } from "@/lib/pin";
import { clearMemberCookie, getBase, setMemberCookie, signMemberToken } from "@/lib/session";
import { UUID_RE } from "@/lib/data";
import type { FormState } from "@/lib/types";

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export async function loginAction(_p: FormState, fd: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(fd.get("email"));
  const password = String(fd.get("password") ?? "");
  const remember = fd.get("remember") === "on";
  if (!email.success || !password) return { error: "أدخل البريد الإلكتروني وكلمة المرور." };

  const supabase = await createClient({ remember });
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) {
    // رسالة موحّدة: لا نكشف هل البريد موجود أم لا
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  }
  const store = await cookies();
  store.set(REMEMBER_COOKIE, remember ? "1" : "0", {
    httpOnly: true, sameSite: "lax", path: "/",
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: 60 * 60 * 24 * 90 } : {}),
  });
  await clearMemberCookie();
  redirect("/who");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearMemberCookie();
  redirect("/");
}

export async function switchMemberAction() {
  await clearMemberCookie();
  redirect("/who");
}

export async function forgotPasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(fd.get("email"));
  if (!email.success) return { error: "أدخل بريداً إلكترونياً صحيحاً." };

  const h = await headers();
  const origin = env.siteUrl() || h.get("origin") || `https://${h.get("host")}`;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  // نفس الرد دائماً (لا نكشف وجود الحساب)
  return { ok: "إن كان البريد مسجّلاً لدينا فقد أرسلنا إليه رابط الاستعادة. تحقق من صندوق الوارد والرسائل غير المرغوبة." };
}

export async function resetPasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  const pw = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (pw.length < 10) return { error: "كلمة المرور يجب ألا تقل عن 10 أحرف." };
  if (pw !== confirm) return { error: "كلمتا المرور غير متطابقتين." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "انتهت صلاحية رابط الاستعادة. اطلب رابطاً جديداً." };
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { error: "تعذر تغيير كلمة المرور. جرّب كلمة مرور أقوى أو اطلب رابطاً جديداً." };
  redirect("/who");
}

const setupSchema = z.object({
  family: z.string().trim().min(1, "اكتب اسم العائلة.").max(80),
  name: z.string().trim().min(1, "اكتب اسم المشرف.").max(50),
});

export async function setupFamilyAction(_p: FormState, fd: FormData): Promise<FormState> {
  const { user, family } = await getBase();
  if (family) redirect("/who");

  const parsed = setupSchema.safeParse({ family: fd.get("family"), name: fd.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const pin = String(fd.get("pin") ?? "");
  const pin2 = String(fd.get("pin2") ?? "");
  const problem = pinProblem(pin);
  if (problem) return { error: problem };
  if (pin !== pin2) return { error: "رمزا PIN غير متطابقين." };

  const admin = db();
  const { data: fam, error: e1 } = await admin
    .from("families")
    .insert({ owner_id: user.id, name: parsed.data.family })
    .select("id")
    .single();
  if (e1 || !fam) return { error: "تعذر إنشاء العائلة (ربما أُنشئت من قبل). حدّث الصفحة وحاول مجدداً." };

  const { data: mem, error: e2 } = await admin
    .from("members")
    .insert({
      family_id: fam.id,
      name: parsed.data.name,
      role: "admin",
      pin_hash: await hashPin(pin),
      permissions: { add: true, edit_own: true, view_all: true, reports: true },
    })
    .select("id")
    .single();
  if (e2 || !mem) return { error: "تعذر إنشاء حساب المشرف. حاول مرة أخرى." };

  await admin.from("settings").insert({ family_id: fam.id });
  await audit({ familyId: fam.id, actor: { id: mem.id, name: parsed.data.name }, action: "family.setup", entity: "family", entityId: fam.id });

  await setMemberCookie(await signMemberToken({ mid: mem.id, fid: fam.id, uid: user.id }));
  redirect("/dashboard");
}

export async function selectMemberAction(_p: FormState, fd: FormData): Promise<FormState> {
  const { user, family } = await getBase();
  if (!family) redirect("/setup");

  const memberId = String(fd.get("member_id") ?? "");
  const pin = String(fd.get("pin") ?? "");
  if (!UUID_RE.test(memberId)) return { error: "اختر اسمك أولاً." };
  if (pinProblem(pin)) return { error: "أدخل رمز PIN (4 إلى 8 أرقام)." };

  const admin = db();
  const { data: m } = await admin
    .from("members")
    .select("id,name,pin_hash,active,locked_until")
    .eq("id", memberId)
    .eq("family_id", family.id)
    .maybeSingle();

  const usable = !!m && m.active;
  const lockedMs = usable && m!.locked_until ? new Date(m!.locked_until).getTime() - Date.now() : 0;
  if (lockedMs > 0) {
    return { error: `تم إيقاف المحاولات مؤقتاً. حاول بعد ${Math.ceil(lockedMs / 60000)} دقيقة.` };
  }

  const ok = await verifyPin(pin, usable ? m!.pin_hash : null);
  if (!usable) return { error: "هذا الحساب غير متاح. تواصل مع المشرف." };

  if (!ok) {
    const { data } = await admin.rpc("register_pin_failure", { p_member: m!.id, p_max: MAX_FAILED, p_lock_minutes: LOCK_MINUTES });
    const row = Array.isArray(data) ? data[0] : data;
    await audit({ familyId: family.id, actor: null, action: "member.pin_failed", entity: "member", entityId: m!.id, details: { name: m!.name } });
    if (row?.o_locked_until) {
      return { error: `رمز غير صحيح. تم إيقاف المحاولات ${LOCK_MINUTES} دقيقة لحماية الحساب.` };
    }
    const left = Math.max(0, MAX_FAILED - (row?.o_failed ?? 0));
    return { error: `رمز PIN غير صحيح. تبقّى ${left} محاولات.` };
  }

  await admin.rpc("reset_pin_failures", { p_member: m!.id });
  await audit({ familyId: family.id, actor: { id: m!.id, name: m!.name }, action: "member.login", entity: "member", entityId: m!.id });
  await setMemberCookie(await signMemberToken({ mid: m!.id, fid: family.id, uid: user.id }));
  redirect("/dashboard");
}
