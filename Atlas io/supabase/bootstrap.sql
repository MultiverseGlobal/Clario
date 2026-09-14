-- ==============================================================================
-- UNIFIED IDEMPOTENT BOOTSTRAP SCRIPT: ATLAS IO + CLARIO
-- Safe to execute repeatedly on new or existing Supabase projects.
-- Covers all tables, enums, triggers, storage buckets, and RLS policies.
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS citext;

-- 2. Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'page_visibility') THEN
    CREATE TYPE public.page_visibility AS ENUM ('public', 'unlisted', 'private');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_plan') THEN
    CREATE TYPE public.user_plan AS ENUM ('free', 'atlas');
  END IF;
END$$;

-- 3. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle CITEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  page_visibility public.page_visibility NOT NULL DEFAULT 'unlisted',
  plan public.user_plan NOT NULL DEFAULT 'free',
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_public_read') THEN
    CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (page_visibility != 'private');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_user_manage') THEN
    CREATE POLICY "profiles_user_manage" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 4. Atlas User Settings (Extended with multi-provider AI & SMTP credentials)
CREATE TABLE IF NOT EXISTS public.atlas_user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_api_key TEXT,
  groq_api_key TEXT,
  gemini_api_key TEXT,
  kimi_api_key TEXT,
  nim_api_key TEXT,
  apollo_api_key TEXT,
  resend_api_key TEXT,
  proxy_url TEXT,
  proxy_auth TEXT,
  sender_name TEXT,
  smtp_email TEXT,
  smtp_password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.atlas_user_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'atlas_user_settings' AND policyname = 'atlas_user_settings_owner') THEN
    CREATE POLICY "atlas_user_settings_owner" ON public.atlas_user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Atlas Opportunities (Core CRM & Lead Pipeline)
CREATE TABLE IF NOT EXISTS public.atlas_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  primary_domain TEXT,
  prospect TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  industry TEXT,
  team_size TEXT,
  fit_score NUMERIC DEFAULT 7,
  score_founder_active INT DEFAULT 2,
  score_buying_signal INT DEFAULT 2,
  score_icp_fit INT DEFAULT 2,
  score_reachable INT DEFAULT 2,
  score_atlas_relevance INT DEFAULT 2,
  pipeline_stage TEXT DEFAULT 'Sourced',
  priority TEXT DEFAULT 'Medium',
  source TEXT DEFAULT 'Organic',
  acquisition_channel TEXT DEFAULT 'Outbound',
  founder_thesis TEXT,
  goal TEXT,
  pain_signals JSONB DEFAULT '[]'::jsonb,
  buying_signals JSONB DEFAULT '[]'::jsonb,
  research_data JSONB DEFAULT '{}'::jsonb,
  deal_notes TEXT,
  next_action TEXT,
  clario_video_url TEXT,
  is_contacted BOOLEAN DEFAULT false,
  is_hq_dump BOOLEAN DEFAULT false,
  reply_status TEXT,
  deal_size NUMERIC DEFAULT 0,
  stale_data_warning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_atlas_opps_user_stage ON public.atlas_opportunities(user_id, pipeline_stage);
ALTER TABLE public.atlas_opportunities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'atlas_opportunities' AND policyname = 'atlas_opportunities_owner') THEN
    CREATE POLICY "atlas_opportunities_owner" ON public.atlas_opportunities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 6. Atlas Outreach (Outbound Drafts, Queue & Clario Links)
CREATE TABLE IF NOT EXISTS public.atlas_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'cold_email',
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  clario_video_url TEXT,
  clario_requested_at TIMESTAMPTZ,
  follow_up_due DATE,
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_atlas_outreach_user_status ON public.atlas_outreach(user_id, status);
CREATE INDEX IF NOT EXISTS idx_atlas_outreach_company ON public.atlas_outreach(company_id);
ALTER TABLE public.atlas_outreach ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'atlas_outreach' AND policyname = 'atlas_outreach_owner') THEN
    CREATE POLICY "atlas_outreach_owner" ON public.atlas_outreach FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 7. Atlas Events (Audit Trail & Activity Log)
CREATE TABLE IF NOT EXISTS public.atlas_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_atlas_events_user_type ON public.atlas_events(user_id, event_type);
ALTER TABLE public.atlas_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'atlas_events' AND policyname = 'atlas_events_owner') THEN
    CREATE POLICY "atlas_events_owner" ON public.atlas_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 8. Clario Projects (Project Library & Video Manifests)
CREATE TABLE IF NOT EXISTS public.clario_projects (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  mode TEXT NOT NULL DEFAULT 'video_harvester',
  project_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clario_projects_user ON public.clario_projects(user_id);
ALTER TABLE public.clario_projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clario_projects' AND policyname = 'clario_projects_owner') THEN
    CREATE POLICY "clario_projects_owner" ON public.clario_projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 9. Clario Jobs (Processing Queue, Remote Ingest, Export Status)
CREATE TABLE IF NOT EXISTS public.clario_jobs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  outreach_id UUID REFERENCES public.atlas_outreach(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Video Harvest',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  progress_pct INT NOT NULL DEFAULT 0,
  status_msg TEXT,
  input_url TEXT,
  video_url TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clario_jobs_user ON public.clario_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_clario_jobs_outreach ON public.clario_jobs(outreach_id) WHERE outreach_id IS NOT NULL;
ALTER TABLE public.clario_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clario_jobs' AND policyname = 'clario_jobs_owner') THEN
    CREATE POLICY "clario_jobs_owner" ON public.clario_jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 10. Automated Video Propagation Trigger: Clario -> Atlas Outreach
CREATE OR REPLACE FUNCTION public.fn_clario_job_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.video_url IS NOT NULL AND (OLD.video_url IS NULL OR OLD.video_url <> NEW.video_url) THEN
    IF NEW.outreach_id IS NOT NULL THEN
      UPDATE public.atlas_outreach
        SET clario_video_url = NEW.video_url,
            status = 'ready',
            updated_at = now()
        WHERE id = NEW.outreach_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clario_job_complete ON public.clario_jobs;
CREATE TRIGGER trg_clario_job_complete
  AFTER UPDATE ON public.clario_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_clario_job_complete();

-- 11. Storage Buckets (Direct CDN + Render Processor Bridge)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('clario-raw', 'clario-raw', false),
  ('clario-exports', 'clario-exports', true),
  ('clario-frames', 'clario-frames', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage RLS Policies
DO $$ BEGIN
  -- clario-raw: authenticated uploads matching user folder (e.g. {uid}/...)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'clario_raw_auth_insert') THEN
    CREATE POLICY "clario_raw_auth_insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'clario-raw' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'clario_raw_auth_select') THEN
    CREATE POLICY "clario_raw_auth_select" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'clario-raw' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  -- clario-exports: public read for outreach recipients & authenticated insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'clario_exports_public_select') THEN
    CREATE POLICY "clario_exports_public_select" ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'clario-exports');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'clario_exports_auth_insert') THEN
    CREATE POLICY "clario_exports_auth_insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'clario-exports');
  END IF;

  -- clario-frames: public read for keyframes & contact sheets
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'clario_frames_public_select') THEN
    CREATE POLICY "clario_frames_public_select" ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'clario-frames');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'clario_frames_auth_insert') THEN
    CREATE POLICY "clario_frames_auth_insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'clario-frames');
  END IF;
END $$;

-- 12. Service Role & Authenticated Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
