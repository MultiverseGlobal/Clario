-- ============================================================
-- CLARIO FOUNDATION MIGRATION
-- Run in: Pseudonyms Supabase project (sqthvliapkauoxieiwfb)
-- Phase: clario_jobs — background processing job tracker
-- Used by: FastAPI worker (server/main.py) to persist job state
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clario_jobs (
  id              TEXT PRIMARY KEY,               -- job_id from worker (e.g. "job_abc123")
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type            TEXT DEFAULT 'video_analysis',  -- 'video_analysis' | 'slide_analysis' | 'zip_export' | 'reference_ingest'
  status          TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'processing' | 'completed' | 'failed'
  progress_pct    INTEGER DEFAULT 0,
  status_msg      TEXT,
  input_url       TEXT,                           -- original source URL or filename
  result          JSONB,                          -- final result payload from worker
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION public.clario_jobs_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clario_jobs_updated_at ON public.clario_jobs;
CREATE TRIGGER trg_clario_jobs_updated_at
  BEFORE UPDATE ON public.clario_jobs
  FOR EACH ROW EXECUTE FUNCTION public.clario_jobs_set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clario_jobs_user    ON public.clario_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_clario_jobs_status  ON public.clario_jobs(status);
CREATE INDEX IF NOT EXISTS idx_clario_jobs_created ON public.clario_jobs(created_at DESC);

-- RLS: workers use service_role key which bypasses RLS; users can read their own jobs
ALTER TABLE public.clario_jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.clario_jobs TO authenticated;
GRANT ALL ON public.clario_jobs TO service_role;

DROP POLICY IF EXISTS "users read own jobs" ON public.clario_jobs;
CREATE POLICY "users read own jobs"
  ON public.clario_jobs FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);
