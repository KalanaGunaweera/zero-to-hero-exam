import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/supabase/server';
import { AdminShell, NotAdmin } from '../AdminShell';
import { QuestionEditor, type AdminQuestion } from './QuestionEditor';

export const dynamic = 'force-dynamic';

export default async function QuestionsPage() {
  const { supabase, user, isAdmin } = await getAdmin();
  if (!user) redirect('/admin/login');
  if (!isAdmin) return <NotAdmin email={user.email ?? ''} />;

  const { data: exam } = await supabase.from('exams').select('id, title').eq('is_active', true).maybeSingle();
  const { data: qs } = await supabase
    .from('questions')
    .select('*, question_keys(correct_option)')
    .eq('exam_id', exam?.id ?? '')
    .order('position')
    .order('created_at');
  const { count: started } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('exam_id', exam?.id ?? '')
    .not('started_at', 'is', null);

  const questions: AdminQuestion[] = (qs ?? []).map((q: Record<string, unknown>) => {
    const key = q.question_keys as { correct_option: number } | { correct_option: number }[] | null;
    const correct = Array.isArray(key) ? key[0]?.correct_option : key?.correct_option;
    return { ...(q as unknown as AdminQuestion), correct_option: correct ?? null };
  });

  return (
    <AdminShell email={user.email ?? ''}>
      {exam ? <QuestionEditor examId={exam.id} initial={questions} attemptsStarted={started ?? 0} /> : <p>No active exam.</p>}
    </AdminShell>
  );
}
