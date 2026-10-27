export type Permissions = {
  add: boolean;
  edit_own: boolean;
  view_all: boolean;
  reports: boolean;
};

export type Family = {
  id: string;
  owner_id: string;
  name: string;
  currency: string;
  timezone: string;
};

export type Member = {
  id: string;
  family_id: string;
  name: string;
  role: "admin" | "member";
  permissions: Permissions;
  active: boolean;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
};

export type TxType = "income" | "expense" | "opening";

export type Tx = {
  id: string;
  family_id: string;
  member_id: string;
  type: TxType;
  title: string;
  category: string;
  amount: number;
  description: string | null;
  notes: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  delete_reason: string | null;
};

export type Settings = {
  family_id: string;
  categories: string[];
  last_export_at: string | null;
};

export type AuditRow = {
  id: number;
  actor_member_id: string | null;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

// أعمدة الأفراد المسموح قراءتها (بدون pin_hash أبداً)
export const MEMBER_COLS =
  "id,family_id,name,role,permissions,active,locked_until,last_login_at,created_at";

export const TX_COLS =
  "id,family_id,member_id,type,title,category,amount,description,notes,occurred_at,created_at,updated_at,updated_by,deleted_at,delete_reason";

export type FormState = { error?: string; ok?: string };
