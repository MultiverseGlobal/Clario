-- Weave Learning Substrate — Supabase Migration
-- A cross-app intelligence layer that records signals from Atlas, Clario, Metaphor, and Orion.
-- Phase 1: Schema stub. The WeavePanel in Metaphor reads from this table (mocked initially).

-- ── 1. Weave Learnings Table ─────────────────────────────────────────────────

create table if not exists weave_learnings (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete cascade,

  -- Source app and signal type
  app         text        not null
              check (app in ('atlas', 'clario', 'metaphor', 'orion', 'pseudonymsid')),
  signal_type text        not null
              check (signal_type in (
                'click', 'export', 'approve', 'reject',
                'search', 'match', 'save', 'edit', 'view'
              )),

  -- Flexible payload for any app-specific data
  payload     jsonb       not null default '{}',

  -- Optional: the entity this signal relates to
  entity_type text,       -- 'shot' | 'script' | 'campaign' | 'document' etc.
  entity_id   text,       -- the ID of that entity

  -- Context
  session_id  text,
  created_at  timestamptz not null default now()
);

-- ── 2. Indexes ────────────────────────────────────────────────────────────────

create index if not exists weave_learnings_user_idx       on weave_learnings (user_id);
create index if not exists weave_learnings_app_idx        on weave_learnings (app);
create index if not exists weave_learnings_signal_idx     on weave_learnings (signal_type);
create index if not exists weave_learnings_created_at_idx on weave_learnings (created_at desc);

-- ── 3. Row Level Security ─────────────────────────────────────────────────────

alter table weave_learnings enable row level security;

create policy "Users can view their own learnings"
  on weave_learnings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own learnings"
  on weave_learnings for insert
  with check (auth.uid() = user_id);

-- ── 4. Aggregate view (for WeavePanel feed) ───────────────────────────────────
-- Returns the 20 most recent signals across all apps for a user.

create or replace view weave_recent_signals as
  select
    id,
    user_id,
    app,
    signal_type,
    entity_type,
    entity_id,
    payload,
    created_at
  from weave_learnings
  order by created_at desc
  limit 20;
