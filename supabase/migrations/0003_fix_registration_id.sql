-- Fix: registration IDs failed on Supabase because gen_random_bytes() lives in the
-- "extensions" schema there. Use the built-in gen_random_uuid() instead (no extension).
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

revoke all on function public._new_registration_id() from public, anon, authenticated;
grant execute on function public._new_registration_id() to service_role;
