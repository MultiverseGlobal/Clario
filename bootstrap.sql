-- ==============================================================================
-- ATLAS & CLARIO CONSOLIDATED INFRASTRUCTURE BOOTSTRAP
-- Project Ref: sqthvliapkauoxieiwfb
-- ==============================================================================

-- 1. Storage Buckets for Clario Assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Final polished exports — public so Atlas outreach email video links work directly
  ('clario-exports', 'clario-exports', true,  524288000, ARRAY['video/mp4', 'video/webm']),
  -- Shot thumbnails from Content Video harvests — public for UI & email embeds
  ('clario-frames',  'clario-frames',  true,  10485760,  ARRAY['image/jpeg', 'image/png', 'image/webp']),
  -- Raw unprocessed recordings — private, uploaded directly to bypass timeouts
  ('clario-raw',     'clario-raw',     false, 2147483648, ARRAY['video/webm', 'video/mp4']),
  -- Slide images and decks
  ('clario-slides',  'clario-slides',  false, 52428800,  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- 2. Storage Policies
DROP POLICY IF EXISTS "clario exports public read" ON storage.objects;
CREATE POLICY "clario exports public read"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('clario-exports', 'clario-frames'));

DROP POLICY IF EXISTS "clario authenticated upload" ON storage.objects;
CREATE POLICY "clario authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id LIKE 'clario-%'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "clario authenticated update own" ON storage.objects;
CREATE POLICY "clario authenticated update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id LIKE 'clario-%'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "clario authenticated delete own" ON storage.objects;
CREATE POLICY "clario authenticated delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id LIKE 'clario-%'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "clario private read own files" ON storage.objects;
CREATE POLICY "clario private read own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('clario-raw', 'clario-slides')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "clario service role full access" ON storage.objects;
CREATE POLICY "clario service role full access"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id LIKE 'clario-%');

-- 3. Clario Projects & Jobs Tables
CREATE TABLE IF NOT EXISTS public.clario_projects (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mode TEXT NOT NULL,
    project_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clario_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own clario projects" ON public.clario_projects;
CREATE POLICY "Users can manage own clario projects"
    ON public.clario_projects FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full access to clario projects" ON public.clario_projects;
CREATE POLICY "Service role has full access to clario projects"
    ON public.clario_projects FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.clario_jobs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id TEXT,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    progress_pct INTEGER NOT NULL DEFAULT 0,
    status_msg TEXT,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clario_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own clario jobs" ON public.clario_jobs;
CREATE POLICY "Users can manage own clario jobs"
    ON public.clario_jobs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full access to clario jobs" ON public.clario_jobs;
CREATE POLICY "Service role has full access to clario jobs"
    ON public.clario_jobs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- REQUIRED ENVIRONMENT VARIABLES CHECKLIST
-- ==============================================================================
--
-- Render Backend (Clario Python FastAPI: https://clario-l5d0.onrender.com):
--   - SUPABASE_URL: https://sqthvliapkauoxieiwfb.supabase.co
--   - SUPABASE_SERVICE_ROLE_KEY: [Service Role Key]
--   - GEMINI_API_KEY: [Google AI Studio Key]
--   - ALLOWED_ORIGINS: http://localhost:5173,http://localhost:4173,https://clariovid.vercel.app,https://clario-l5d0.onrender.com
--
-- Supabase Edge Functions (Atlas IO):
--   - SMTP_EMAIL: multiverseglobals@gmail.com
--   - SMTP_PASSWORD: [App Password]
--   - GEMINI_API_KEY: [Google AI Studio Key]
--   - KIMI_API_KEY / MOONSHOT_API_KEY: [Moonshot AI Key]
--   - OPENROUTER_API_KEY: [OpenRouter Key]
-- ==============================================================================
