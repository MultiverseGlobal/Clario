-- ============================================================
-- CLARIO FOUNDATION MIGRATION
-- Run in: Pseudonyms Supabase project (sqthvliapkauoxieiwfb)
-- Phase 1d: clario_slide_analyses
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clario_slide_analyses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES public.clario_projects(id) ON DELETE CASCADE,
  slide_index      INT NOT NULL,
  slide_image_url  TEXT,    -- image in clario-slides bucket
  layout_type      TEXT,    -- 'title' | 'content' | 'comparison' | 'cta' | 'data' | 'image'
  gemini_analysis  TEXT,    -- raw Gemini Vision JSON/text output
  slide_goal       TEXT,    -- user input: "what should the viewer feel or do?"
  redesign_prompt  TEXT,    -- AI-generated prompt for Midjourney/Ideogram/Canva
  slide_brief      TEXT,    -- structured communication brief for this slide
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clario_slides_project
  ON public.clario_slide_analyses(project_id, slide_index);

ALTER TABLE public.clario_slide_analyses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clario_slide_analyses TO authenticated;
GRANT ALL ON public.clario_slide_analyses TO service_role;

DROP POLICY IF EXISTS "users manage own slide analyses" ON public.clario_slide_analyses;
CREATE POLICY "users manage own slide analyses"
  ON public.clario_slide_analyses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
