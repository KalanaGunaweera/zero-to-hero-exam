import { redirect } from 'next/navigation';
import { getCurrentState, routeForStatus } from '@/lib/exam';
import { ExamClient } from './ExamClient';

export const dynamic = 'force-dynamic';

export default async function ExamPage() {
  const state = await getCurrentState();
  if (!state) redirect('/');
  if (state.status !== 'in_progress') redirect(routeForStatus(state.status));
  return <ExamClient />;
}
