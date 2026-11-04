-- =====================================================================
-- Zero to Hero — Grade 9 Mathematics 2027 Examination
-- Schema, Row Level Security and server-side exam functions
--
-- Design:
--   * Students never talk to the database directly. Every student action
--     goes through a Next.js API route that calls one of the SECURITY
--     DEFINER functions below with the service-role key. Those functions
--     are the ONLY way to register, start, answer and submit.
--   * All time decisions use the database clock (now()). The browser
--     timer is display only.
--   * Correct answers live in question_keys, which no student-facing
--     function ever returns.
--   * Admins use Supabase Auth; RLS grants them access via is_admin().
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.exams (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null default 'Grade 9 Mathematics – 2027',
  duration_minutes   int  not null default 40 check (duration_minutes between 1 and 600),
  is_active          boolean not null default true,
  registration_open  boolean not null default true,
  exam_open          boolean not null default true,   -- students may press Start
  show_results       boolean not null default true,   -- show marks on result page
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- Only one active exam at a time
create unique index exams_one_active on public.exams (is_active) where is_active;

create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references public.exams(id) on delete cascade,
  position       int  not null default 1,
  question_text  text not null,
  image_url      text,
  option_1       text not null,
  option_2       text not null,
  option_3       text not null,
  option_4       text not null,
  is_published   boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index questions_exam_pos on public.questions (exam_id, position);

-- Answer key kept apart from question content so it can never be
-- selected by accident alongside the question.
create table public.question_keys (
  question_id     uuid primary key references public.questions(id) on delete cascade,
  correct_option  smallint not null check (correct_option between 1 and 4)
);

create table public.students (
  id                  uuid primary key default gen_random_uuid(),
  exam_id             uuid not null references public.exams(id) on delete cascade,
  registration_id     text not null unique,
  full_name           text not null check (char_length(full_name) between 3 and 120),
  mobile              text not null check (mobile ~ '^07[0-9]{8}$'),
  school_name         text not null check (char_length(school_name) between 2 and 150),
  district            text not null,
  parent_name         text not null check (char_length(parent_name) between 3 and 120),
  consent_given       boolean not null check (consent_given),
  consent_at          timestamptz not null default now(),
  session_token_hash  text not null unique,
  created_at          timestamptz not null default now(),
  unique (exam_id, mobile)              -- duplicate-registration guard
);

create table public.attempts (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null unique references public.students(id) on delete cascade, -- one attempt per student
  exam_id          uuid not null references public.exams(id) on delete cascade,
  status           text not null default 'registered'
                   check (status in ('registered','ready_to_start','in_progress','submitted','auto_submitted','expired')),
  ready_at         timestamptz,
  started_at       timestamptz,
  deadline_at      timestamptz,
  submitted_at     timestamptz,   -- official submission time (deadline for auto-submits)
  finalized_at     timestamptz,   -- wall-clock time the server finalized the attempt
  score            int,
  total_questions  int,
  answered_count   int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((status in ('in_progress','submitted','auto_submitted','expired')) = (started_at is not null)),
  check (deadline_at is null or deadline_at > started_at)
);
create index attempts_status_deadline on public.attempts (status, deadline_at);

create table public.answers (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null references public.attempts(id) on delete cascade,
  question_id      uuid not null references public.questions(id) on delete cascade,
  selected_option  smallint not null check (selected_option between 1 and 4),
  client_seq       bigint not null default 0,  -- monotonic per browser; rejects out-of-order retries
  saved_at         timestamptz not null default now(),
  unique (attempt_id, question_id)             -- one row per question, never duplicates
);

create table public.admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security: deny by default; admins only.
-- Students have NO policies — they cannot read or write any table
-- through the public API. Their access is the functions further down.
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.exams          enable row level security;
alter table public.questions      enable row level security;
alter table public.question_keys  enable row level security;
alter table public.students       enable row level security;
alter table public.attempts       enable row level security;
alter table public.answers        enable row level security;
alter table public.admins         enable row level security;

create policy admin_all_exams     on public.exams         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_questions on public.questions     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_keys      on public.question_keys for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Admins can read registrations and results, but not rewrite them
create policy admin_read_students on public.students      for select to authenticated using (public.is_admin());
create policy admin_read_attempts on public.attempts      for select to authenticated using (public.is_admin());
create policy admin_read_answers  on public.answers       for select to authenticated using (public.is_admin());
create policy admin_read_self     on public.admins        for select to authenticated using (user_id = auth.uid());

revoke all on public.students, public.attempts, public.answers, public.question_keys from anon;
revoke all on public.exams, public.questions, public.admins from anon;

-- Admin-friendly view (RLS of underlying tables applies via security_invoker)
create or replace view public.admin_results
with (security_invoker = true) as
select
  s.id               as student_id,
  s.registration_id,
  s.full_name,
  s.mobile,
  s.school_name,
  s.district,
  s.parent_name,
  s.consent_given,
  s.created_at       as registered_at,
  a.status,
  a.started_at,
  a.deadline_at,
  a.submitted_at,
  a.finalized_at,
  a.score,
  a.total_questions,
  coalesce(a.answered_count, (select count(*) from public.answers x where x.attempt_id = a.id))::int as answered_count,
  s.exam_id
from public.students s
join public.attempts a on a.student_id = s.id;

-- ---------------------------------------------------------------------
-- Internal helpers (not callable from the API)
-- ---------------------------------------------------------------------

create or replace function public._district_ok(p text)
returns boolean language sql immutable as $$
  select p = any (array[
    'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha',
    'Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala',
    'Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya',
    'Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'
  ]);
$$;

create or replace function public._new_registration_id()
returns text language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  code text;
  b bytea;
  i int;
begin
  loop
    -- first 6 bytes of a v4 UUID are fully random
    b := decode(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), 'hex');
    code := '';
    for i in 0..5 loop
      code := code || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
    end loop;
    code := 'ZTH27-' || code;
    exit when not exists (select 1 from public.students where registration_id = code);
  end loop;
  return code;
end $$;

-- Score and close an attempt. Caller must hold the row lock.
create or replace function public._finalize_attempt(p_attempt_id uuid, p_status text, p_submitted_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_exam uuid;
  v_total int;
  v_answered int;
  v_score int;
  v_final text := p_status;
begin
  select exam_id into v_exam from public.attempts where id = p_attempt_id;

  select count(*) into v_total
    from public.questions where exam_id = v_exam and is_published;

  select count(*),
         count(*) filter (where k.correct_option = an.selected_option)
    into v_answered, v_score
    from public.answers an
    join public.questions q on q.id = an.question_id and q.is_published
    left join public.question_keys k on k.question_id = an.question_id
   where an.attempt_id = p_attempt_id;

  -- Deadline passed and nothing was ever saved → expired
  if p_status = 'auto_submitted' and v_answered = 0 then
    v_final := 'expired';
  end if;

  update public.attempts
     set status = v_final,
         submitted_at = p_submitted_at,
         finalized_at = now(),
         score = v_score,
         total_questions = v_total,
         answered_count = v_answered,
         updated_at = now()
   where id = p_attempt_id;
end $$;

-- If an in-progress attempt has passed its deadline, close it using the
-- answers saved before the deadline. Caller must hold the row lock.
create or replace function public._finalize_if_expired(p_attempt_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  a public.attempts;
begin
  select * into a from public.attempts where id = p_attempt_id;
  if a.status = 'in_progress' and now() >= a.deadline_at then
    perform public._finalize_attempt(a.id, 'auto_submitted', a.deadline_at);
    return true;
  end if;
  return false;
end $$;

-- Locate and lock an attempt by session token
create or replace function public._attempt_for_token(p_token_hash text)
returns public.attempts language plpgsql security definer set search_path = public as $$
declare
  a public.attempts;
begin
  select at.* into a
    from public.attempts at
    join public.students s on s.id = at.student_id
   where s.session_token_hash = p_token_hash
   for update of at;
  if not found then
    raise exception 'INVALID_SESSION';
  end if;
  return a;
end $$;

create or replace function public._state_json(p_attempt_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'attempt_id',       a.id,
    'status',           a.status,
    'registration_id',  s.registration_id,
    'full_name',        s.full_name,
    'started_at',       a.started_at,
    'deadline_at',      a.deadline_at,
    'submitted_at',     a.submitted_at,
    'server_now',       now(),
    'remaining_ms',     case when a.status = 'in_progress'
                             then greatest(0, floor(extract(epoch from (a.deadline_at - now())) * 1000))::bigint
                             else null end,
    'duration_minutes', e.duration_minutes,
    'exam_open',        e.exam_open,
    'exam_title',       e.title,
    'question_count',   (select count(*) from public.questions q where q.exam_id = a.exam_id and q.is_published),
    'answered_count',   (select count(*) from public.answers x where x.attempt_id = a.id),
    'score',            case when e.show_results and a.status in ('submitted','auto_submitted','expired') then a.score end,
    'total_questions',  a.total_questions,
    'show_results',     e.show_results
  )
  from public.attempts a
  join public.students s on s.id = a.student_id
  join public.exams e on e.id = a.exam_id
  where a.id = p_attempt_id;
$$;

-- ---------------------------------------------------------------------
-- Student-facing functions (called only by the server with service role)
-- ---------------------------------------------------------------------

create or replace function public.register_student(
  p_full_name text, p_mobile text, p_school_name text, p_district text,
  p_parent_name text, p_consent boolean, p_token_hash text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_exam public.exams;
  v_student_id uuid;
  v_reg text;
begin
  select * into v_exam from public.exams where is_active;
  if not found then raise exception 'NO_ACTIVE_EXAM'; end if;
  if not v_exam.registration_open then raise exception 'REGISTRATION_CLOSED'; end if;
  if coalesce(p_consent, false) is false then raise exception 'CONSENT_REQUIRED'; end if;
  if p_mobile !~ '^07[0-9]{8}$' then raise exception 'INVALID_MOBILE'; end if;
  if not public._district_ok(p_district) then raise exception 'INVALID_DISTRICT'; end if;
  if char_length(btrim(p_full_name)) < 3 or char_length(btrim(p_school_name)) < 2
     or char_length(btrim(p_parent_name)) < 3 then
    raise exception 'INVALID_INPUT';
  end if;

  if exists (select 1 from public.students where exam_id = v_exam.id and mobile = p_mobile) then
    raise exception 'DUPLICATE_MOBILE';
  end if;

  v_reg := public._new_registration_id();
  begin
    insert into public.students (exam_id, registration_id, full_name, mobile, school_name,
                                 district, parent_name, consent_given, session_token_hash)
    values (v_exam.id, v_reg, btrim(p_full_name), p_mobile, btrim(p_school_name),
            p_district, btrim(p_parent_name), true, p_token_hash)
    returning id into v_student_id;
  exception when unique_violation then
    raise exception 'DUPLICATE_MOBILE';  -- concurrent double-submit
  end;

  insert into public.attempts (student_id, exam_id) values (v_student_id, v_exam.id);

  return jsonb_build_object('registration_id', v_reg, 'status', 'registered');
end $$;

-- Re-issue a session on another device / after cookies were cleared.
-- Old session token stops working.
create or replace function public.resume_session(p_mobile text, p_registration_id text, p_new_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  update public.students s
     set session_token_hash = p_new_token_hash
    from public.exams e
   where e.id = s.exam_id and e.is_active
     and s.mobile = p_mobile
     and s.registration_id = upper(btrim(p_registration_id))
  returning s.id into v_id;
  if v_id is null then raise exception 'RESUME_NOT_FOUND'; end if;
  return jsonb_build_object('ok', true);
end $$;

-- Current state; finalizes the attempt first if its deadline has passed.
create or replace function public.get_exam_state(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.attempts;
begin
  a := public._attempt_for_token(p_token_hash);
  perform public._finalize_if_expired(a.id);
  return public._state_json(a.id);
end $$;

-- Questions (no answer key) + saved answers. Only while in progress.
create or replace function public.get_exam_paper(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.attempts;
begin
  a := public._attempt_for_token(p_token_hash);
  perform public._finalize_if_expired(a.id);
  select * into a from public.attempts where id = a.id;
  if a.status <> 'in_progress' then
    return jsonb_build_object('error', 'NOT_IN_PROGRESS', 'state', public._state_json(a.id));
  end if;

  return jsonb_build_object(
    'state', public._state_json(a.id),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'number', q.rn, 'text', q.question_text, 'image_url', q.image_url,
               'options', jsonb_build_array(q.option_1, q.option_2, q.option_3, q.option_4))
             order by q.rn)
        from (select *, row_number() over (order by position, created_at, id) as rn
                from public.questions where exam_id = a.exam_id and is_published) q
    ), '[]'::jsonb),
    'answers', coalesce((
      select jsonb_object_agg(question_id, jsonb_build_object('option', selected_option, 'seq', client_seq))
        from public.answers where attempt_id = a.id
    ), '{}'::jsonb)
  );
end $$;

-- Instructions page viewed
create or replace function public.mark_ready(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.attempts;
begin
  a := public._attempt_for_token(p_token_hash);
  if a.status = 'registered' then
    update public.attempts set status = 'ready_to_start', ready_at = now(), updated_at = now()
     where id = a.id;
  end if;
  return public._state_json(a.id);
end $$;

-- One-time start. Idempotent: calling again returns the existing attempt
-- and never moves the deadline.
create or replace function public.start_exam(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.attempts;
  e public.exams;
begin
  a := public._attempt_for_token(p_token_hash);
  perform public._finalize_if_expired(a.id);
  select * into a from public.attempts where id = a.id;

  if a.status in ('registered', 'ready_to_start') then
    select * into e from public.exams where id = a.exam_id;
    if not e.exam_open then raise exception 'EXAM_NOT_OPEN'; end if;
    if not exists (select 1 from public.questions where exam_id = e.id and is_published) then
      raise exception 'NO_QUESTIONS';
    end if;
    update public.attempts
       set status = 'in_progress',
           ready_at = coalesce(ready_at, now()),
           started_at = now(),
           deadline_at = now() + make_interval(mins => e.duration_minutes),
           updated_at = now()
     where id = a.id;
  end if;
  return public._state_json(a.id);
end $$;

-- Save / change one answer. Rejected after the deadline or submission.
-- client_seq stops an older retry from overwriting a newer choice.
create or replace function public.save_answer(
  p_token_hash text, p_question_id uuid, p_option smallint, p_client_seq bigint
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.attempts;
  v_row public.answers;
begin
  if p_option is null or p_option not between 1 and 4 then raise exception 'INVALID_OPTION'; end if;

  a := public._attempt_for_token(p_token_hash);
  -- Return (not raise) so the finalization above is committed, not rolled back
  if public._finalize_if_expired(a.id) then
    return jsonb_build_object('error', 'DEADLINE_PASSED');
  end if;
  if a.status <> 'in_progress' then
    return jsonb_build_object('error', 'NOT_IN_PROGRESS');
  end if;

  if not exists (select 1 from public.questions
                  where id = p_question_id and exam_id = a.exam_id and is_published) then
    raise exception 'INVALID_QUESTION';
  end if;

  insert into public.answers as an (attempt_id, question_id, selected_option, client_seq, saved_at)
  values (a.id, p_question_id, p_option, coalesce(p_client_seq, 0), now())
  on conflict (attempt_id, question_id) do update
     set selected_option = excluded.selected_option,
         client_seq      = excluded.client_seq,
         saved_at        = excluded.saved_at
   where an.client_seq <= excluded.client_seq;

  select * into v_row from public.answers where attempt_id = a.id and question_id = p_question_id;

  return jsonb_build_object(
    'question_id', p_question_id,
    'option',      v_row.selected_option,   -- what the database now holds
    'seq',         v_row.client_seq,
    'saved_at',    v_row.saved_at,
    'remaining_ms', greatest(0, floor(extract(epoch from (a.deadline_at - now())) * 1000))::bigint
  );
end $$;

-- Manual submit (or the client's call at the deadline). Idempotent.
create or replace function public.submit_exam(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.attempts;
begin
  a := public._attempt_for_token(p_token_hash);
  if not public._finalize_if_expired(a.id) then
    if a.status = 'in_progress' then
      perform public._finalize_attempt(a.id, 'submitted', now());
    elsif a.status in ('registered', 'ready_to_start') then
      raise exception 'NOT_STARTED';
    end if;
  end if;
  return public._state_json(a.id);
end $$;

-- Sweep: close every attempt whose deadline passed (pg_cron / admin view)
create or replace function public.finalize_all_expired()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in select id from public.attempts
            where status = 'in_progress' and deadline_at <= now()
            for update skip locked loop
    perform public._finalize_attempt(r.id, 'auto_submitted',
              (select deadline_at from public.attempts where id = r.id));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Admin-callable wrapper
create or replace function public.admin_finalize_expired()
returns int language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  return public.finalize_all_expired();
end $$;

-- ---------------------------------------------------------------------
-- Function privileges: only the server (service_role) can call the
-- student functions; admins get their wrapper.
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public'
              and p.proname in ('register_student','resume_session','get_exam_state','get_exam_paper',
                                'mark_ready','start_exam','save_answer','submit_exam','finalize_all_expired',
                                '_finalize_attempt','_finalize_if_expired','_attempt_for_token','_state_json',
                                '_new_registration_id','_district_ok','admin_finalize_expired')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
grant execute on function public.admin_finalize_expired() to authenticated;

-- ---------------------------------------------------------------------
-- Storage bucket for question images (public read, admin write)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

create policy "admins upload question images" on storage.objects
  for insert to authenticated with check (bucket_id = 'question-images' and public.is_admin());
create policy "admins update question images" on storage.objects
  for update to authenticated using (bucket_id = 'question-images' and public.is_admin());
create policy "admins delete question images" on storage.objects
  for delete to authenticated using (bucket_id = 'question-images' and public.is_admin());

-- ---------------------------------------------------------------------
-- Seed the 2027 exam
-- ---------------------------------------------------------------------
insert into public.exams (title, duration_minutes) values ('Grade 9 Mathematics – 2027', 40);

-- ---------------------------------------------------------------------
-- Optional: background sweep every minute with pg_cron.
-- (Enable "pg_cron" under Database → Extensions first; safe to skip —
--  attempts are also finalized on the student's next request and when
--  the admin dashboard loads.)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('zth-finalize-expired', '* * * * *', 'select public.finalize_all_expired()');
  end if;
exception when others then
  raise notice 'pg_cron not scheduled: %', sqlerrm;
end $$;
