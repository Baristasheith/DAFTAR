import "server-only";
import { db } from "./supabase/admin";

/** تدقيق لأحداث غير العمليات (الأفراد، الإعدادات، النسخ). عمليات المعاملات تُدقَّق تلقائياً بـ trigger في القاعدة. */
export async function audit(a: {
  familyId: string;
  actor: { id: string; name: string } | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  const { error } = await db().from("audit_log").insert({
    family_id: a.familyId,
    actor_member_id: a.actor?.id ?? null,
    actor_name: a.actor?.name ?? null,
    action: a.action,
    entity: a.entity,
    entity_id: a.entityId ?? null,
    details: a.details ?? {},
  });
  if (error) console.error("audit insert failed", error.message);
}
