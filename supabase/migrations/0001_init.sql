-- DAFTAR | دفتر — المخطط الأساسي
-- نفّذ هذا الملف كاملاً في Supabase: SQL Editor > New query > Run
-- التصميم:
--  * المشرف = مستخدم Supabase Auth (بريد + كلمة مرور) ويملك "عائلة" واحدة.
--  * أفراد العائلة = صفوف في members (PIN مشفّر بـ bcrypt، لا يُقرأ من الواجهة أبداً).
--  * القراءة من الواجهة مقيّدة بـ RLS على عائلة المشرف فقط. الكتابة ممنوعة من الواجهة تماماً
--    وتتم فقط من الخادم (service_role) بعد فحص الصلاحيات.

-- ───────────────────────── الجداول ─────────────────────────

create table public.families (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null unique references auth.users(id) on delete restrict,
  name       text not null check (char_length(trim(name)) between 1 and 80),
  currency   text not null default 'IQD',
  timezone   text not null default 'Asia/Baghdad',
  created_at timestamptz not null default now()
);

create table public.members (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families(id),
  name            text not null check (char_length(trim(name)) between 1 and 50),
  role            text not null default 'member' check (role in ('admin', 'member')),
  pin_hash        text not null,
  permissions     jsonb not null default '{"add":true,"edit_own":true,"view_all":true,"reports":true}'::jsonb,
  active          boolean not null default true,
  failed_attempts int not null default 0,
  locked_until    timestamptz,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now()
);
create unique index members_family_name_uq on public.members (family_id, lower(trim(name)));
create unique index members_one_admin_uq on public.members (family_id) where role = 'admin';

create table public.settings (
  family_id      uuid primary key references public.families(id),
  categories     jsonb not null default '["مشتريات المنزل","طعام وشراب","فواتير وخدمات","مواصلات","صحة","تعليم","ملابس","ترفيه","مبلغ وارد","أخرى"]'::jsonb,
  last_export_at timestamptz,
  updated_at     timestamptz not null default now()
);

create table public.transactions (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families(id),
  member_id       uuid not null references public.members(id),
  type            text not null check (type in ('income', 'expense', 'opening')),
  title           text not null check (char_length(trim(title)) between 1 and 120),
  category        text not null check (char_length(trim(category)) between 1 and 40),
  amount          bigint not null check (amount <= 100000000000),
  description     text check (description is null or char_length(description) <= 1000),
  notes           text check (notes is null or char_length(notes) <= 1000),
  occurred_at     timestamptz not null default now(),
  idempotency_key uuid not null,
  created_by      uuid not null references public.members(id),
  updated_by      uuid references public.members(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  deleted_by      uuid references public.members(id),
  delete_reason   text check (delete_reason is null or char_length(delete_reason) <= 300),
  constraint amount_by_type check (
    (type = 'opening' and amount >= 0) or (type <> 'opening' and amount > 0)
  ),
  constraint tx_idempotency_uq unique (family_id, idempotency_key)
);
create unique index tx_one_opening_uq on public.transactions (family_id) where type = 'opening' and deleted_at is null;
create index tx_family_date_idx on public.transactions (family_id, occurred_at desc);
create index tx_family_member_idx on public.transactions (family_id, member_id);

create table public.audit_log (
  id              bigint generated always as identity primary key,
  family_id       uuid not null references public.families(id),
  actor_member_id uuid,
  actor_name      text,
  action          text not null,
  entity          text not null,
  entity_id       uuid,
  details         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index audit_family_date_idx on public.audit_log (family_id, created_at desc);
create index audit_actor_idx on public.audit_log (family_id, actor_member_id, created_at desc);

-- ───────────────────────── الحماية على مستوى الصفوف (Triggers) ─────────────────────────

-- سجل التدقيق للإضافة فقط: لا تعديل ولا حذف لأي أحد.
create function public.audit_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'سجل التدقيق للإضافة فقط ولا يمكن تعديله أو حذفه';
end $$;

create trigger audit_no_update_delete before update or delete on public.audit_log
  for each row execute function public.audit_immutable();
create trigger audit_no_truncate before truncate on public.audit_log
  for each statement execute function public.audit_immutable();

-- لا حذف نهائي للعمليات (الإلغاء يتم بوسم deleted_at فقط).
create function public.tx_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'لا يُسمح بحذف العمليات نهائياً، استخدم الإلغاء';
end $$;

create trigger tx_block_delete before delete on public.transactions
  for each row execute function public.tx_no_delete();
create trigger tx_block_truncate before truncate on public.transactions
  for each statement execute function public.tx_no_delete();

-- حقول لا يجوز تغييرها بعد الإنشاء + ضبط updated_at.
create function public.tx_guard_update() returns trigger
language plpgsql as $$
begin
  if new.family_id <> old.family_id
     or new.member_id <> old.member_id
     or new.idempotency_key <> old.idempotency_key
     or new.created_by <> old.created_by
     or new.created_at <> old.created_at then
    raise exception 'لا يجوز تغيير الحقول الأساسية للعملية';
  end if;
  if (old.type = 'opening') <> (new.type = 'opening') then
    raise exception 'لا يجوز تحويل العملية من أو إلى رصيد افتتاحي';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger tx_guard before update on public.transactions
  for each row execute function public.tx_guard_update();

-- فرق الحقول بين نسختين (للتدقيق).
create function public.jsonb_changed(a jsonb, b jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
  from jsonb_each(b) e
  where e.key not in ('updated_at', 'updated_by')
    and (a -> e.key) is distinct from e.value
$$;

-- تدقيق تلقائي وذري لكل إنشاء/تعديل/إلغاء للعمليات (لا يعتمد على كود التطبيق).
create function public.tx_audit() returns trigger
language plpgsql as $$
declare
  v_actor uuid;
  v_name  text;
  v_action text;
  v_details jsonb;
begin
  if tg_op = 'INSERT' then
    v_actor := new.created_by;
    v_action := case when new.type = 'opening' then 'opening.set' else 'transaction.create' end;
    v_details := jsonb_build_object('after', to_jsonb(new) - 'idempotency_key');
  else
    v_actor := coalesce(new.updated_by, new.created_by);
    v_action := case
      when old.deleted_at is null and new.deleted_at is not null then 'transaction.void'
      when old.deleted_at is not null and new.deleted_at is null then 'transaction.restore'
      when new.type = 'opening' then 'opening.update'
      else 'transaction.update' end;
    v_details := jsonb_build_object(
      'before', (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
                 from jsonb_each(to_jsonb(old)) e
                 where (to_jsonb(new) -> e.key) is distinct from e.value
                   and e.key not in ('updated_at', 'updated_by')),
      'after', public.jsonb_changed(to_jsonb(old), to_jsonb(new)));
  end if;

  select m.name into v_name from public.members m where m.id = v_actor;

  insert into public.audit_log (family_id, actor_member_id, actor_name, action, entity, entity_id, details)
  values (new.family_id, v_actor, v_name, v_action, 'transaction', new.id, v_details);
  return null;
end $$;

create trigger tx_audit_ins after insert on public.transactions
  for each row execute function public.tx_audit();
create trigger tx_audit_upd after update on public.transactions
  for each row execute function public.tx_audit();

-- ───────────────────────── قفل تخمين PIN (ذري) ─────────────────────────

create function public.register_pin_failure(p_member uuid, p_max int default 5, p_lock_minutes int default 15)
returns table (o_failed int, o_locked_until timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.members m
     set failed_attempts = s.n,
         locked_until = case when s.n >= p_max then now() + make_interval(mins => p_lock_minutes) else null end
    from (
      select x.id,
             case when x.locked_until is not null and x.locked_until <= now() then 1
                  else x.failed_attempts + 1 end as n
        from public.members x
       where x.id = p_member
         for update
    ) s
   where m.id = s.id
  returning m.failed_attempts, m.locked_until;
end $$;

create function public.reset_pin_failures(p_member uuid)
returns void
language sql security definer set search_path = public as $$
  update public.members
     set failed_attempts = 0, locked_until = null, last_login_at = now()
   where id = p_member
$$;

revoke execute on function public.register_pin_failure(uuid, int, int) from public, anon, authenticated;
revoke execute on function public.reset_pin_failures(uuid) from public, anon, authenticated;
grant execute on function public.register_pin_failure(uuid, int, int) to service_role;
grant execute on function public.reset_pin_failures(uuid) to service_role;

-- ───────────────────────── RLS ─────────────────────────

alter table public.families     enable row level security;
alter table public.members      enable row level security;
alter table public.settings     enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_log    enable row level security;

create function public.owns_family(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.families f where f.id = fid and f.owner_id = auth.uid())
$$;
revoke execute on function public.owns_family(uuid) from public, anon;
grant execute on function public.owns_family(uuid) to authenticated;

create policy families_select     on public.families     for select to authenticated using (owner_id = auth.uid());
create policy members_select      on public.members      for select to authenticated using (public.owns_family(family_id));
create policy settings_select     on public.settings     for select to authenticated using (public.owns_family(family_id));
create policy transactions_select on public.transactions for select to authenticated using (public.owns_family(family_id));
create policy audit_select        on public.audit_log    for select to authenticated using (public.owns_family(family_id));
-- لا توجد سياسات insert/update/delete: الكتابة من الواجهة مرفوضة تماماً.

-- صلاحيات الأعمدة: قراءة فقط، وبدون pin_hash نهائياً.
revoke all on public.families, public.members, public.settings, public.transactions, public.audit_log from anon, authenticated;
grant select on public.families, public.settings, public.transactions, public.audit_log to authenticated;
grant select (id, family_id, name, role, permissions, active, locked_until, last_login_at, created_at)
  on public.members to authenticated;
grant all on public.families, public.members, public.settings, public.transactions, public.audit_log to service_role;
grant usage, select on all sequences in schema public to service_role;
