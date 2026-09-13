-- 1. Migrate data from kuro_pipeline_view to atlas_opportunities
INSERT INTO public.atlas_opportunities (
  id, user_id, organization_name, primary_domain, deal_notes, pipeline_stage, fit_score, created_at, updated_at
)
SELECT 
  id, user_id, COALESCE(NULLIF(company, ''), 'Unknown'), COALESCE(NULLIF(website, ''), id || '.unknown.com'), notes, 
  CASE 
    WHEN stage IN ('won', 'paid', 'complete') THEN 'closed_won'
    WHEN stage IN ('Sourced', 'new', 'uncontacted') THEN 'discovered'
    WHEN stage IN ('call_booked', 'call_completed', 'pain_confirmed', 'proposal_sent', 'negotiating') THEN 'engaged'
    WHEN stage IN ('lost', 'not_interested') THEN 'closed_lost'
    ELSE 'discovered'
  END,
  COALESCE(icp_score, 50),
  created_at, created_at
FROM public.kuro_pipeline_view
ON CONFLICT (id) DO NOTHING;

-- 2. Drop the old view if necessary, or just leave it for legacy fallback
-- DROP TABLE IF EXISTS public.kuro_pipeline_view CASCADE;
