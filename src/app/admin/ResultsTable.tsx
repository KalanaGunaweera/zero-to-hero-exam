'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { districtSi } from '@/lib/districts';

export type ResultRow = {
  student_id: string;
  registration_id: string;
  full_name: string;
  mobile: string;
  school_name: string;
  district: string;
  parent_name: string;
  registered_at: string;
  status: string;
  started_at: string | null;
  deadline_at: string | null;
  submitted_at: string | null;
  score: number | null;
  total_questions: number | null;
  answered_count: number;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  registered: { label: 'Registered', cls: 'bg-slate-muted/10 text-slate-muted' },
  ready_to_start: { label: 'Ready to start', cls: 'bg-gold/20 text-gold-dark' },
  in_progress: { label: 'In progress', cls: 'bg-blue-100 text-blue-800' },
  submitted: { label: 'Submitted', cls: 'bg-board text-white' },
  auto_submitted: { label: 'Auto-submitted', cls: 'bg-board/15 text-board' },
  expired: { label: 'Expired', cls: 'bg-danger/10 text-danger' },
};

const fmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(iso))
    : '—';

const duration = (a: string | null, b: string | null) => {
  if (!a || !b) return '—';
  const s = Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};

type SortKey = 'registered_at' | 'score' | 'full_name' | 'submitted_at';

export function ResultsTable({ rows }: { rows: ResultRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<SortKey>('registered_at');

  const stats = useMemo(() => {
    const done = rows.filter((r) => ['submitted', 'auto_submitted', 'expired'].includes(r.status));
    const scored = done.filter((r) => r.score != null);
    const avg = scored.length ? scored.reduce((a, r) => a + (r.score ?? 0), 0) / scored.length : null;
    return {
      total: rows.length,
      waiting: rows.filter((r) => r.status === 'registered' || r.status === 'ready_to_start').length,
      live: rows.filter((r) => r.status === 'in_progress').length,
      done: done.length,
      avg,
      top: scored.length ? Math.max(...scored.map((r) => r.score ?? 0)) : null,
    };
  }, [rows]);

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => status === 'all' || r.status === status)
      .filter((r) =>
        !needle ||
        [r.full_name, r.mobile, r.school_name, r.registration_id, r.district, r.parent_name].some((v) => v?.toLowerCase().includes(needle)),
      )
      .sort((a, b) => {
        if (sort === 'score') return (b.score ?? -1) - (a.score ?? -1);
        if (sort === 'full_name') return a.full_name.localeCompare(b.full_name);
        const av = a[sort] ?? '';
        const bv = b[sort] ?? '';
        return bv.localeCompare(av);
      });
  }, [rows, q, status, sort]);

  function exportCsv() {
    const head = ['Registration ID', 'Name', 'Mobile', 'School', 'District', 'Parent/Guardian', 'Status', 'Registered', 'Started', 'Deadline', 'Submitted', 'Time taken', 'Answered', 'Score', 'Total'];
    const lines = view.map((r) =>
      [r.registration_id, r.full_name, r.mobile, r.school_name, r.district, r.parent_name, r.status, fmt(r.registered_at), fmt(r.started_at), fmt(r.deadline_at), fmt(r.submitted_at), duration(r.started_at, r.submitted_at), r.answered_count, r.score ?? '', r.total_questions ?? '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    // BOM so Excel opens Sinhala text correctly
    const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zero-to-hero-grade9-2027-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Registered', stats.total],
          ['Not started', stats.waiting],
          ['Writing now', stats.live],
          ['Finished', stats.done],
          ['Average score', stats.avg == null ? '—' : stats.avg.toFixed(1)],
          ['Top score', stats.top ?? '—'],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col-reverse rounded-2xl border border-board/10 bg-white px-4 py-3">
            <dt className="text-xs text-slate-muted">{k}</dt>
            <dd className="tabular text-2xl font-bold text-board">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, mobile, school, ID…"
          className="min-h-[42px] w-full rounded-xl border-2 border-board/15 bg-white px-3 sm:w-72"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-[42px] rounded-xl border-2 border-board/15 bg-white px-3">
          <option value="all">All statuses</option>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="min-h-[42px] rounded-xl border-2 border-board/15 bg-white px-3">
          <option value="registered_at">Newest registration</option>
          <option value="submitted_at">Latest submission</option>
          <option value="score">Highest score</option>
          <option value="full_name">Name A–Z</option>
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={() => router.refresh()} className="min-h-[42px] rounded-xl border-2 border-board/20 bg-white px-4 font-semibold text-board">
            Refresh
          </button>
          <button onClick={exportCsv} className="min-h-[42px] rounded-xl bg-board px-4 font-semibold text-white">
            Export CSV
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-muted">{view.length} of {rows.length} students</p>

      <div className="mt-2 overflow-x-auto rounded-2xl border border-board/10 bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-board text-white">
            <tr>
              {['Reg. ID', 'Student', 'School / District', 'Parent / Guardian', 'Status', 'Registered', 'Started', 'Submitted', 'Time', 'Answered', 'Score'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => {
              const s = STATUS[r.status] ?? { label: r.status, cls: '' };
              return (
                <tr key={r.student_id} className="border-t border-board/10 align-top hover:bg-paper">
                  <td className="tabular whitespace-nowrap px-3 py-2.5 font-semibold">{r.registration_id}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold">{r.full_name}</div>
                    <a href={`tel:${r.mobile}`} className="tabular text-slate-muted hover:underline">{r.mobile}</a>
                  </td>
                  <td className="px-3 py-2.5">
                    <div>{r.school_name}</div>
                    <div className="text-slate-muted">{r.district} · {districtSi(r.district)}</div>
                  </td>
                  <td className="px-3 py-2.5">{r.parent_name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-2.5">{fmt(r.registered_at)}</td>
                  <td className="tabular whitespace-nowrap px-3 py-2.5">{fmt(r.started_at)}</td>
                  <td className="tabular whitespace-nowrap px-3 py-2.5">{fmt(r.submitted_at)}</td>
                  <td className="tabular whitespace-nowrap px-3 py-2.5">{duration(r.started_at, r.submitted_at)}</td>
                  <td className="tabular px-3 py-2.5">{r.answered_count}</td>
                  <td className="tabular whitespace-nowrap px-3 py-2.5 text-base font-bold text-board">
                    {r.score != null ? `${r.score}/${r.total_questions}` : '—'}
                  </td>
                </tr>
              );
            })}
            {view.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-slate-muted">
                  {rows.length ? 'No students match these filters.' : 'No registrations yet. Share the exam link with students to begin.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
