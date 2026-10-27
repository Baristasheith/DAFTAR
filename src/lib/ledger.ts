import { dayKey, localParts, monthKey } from "./format";
import type { Tx } from "./types";

/** العمليات الفعّالة فقط: بدون الملغاة وبدون تكرار نفس المعرّف (لا تُحسب عملية مرتين). */
export function activeOnly<T extends Pick<Tx, "id" | "deleted_at">>(txs: T[]): T[] {
  const seen = new Map<string, T>();
  for (const t of txs) {
    if (t.deleted_at) continue;
    if (!seen.has(t.id)) seen.set(t.id, t);
  }
  return [...seen.values()];
}

type Flow = Pick<Tx, "id" | "type" | "amount" | "occurred_at" | "deleted_at">;

export type Summary = {
  opening: number;
  income: number;
  expense: number;
  /** الرصيد = رصيد البداية + الوارد − المصروفات */
  balance: number;
  todayExpense: number;
  monthExpense: number;
  count: number;
};

export function summarize(txs: Flow[], now: Date = new Date()): Summary {
  const list = activeOnly(txs);
  const today = dayKey(now);
  const month = monthKey(now);
  let opening = 0, income = 0, expense = 0, todayExpense = 0, monthExpense = 0;
  for (const t of list) {
    if (t.type === "opening") opening += t.amount;
    else if (t.type === "income") income += t.amount;
    else {
      expense += t.amount;
      const d = new Date(t.occurred_at);
      if (dayKey(d) === today) todayExpense += t.amount;
      if (monthKey(d) === month) monthExpense += t.amount;
    }
  }
  return {
    opening, income, expense,
    balance: opening + income - expense,
    todayExpense, monthExpense,
    count: list.length,
  };
}

export type Totals = { income: number; expense: number; net: number; count: number };

/** إجماليات حركة فترة (بدون الرصيد الافتتاحي). */
export function flowTotals(txs: Flow[]): Totals {
  let income = 0, expense = 0, count = 0;
  for (const t of activeOnly(txs)) {
    if (t.type === "income") { income += t.amount; count++; }
    else if (t.type === "expense") { expense += t.amount; count++; }
  }
  return { income, expense, net: income - expense, count };
}

export function expenseBy<T extends Flow>(txs: T[], key: (t: T) => string) {
  const m = new Map<string, number>();
  for (const t of activeOnly(txs)) {
    if (t.type !== "expense") continue;
    const k = key(t);
    m.set(k, (m.get(k) ?? 0) + t.amount);
  }
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export type SeriesPoint = { label: string; income: number; expense: number };

function seriesBy(txs: Flow[], keyOf: (d: Date) => string, keys: string[], labelOf: (k: string) => string): SeriesPoint[] {
  const m = new Map(keys.map((k) => [k, { income: 0, expense: 0 }]));
  for (const t of activeOnly(txs)) {
    if (t.type === "opening") continue;
    const slot = m.get(keyOf(new Date(t.occurred_at)));
    if (!slot) continue;
    slot[t.type === "income" ? "income" : "expense"] += t.amount;
  }
  return keys.map((k) => ({ label: labelOf(k), ...m.get(k)! }));
}

/** آخر n أشهر تنتهي بالشهر المعطى (YYYY-MM). */
export function lastMonthsSeries(txs: Flow[], endMonth: string, n: number, labelOf: (k: string) => string) {
  const [y, m] = endMonth.split("-").map(Number);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.push(`${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return seriesBy(txs, monthKey, keys, labelOf);
}

export function daysOfMonthSeries(txs: Flow[], month: string) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const keys = Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  return seriesBy(txs, dayKey, keys, (k) => String(Number(k.slice(8))));
}

export function monthsOfYearSeries(txs: Flow[], year: string, labelOf: (k: string) => string) {
  const keys = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  return seriesBy(txs, monthKey, keys, labelOf);
}

export type MonthRow = { month: string; income: number; expense: number; net: number; count: number };

export function monthlyRollup(txs: Flow[]): MonthRow[] {
  const m = new Map<string, MonthRow>();
  for (const t of activeOnly(txs)) {
    if (t.type === "opening") continue;
    const k = monthKey(new Date(t.occurred_at));
    const row = m.get(k) ?? { month: k, income: 0, expense: 0, net: 0, count: 0 };
    if (t.type === "income") row.income += t.amount;
    else row.expense += t.amount;
    row.count++;
    row.net = row.income - row.expense;
    m.set(k, row);
  }
  return [...m.values()].sort((a, b) => (a.month < b.month ? 1 : -1));
}

export { localParts };
