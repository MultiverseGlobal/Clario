create table if not exists public.atlas_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start timestamp with time zone not null,
  week_end timestamp with time zone not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.atlas_reports enable row level security;

create policy "Users can view their own reports"
  on public.atlas_reports for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reports"
  on public.atlas_reports for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reports"
  on public.atlas_reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own reports"
  on public.atlas_reports for delete
  using (auth.uid() = user_id);
