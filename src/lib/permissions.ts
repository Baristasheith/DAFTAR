import type { Member } from "./types";

export function can(member: Pick<Member, "role" | "permissions">) {
  const admin = member.role === "admin";
  const p = member.permissions;
  return {
    admin,
    add: admin || !!p.add,
    editOwn: admin || !!p.edit_own,
    editAll: admin,
    viewAll: admin || !!p.view_all,
    reports: admin || !!p.reports,
  };
}

export type Can = ReturnType<typeof can>;

export const PERMISSION_LABELS: Record<string, string> = {
  add: "إضافة عمليات",
  edit_own: "تعديل وإلغاء عملياته",
  view_all: "رؤية عمليات الجميع",
  reports: "فتح التقارير",
};
