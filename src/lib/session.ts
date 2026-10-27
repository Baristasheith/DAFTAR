import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import { createClient } from "./supabase/server";
import { db } from "./supabase/admin";
import { can } from "./permissions";
import { MEMBER_COLS, type Family, type Member, type Settings } from "./types";

export const MEMBER_COOKIE = "daftar_member";
const MEMBER_TTL_HOURS = 12;

type Claims = { mid: string; fid: string; uid: string };

export async function signMemberToken(c: Claims) {
  return new SignJWT({ ...c })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MEMBER_TTL_HOURS}h`)
    .sign(env.sessionSecret());
}

async function readMemberToken(token: string): Promise<Claims | null> {
  try {
    const { payload } = await jwtVerify(token, env.sessionSecret(), { algorithms: ["HS256"] });
    if (typeof payload.mid !== "string" || typeof payload.fid !== "string" || typeof payload.uid !== "string") return null;
    return { mid: payload.mid, fid: payload.fid, uid: payload.uid };
  } catch {
    return null;
  }
}

export async function setMemberCookie(token: string) {
  const store = await cookies();
  store.set(MEMBER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MEMBER_TTL_HOURS * 3600,
  });
}

export async function clearMemberCookie() {
  const store = await cookies();
  store.delete(MEMBER_COOKIE);
}

/** المشرف (Supabase Auth) + عائلته. يعيد التوجيه لتسجيل الدخول أو الإعداد الأولي عند الحاجة. */
export const getBase = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const { data: family } = await db()
    .from("families")
    .select("id,owner_id,name,currency,timezone")
    .eq("owner_id", user.id)
    .maybeSingle();
  return { user, family: (family as Family | null) ?? null };
});

/** هوية كاملة: المشرف + العائلة + الفرد الموثّق (إن وُجد). كل شيء يُتحقق منه على الخادم في كل طلب. */
export const getContext = cache(async () => {
  const { user, family } = await getBase();
  if (!family) redirect("/setup");

  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  let member: Member | null = null;
  if (token) {
    const c = await readMemberToken(token);
    if (c && c.uid === user.id && c.fid === family.id) {
      const { data } = await db()
        .from("members")
        .select(MEMBER_COLS)
        .eq("id", c.mid)
        .eq("family_id", family.id)
        .eq("active", true)
        .maybeSingle();
      member = (data as Member | null) ?? null;
    }
  }

  const { data: s } = await db()
    .from("settings")
    .select("family_id,categories,last_export_at")
    .eq("family_id", family.id)
    .maybeSingle();

  const settings: Settings = (s as Settings | null) ?? {
    family_id: family.id,
    categories: ["أخرى"],
    last_export_at: null,
  };

  return { user, family, member, settings };
});

export async function requireMember() {
  const ctx = await getContext();
  if (!ctx.member) redirect("/who");
  return { ...ctx, member: ctx.member, can: can(ctx.member) };
}

export async function requireAdmin() {
  const ctx = await requireMember();
  if (!ctx.can.admin) redirect("/dashboard");
  return ctx;
}
