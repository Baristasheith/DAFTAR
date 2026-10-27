import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { getContext } from "@/lib/session";
import { listMembers } from "@/lib/data";
import { logoutAction } from "@/actions/auth";
import MemberPicker from "./MemberPicker";

export const metadata = { title: "من أنت؟ | DAFTAR" };

export default async function WhoPage() {
  const { family, member } = await getContext();
  if (member) redirect("/dashboard");
  const members = (await listMembers(family.id, true)).map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    locked: !!m.locked_until && new Date(m.locked_until) > new Date(),
  }));

  return (
    <AuthShell title={`من يستخدم دفتر ${family.name}؟`} subtitle="اختر اسمك ثم أدخل رمز PIN الخاص بك." back={null} wide>
      <MemberPicker members={members} />
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm">
        <p className="max-w-xs text-xs leading-relaxed text-muted">
          لإضافة فرد جديد: ادخل باسم المشرف، ثم افتح صفحة «الأفراد» (متاحة للمشرف فقط).
        </p>
        <form action={logoutAction}>
          <button className="text-muted transition hover:text-danger">خروج من حساب المشرف</button>
        </form>
      </div>
    </AuthShell>
  );
}
