-- ============================================================
-- CLARIO FOUNDATION MIGRATION
-- Run in: Pseudonyms Supabase project (sqthvliapkauoxieiwfb)
-- Phase 1a: clario_user_settings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clario_user_settings (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gemini_api_key TEXT,
  api_base_url   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clario_user_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clario_user_settings TO authenticated;
GRANT ALL ON public.clario_user_settings TO service_role;

DROP POLICY IF EXISTS "users manage own clario settings" ON public.clario_user_settings;
CREATE POLICY "users manage own clario settings"
  ON public.clario_user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
