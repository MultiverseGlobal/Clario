-- ============================================================
-- CLARIO FOUNDATION MIGRATION
-- Run in: Pseudonyms Supabase project (sqthvliapkauoxieiwfb)
-- Phase 1e: clario_recording_sessions (Sales Video)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clario_recording_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  atlas_job_id          UUID,    -- UUID of the clario_jobs row in Atlas Supabase project
  project_id            UUID REFERENCES public.clario_projects(id) ON DELETE SET NULL,

  -- Raw recording
  raw_video_url         TEXT,    -- unprocessed .webm in clario-raw bucket
  cursor_log            JSONB,   -- [{x, y, timestamp, clicked, button}] at ~60fps

  -- Processing
  processing_status     TEXT NOT NULL DEFAULT 'pending'
                        CHECK (processing_status IN ('pending', 'processing', 'done', 'failed')),
  processing_log        JSONB,   -- FFmpeg pipeline steps, timings, errors
  processing_error      TEXT,

  -- Output
  processed_video_url   TEXT,    -- polished .mp4 in clario-exports bucket (public URL)
  duration_sec          FLOAT,

  -- Atlas integration
  atlas_notified        BOOLEAN NOT NULL DEFAULT false,  -- true after video_url written to Atlas

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clario_recording_user
  ON public.clario_recording_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clario_recording_atlas_job
  ON public.clario_recording_sessions(atlas_job_id)
  WHERE atlas_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clario_recording_processing
  ON public.clario_recording_sessions(processing_status)
  WHERE processing_status IN ('pending', 'processing');

ALTER TABLE public.clario_recording_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clario_recording_sessions TO authenticated;
GRANT ALL ON public.clario_recording_sessions TO service_role;

DROP POLICY IF EXISTS "users manage own recording sessions" ON public.clario_recording_sessions;
CREATE POLICY "users manage own recording sessions"
  ON public.clario_recording_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
