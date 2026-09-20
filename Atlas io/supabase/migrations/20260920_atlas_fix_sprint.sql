-- ──────────────────────────────────────────────────────────────────────────────
-- Atlas Fix Sprint Migration
-- Run in Supabase: SQL Editor → New Query → paste → Run
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. atlas_reports table (fixes HqReport crash — was querying a non-existent table)
CREATE TABLE IF NOT EXISTS public.atlas_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  week_end      DATE NOT NULL,
  content       JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.atlas_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atlas_reports: owner full access"
  ON public.atlas_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Add linkedin_url to atlas_contacts (so the LinkedIn Ready flow can use it)
ALTER TABLE public.atlas_contacts
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- 3. Add discovery interview status to atlas_opportunities
ALTER TABLE public.atlas_opportunities
  ADD COLUMN IF NOT EXISTS discovery_interview_status TEXT
    CHECK (discovery_interview_status IN (
      'not_contacted', 'message_sent', 'replied',
      'interview_scheduled', 'completed', 'declined'
    ))
    DEFAULT 'not_contacted';

-- 4. atlas_user_settings — ensure sender_name column exists (used by outreach generator)
ALTER TABLE public.atlas_user_settings
  ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT 'Ben';

-- Done. No data loss. All changes are additive.
