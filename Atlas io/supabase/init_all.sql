-- Enable extension
CREATE EXTENSION IF NOT EXISTS citext;

-- ============ ENUMS ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_provider') THEN
    CREATE TYPE public.integration_provider AS ENUM ('github', 'stripe', 'linear', 'posthog');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_status') THEN
    CREATE TYPE public.integration_status AS ENUM ('active', 'error', 'disconnected', 'syncing');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
    CREATE TYPE public.event_type AS ENUM (
      'gh_pr_merged','gh_release','gh_deploy','gh_repo_created','gh_readme_milestone',
      'stripe_new_customer','stripe_first_dollar','stripe_mrr_milestone','stripe_churn_saved','stripe_refund',
      'linear_cycle_completed','linear_issue_closed','linear_project_shipped','linear_milestone',
      'posthog_wau_milestone','posthog_feature_adoption','posthog_retention_milestone','posthog_funnel_improvement',
      'manual_note'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type') THEN
    CREATE TYPE public.report_type AS ENUM ('weekly','investor','launch_post');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'page_visibility') THEN
    CREATE TYPE public.page_visibility AS ENUM ('public','unlisted','private');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'map_confidence') THEN
    CREATE TYPE public.map_confidence AS ENUM ('starter', 'emerging', 'established');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waypoint_kind') THEN
    CREATE TYPE public.waypoint_kind AS ENUM ('goal', 'constraint', 'evidence', 'move');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_plan') THEN
    CREATE TYPE public.user_plan AS ENUM ('free', 'atlas');
  END IF;
END$$;

-- ============ PROFILES ============
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
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles readable by all for public pages" ON public.profiles;
CREATE POLICY "profiles readable by all for public pages" ON public.profiles
  FOR SELECT USING (page_visibility != 'private');
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users insert own profile" ON public.profiles;
CREATE POLICY "users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============ ATLAS USER SETTINGS ============
CREATE TABLE IF NOT EXISTS public.atlas_user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_api_key TEXT,
  apollo_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atlas_user_settings TO authenticated;
GRANT ALL ON public.atlas_user_settings TO service_role;
ALTER TABLE public.atlas_user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own settings" ON public.atlas_user_settings;
CREATE POLICY "users manage own settings" ON public.atlas_user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ USER ROLES ============
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- ============ INTEGRATIONS ============
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider public.integration_provider NOT NULL,
  external_account_id TEXT,
  external_account_label TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  status public.integration_status NOT NULL DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, external_account_id)
);
CREATE INDEX IF NOT EXISTS idx_integrations_user ON public.integrations(user_id);
GRANT INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
GRANT SELECT (id, user_id, provider, external_account_id, external_account_label, scopes, status, last_sync_at, last_error, token_expires_at, created_at, updated_at)
  ON public.integrations TO authenticated;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own integrations" ON public.integrations;
CREATE POLICY "users manage own integrations" ON public.integrations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SYNC RUNS ============
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  events_ingested INT NOT NULL DEFAULT 0,
  error TEXT,
  kind TEXT NOT NULL DEFAULT 'poll'
);
CREATE INDEX IF NOT EXISTS idx_sync_runs_integration ON public.sync_runs(integration_id, started_at DESC);
GRANT SELECT ON public.sync_runs TO authenticated;
GRANT ALL ON public.sync_runs TO service_role;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own sync runs" ON public.sync_runs;
CREATE POLICY "users read own sync runs" ON public.sync_runs
  FOR SELECT USING (auth.uid() = user_id);

-- ============ EVENTS ============
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
  provider public.integration_provider,
  event_type public.event_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  external_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signal_score INT NOT NULL DEFAULT 0,
  is_high_signal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_provider_external ON public.events(provider, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_user_time ON public.events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_highsignal_time ON public.events(user_id, occurred_at DESC) WHERE is_high_signal = true;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own events" ON public.events;
CREATE POLICY "users manage own events" ON public.events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ EVENT METRICS ============
CREATE TABLE IF NOT EXISTS public.event_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_value_numeric NUMERIC,
  metric_value_text TEXT,
  metric_unit TEXT
);
CREATE INDEX IF NOT EXISTS idx_event_metrics_event ON public.event_metrics(event_id);
CREATE INDEX IF NOT EXISTS idx_event_metrics_user_key ON public.event_metrics(user_id, metric_key);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_metrics TO authenticated;
GRANT ALL ON public.event_metrics TO service_role;
ALTER TABLE public.event_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own metrics" ON public.event_metrics;
CREATE POLICY "users manage own metrics" ON public.event_metrics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ REPORTS ============
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.report_type NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  template_output_md TEXT NOT NULL,
  llm_output_md TEXT,
  validator_passed BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  og_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_user_time ON public.reports(user_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_reports_published ON public.reports(user_id, published, period_end DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT SELECT ON public.reports TO anon;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own reports" ON public.reports;
CREATE POLICY "users manage own reports" ON public.reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "public reports visible to anyone" ON public.reports;
CREATE POLICY "public reports visible to anyone" ON public.reports
  FOR SELECT USING (
    published = true AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = reports.user_id AND p.page_visibility != 'private'
    )
  );

-- ============ REPORT ↔ EVENT LINKS ============
CREATE TABLE IF NOT EXISTS public.report_event_links (
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  citation_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (report_id, event_id)
);
GRANT SELECT, INSERT, DELETE ON public.report_event_links TO authenticated;
GRANT SELECT ON public.report_event_links TO anon;
GRANT ALL ON public.report_event_links TO service_role;
ALTER TABLE public.report_event_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "links follow report visibility" ON public.report_event_links;
CREATE POLICY "links follow report visibility" ON public.report_event_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_event_links.report_id
        AND (r.user_id = auth.uid()
             OR (r.published AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = r.user_id AND p.page_visibility = 'public')))
    )
  );
DROP POLICY IF EXISTS "users write own report links" ON public.report_event_links;
CREATE POLICY "users write own report links" ON public.report_event_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_event_links.report_id AND r.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_event_links.report_id AND r.user_id = auth.uid())
  );

-- ============ PUBLIC SNAPSHOTS ============
CREATE TABLE IF NOT EXISTS public.public_snapshots (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle CITEXT NOT NULL,
  snapshot JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_handle ON public.public_snapshots(handle);
GRANT SELECT ON public.public_snapshots TO anon, authenticated;
GRANT ALL ON public.public_snapshots TO service_role;
ALTER TABLE public.public_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "snapshots visible when profile public" ON public.public_snapshots;
CREATE POLICY "snapshots visible when profile public" ON public.public_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = public_snapshots.user_id AND p.page_visibility = 'public')
  );

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own notifications" ON public.notifications;
CREATE POLICY "users read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users update own notifications" ON public.notifications;
CREATE POLICY "users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ACTIVITY LOGS ============
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_logs(user_id, created_at DESC);
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own activity" ON public.activity_logs;
CREATE POLICY "users read own activity" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ============ MAPS ============
CREATE TABLE IF NOT EXISTS public.maps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_statement TEXT NOT NULL,
  confidence    public.map_confidence NOT NULL DEFAULT 'starter',
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maps_user ON public.maps(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maps TO authenticated;
GRANT SELECT ON public.maps TO anon;
GRANT ALL ON public.maps TO service_role;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own maps" ON public.maps;
CREATE POLICY "users manage own maps" ON public.maps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "published maps visible to anon" ON public.maps;
CREATE POLICY "published maps visible to anon" ON public.maps
  FOR SELECT USING (
    is_published = true AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = maps.user_id AND p.page_visibility != 'private'
    )
  );

-- ============ WAYPOINTS ============
CREATE TABLE IF NOT EXISTS public.waypoints (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id     UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       public.waypoint_kind NOT NULL,
  title      TEXT NOT NULL,
  confidence public.map_confidence NOT NULL DEFAULT 'starter',
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waypoints_map ON public.waypoints(map_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waypoints TO authenticated;
GRANT ALL ON public.waypoints TO service_role;
ALTER TABLE public.waypoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own waypoints" ON public.waypoints;
CREATE POLICY "users manage own waypoints" ON public.waypoints
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "published waypoints visible" ON public.waypoints;
CREATE POLICY "published waypoints visible" ON public.waypoints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maps m WHERE m.id = waypoints.map_id AND m.is_published = true
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = m.user_id AND p.page_visibility != 'private')
    )
  );

-- ============ SOURCES (never publishable) ============
CREATE TABLE IF NOT EXISTS public.sources (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id         UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
  provider       public.integration_provider,
  label          TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sources_map ON public.sources(map_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own sources" ON public.sources;
CREATE POLICY "users manage own sources" ON public.sources
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SIGNALS (never publishable) ============
CREATE TABLE IF NOT EXISTS public.signals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id      UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  score       INT NOT NULL DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signals_map ON public.signals(map_id, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signals TO authenticated;
GRANT ALL ON public.signals TO service_role;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own signals" ON public.signals;
CREATE POLICY "users manage own signals" ON public.signals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ EVIDENCE ITEMS ============
CREATE TABLE IF NOT EXISTS public.evidence_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id      UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  waypoint_id UUID REFERENCES public.waypoints(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  source_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_map ON public.evidence_items(map_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_items TO authenticated;
GRANT ALL ON public.evidence_items TO service_role;
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own evidence" ON public.evidence_items;
CREATE POLICY "users manage own evidence" ON public.evidence_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "published evidence visible" ON public.evidence_items;
CREATE POLICY "published evidence visible" ON public.evidence_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maps m WHERE m.id = evidence_items.map_id AND m.is_published = true
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = m.user_id AND p.page_visibility = 'public')
    )
  );

-- ============ TIMELINE EVENTS ============
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id      UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_timeline_map ON public.timeline_events(map_id, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_events TO authenticated;
GRANT ALL ON public.timeline_events TO service_role;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own timeline events" ON public.timeline_events;
CREATE POLICY "users manage own timeline events" ON public.timeline_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "published timeline events visible" ON public.timeline_events;
CREATE POLICY "published timeline events visible" ON public.timeline_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maps m WHERE m.id = timeline_events.map_id AND m.is_published = true
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = m.user_id AND p.page_visibility = 'public')
    )
  );

-- ============ ACTIVE MAP COUNT HELPER ============
CREATE OR REPLACE FUNCTION public.active_map_count(_user_id UUID)
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.maps WHERE user_id = _user_id;
$$;

-- ============ TRIGGERS & UTILITIES ============
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_integrations_updated ON public.integrations;
CREATE TRIGGER trg_integrations_updated BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_reports_updated ON public.reports;
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_maps_updated ON public.maps;
CREATE TRIGGER trg_maps_updated BEFORE UPDATE ON public.maps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
          NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ MISSING: updated_at TRIGGER FOR atlas_user_settings ============
DROP TRIGGER IF EXISTS trg_atlas_user_settings_updated ON public.atlas_user_settings;
CREATE TRIGGER trg_atlas_user_settings_updated BEFORE UPDATE ON public.atlas_user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ UPSERT GITHUB TOKEN RPC ============
-- Called by useAuth.tsx to persist the GitHub OAuth provider token
-- into the integrations table when the user signs in with GitHub.
CREATE OR REPLACE FUNCTION public.upsert_github_token(
  p_token TEXT,
  p_scopes TEXT DEFAULT 'read:user repo',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.integrations (user_id, provider, access_token_encrypted, scopes, token_expires_at, status)
  VALUES (
    _uid,
    'github',
    p_token,
    string_to_array(p_scopes, ' '),
    p_expires_at,
    'active'
  )
  ON CONFLICT (user_id, provider, external_account_id)
    DO UPDATE SET
      access_token_encrypted = EXCLUDED.access_token_encrypted,
      scopes = EXCLUDED.scopes,
      token_expires_at = EXCLUDED.token_expires_at,
      status = 'active',
      updated_at = now();
END; $$;

GRANT EXECUTE ON FUNCTION public.upsert_github_token(TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- Lock down function execute privileges
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_github_token(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
-- ==============================================================================
-- PSEUDONYMS ATLAS V1 — CANONICAL DATABASE SCHEMA
-- Migration: 20260907000000_atlas_v1_vertical_slice.sql
-- ==============================================================================

-- 1. OBJECTIVES (Founder Commercial Intent)
CREATE TABLE IF NOT EXISTS public.atlas_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_summary TEXT NOT NULL,
  target_hypothesis TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ICP PROFILES (Version Numbers Represent Approved Versions)
CREATE TABLE IF NOT EXISTS public.atlas_icp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.atlas_objectives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INT, -- NULL when status = 'draft'; 1, 2, 3... when approved
  title TEXT NOT NULL,
  buyer_persona JSONB NOT NULL DEFAULT '{"role": "Managing Director / Founder", "seniority": "Executive"}',
  target_geography TEXT[] NOT NULL DEFAULT ARRAY['US', 'UK'],
  employee_range_min INT NOT NULL DEFAULT 5,
  employee_range_max INT NOT NULL DEFAULT 30,
  industry_keywords TEXT[] NOT NULL DEFAULT ARRAY['digital agency', 'web agency', 'design studio', 'marketing agency'],
  pain_signals TEXT[] NOT NULL DEFAULT ARRAY['delivery overhead', 'retainer management chaos', 'automation hiring'],
  buying_signals TEXT[] NOT NULL DEFAULT ARRAY['scaling operations', 'tech stack adoption'],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ACQUISITION RUNS (Batch Jobs Storing Frozen ICP Snapshot)
CREATE TABLE IF NOT EXISTS public.atlas_acquisition_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icp_profile_id UUID NOT NULL REFERENCES public.atlas_icp_profiles(id) ON DELETE RESTRICT,
  icp_version_snapshot INT NOT NULL,
  icp_snapshot JSONB NOT NULL, -- Frozen copy of the exact approved search thesis
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_connector TEXT NOT NULL DEFAULT 'controlled_agency_feed',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  items_discovered INT NOT NULL DEFAULT 0,
  items_qualified INT NOT NULL DEFAULT 0,
  run_telemetry JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. OPPORTUNITIES (Evaluated Organizations with Transparent Fit Score)
CREATE TABLE IF NOT EXISTS public.atlas_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.atlas_acquisition_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  primary_domain TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'Digital Agency',
  employee_count_est INT,
  country TEXT,
  pipeline_stage TEXT NOT NULL DEFAULT 'discovered' 
    CHECK (pipeline_stage IN ('discovered', 'qualified', 'outreach_ready', 'contacted', 'engaged', 'closed_won', 'closed_lost', 'disqualified')),
  fit_score INT NOT NULL DEFAULT 0 CHECK (fit_score BETWEEN 0 AND 100),
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_action_recommendation TEXT,
  next_action_due_at TIMESTAMPTZ,
  deal_value_usd NUMERIC,
  deal_closed_at TIMESTAMPTZ,
  deal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_atlas_org_domain UNIQUE (user_id, primary_domain)
);

-- 5. EVIDENCE (Truly Immutable Append-Only Grounded Signals)
CREATE TABLE IF NOT EXISTS public.atlas_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('employee_fit', 'geo_fit', 'industry_fit', 'pain_signal', 'buying_signal', 'decision_maker')),
  raw_snippet TEXT NOT NULL,
  source_url TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable Evidence Trigger: Hard block on UPDATE or DELETE
CREATE OR REPLACE FUNCTION public.trg_fn_prevent_evidence_mutation() 
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'atlas_evidence records are strictly append-only. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_evidence_mutation ON public.atlas_evidence;
CREATE TRIGGER trg_prevent_evidence_mutation 
  BEFORE UPDATE OR DELETE ON public.atlas_evidence
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_prevent_evidence_mutation();

-- 6. CONTACTS (Decision Makers with Rigorous Provenance Tier)
CREATE TABLE IF NOT EXISTS public.atlas_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  email TEXT,
  linkedin_url TEXT,
  verification_tier TEXT NOT NULL DEFAULT 'email_discovered'
    CHECK (verification_tier IN ('email_discovered', 'email_domain_valid', 'email_verified', 'person_email_verified', 'user_provided')),
  provenance_source TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. OUTREACH (Human-Approved Pitch Copy for Manual Send)
CREATE TABLE IF NOT EXISTS public.atlas_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.atlas_contacts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'linkedin')),
  draft_subject TEXT NOT NULL,
  draft_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'manually_sent', 'replied', 'declined')),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  manual_send_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. FOLLOWUPS (Deterministic Next Best Actions)
CREATE TABLE IF NOT EXISTS public.atlas_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id UUID NOT NULL REFERENCES public.atlas_outreach(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  action_strategy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. ROW LEVEL SECURITY (Tenant Isolation)
ALTER TABLE public.atlas_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_icp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_acquisition_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_isolation_objectives" ON public.atlas_objectives FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_icp" ON public.atlas_icp_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_runs" ON public.atlas_acquisition_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_opps" ON public.atlas_opportunities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_evidence" ON public.atlas_evidence FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_contacts" ON public.atlas_contacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_outreach" ON public.atlas_outreach FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_followups" ON public.atlas_followups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. ONE-WAY COMPATIBILITY READ ADAPTER (Read-Only Projection for Legacy Consumers)
CREATE OR REPLACE VIEW public.legacy_kuro_sync 
WITH (security_invoker = true) AS
  SELECT 
    id,
    user_id,
    organization_name AS company_name,
    primary_domain AS domain,
    pipeline_stage AS status,
    fit_score AS score,
    created_at
  FROM public.atlas_opportunities;

-- Explicitly block all writes through the compatibility view
REVOKE INSERT, UPDATE, DELETE ON public.legacy_kuro_sync FROM authenticated, anon, public;
-- ============================================================
-- CLARIO JOBS ? ATLAS OUTREACH LINK
-- Adds outreach_id FK + video_url to clario_jobs so that
-- when Clario pushes a completed recording, a trigger
-- automatically propagates the URL to atlas_outreach.
-- ============================================================

-- 1. Extend clario_jobs with outreach link + video URL
ALTER TABLE public.clario_jobs
  ADD COLUMN IF NOT EXISTS outreach_id UUID REFERENCES public.atlas_outreach(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_url   TEXT;

CREATE INDEX IF NOT EXISTS idx_clario_jobs_outreach_id
  ON public.clario_jobs(outreach_id)
  WHERE outreach_id IS NOT NULL;

-- 2. Trigger function: when a clario_job gets a video_url,
--    auto-copy it to the linked atlas_outreach row.
CREATE OR REPLACE FUNCTION public.fn_clario_job_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only act when video_url transitions from NULL to a real value
  IF NEW.video_url IS NOT NULL AND (OLD.video_url IS NULL OR OLD.video_url <> NEW.video_url) THEN
    IF NEW.outreach_id IS NOT NULL THEN
      UPDATE public.atlas_outreach
        SET clario_video_url = NEW.video_url,
            updated_at       = now()
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

-- 3. Grant service_role INSERT/UPDATE on clario_jobs so the
--    queue-worker can create Clario job records server-side.
GRANT INSERT, UPDATE ON public.clario_jobs TO service_role;
-- ============================================================
-- ENTERPRISE QUEUES: Background Jobs + Proxy + Clario
-- ============================================================

-- 1. Background job queue for large sourcing runs
CREATE TABLE IF NOT EXISTS public.atlas_background_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'sourcing_run',  -- extensible
  payload     JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result      JSONB,
  error       TEXT,
  started_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atlas_bg_jobs_user_status
  ON public.atlas_background_jobs(user_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.atlas_background_jobs TO authenticated;
GRANT ALL ON public.atlas_background_jobs TO service_role;

ALTER TABLE public.atlas_background_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own bg jobs" ON public.atlas_background_jobs;
CREATE POLICY "users manage own bg jobs" ON public.atlas_background_jobs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_atlas_bg_job_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_atlas_bg_job_updated ON public.atlas_background_jobs;
CREATE TRIGGER trg_atlas_bg_job_updated
  BEFORE UPDATE ON public.atlas_background_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_atlas_bg_job_updated_at();

-- 2. Add proxy fields to atlas_user_settings
ALTER TABLE public.atlas_user_settings
  ADD COLUMN IF NOT EXISTS proxy_url  TEXT,
  ADD COLUMN IF NOT EXISTS proxy_auth TEXT,  -- "user:pass" format
  ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
  ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT 'Atlas',
  ADD COLUMN IF NOT EXISTS sender_email TEXT;

-- 3. Clario integration on atlas_outreach
--    Drop old constraint, add clario fields, re-add wider constraint
ALTER TABLE public.atlas_outreach
  DROP CONSTRAINT IF EXISTS atlas_outreach_status_check;

-- Ensure existing data complies with the new constraint
UPDATE public.atlas_outreach
  SET status = 'draft'
  WHERE status NOT IN ('draft','approved','waiting_for_clario','manually_sent','auto_sent','replied','declined');

ALTER TABLE public.atlas_outreach
  ADD CONSTRAINT atlas_outreach_status_check
    CHECK (status IN ('draft','approved','waiting_for_clario','manually_sent','auto_sent','replied','declined'));

ALTER TABLE public.atlas_outreach
  ADD COLUMN IF NOT EXISTS clario_video_url   TEXT,
  ADD COLUMN IF NOT EXISTS clario_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_send_enabled  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resend_id          TEXT,
  ADD COLUMN IF NOT EXISTS to_email           TEXT,
  ADD COLUMN IF NOT EXISTS to_name            TEXT;
-- Migration: Schedule daily-sync-cron via pg_cron
-- Runs at 4:00 AM UTC every day

-- Enable pg_cron extension if not already present
-- (Already enabled in most Supabase projects, but this ensures it)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing schedule with this name before re-adding it
SELECT cron.unschedule('atlas-daily-sync-cron')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'atlas-daily-sync-cron'
);

-- Schedule the edge function to run at 04:00 UTC daily
SELECT cron.schedule(
  'atlas-daily-sync-cron',
  '0 4 * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/daily-sync-cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    )
  $$
);
CREATE TABLE public.clario_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.clario_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clario_jobs"
    ON public.clario_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clario_jobs"
    ON public.clario_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clario_jobs"
    ON public.clario_jobs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clario_jobs"
    ON public.clario_jobs FOR DELETE
    USING (auth.uid() = user_id);
ALTER TABLE public.clario_jobs
  ADD COLUMN IF NOT EXISTS result JSONB,
  ADD COLUMN IF NOT EXISTS progress_pct INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_msg TEXT;
CREATE TABLE public.clario_projects (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    mode TEXT NOT NULL,
    project_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.clario_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own clario_projects" ON public.clario_projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
INSERT INTO storage.buckets (id, name, public) VALUES ('clario-media', 'clario-media', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'clario-media');
