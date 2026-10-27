import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { getBase } from "@/lib/session";
import SetupForm from "./SetupForm";

export const metadata = { title: "الإعداد الأولي | DAFTAR" };

export default async function SetupPage() {
  const { family } = await getBase();
  if (family) redirect("/who");
  return (
    <AuthShell
      title="الإعداد الأولي للدفتر"
      subtitle="خطوة واحدة فقط: سمِّ العائلة، وأنشئ حساب المشرف الذي سيدير الأفراد ورموز PIN."
      back={null}
    >
      <SetupForm />
    </AuthShell>
  );
}
