// كل التواريخ تُخزَّن UTC في قاعدة البيانات، وتُعرض وتُجمَّع بتوقيت بغداد (UTC+3 ثابت، بلا توقيت صيفي).
export const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;

const p2 = (n: number) => String(n).padStart(2, "0");

export const ARABIC_MONTHS = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
];

export function localParts(d: Date) {
  const l = new Date(d.getTime() + TZ_OFFSET_MS);
  return {
    y: l.getUTCFullYear(),
    m: l.getUTCMonth() + 1,
    d: l.getUTCDate(),
    h: l.getUTCHours(),
    min: l.getUTCMinutes(),
    dow: l.getUTCDay(),
  };
}

export const dayKey = (d: Date) => {
  const p = localParts(d);
  return `${p.y}-${p2(p.m)}-${p2(p.d)}`;
};
export const monthKey = (d: Date) => dayKey(d).slice(0, 7);
export const yearKey = (d: Date) => dayKey(d).slice(0, 4);

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-\d{2}$/;
export const YEAR_RE = /^\d{4}$/;

/** بداية يوم محلي (00:00 بغداد) كـ Date بتوقيت UTC. */
export function startOfLocalDay(key: string): Date | null {
  if (!DAY_RE.test(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) - TZ_OFFSET_MS;
  const back = new Date(t + TZ_OFFSET_MS);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== m - 1 || back.getUTCDate() !== d) return null;
  return new Date(t);
}

export function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86400000);
}

export type Period = "day" | "month" | "year";

/** نطاق فترة: from شاملة و to حصرية. */
export function periodRange(period: Period, key: string): { from: Date; to: Date } | null {
  if (period === "day") {
    const from = startOfLocalDay(key);
    return from ? { from, to: addDays(from, 1) } : null;
  }
  if (period === "month") {
    if (!MONTH_RE.test(key)) return null;
    const [y, m] = key.split("-").map(Number);
    if (m < 1 || m > 12) return null;
    return {
      from: new Date(Date.UTC(y, m - 1, 1) - TZ_OFFSET_MS),
      to: new Date(Date.UTC(y, m, 1) - TZ_OFFSET_MS),
    };
  }
  if (!YEAR_RE.test(key)) return null;
  const y = Number(key);
  return {
    from: new Date(Date.UTC(y, 0, 1) - TZ_OFFSET_MS),
    to: new Date(Date.UTC(y + 1, 0, 1) - TZ_OFFSET_MS),
  };
}

export function shiftKey(period: Period, key: string, delta: number): string {
  if (period === "day") {
    const s = startOfLocalDay(key)!;
    return dayKey(addDays(s, delta));
  }
  if (period === "month") {
    const [y, m] = key.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${t.getUTCFullYear()}-${p2(t.getUTCMonth() + 1)}`;
  }
  return String(Number(key) + delta);
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${ARABIC_MONTHS[m - 1]} ${y}`;
}

export function periodLabel(period: Period, key: string) {
  if (period === "month") return monthLabel(key);
  if (period === "year") return key;
  const s = startOfLocalDay(key);
  if (!s) return key;
  const p = localParts(s);
  return `${p.d} ${ARABIC_MONTHS[p.m - 1]} ${p.y}`;
}

/** قيمة حقل datetime-local (بتوقيت بغداد). */
export function localInputValue(d: Date) {
  const p = localParts(d);
  return `${p.y}-${p2(p.m)}-${p2(p.d)}T${p2(p.h)}:${p2(p.min)}`;
}

/** تحويل قيمة datetime-local (بتوقيت بغداد) إلى Date بتوقيت UTC. */
export function localInputToDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const t = Date.UTC(y, mo - 1, d, h, mi) - TZ_OFFSET_MS;
  const back = localParts(new Date(t));
  if (back.y !== y || back.m !== mo || back.d !== d || back.h !== h || back.min !== mi) return null;
  return new Date(t);
}

export function formatDateTime(iso: string) {
  const p = localParts(new Date(iso));
  const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${p2(p.d)}/${p2(p.m)}/${p.y} ${p2(h12)}:${p2(p.min)} ${p.h < 12 ? "ص" : "م"}`;
}

export function formatDate(iso: string) {
  const p = localParts(new Date(iso));
  return `${p2(p.d)}/${p2(p.m)}/${p.y}`;
}

export function formatIQD(n: number) {
  const neg = n < 0;
  return `${neg ? "−" : ""}${Math.abs(n).toLocaleString("en-US")} د.ع`;
}

export const MAX_AMOUNT = 100_000_000_000;

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeDigits(s: string) {
  return s
    .replace(/[٠-٩]/g, (c) => String(AR_DIGITS.indexOf(c)))
    .replace(/[۰-۹]/g, (c) => String(FA_DIGITS.indexOf(c)));
}

/** يحوّل نص المبلغ إلى عدد صحيح بالدينار. يرفض الكسور والقيم غير الصالحة. */
export function parseAmount(raw: string, { allowZero = false } = {}): number | null {
  const s = normalizeDigits(raw).replace(/[\s,٬،']/g, "");
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n > MAX_AMOUNT) return null;
  if (n === 0 && !allowZero) return null;
  return n;
}
