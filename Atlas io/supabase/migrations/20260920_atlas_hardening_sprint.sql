-- ──────────────────────────────────────────────────────────────────────────────
-- Atlas Hardening Sprint Migration
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Create atlas_validation_campaigns table for Campaign Hub cloud sync
CREATE TABLE IF NOT EXISTS public.atlas_validation_campaigns (
  id                TEXT PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'validation_to_first_client',
  hypothesis        TEXT,
  target_icp        JSONB NOT NULL DEFAULT '{}',
  active_stage      INTEGER NOT NULL DEFAULT 1,
  scoreboard        JSONB NOT NULL DEFAULT '{}',
  sprint_milestone  JSONB NOT NULL DEFAULT '{}',
  prospects         JSONB NOT NULL DEFAULT '[]',
  discovery_notes   JSONB NOT NULL DEFAULT '[]',
  decision_gate     JSONB NOT NULL DEFAULT '{}',
  micro_demo        JSONB NOT NULL DEFAULT '{}',
  pilot_offer       JSONB NOT NULL DEFAULT '{}',
  delivery_metrics  JSONB NOT NULL DEFAULT '[]',
  case_studies      JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atlas_validation_campaigns ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'atlas_validation_campaigns' 
    AND policyname = 'users manage own validation campaigns'
  ) THEN
    CREATE POLICY "users manage own validation campaigns"
      ON public.atlas_validation_campaigns
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. Add Trust Center governance fields to atlas_user_settings
ALTER TABLE public.atlas_user_settings
  ADD COLUMN IF NOT EXISTS agent_permissions JSONB DEFAULT '{"metaphor": true, "atlas": false, "clario": true}',
  ADD COLUMN IF NOT EXISTS spending_limit NUMERIC DEFAULT 100;

-- Done. Completely additive and non-destructive.
