create table if not exists public.atlas_team_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references auth.users(id) on delete cascade not null,
  email text not null,
  role text not null default 'admin',
  status text not null default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (workspace_id, email)
);

alter table public.atlas_team_members enable row level security;

create policy "Users can view their team members"
  on public.atlas_team_members for select
  using (auth.uid() = workspace_id);

create policy "Users can insert team members"
  on public.atlas_team_members for insert
  with check (auth.uid() = workspace_id);

create policy "Users can delete team members"
  on public.atlas_team_members for delete
  using (auth.uid() = workspace_id);
