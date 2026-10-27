import AuthShell from "@/components/AuthShell";
import LoginForm from "./LoginForm";

export const metadata = { title: "تسجيل الدخول | DAFTAR" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const notice = e === "link" ? "رابط الاستعادة غير صالح أو منتهي. اطلب رابطاً جديداً." : undefined;
  return (
    <AuthShell title="دخول المشرف" subtitle="سجّل دخولك بالبريد وكلمة المرور الخاصة بالمشرف، ثم اختر اسمك وأدخل رمز PIN.">
      <LoginForm notice={notice} />
    </AuthShell>
  );
}
