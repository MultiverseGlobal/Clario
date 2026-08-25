-- William Execution Companion — Lean Execution Database Schema
-- Run this in your Supabase SQL Editor: https://app.supabase.com

-- 1. Execution Plans (Daily & Weekly execution plans)
CREATE TABLE IF NOT EXISTS execution_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT DEFAULT 'user_1',
  date TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'rebuilding')),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Commands (Core Execution Table — 1 focus item at a time)
CREATE TABLE IF NOT EXISTS commands (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  execution_plan_id TEXT REFERENCES execution_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  estimated_duration TEXT DEFAULT '30m',
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Focus Sessions (Deep work session timer & productivity score)
CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  command_id TEXT REFERENCES commands(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  interruptions INTEGER DEFAULT 0,
  score INTEGER DEFAULT 100
);

-- 4. Calendar Cache (Transient cache for fast scheduling)
CREATE TABLE IF NOT EXISTS calendar_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT
);

-- 5. Daily Briefs
CREATE TABLE IF NOT EXISTS daily_briefs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TEXT NOT NULL,
  type TEXT DEFAULT 'morning' CHECK (type IN ('morning', 'evening', 'weekly')),
  summary TEXT NOT NULL,
  risks JSONB DEFAULT '[]',
  priorities JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Daily Command Execution Plan
INSERT INTO execution_plans (id, user_id, date, status) VALUES
('plan_today', 'user_1', '2026-07-23', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO commands (id, execution_plan_id, title, priority, estimated_duration, completed) VALUES
('cmd_1', 'plan_today', 'Finalize Chief of Staff Platform Architecture', 1, '45m', false),
('cmd_2', 'plan_today', 'Review Metaphor & Atlas Context Adapters', 2, '30m', false),
('cmd_3', 'plan_today', 'Execute 1-Tap Calendar Conflict Recovery', 3, '20m', false)
ON CONFLICT (id) DO NOTHING;
