import "server-only";
import { db } from "./supabase/admin";
import { addDays, DAY_RE, startOfLocalDay } from "./format";
import { MEMBER_COLS, TX_COLS, type Member, type Tx } from "./types";
import type { Can } from "./permissions";

type Scope = { familyId: string; memberId: string; can: Can };

const PAGE = 1000;
const HARD_CAP = 50_000;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** كل العمليات الفعّالة ضمن نطاق (مع تقسيم صفحات لتجاوز حد 1000 صف في Supabase). */
export async function fetchTransactions(
  s: Scope,
  opts: { from?: Date; to?: Date; includeVoided?: boolean } = {},
): Promise<Tx[]> {
  const out: Tx[] = [];
  for (let i = 0; i < HARD_CAP; i += PAGE) {
    let q = db().from("transactions").select(TX_COLS).eq("family_id", s.familyId);
    if (!s.can.viewAll) q = q.eq("member_id", s.memberId);
    if (!opts.includeVoided) q = q.is("deleted_at", null);
    if (opts.from) q = q.gte("occurred_at", opts.from.toISOString());
    if (opts.to) q = q.lt("occurred_at", opts.to.toISOString());
    const { data, error } = await q.order("occurred_at", { ascending: false }).order("id").range(i, i + PAGE - 1);
    if (error) throw new Error("تعذر قراءة العمليات");
    const rows = (data ?? []) as unknown as Tx[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export type TxFilters = {
  q?: string;
  type?: string;
  category?: string;
  member?: string;
  from?: string;
  to?: string;
  month?: string; // YYYY-MM (للأرشيف)
  showVoided?: boolean;
  page?: number;
  pageSize?: number;
};

/** استعلام مُقسَّم لصفحات مع تصفية. كل المدخلات تُنقّى قبل دخولها في صيغة PostgREST. */
export async function queryTransactions(s: Scope, f: TxFilters, range?: { from: Date; to: Date }) {
  const pageSize = f.pageSize ?? 25;
  const page = Math.max(1, f.page ?? 1);

  let q = db().from("transactions").select(TX_COLS, { count: "exact" }).eq("family_id", s.familyId);
  if (!s.can.viewAll) q = q.eq("member_id", s.memberId);
  else if (f.member && UUID_RE.test(f.member)) q = q.eq("member_id", f.member);
  if (!f.showVoided) q = q.is("deleted_at", null);
  if (f.type && ["income", "expense", "opening"].includes(f.type)) q = q.eq("type", f.type);
  if (f.category) q = q.eq("category", f.category.slice(0, 40));

  const from = range?.from ?? (f.from && DAY_RE.test(f.from) ? startOfLocalDay(f.from) : null);
  const to = range?.to ?? (f.to && DAY_RE.test(f.to) ? (() => { const d = startOfLocalDay(f.to!); return d ? addDays(d, 1) : null; })() : null);
  if (from) q = q.gte("occurred_at", from.toISOString());
  if (to) q = q.lt("occurred_at", to.toISOString());

  const term = (f.q ?? "").replace(/[,()"\\%*_:.]/g, " ").trim().slice(0, 60);
  if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,notes.ilike.%${term}%,category.ilike.%${term}%`);

  const { data, count, error } = await q
    .order("occurred_at", { ascending: false })
    .order("id")
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error("تعذر قراءة العمليات");
  return { rows: (data ?? []) as unknown as Tx[], count: count ?? 0, page, pageSize };
}

export async function listMembers(familyId: string, onlyActive = false): Promise<Member[]> {
  let q = db().from("members").select(MEMBER_COLS).eq("family_id", familyId);
  if (onlyActive) q = q.eq("active", true);
  const { data, error } = await q.order("created_at");
  if (error) throw new Error("تعذر قراءة الأفراد");
  return (data ?? []) as unknown as Member[];
}

export function nameMap(members: Pick<Member, "id" | "name">[]) {
  return new Map(members.map((m) => [m.id, m.name]));
}
