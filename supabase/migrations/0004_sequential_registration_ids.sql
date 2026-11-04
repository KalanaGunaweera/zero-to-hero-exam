-- =====================================================================
-- Registration IDs: ZTHG9-2027A001, ZTHG9-2027A002, … A999, B001, …
-- Sequential IDs are guessable, so re-entry on a new device
-- (mobile + registration ID) now locks for 15 minutes after 5 wrong tries.
-- =====================================================================

create sequence if not exists public.registration_seq;

create or replace function public._new_registration_id()
returns text language plpgsql volatile set search_path = public as $$
declare
  n bigint := nextval('public.registration_seq');
  series int := (n - 1) / 999;          -- 0 → A, 1 → B, …
  num int := ((n - 1) % 999) + 1;       -- 001 … 999
begin
  return 'ZTHG9-2027' || chr(65 + series) || lpad(num::text, 3, '0');
end $$;

-- Renumber anyone already registered, in registration order
with ordered as (
  select id, row_number() over (order by created_at, id) as rn from public.students
)
update public.students s
   set registration_id = 'ZTHG9-2027' || chr(65 + ((o.rn - 1) / 999)::int) || lpad((((o.rn - 1) % 999) + 1)::text, 3, '0')
  from ordered o
 where o.id = s.id;

select case when (select count(*) from public.students) = 0
            then setval('public.registration_seq', 1, false)
            else setval('public.registration_seq', (select count(*) from public.students)) end;

-- ---------------------------------------------------------------------
-- Re-entry lockout
-- ---------------------------------------------------------------------
create table if not exists public.resume_failures (
  mobile        text primary key,
  failures      int not null default 0,
  locked_until  timestamptz
);
alter table public.resume_failures enable row level security;  -- no policies: server only
revoke all on public.resume_failures from anon, authenticated;

-- Returns {"ok":true} or {"error":"RESUME_NOT_FOUND"|"RESUME_LOCKED"}.
-- Returns (never raises) so the failure counter is committed.
create or replace function public.resume_session(p_mobile text, p_registration_id text, p_new_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  f public.resume_failures;
begin
  select * into f from public.resume_failures where mobile = p_mobile for update;
  if found and f.locked_until is not null and f.locked_until > now() then
    return jsonb_build_object('error', 'RESUME_LOCKED');
  end if;

  update public.students s
     set session_token_hash = p_new_token_hash
    from public.exams e
   where e.id = s.exam_id and e.is_active
     and s.mobile = p_mobile
     and s.registration_id = upper(btrim(p_registration_id))
  returning s.id into v_id;

  if v_id is null then
    insert into public.resume_failures as rf (mobile, failures) values (p_mobile, 1)
    on conflict (mobile) do update
       set failures = case when rf.locked_until is not null and rf.locked_until <= now() then 1 else rf.failures + 1 end,
           locked_until = null;
    update public.resume_failures
       set locked_until = now() + interval '15 minutes', failures = 0
     where mobile = p_mobile and failures >= 5;
    return jsonb_build_object('error',
      case when exists (select 1 from public.resume_failures where mobile = p_mobile and locked_until > now())
           then 'RESUME_LOCKED' else 'RESUME_NOT_FOUND' end);
  end if;

  delete from public.resume_failures where mobile = p_mobile;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public._new_registration_id() from public, anon, authenticated;
grant execute on function public._new_registration_id() to service_role;
revoke all on function public.resume_session(text, text, text) from public, anon, authenticated;
grant execute on function public.resume_session(text, text, text) to service_role;
grant usage on sequence public.registration_seq to service_role;
