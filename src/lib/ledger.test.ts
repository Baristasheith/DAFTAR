import { test } from "node:test";
import assert from "node:assert/strict";
import { activeOnly, expenseBy, flowTotals, monthlyRollup, summarize } from "./ledger";
import {
  dayKey, localInputToDate, localInputValue, monthKey, parseAmount, periodRange, shiftKey, startOfLocalDay,
} from "./format";

const base = { deleted_at: null as string | null };
const tx = (id: string, type: "income" | "expense" | "opening", amount: number, at: string, extra = {}) => ({
  id, type, amount, occurred_at: at, ...base, ...extra,
});

test("الرصيد = وارد − مصروف (مثال البرومبت: 100,000 − 50,000 = 50,000)", () => {
  const s = summarize([tx("a", "income", 100000, "2026-10-20T10:00:00Z"), tx("b", "expense", 50000, "2026-10-20T11:00:00Z")]);
  assert.equal(s.balance, 50000);
  assert.equal(s.income, 100000);
  assert.equal(s.expense, 50000);
});

test("الرصيد يبدأ من صفر عند عدم وجود رصيد افتتاحي، ويضيف الافتتاحي إن وُجد", () => {
  assert.equal(summarize([]).balance, 0);
  const s = summarize([tx("o", "opening", 200000, "2026-10-01T00:00:00Z"), tx("e", "expense", 50000, "2026-10-02T00:00:00Z")]);
  assert.equal(s.balance, 150000);
  assert.equal(s.income, 0); // الافتتاحي ليس "وارداً"
});

test("لا تُحسب العملية مرتين، ولا تُحسب الملغاة", () => {
  const e = tx("x", "expense", 30000, "2026-10-02T00:00:00Z");
  const voided = tx("v", "expense", 99999, "2026-10-02T00:00:00Z", { deleted_at: "2026-10-03T00:00:00Z" });
  const s = summarize([e, e, voided]);
  assert.equal(s.expense, 30000);
  assert.equal(activeOnly([e, e, voided]).length, 1);
});

test("مصروفات اليوم والشهر بتوقيت بغداد (منتصف الليل UTC+3)", () => {
  // 2026-10-26T21:30Z = 2026-10-27 00:30 بغداد -> اليوم والشهر الحالي
  const now = new Date("2026-10-27T10:00:00Z");
  const s = summarize(
    [
      tx("1", "expense", 1000, "2026-10-26T21:30:00Z"), // 27 أكتوبر بغداد
      tx("2", "expense", 2000, "2026-10-26T20:59:00Z"), // 26 أكتوبر 23:59 بغداد
      tx("3", "expense", 4000, "2026-09-30T21:30:00Z"), // 1 أكتوبر 00:30 بغداد
      tx("4", "expense", 8000, "2026-09-30T20:30:00Z"), // 30 سبتمبر 23:30 بغداد
    ],
    now,
  );
  assert.equal(s.todayExpense, 1000);
  assert.equal(s.monthExpense, 1000 + 2000 + 4000);
});

test("تجميع حسب الشخص/التصنيف يستثني الوارد", () => {
  const rows = expenseBy(
    [tx("1", "expense", 100, "2026-10-01T00:00:00Z", { c: "أ" }), tx("2", "expense", 50, "2026-10-01T00:00:00Z", { c: "أ" }), tx("3", "income", 999, "2026-10-01T00:00:00Z", { c: "ب" })],
    (t) => (t as unknown as { c: string }).c,
  );
  assert.deepEqual(rows, [{ label: "أ", value: 150 }]);
});

test("ملخص الأشهر والإجماليات", () => {
  const list = [tx("1", "income", 500, "2026-10-05T00:00:00Z"), tx("2", "expense", 200, "2026-10-06T00:00:00Z"), tx("3", "expense", 70, "2026-09-06T00:00:00Z")];
  assert.deepEqual(flowTotals(list), { income: 500, expense: 270, net: 230, count: 3 });
  const r = monthlyRollup(list);
  assert.equal(r[0].month, "2026-10");
  assert.equal(r[0].net, 300);
  assert.equal(r[1].month, "2026-09");
});

test("parseAmount: أرقام عربية وفواصل وعدم قبول الكسور/السالب/الصفر", () => {
  assert.equal(parseAmount("50,000"), 50000);
  assert.equal(parseAmount("٥٠٬٠٠٠"), 50000);
  assert.equal(parseAmount(" 1 250 000 "), 1250000);
  assert.equal(parseAmount("12.5"), null);
  assert.equal(parseAmount("-5"), null);
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount("0", { allowZero: true }), 0);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("999999999999999999"), null);
});

test("تحويل datetime-local من/إلى بغداد", () => {
  const d = localInputToDate("2026-10-27T02:31")!;
  assert.equal(d.toISOString(), "2026-10-26T23:31:00.000Z");
  assert.equal(localInputValue(d), "2026-10-27T02:31");
  assert.equal(localInputToDate("2026-02-30T10:00"), null);
  assert.equal(localInputToDate("garbage"), null);
});

test("نطاقات الفترات والتنقل بينها", () => {
  const day = periodRange("day", "2026-10-27")!;
  assert.equal(day.from.toISOString(), "2026-10-26T21:00:00.000Z");
  assert.equal(day.to.toISOString(), "2026-10-27T21:00:00.000Z");
  const month = periodRange("month", "2026-12")!;
  assert.equal(month.to.toISOString(), "2026-12-31T21:00:00.000Z");
  assert.equal(periodRange("month", "2026-13"), null);
  assert.equal(shiftKey("month", "2026-01", -1), "2025-12");
  assert.equal(shiftKey("day", "2026-03-01", -1), "2026-02-28");
  assert.equal(shiftKey("year", "2026", 1), "2027");
  assert.equal(dayKey(startOfLocalDay("2026-10-27")!), "2026-10-27");
  assert.equal(monthKey(new Date("2026-09-30T21:00:00Z")), "2026-10");
});
