import { bootDb } from './pglite-db.mjs';
import assert from 'node:assert/strict';

const db = await bootDb(new URL('../supabase/migrations/0001_exam_schema.sql', import.meta.url).pathname);
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const fn = async (name, args) => {
  const keys = Object.keys(args);
  const sql = `select public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`;
  return (await db.query(sql, keys.map((k) => args[k]))).rows[0].r;
};
const expectErr = async (p, code) => {
  try { await p; assert.fail('expected ' + code); } catch (e) { assert.match(e.message, new RegExp(code)); }
};
let pass = 0; const ok = (m) => { pass++; console.log('  ✓', m); };

const exam = await one('select id from exams where is_active');
// 25 questions; correct answer = (n % 4) + 1
for (let n = 1; n <= 25; n++) {
  const q = await one(
    `insert into questions (exam_id, position, question_text, option_1, option_2, option_3, option_4)
     values ($1, $2, $3, 'a','b','c','d') returning id`, [exam.id, n, `Q${n}`]);
  await db.query('insert into question_keys values ($1, $2)', [q.id, (n % 4) + 1]);
}
const qs = (await db.query('select q.id, k.correct_option from questions q join question_keys k on k.question_id=q.id order by position')).rows;

const reg = {
  p_full_name: 'Test Student', p_mobile: '0771234567', p_school_name: 'Rahula College',
  p_district: 'Matara', p_parent_name: 'Parent Name', p_consent: true, p_token_hash: 'tok1',
};
const r1 = await fn('register_student', reg);
assert.match(r1.registration_id, /^ZTH27-[A-Z2-9]{6}$/); ok('registration returns ID ' + r1.registration_id);
await expectErr(fn('register_student', { ...reg, p_token_hash: 'tok2' }), 'DUPLICATE_MOBILE'); ok('duplicate mobile rejected');
await expectErr(fn('register_student', { ...reg, p_mobile: '0661234567', p_token_hash: 't3' }), 'INVALID_MOBILE'); ok('bad mobile rejected');
await expectErr(fn('register_student', { ...reg, p_mobile: '0711111111', p_district: 'Mars', p_token_hash: 't4' }), 'INVALID_DISTRICT'); ok('bad district rejected');
await expectErr(fn('register_student', { ...reg, p_mobile: '0711111112', p_consent: false, p_token_hash: 't5' }), 'CONSENT_REQUIRED'); ok('consent required');

let st = await fn('get_exam_state', { p_token_hash: 'tok1' });
assert.equal(st.status, 'registered'); assert.equal(st.remaining_ms, null); ok('state = registered, no timer');
await expectErr(fn('get_exam_state', { p_token_hash: 'nope' }), 'INVALID_SESSION'); ok('invalid session rejected');

let paper = await fn('get_exam_paper', { p_token_hash: 'tok1' });
assert.equal(paper.error, 'NOT_IN_PROGRESS'); assert.equal(paper.questions, undefined); ok('questions hidden before start');

st = await fn('mark_ready', { p_token_hash: 'tok1' }); assert.equal(st.status, 'ready_to_start'); ok('ready_to_start');

await db.query('update exams set exam_open=false');
await expectErr(fn('start_exam', { p_token_hash: 'tok1' }), 'EXAM_NOT_OPEN'); ok('start blocked while exam closed');
await db.query('update exams set exam_open=true');

st = await fn('start_exam', { p_token_hash: 'tok1' });
assert.equal(st.status, 'in_progress');
assert.ok(st.remaining_ms > 39.9 * 60000 && st.remaining_ms <= 40 * 60000); ok('started, remaining ≈ 40 min');
const first = await one('select started_at, deadline_at from attempts');
assert.equal(new Date(first.deadline_at) - new Date(first.started_at), 2400000); ok('deadline = start + exactly 40 min');
await fn('start_exam', { p_token_hash: 'tok1' });
const again = await one('select started_at, deadline_at from attempts');
assert.equal(+again.deadline_at, +first.deadline_at); ok('second start is idempotent; deadline unchanged');

paper = await fn('get_exam_paper', { p_token_hash: 'tok1' });
assert.equal(paper.questions.length, 25);
assert.ok(!JSON.stringify(paper).includes('correct')); ok('paper has 25 questions, no answer key');

// answers: Q1 correct, Q2 wrong then changed to correct, Q3 out-of-order retry
await fn('save_answer', { p_token_hash: 'tok1', p_question_id: qs[0].id, p_option: qs[0].correct_option, p_client_seq: 10 });
await fn('save_answer', { p_token_hash: 'tok1', p_question_id: qs[1].id, p_option: 1 === qs[1].correct_option ? 2 : 1, p_client_seq: 11 });
let s2 = await fn('save_answer', { p_token_hash: 'tok1', p_question_id: qs[1].id, p_option: qs[1].correct_option, p_client_seq: 12 });
assert.equal(s2.option, qs[1].correct_option); ok('answer change saved');
await fn('save_answer', { p_token_hash: 'tok1', p_question_id: qs[2].id, p_option: 4, p_client_seq: 20 });
const stale = await fn('save_answer', { p_token_hash: 'tok1', p_question_id: qs[2].id, p_option: 3, p_client_seq: 19 });
assert.equal(stale.option, 4); assert.equal(stale.seq, 20); ok('stale out-of-order retry does not overwrite newer answer');
assert.equal((await one('select count(*)::int c from answers')).c, 3); ok('one row per question (no duplicates)');
await expectErr(fn('save_answer', { p_token_hash: 'tok1', p_question_id: qs[0].id, p_option: 5, p_client_seq: 30 }), 'INVALID_OPTION'); ok('option 5 rejected');
await expectErr(fn('save_answer', { p_token_hash: 'tok1', p_question_id: '00000000-0000-0000-0000-000000000000', p_option: 1, p_client_seq: 31 }), 'INVALID_QUESTION'); ok('foreign question rejected');

paper = await fn('get_exam_paper', { p_token_hash: 'tok1' });
assert.equal(Object.keys(paper.answers).length, 3); ok('saved answers restored on reload');

// Expire: move deadline into the past, as if browser was closed
await db.query("update attempts set deadline_at = now() - interval '1 second', started_at = now() - interval '61 minutes'");
const late = await fn('save_answer', { p_token_hash: 'tok1', p_question_id: qs[3].id, p_option: 1, p_client_seq: 40 });
assert.equal(late.error, 'DEADLINE_PASSED'); ok('late answer rejected');
const fin = await one('select status, score, answered_count, total_questions, submitted_at = deadline_at as at_deadline from attempts');
assert.equal(fin.status, 'auto_submitted'); assert.equal(fin.score, 3 - (qs[2].correct_option === 4 ? 0 : 1));
assert.equal(fin.answered_count, 3); assert.equal(fin.total_questions, 25); assert.ok(fin.at_deadline);
ok(`auto-submitted on next request, score ${fin.score}/25, submitted_at = deadline`);
st = await fn('submit_exam', { p_token_hash: 'tok1' }); assert.equal(st.status, 'auto_submitted'); ok('submit after finalize is idempotent');
st = await fn('start_exam', { p_token_hash: 'tok1' }); assert.equal(st.status, 'auto_submitted'); ok('cannot restart a finished attempt');

// Student 2: manual submit; Student 3: expired with no answers via sweep
await fn('register_student', { ...reg, p_mobile: '0712345678', p_token_hash: 'tokB' });
await fn('start_exam', { p_token_hash: 'tokB' });
await fn('save_answer', { p_token_hash: 'tokB', p_question_id: qs[4].id, p_option: qs[4].correct_option, p_client_seq: 1 });
st = await fn('submit_exam', { p_token_hash: 'tokB' });
assert.equal(st.status, 'submitted'); assert.equal(st.score, 1); ok('manual submit, score computed on server');
const afterSubmit = await fn('save_answer', { p_token_hash: 'tokB', p_question_id: qs[5].id, p_option: 1, p_client_seq: 2 });
assert.equal(afterSubmit.error, 'NOT_IN_PROGRESS'); ok('no edits after submit');

await fn('register_student', { ...reg, p_mobile: '0751234567', p_token_hash: 'tokC' });
await fn('start_exam', { p_token_hash: 'tokC' });
await db.query("update attempts a set deadline_at = now() - interval '5 seconds', started_at = now() - interval '61 minutes' from students s where s.id=a.student_id and s.mobile='0751234567'");
assert.equal(await fn('finalize_all_expired', {}), 1);
const c = await one("select a.status from attempts a join students s on s.id=a.student_id where s.mobile='0751234567'");
assert.equal(c.status, 'expired'); ok('sweep finalizes; zero answers → expired');

// Resume on another device
await fn('resume_session', { p_mobile: '0771234567', p_registration_id: r1.registration_id.toLowerCase(), p_new_token_hash: 'tokNew' });
await expectErr(fn('get_exam_state', { p_token_hash: 'tok1' }), 'INVALID_SESSION');
st = await fn('get_exam_state', { p_token_hash: 'tokNew' }); assert.equal(st.registration_id, r1.registration_id);
ok('resume issues new session, old one revoked');
await expectErr(fn('resume_session', { p_mobile: '0771234567', p_registration_id: 'ZTH27-XXXXXX', p_new_token_hash: 'x' }), 'RESUME_NOT_FOUND'); ok('wrong registration ID rejected');

// RLS: anon/authenticated non-admin cannot read students or keys
await db.query("insert into auth.users values ('11111111-1111-1111-1111-111111111111','admin@x.com'),('22222222-2222-2222-2222-222222222222','rando@x.com')");
await db.query("insert into admins (user_id, email) values ('11111111-1111-1111-1111-111111111111','admin@x.com')");
await db.exec('grant usage on schema public to anon, authenticated; grant select on all tables in schema public to authenticated;');
await db.exec("set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);");
assert.equal((await db.query('select * from students')).rows.length, 0);
assert.equal((await db.query('select * from question_keys')).rows.length, 0); ok('RLS: non-admin sees no students/keys');
await expectErr(db.query("select public.save_answer('tokB', gen_random_uuid(), 1::smallint, 1)"), 'permission denied'); ok('authenticated cannot call student functions');
await db.exec("select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);");
assert.equal((await db.query('select * from admin_results')).rows.length, 3); ok('RLS: admin sees results view');
await db.exec('reset role');

// ---- The real Grade 9 2027 paper (migration 0002)
{
  const db2 = await bootDb(new URL('../supabase/migrations/0001_exam_schema.sql', import.meta.url).pathname,
                           new URL('../supabase/migrations/0002_grade9_2027_paper.sql', import.meta.url).pathname);
  const ex = (await db2.query('select duration_minutes from exams where is_active')).rows[0];
  assert.equal(ex.duration_minutes, 40); ok('paper migration: exam is 40 minutes');
  const rows = (await db2.query('select q.position, k.correct_option, q.image_url from questions q join question_keys k on k.question_id = q.id order by q.position')).rows;
  assert.equal(rows.length, 20); ok('paper migration: 20 questions, each with a key');
  // Answer key exactly as given in the teacher's PDF
  const KEY = [3, 1, 2, 2, 4, 2, 2, 3, 1, 2, 3, 1, 1, 4, 1, 1, 2, 1, 4, 1];
  assert.deepEqual(rows.map((r) => r.correct_option), KEY); ok('paper migration: answer key matches the PDF');
  assert.equal(rows[3].image_url, '/questions/q04-number-line.svg'); ok('paper migration: Q4 has the number line');
  const again = await import('node:fs').then((fs) => fs.readFileSync(new URL('../supabase/migrations/0002_grade9_2027_paper.sql', import.meta.url), 'utf8'));
  await db2.exec(again);
  assert.equal((await db2.query('select count(*)::int c from questions')).rows[0].c, 20); ok('paper migration: re-running does not duplicate');
}

console.log(`\n${pass} checks passed`);
