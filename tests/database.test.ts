import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
let db: PGlite;
const admin = "10000000-0000-4000-8000-000000000001",
  coach = "10000000-0000-4000-8000-000000000002",
  family = "10000000-0000-4000-8000-000000000003",
  other = "10000000-0000-4000-8000-000000000004";
const team = "20000000-0000-4000-8000-000000000001",
  otherTeam = "20000000-0000-4000-8000-000000000002",
  athlete = "30000000-0000-4000-8000-000000000001",
  otherAthlete = "30000000-0000-4000-8000-000000000002",
  skill = "40000000-0000-4000-8000-000000000001";
async function as(id: string, aal = "aal1") {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);select set_config('request.jwt.claim.aal','${aal}',false);`,
  );
}
async function cmd(action: string, d: unknown) {
  return db.query<{ magic_command: { id: string } }>(
    "select public.magic_command($1,$2::jsonb)",
    [action, JSON.stringify(d)],
  );
}
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('request.jwt.claim.aal',true)) $$;
 grant usage on schema auth to authenticated,anon,service_role;grant execute on all functions in schema auth to authenticated,anon,service_role;`);
  await db.exec(await readFile("supabase/migrations/001_magic.sql", "utf8"));
  await db.exec(
    await readFile(
      "supabase/migrations/003_tasks_and_monthly_goals.sql",
      "utf8",
    ),
  );
  await db.exec(
    await readFile("supabase/migrations/004_coach_profiles.sql", "utf8"),
  );
  await db.exec(await readFile("supabase/migrations/005_optional_mfa.sql", "utf8"));
  await db.exec(
    await readFile(
      "supabase/migrations/006_admin_edit_coach_profiles.sql",
      "utf8",
    ),
  );
  await db.exec(`insert into auth.users values ('${admin}','admin@example.test',now()),('${coach}','coach@example.test',now()),('${family}','family@example.test',now()),('${other}','other@example.test',now());
 insert into profiles(id,name) values('${admin}','Admin'),('${coach}','Coach'),('${family}','Family'),('${other}','Other');
 insert into user_roles values('${admin}','admin'),('${coach}','coach'),('${family}','family'),('${other}','family');
 insert into teams(id,name) values('${team}','Test A'),('${otherTeam}','Test B');
 insert into coach_assignments values('${coach}','${team}');
 insert into athletes(id,name,display_name) values('${athlete}','Athlete A','A'),('${otherAthlete}','Athlete B','B');
 insert into team_memberships values('${athlete}','${team}'),('${otherAthlete}','${otherTeam}');
 insert into guardian_athletes values('${family}','${athlete}'),('${other}','${otherAthlete}');
 insert into skills(id,team_id,name,area,criteria) values('${skill}','${team}','Test','Tumbling','["A","B"]');`);
});
after(async () => {
  await db.close();
});
test("family sees its own athlete and no athlete from another family", async () => {
  await as(family);
  const r = await db.query<{ id: string }>("select id from athletes");
  assert.deepEqual(
    r.rows.map((a) => a.id),
    [athlete],
  );
});
test("family cannot write directly or promote itself", async () => {
  await as(family);
  await assert.rejects(db.exec(`update athletes set tv_consent=true`));
  await assert.rejects(
    db.exec(`insert into user_roles values('${family}','admin')`),
  );
  await assert.rejects(cmd("team_save", { name: "Hacked" }));
});
test("admin operations work without a configured second factor", async () => {
  await as(admin);
  const r = await cmd("team_save", { name: "New team" });
  assert.ok(r.rows[0].magic_command.id);
});
test("coach cannot evaluate athlete from another team", async () => {
  await as(coach);
  await assert.rejects(
    cmd("evaluate", {
      id: crypto.randomUUID(),
      athlete_id: otherAthlete,
      skill_id: skill,
      scores: [true, true],
      mastered: true,
    }),
  );
});
test("mastery needs all required criteria; repeats are idempotent", async () => {
  await as(coach);
  const id = crypto.randomUUID();
  await assert.rejects(
    cmd("evaluate", {
      id,
      athlete_id: athlete,
      skill_id: skill,
      scores: [true, false],
      mastered: true,
    }),
  );
  const d = {
    id,
    athlete_id: athlete,
    skill_id: skill,
    scores: [true, true],
    mastered: true,
  };
  await cmd("evaluate", d);
  await cmd("evaluate", d);
  const r = await db.query<{ n: number }>(
    "select count(*)::int as n from evaluations",
  );
  assert.equal(r.rows[0].n, 1);
});
test("family cannot forge official origin or select another team", async () => {
  await as(family);
  await assert.rejects(
    cmd("media_create", {
      kind: "official",
      team_ids: [team],
      title: "Forged",
    }),
  );
  await assert.rejects(
    cmd("media_create", {
      kind: "family",
      team_ids: [otherTeam],
      title: "Wrong team",
    }),
  );
});
test("pending family photo is private; approval is per photo", async () => {
  await as(family);
  const r = await cmd("media_create", {
    kind: "family",
    team_ids: [team],
    title: "A photo",
  });
  const id = r.rows[0].magic_command.id;
  await db.exec(
    `reset role;update media set status='pending',object_path='test.webp' where id='${id}';`,
  );
  await as(other);
  assert.equal((await db.query("select * from media")).rows.length, 0);
  await as(coach);
  await assert.rejects(
    cmd("media_review", {
      id,
      approve: true,
      consent_verified: false,
      tv: true,
    }),
  );
  await cmd("media_review", {
    id,
    approve: true,
    consent_verified: true,
    evidence: "Autorización de prueba",
    tv: true,
    portal: false,
  });
  await as(family);
  await cmd("media_withdraw", { id });
  await as(coach);
  await assert.rejects(
    cmd("media_review", { id, approve: true, consent_verified: true }),
  );
});
test("drafts remain private and do not publish results", async () => {
  await as(coach);
  await cmd("draft_save", {
    id: crypto.randomUUID(),
    athlete_id: athlete,
    skill_id: skill,
    scores: [true, false],
    comment: "Borrador privado",
  });
  assert.equal(
    (await db.query("select * from evaluation_drafts")).rows.length,
    1,
  );
  await as(family);
  assert.equal(
    (await db.query("select * from evaluation_drafts")).rows.length,
    0,
  );
});
test("stale revisions cannot overwrite another coach result", async () => {
  await as(coach);
  await assert.rejects(
    cmd("evaluate", {
      id: crypto.randomUUID(),
      athlete_id: athlete,
      skill_id: skill,
      scores: [true, false],
      revision_of: null,
    }),
  );
});
test("consent withdrawal removes group photos from TV", async () => {
  await as(admin, "aal2");
  await cmd("consent", {
    athlete_id: athlete,
    allowed: true,
    evidence: "Registro de prueba",
  });
  await as(family);
  const r = await cmd("media_create", {
    kind: "family",
    team_ids: [team],
    title: "Grupo",
  });
  const id = r.rows[0].magic_command.id;
  await db.exec(
    `reset role;update media set status='pending' where id='${id}';`,
  );
  await as(coach);
  await cmd("media_review", {
    id,
    approve: true,
    consent_verified: true,
    evidence: "Registro grupal",
    subject_ids: [athlete],
    tv: true,
  });
  await as(admin, "aal2");
  await cmd("consent", {
    athlete_id: athlete,
    allowed: false,
    evidence: "Retirada verificada",
  });
  assert.equal(
    (await db.query<{ tv: boolean }>("select tv from media where id=$1", [id]))
      .rows[0].tv,
    false,
  );
});
test("removing coach revokes team access but preserves evaluations", async () => {
  await as(admin, "aal2");
  await cmd("coach_remove", { id: coach });
  await as(coach);
  assert.equal((await db.query("select * from evaluations")).rows.length, 0);
  await assert.rejects(
    cmd("evaluate", {
      id: crypto.randomUUID(),
      athlete_id: athlete,
      skill_id: skill,
      scores: [true, true],
    }),
  );
  await as(admin, "aal2");
  assert.equal((await db.query("select * from evaluations")).rows.length, 1);
});
test("coach can create a team task and family can submit only for its athlete", async () => {
  await as(admin, "aal2");
  await cmd("coach_restore", { id: coach });
  await cmd("coach_assign", { coach_id: coach, team_id: team });
  await as(coach);
  const created = await db.query<{ magic_task_command: { id: string } }>(
    "select public.magic_task_command($1,$2::jsonb)",
    [
      "task_create",
      JSON.stringify({
        team_id: team,
        title: "Práctica en casa",
        instructions: "Envía una foto de la postura.",
      }),
    ],
  );
  const taskId = created.rows[0].magic_task_command.id;
  await as(family);
  const submitted = await db.query<{ magic_task_command: { id: string } }>(
    "select public.magic_task_command($1,$2::jsonb)",
    [
      "task_media_create",
      JSON.stringify({
        task_id: taskId,
        athlete_id: athlete,
        title: "Mi práctica",
      }),
    ],
  );
  assert.ok(submitted.rows[0].magic_task_command.id);
  await as(other);
  await assert.rejects(
    db.query("select public.magic_task_command($1,$2::jsonb)", [
      "task_media_create",
      JSON.stringify({
        task_id: taskId,
        athlete_id: athlete,
        title: "Intento ajeno",
      }),
    ]),
  );
});
test("coach owns their profile while administration reviews it", async () => {
  await as(coach);
  await db.query("select public.magic_coach_command($1,$2::jsonb)", [
    "coach_profile_save",
    JSON.stringify({
      headline: "Coach de prueba",
      bio: "Acompaño al equipo.",
      specialty: "Tumbling",
      phone: "3000000000",
    }),
  ]);
  await as(family);
  await assert.rejects(
    db.query("select public.magic_coach_command($1,$2::jsonb)", [
      "coach_profile_save",
      JSON.stringify({ user_id: coach, headline: "Intento no autorizado" }),
    ]),
  );
  await as(admin, "aal2");
  await db.query("select public.magic_coach_command($1,$2::jsonb)", [
    "coach_profile_review",
    JSON.stringify({ user_id: coach, approved: true, admin_note: "Revisado" }),
  ]);
  const result = await db.query<{ admin_approved: boolean }>(
    "select admin_approved from coach_profiles where user_id=$1",
    [coach],
  );
  assert.equal(result.rows[0].admin_approved, true);
});
test("administration can edit a coach profile", async () => {
  await as(admin);
  await db.query("select public.magic_coach_command($1,$2::jsonb)", [
    "coach_profile_admin_update",
    JSON.stringify({
      user_id: coach,
      name: "Coach Editada",
      headline: "Coach de prueba",
      bio: "Acompaño al equipo.",
      specialty: "Tumbling",
      phone: "3000000001",
      approved: true,
      admin_note: "Actualizado por administración.",
    }),
  ]);
  const result = await db.query<{ name: string; phone: string }>(
    "select p.name,cp.phone from profiles p join coach_profiles cp on cp.user_id=p.id where p.id=$1",
    [coach],
  );
  assert.deepEqual(result.rows[0], { name: "Coach Editada", phone: "3000000001" });
});
