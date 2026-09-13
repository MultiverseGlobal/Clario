alter table public.atlas_user_settings 
add column if not exists workspace_name text,
add column if not exists workspace_domain text;
