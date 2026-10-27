import "server-only";
import bcrypt from "bcryptjs";
import { normalizeDigits } from "./format";

export const PIN_RE = /^\d{4,8}$/;
export const MAX_FAILED = 5;
export const LOCK_MINUTES = 15;
const COST = 12;

export function normalizePin(raw: string) {
  return normalizeDigits(raw.trim());
}

export function pinProblem(raw: string): string | null {
  return PIN_RE.test(normalizePin(raw)) ? null : "رمز PIN يجب أن يكون من 4 إلى 8 أرقام.";
}

export async function hashPin(raw: string) {
  return bcrypt.hash(normalizePin(raw), COST);
}

// هاش وهمي صالح يُحسب مرة واحدة: نقارن به عند غياب الفرد كي لا يكشف الزمن وجود الاسم
let dummy: Promise<string> | null = null;

export async function verifyPin(raw: string, hash: string | null) {
  if (!hash) {
    dummy ??= bcrypt.hash("0000", COST);
    await bcrypt.compare(normalizePin(raw), await dummy);
    return false;
  }
  return bcrypt.compare(normalizePin(raw), hash);
}
