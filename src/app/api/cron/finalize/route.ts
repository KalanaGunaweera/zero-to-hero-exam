import { serviceClient } from '@/lib/supabase/service';
import { fail, json } from '@/lib/api';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

// Optional backup sweep (Vercel Cron or any scheduler). pg_cron in the
// migration does the same thing inside the database every minute.
export async function GET() {
  const secret = process.env.CRON_SECRET;
  if (!secret || headers().get('authorization') !== `Bearer ${secret}`) return fail('FORBIDDEN', 403);
  const { data, error } = await serviceClient().rpc('finalize_all_expired');
  if (error) return fail('SERVER_ERROR', 500);
  return json({ ok: true, finalized: data });
}
