-- Supabase Schema for Pseudonyms ID & Ecosystem

-- 1. Applications Registry
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    url TEXT,
    capabilities JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert core ecosystem apps
INSERT INTO public.applications (slug, name, description, url)
VALUES 
    ('orion', 'Orion', 'Execution and Workflow Environment', 'http://localhost:5174'),
    ('atlas', 'Atlas', 'Creative and Canvas Environment', 'http://localhost:5173'),
    ('clario', 'Clario', 'Content and Video Environment', 'http://localhost:5175'),
    ('metaphor', 'Metaphor', 'Context and Intelligence Layer', 'http://localhost:8000')
ON CONFLICT (slug) DO NOTHING;

-- 2. Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    timezone TEXT,
    global_preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists to be idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Application Memberships (Access Control)
CREATE TABLE IF NOT EXISTS public.application_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, application_id)
);

-- 4. Pseudonyms (App-specific identity)
CREATE TABLE IF NOT EXISTS public.pseudonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    description TEXT,
    visibility TEXT DEFAULT 'private',
    settings JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, application_id)
);

-- 5. Connections (External Integrations)
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    scopes JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, provider)
);

-- 6. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Activity
CREATE TABLE IF NOT EXISTS public.activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pseudonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles
CREATE POLICY "Users can view their own profile."
    ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile."
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Applications (Publicly readable)
CREATE POLICY "Applications are readable by all authenticated users."
    ON public.applications FOR SELECT USING (auth.role() = 'authenticated');

-- Memberships
CREATE POLICY "Users can view their own memberships."
    ON public.application_memberships FOR SELECT USING (auth.uid() = profile_id);

-- Pseudonyms
CREATE POLICY "Users can view their own pseudonyms."
    ON public.pseudonyms FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert their own pseudonyms."
    ON public.pseudonyms FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own pseudonyms."
    ON public.pseudonyms FOR UPDATE USING (auth.uid() = profile_id);

-- Connections, Notifications, Activity
CREATE POLICY "Users can view their own connections."
    ON public.connections FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can view their own notifications."
    ON public.notifications FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can update their own notifications."
    ON public.notifications FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can view their own activity."
    ON public.activity FOR SELECT USING (auth.uid() = profile_id);
