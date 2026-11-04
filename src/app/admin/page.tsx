import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/supabase/server';
import { AdminShell, NotAdmin } from './AdminShell';
import { ResultsTable, type ResultRow } from './ResultsTable';
import { ExamSettings, type ExamRow } from './ExamSettings';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const { supabase, user, isAdmin } = await getAdmin();
  if (!user) redirect('/admin/login');
  if (!isAdmin) return <NotAdmin email={user.email ?? ''} />;

  // Close any attempt whose deadline passed while the student was away
  await supabase.rpc('admin_finalize_expired');

  const { data: exam } = await supabase.from('exams').select('*').eq('is_active', true).maybeSingle<ExamRow>();
  const [{ data: rows }, { count }] = await Promise.all([
    supabase.from('admin_results').select('*').eq('exam_id', exam?.id ?? '').order('registered_at', { ascending: false }),
    supabase.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', exam?.id ?? '').eq('is_published', true),
  ]);

  return (
    <AdminShell email={user.email ?? ''}>
      {exam ? <ExamSettings exam={exam} questionCount={count ?? 0} /> : <p>No active exam.</p>}
      <ResultsTable rows={(rows as ResultRow[]) ?? []} />
    </AdminShell>
  );
}
