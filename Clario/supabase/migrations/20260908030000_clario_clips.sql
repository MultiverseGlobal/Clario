-- ============================================================
-- CLARIO FOUNDATION MIGRATION
-- Run in: Pseudonyms Supabase project (sqthvliapkauoxieiwfb)
-- Phase 1c: clario_clips (pgvector)
-- Prerequisite: CREATE EXTENSION IF NOT EXISTS vector;
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.clario_clips (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES public.clario_projects(id) ON DELETE CASCADE,
  shot_id        TEXT,
  title          TEXT,
  content_type   TEXT,   -- 'hook' | 'broll' | 'talking' | 'cta' | 'title_card'
  start_sec      FLOAT,
  end_sec        FLOAT,
  duration       FLOAT,
  frame_url      TEXT,   -- thumbnail in clario-frames bucket
  clip_url       TEXT,   -- cut video clip in clario-exports bucket
  description    TEXT,   -- Gemini Vision description
  rights_status  TEXT DEFAULT 'unresolved',
  embedding      vector(768),  -- Gemini text-embedding-004 for semantic vault search
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clario_clips_user    ON public.clario_clips(user_id);
CREATE INDEX IF NOT EXISTS idx_clario_clips_project ON public.clario_clips(project_id);
CREATE INDEX IF NOT EXISTS idx_clario_clips_embedding
  ON public.clario_clips USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE public.clario_clips ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clario_clips TO authenticated;
GRANT ALL ON public.clario_clips TO service_role;

DROP POLICY IF EXISTS "users manage own clario clips" ON public.clario_clips;
CREATE POLICY "users manage own clario clips"
  ON public.clario_clips FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Semantic search helper ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_clario_clips(
  query_embedding vector(768),
  match_user_id   uuid,
  match_count     int DEFAULT 10
)
RETURNS TABLE (
  id           uuid,
  shot_id      text,
  title        text,
  content_type text,
  clip_url     text,
  frame_url    text,
  description  text,
  duration     float,
  similarity   float
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id, c.shot_id, c.title, c.content_type,
    c.clip_url, c.frame_url, c.description, c.duration,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.clario_clips c
  WHERE c.user_id = match_user_id
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
