-- ============================================================
-- CLARIO FOUNDATION MIGRATION
-- Run in: Pseudonyms Supabase project (sqthvliapkauoxieiwfb)
-- Phase 1f: Storage Buckets
-- ============================================================

-- ── Buckets ──────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Final polished exports — public so Atlas email links work
  ('clario-exports', 'clario-exports', true,  524288000, ARRAY['video/mp4', 'video/webm']),
  -- Shot thumbnails from Content Video harvests — public for UI display
  ('clario-frames',  'clario-frames',  true,  10485760,  ARRAY['image/jpeg', 'image/png', 'image/webp']),
  -- Raw unprocessed recordings — private, deleted after processing
  ('clario-raw',     'clario-raw',     false, 2147483648, ARRAY['video/webm', 'video/mp4']),
  -- Slide images — private, accessed via signed URLs
  ('clario-slides',  'clario-slides',  false, 52428800,  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ── Storage Policies ─────────────────────────────────────────────────────────

-- Public READ on exports and frames (needed for Atlas email links and UI)
DROP POLICY IF EXISTS "clario exports public read" ON storage.objects;
CREATE POLICY "clario exports public read"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('clario-exports', 'clario-frames'));

-- Authenticated UPLOAD to any clario bucket (files must be under user's folder)
DROP POLICY IF EXISTS "clario authenticated upload" ON storage.objects;
CREATE POLICY "clario authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id LIKE 'clario-%'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Authenticated UPDATE/DELETE on own files
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

-- Authenticated READ on private buckets (own files only — signed URLs bypass this)
DROP POLICY IF EXISTS "clario private read own files" ON storage.objects;
CREATE POLICY "clario private read own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('clario-raw', 'clario-slides')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service role full access (FastAPI server writes processed videos here)
DROP POLICY IF EXISTS "clario service role full access" ON storage.objects;
CREATE POLICY "clario service role full access"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id LIKE 'clario-%');
