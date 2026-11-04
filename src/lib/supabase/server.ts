import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Cookie-authenticated client for the admin area (RLS applies). */
export function adminServerClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component — middleware refreshes the session */
        }
      },
    },
  });
}

/** Returns the signed-in admin's user or null. */
export async function getAdmin() {
  const supabase = adminServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: null, isAdmin: false };
  const { data: row } = await supabase.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
  return { supabase, user: data.user, isAdmin: !!row };
}
