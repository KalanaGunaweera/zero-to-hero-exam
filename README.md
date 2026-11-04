# Zero to Hero — Grade 9 Mathematics 2027 Examination

Online MCQ exam for **Zero to Hero** (Kalana Gunaweera · Online – Zoom · 074 168 9755).
Registration → instructions → 60-minute timed exam → result, with an admin dashboard.
Next.js 14 (App Router) + Supabase (Postgres, Auth, Storage), deployable to Vercel.

All student-facing text is Sinhala (Noto Sans Sinhala, self-hosted).

---

## Setup (about 10 minutes)

### 1. Supabase
1. Create a project at supabase.com.
2. **SQL Editor →** paste and run `supabase/migrations/0001_exam_schema.sql`.
   This creates the tables, Row Level Security, exam functions, the `question-images`
   storage bucket, and the *Grade 9 Mathematics – 2027* exam.
   Then run `supabase/migrations/0002_grade9_2027_paper.sql` — the 20-question paper with its
   answer key, and sets the exam to **40 minutes**. (Safe: it won't insert twice.)
3. *(Recommended)* **Database → Extensions → enable `pg_cron`**, then re-run only the last
   `do $$ … pg_cron … $$` block from the migration. It closes timed-out attempts every minute.
   (Not required — attempts are also closed on the student's next request and whenever
   the admin dashboard loads.)

### 2. Create your admin login
1. **Authentication → Users → Add user** — your email + a password (tick *Auto confirm*).
2. **SQL Editor:**
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'you@example.com';
   ```

### 3. Environment variables
Copy `.env.example` to `.env.local` (and add the same values in Vercel → Settings → Environment Variables):

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (**server only, never expose**) |
| `CRON_SECRET` | optional, protects `/api/cron/finalize` |

### 4. Branding
Already included, taken from the Zero to Hero Facebook cover:
- `public/brand/teacher.jpg` — profile photo (used in small avatars).
- `public/brand/cover-art.jpg` — the photo + glow ring + lightning from the cover. The banner's
  text (title, "Zero to Hero", WhatsApp, Zoom) is live HTML, so the year/batch changes in one place:
  `coverTitle` in `src/lib/brand.ts` (currently "Grade 9 Maths Class – 2027").
- `public/brand/logo.svg` — app/home-screen icon. After changing it run `npm run icons`.

### 5. Run / deploy
```bash
npm install
npm run dev          # http://localhost:3000   admin: /admin
npm run build && npm start
```
Deploy: push to GitHub → import in Vercel → add the env vars.

### 6. Questions
The 20-question paper is loaded by migration `0002`. Review or edit it at **/admin → Questions**
(text, optional image, 4 options, correct option, order). The header turns green at exactly 20.

Maths markup works in questions and options: `[[5/6]]` → stacked fraction,
`[[√196]]` → square root with overbar. Type ² ³ ° × − ≤ directly.
Paper size shown on the registration page is `exam` in `src/lib/brand.ts`; the timer itself
comes from `exams.duration_minutes` in the database.

### 7. Before exam day
On **/admin** use the switches:
- **Registration open** — new students can register.
- **Exam open** — registered students can press Start. Turn this off to let students register
  in advance and all start at a fixed time.
- **Show marks to students** — off = result page says the teacher will announce results.

---

## How it works

### Security model
- Students never touch the database directly. Every action goes through an API route that calls a
  `SECURITY DEFINER` Postgres function using the service-role key. Only `service_role` can execute them.
- RLS is enabled on every table with **no** student policies. Admins (rows in `admins`) can read
  results and manage exams/questions; nobody can edit registrations or answers through the API.
- Correct answers live in a separate `question_keys` table that no student function returns.
- Session: a random 256-bit token in an **httpOnly** cookie; only its SHA-256 hash is stored.
- On a new device, students re-enter with **mobile + registration ID** (e.g. `ZTH27-K7M2QX`);
  this issues a new session and revokes the old one.

### Time is decided by the server
- Start is a one-time DB operation: `started_at = now()`, `deadline_at = now() + 40 min`.
  Calling it again (refresh, double-click) returns the same attempt and never moves the deadline.
- Every answer save and submit is checked against `deadline_at` using the **database clock**.
- The browser countdown displays `deadline − server_now`, anchored to `performance.now()`
  (immune to wrong/changed device clocks) and re-synced every 30 s, on tab focus and on reconnect.
- If the browser is closed at the deadline, the attempt is finalized from saved answers on the next
  request (or by pg_cron / the admin dashboard). Late writes are rejected.

### Auto-save
- Every selection is sent immediately with an increasing sequence number. The DB only accepts a
  write with a sequence ≥ the stored one, so a slow retry can't overwrite a newer choice.
  One row per (attempt, question) — no duplicates.
- "සුරකින ලදී" appears only after the server confirms it holds that exact choice.
- Network errors retry with backoff (1 s → 15 s) and immediately on reconnect. Unconfirmed choices
  are mirrored to localStorage and replayed after a refresh.
- Submit waits for all pending saves; it's disabled while offline.

### Statuses
| Status | Meaning |
|---|---|
| `registered` | Form completed |
| `ready_to_start` | Instructions page viewed |
| `in_progress` | Started; deadline running |
| `submitted` | Student submitted before the deadline |
| `auto_submitted` | Deadline reached; saved answers scored (submitted_at = deadline) |
| `expired` | Deadline reached with no answers saved |

### PWA
Installable via Add to Home Screen (manifest + icons + service worker). The service worker caches
only static assets; exam pages and all `/api` calls are network-only, so the exam cannot be taken or
submitted offline. Offline navigation shows a Sinhala "no connection" page.

---

## Tests
```bash
npm run test:db   # 37 checks against the real migration in an in-memory Postgres (PGlite)
```
Covers: registration validation, duplicate mobile, questions hidden before start, idempotent start,
exact 60-minute deadline, answer changes, out-of-order retries, late-answer rejection, auto-submit on
reconnect, sweep → expired, manual submit scoring, no edits after submit, resume/session revocation,
RLS (non-admins see nothing; only service role can call student functions), and that the
seeded paper has 20 questions, 40 minutes and exactly the PDF's answer key.

The full student flow was also exercised end to end in Chrome at 360, 390 (+ landscape), 768, 1024
and 1440 px: no horizontal scroll, timer and Previous/Next/Submit always visible, ≥ 44 px touch
targets, offline → retry → saved, refresh restore, manual submit, and auto-submit at the deadline.

## Project map
```
supabase/migrations/0001_exam_schema.sql   schema, RLS, exam functions, storage bucket, seed exam
src/app/page.tsx + RegisterForm.tsx        registration
src/app/resume/                            re-enter with mobile + registration ID
src/app/instructions/                      Sinhala instructions + start confirmation
src/app/exam/                              exam UI, server-synced clock, auto-save engine, answer sheet
src/app/result/                            result page
src/app/admin/                             login, results dashboard + CSV export, settings, question editor
src/app/api/                               register, resume, exam/{state,paper,start,answer,submit}, cron
src/lib/messages.ts                        all Sinhala messages
public/sw.js, manifest.webmanifest         PWA
```
