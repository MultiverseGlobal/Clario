-- Create unified CRM schema for Atlas, Clario, and Metaphor

-- 1. crm_companies
CREATE TABLE public.crm_companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid, -- For local demo, we just use a nullable user_id instead of auth.users since it might be mocked
  name text NOT NULL,
  domain text UNIQUE,
  description text,
  icp_score numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. crm_contacts
CREATE TABLE public.crm_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  linkedin_url text,
  role text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. crm_conversations
CREATE TABLE public.crm_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE CASCADE NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'linkedin', 'clario_video')),
  status text NOT NULL CHECK (status IN ('draft', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'waiting_for_clario', 'failed')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject text,
  body text NOT NULL,
  clario_video_url text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. crm_opportunities
CREATE TABLE public.crm_opportunities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('prospecting', 'qualified', 'proposal', 'won', 'lost')),
  value_amount numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. crm_next_actions
CREATE TABLE public.crm_next_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'contact', 'opportunity')),
  type text NOT NULL CHECK (type IN ('research', 'outreach', 'follow_up', 'meeting', 'review')),
  status text NOT NULL CHECK (status IN ('suggested', 'accepted', 'completed', 'dismissed')),
  suggested_by text NOT NULL CHECK (suggested_by IN ('metaphor', 'user')),
  due_date timestamp with time zone,
  title text,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_next_actions ENABLE ROW LEVEL SECURITY;

-- Create minimal RLS policies for local dev/testing
CREATE POLICY "Enable all for authenticated users" ON public.crm_companies FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.crm_contacts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.crm_conversations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.crm_opportunities FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.crm_next_actions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
