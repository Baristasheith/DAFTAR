// يشغّل ملف الـ migration على Postgres حقيقي (PGlite) ويختبر الصلاحيات والتدقيق وقفل PIN.
// ملاحظة: يحاكي مخطط auth الخاص بـ Supabase، لذلك لا يغني عن اختبار نهائي على مشروعك الفعلي.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();
let passed = 0;
const ok = (name) => { passed++; console.log("  ✓", name); };
async function rejects(sql, params, re, name) {
  await assert.rejects(() => db.query(sql, params), re, name);
  ok(name);
}
const as = async (role, sub) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false); set role ${role};`);
};

// محاكاة بيئة Supabase
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);
await db.exec(readFileSync(new URL("../supabase/migrations/0001_init.sql", import.meta.url), "utf8"));
ok("migration runs without errors");

// بيانات اختبار (معزولة في قاعدة الاختبار فقط)
const ua = (await db.query(`insert into auth.users(email) values ('a@test') returning id`)).rows[0].id;
const ub = (await db.query(`insert into auth.users(email) values ('b@test') returning id`)).rows[0].id;
await as("service_role");
const fa = (await db.query(`insert into families(owner_id,name) values ($1,'A') returning id`, [ua])).rows[0].id;
const fb = (await db.query(`insert into families(owner_id,name) values ($1,'B') returning id`, [ub])).rows[0].id;
const ma = (await db.query(`insert into members(family_id,name,role,pin_hash) values ($1,'Ahmed','admin','HASH_A') returning id`, [fa])).rows[0].id;
const ma2 = (await db.query(`insert into members(family_id,name,pin_hash) values ($1,'Sara','HASH_S') returning id`, [fa])).rows[0].id;
const mb = (await db.query(`insert into members(family_id,name,role,pin_hash) values ($1,'Omar','admin','HASH_B') returning id`, [fb])).rows[0].id;
await db.query(`insert into settings(family_id) values ($1),($2)`, [fa, fb]);

const K1 = "11111111-1111-4111-8111-111111111111";
const ins = (fam, mem, type, amount, key, extra = "") =>
  db.query(
    `insert into transactions(family_id,member_id,type,title,category,amount,idempotency_key,created_by) values ($1,$2,$3,'x','y',$4,$5,$2) returning id`,
    [fam, mem, type, amount, key]);

console.log("المعاملات والتدقيق:");
const t1 = (await ins(fa, ma, "expense", 50000, K1)).rows[0].id;
ok("insert expense (50,000)");
let a = (await db.query(`select * from audit_log where entity_id=$1`, [t1])).rows;
assert.equal(a.length, 1); assert.equal(a[0].action, "transaction.create"); assert.equal(a[0].actor_name, "Ahmed");
ok("create is audited automatically with actor name");

await rejects(`insert into transactions(family_id,member_id,type,title,category,amount,idempotency_key,created_by) values ($1,$2,'expense','x','y',50000,$3,$2)`, [fa, ma, K1], /tx_idempotency_uq|duplicate/i, "duplicate idempotency key rejected (double click)");
await rejects(`insert into transactions(family_id,member_id,type,title,category,amount,idempotency_key,created_by) values ($1,$2,'income','x','y',0,gen_random_uuid(),$2)`, [fa, ma], /amount_by_type/, "zero income rejected");
await rejects(`insert into transactions(family_id,member_id,type,title,category,amount,idempotency_key,created_by) values ($1,$2,'expense','x','y',-5,gen_random_uuid(),$2)`, [fa, ma], /amount_by_type/, "negative expense rejected");
await rejects(`insert into transactions(family_id,member_id,type,title,category,amount,idempotency_key,created_by) values ($1,$2,'foo','x','y',5,gen_random_uuid(),$2)`, [fa, ma], /check/i, "invalid type rejected");

await ins(fa, ma, "opening", 0, "22222222-2222-4222-8222-222222222222");
await rejects(`insert into transactions(family_id,member_id,type,title,category,amount,idempotency_key,created_by) values ($1,$2,'opening','o','y',5,gen_random_uuid(),$2)`, [fa, ma], /tx_one_opening_uq|duplicate/i, "only one active opening balance per family");

await db.query(`update transactions set amount=60000, updated_by=$2 where id=$1`, [t1, ma2]);
a = (await db.query(`select * from audit_log where entity_id=$1 order by id`, [t1])).rows;
assert.equal(a[1].action, "transaction.update"); assert.equal(a[1].actor_name, "Sara");
assert.equal(String(a[1].details.before.amount), "50000"); assert.equal(String(a[1].details.after.amount), "60000");
ok("update audited with before/after and editor");

await rejects(`update transactions set member_id=$2 where id=$1`, [t1, ma2], /الحقول الأساسية/, "cannot reassign transaction to another person");
await rejects(`update transactions set family_id=$2 where id=$1`, [t1, fb], /الحقول الأساسية|foreign|violates/i, "cannot move transaction to another family");
await rejects(`delete from transactions where id=$1`, [t1], /حذف العمليات/, "hard delete of transactions blocked (even for service_role)");
await rejects(`update audit_log set action='x'`, [], /للإضافة فقط/, "audit log cannot be updated");
await rejects(`delete from audit_log`, [], /للإضافة فقط/, "audit log cannot be deleted");

await db.query(`update transactions set deleted_at=now(), deleted_by=$2, delete_reason='خطأ', updated_by=$2 where id=$1`, [t1, ma]);
a = (await db.query(`select action from audit_log where entity_id=$1 order by id desc limit 1`, [t1])).rows;
assert.equal(a[0].action, "transaction.void");
ok("void is audited");

console.log("قفل PIN:");
let r;
for (let i = 1; i <= 4; i++) {
  r = (await db.query(`select * from register_pin_failure($1)`, [ma2])).rows[0];
  assert.equal(r.o_failed, i); assert.equal(r.o_locked_until, null);
}
ok("4 failures: counted, not locked");
r = (await db.query(`select * from register_pin_failure($1)`, [ma2])).rows[0];
assert.equal(r.o_failed, 5); assert.ok(r.o_locked_until);
ok("5th failure locks the member");
await db.query(`select reset_pin_failures($1)`, [ma2]);
r = (await db.query(`select failed_attempts, locked_until, last_login_at from members where id=$1`, [ma2])).rows[0];
assert.equal(r.failed_attempts, 0); assert.equal(r.locked_until, null); assert.ok(r.last_login_at);
ok("successful login resets the counter");
await db.query(`update members set locked_until = now() - interval '1 minute', failed_attempts = 5 where id=$1`, [ma2]);
r = (await db.query(`select * from register_pin_failure($1)`, [ma2])).rows[0];
assert.equal(r.o_failed, 1); assert.equal(r.o_locked_until, null);
ok("expired lock restarts the count");

console.log("RLS (مستخدم المشرف A):");
await ins(fb, mb, "income", 777, "33333333-3333-4333-8333-333333333333");
await as("authenticated", ua);
assert.equal((await db.query(`select * from families`)).rows.length, 1);
assert.equal((await db.query(`select id, name, role from members`)).rows.length, 2);
assert.ok((await db.query(`select * from transactions`)).rows.every((x) => x.family_id === fa));
assert.ok((await db.query(`select * from audit_log`)).rows.every((x) => x.family_id === fa));
ok("sees only own family rows (families, members, transactions, audit)");
await rejects(`select pin_hash from members`, [], /permission denied/, "pin_hash is unreadable from the client");
await rejects(`select * from members`, [], /permission denied/, "select * on members denied (pin_hash column)");
await rejects(`insert into transactions(family_id,member_id,type,title,category,amount,idempotency_key,created_by) values ($1,$2,'income','x','y',5,gen_random_uuid(),$2)`, [fa, ma], /permission denied/, "client cannot insert transactions");
await rejects(`update transactions set amount=1`, [], /permission denied/, "client cannot update transactions");
await rejects(`delete from transactions`, [], /permission denied/, "client cannot delete transactions");
await rejects(`update members set role='admin'`, [], /permission denied/, "client cannot change roles");
await rejects(`select * from register_pin_failure('${ma2}')`, [], /permission denied/, "client cannot call PIN counter functions");

await as("authenticated", ub);
assert.ok((await db.query(`select * from transactions`)).rows.every((x) => x.family_id === fb));
assert.equal((await db.query(`select * from families`)).rows[0].id, fb);
ok("admin B cannot see family A's data");

await as("authenticated", "");
assert.equal((await db.query(`select * from transactions`)).rows.length, 0);
ok("authenticated without a valid uid sees nothing");

await as("anon");
await rejects(`select * from transactions`, [], /permission denied/, "anon has no access at all");

console.log(`\nكل اختبارات قاعدة البيانات نجحت (${passed}).`);
