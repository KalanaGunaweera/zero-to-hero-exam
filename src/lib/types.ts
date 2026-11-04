export type ExamStatus = 'registered' | 'ready_to_start' | 'in_progress' | 'submitted' | 'auto_submitted' | 'expired';

export type ExamState = {
  attempt_id: string;
  status: ExamStatus;
  registration_id: string;
  full_name: string;
  started_at: string | null;
  deadline_at: string | null;
  submitted_at: string | null;
  server_now: string;
  remaining_ms: number | null;
  duration_minutes: number;
  exam_open: boolean;
  exam_title: string;
  question_count: number;
  answered_count: number;
  score: number | null;
  total_questions: number | null;
  show_results: boolean;
};

export type Question = {
  id: string;
  number: number;
  text: string;
  image_url: string | null;
  options: [string, string, string, string];
};

export type SavedAnswers = Record<string, { option: number; seq: number }>;

export type ExamPaper = {
  state: ExamState;
  questions: Question[];
  answers: SavedAnswers;
};
