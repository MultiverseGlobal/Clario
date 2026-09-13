ALTER TABLE public.atlas_opportunities
ADD COLUMN IF NOT EXISTS research_data JSONB,
ADD COLUMN IF NOT EXISTS founder_thesis TEXT,
ADD COLUMN IF NOT EXISTS acquisition_channel TEXT;
