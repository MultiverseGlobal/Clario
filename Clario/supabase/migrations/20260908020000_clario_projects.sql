-- ============================================================
-- CLARIO FOUNDATION MIGRATION
-- Run in: Pseudonyms Supabase project (sqthvliapkauoxieiwfb)
-- Phase 1b: clario_projects
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clario_projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  mode           TEXT NOT NULL CHECK (mode IN ('content_video', 'sales_video', 'slides')),
  format         TEXT,
  script_text    TEXT,
  thumbnail_url  TEXT,
  asset_count    INT NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'processing', 'complete', 'archived')),
  atlas_job_id   UUID,         -- FK to clario_jobs in Atlas (cross-db, stored as UUID ref only)
  dexie_snapshot JSONB,        -- full local Dexie project serialised for cloud backup
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clario_projects_user
  ON public.clario_projects(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_clario_projects_atlas_job
  ON public.clario_projects(atlas_job_id)
  WHERE atlas_job_id IS NOT NULL;

ALTER TABLE public.clario_projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clario_projects TO authenticated;
GRANT ALL ON public.clario_projects TO service_role;

DROP POLICY IF EXISTS "users manage own clario projects" ON public.clario_projects;
CREATE POLICY "users manage own clario projects"
  ON public.clario_projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
