import AppShell from "@/components/AppShell";
import { requireMember } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { member, family, can } = await requireMember();
  return (
    <AppShell memberName={member.name} familyName={family.name} can={can}>
      {children}
    </AppShell>
  );
}
