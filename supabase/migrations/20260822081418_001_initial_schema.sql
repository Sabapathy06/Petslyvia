/*
# Productivity Pet — Initial Schema

## Overview
Creates the complete relational schema for the Productivity Pet application:
profiles, pets, goals, tasks, focus_sessions, productivity_scores,
daily_productivity, streaks, pet_states, pet_interactions, xp_transactions,
achievements, user_achievements, notifications, productivity_insights.

## Tables
1. profiles — user profile linked to auth.users, stores coins, xp, level.
2. pets — user's virtual pets (one active at a time). Pet state (happiness,
   energy, productivity_state) reflects productivity behavior.
3. goals — long/short-term goals with progress percentage (0-100).
4. tasks — tasks linked optionally to goals; priority high/medium/low;
   status pending/in_progress/completed/cancelled; XP & coin rewards.
5. focus_sessions — Pomodoro-style focus/break sessions linked to tasks.
6. productivity_scores — per-day multi-signal productivity breakdown.
7. daily_productivity — aggregated daily productivity counters (unique per user/date).
8. streaks — one record per user tracking current/longest streak.
9. pet_states — historical pet state log for analytics.
10. pet_interactions — pet/feed/play/rest/encourage interactions.
11. xp_transactions — audit log of every XP award with source.
12. achievements — catalog of unlockable achievements (reference data).
13. user_achievements — per-user unlocks (unique user+achievement).
14. notifications — in-app notifications.
15. productivity_insights — generated insights from real data.

## Security
- RLS enabled on every user-owned table (policies added in a later migration).
- achievements is a reference table readable by authenticated users.

## Notes
- All user-owned tables use user_id DEFAULT auth.uid() so frontend inserts
  that omit user_id still satisfy RLS WITH CHECK.
- UUIDs throughout via gen_random_uuid().
- updated_at maintained by triggers.
*/

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  display_name text,
  avatar_url text,
  coins integer NOT NULL DEFAULT 0,
  total_xp integer NOT NULL DEFAULT 0,
  current_level integer NOT NULL DEFAULT 1,
  preferred_focus_minutes integer NOT NULL DEFAULT 25,
  daily_goal_tasks integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- PETS
-- =========================================================
CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  pet_type text NOT NULL,
  pet_name text NOT NULL,
  personality text,
  level integer NOT NULL DEFAULT 1,
  xp integer NOT NULL DEFAULT 0,
  happiness integer NOT NULL DEFAULT 100,
  energy integer NOT NULL DEFAULT 100,
  productivity_state text NOT NULL DEFAULT 'neutral',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pets_state_chk CHECK (productivity_state IN ('energetic','happy','focused','excited','calm','neutral','tired','sleepy','recovering')),
  CONSTRAINT pets_energy_chk CHECK (energy >= 0 AND energy <= 100),
  CONSTRAINT pets_happiness_chk CHECK (happiness >= 0 AND happiness <= 100),
  CONSTRAINT pets_type_chk CHECK (pet_type IN ('cat','dog','bunny','fox','panda','koala','hamster','penguin'))
);

-- =========================================================
-- GOALS
-- =========================================================
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  deadline date,
  progress_percentage integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goals_progress_chk CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT goals_status_chk CHECK (status IN ('active','completed','archived'))
);

-- =========================================================
-- TASKS
-- =========================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  category text NOT NULL DEFAULT 'general',
  due_date date,
  estimated_minutes integer,
  status text NOT NULL DEFAULT 'pending',
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  xp_reward integer NOT NULL DEFAULT 10,
  coin_reward integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_priority_chk CHECK (priority IN ('high','medium','low')),
  CONSTRAINT tasks_status_chk CHECK (status IN ('pending','in_progress','completed','cancelled'))
);

-- =========================================================
-- FOCUS SESSIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  session_type text NOT NULL DEFAULT 'focus',
  planned_minutes integer,
  actual_minutes integer,
  completed boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT focus_type_chk CHECK (session_type IN ('focus','short_break','long_break'))
);

-- =========================================================
-- PRODUCTIVITY SCORES
-- =========================================================
CREATE TABLE IF NOT EXISTS productivity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  score_date date NOT NULL,
  overall_score integer NOT NULL DEFAULT 0,
  task_score integer NOT NULL DEFAULT 0,
  priority_score integer NOT NULL DEFAULT 0,
  goal_score integer NOT NULL DEFAULT 0,
  focus_score integer NOT NULL DEFAULT 0,
  consistency_score integer NOT NULL DEFAULT 0,
  streak_score integer NOT NULL DEFAULT 0,
  recovery_score integer NOT NULL DEFAULT 0,
  workload_penalty integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, score_date)
);

-- =========================================================
-- DAILY PRODUCTIVITY
-- =========================================================
CREATE TABLE IF NOT EXISTS daily_productivity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  productivity_date date NOT NULL,
  tasks_completed integer NOT NULL DEFAULT 0,
  tasks_total integer NOT NULL DEFAULT 0,
  priority_tasks_completed integer NOT NULL DEFAULT 0,
  focus_minutes integer NOT NULL DEFAULT 0,
  goals_progressed integer NOT NULL DEFAULT 0,
  xp_earned integer NOT NULL DEFAULT 0,
  coins_earned integer NOT NULL DEFAULT 0,
  productivity_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, productivity_date)
);

-- =========================================================
-- STREAKS
-- =========================================================
CREATE TABLE IF NOT EXISTS streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  weekly_consistency integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- =========================================================
-- PET STATES (history)
-- =========================================================
CREATE TABLE IF NOT EXISTS pet_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  state text NOT NULL,
  productivity_score integer NOT NULL DEFAULT 0,
  reason text,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT petstates_state_chk CHECK (state IN ('energetic','happy','focused','excited','calm','neutral','tired','sleepy','recovering'))
);

-- =========================================================
-- PET INTERACTIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS pet_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT petinter_type_chk CHECK (interaction_type IN ('pet','feed','play','rest','encourage'))
);

-- =========================================================
-- XP TRANSACTIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid,
  xp_amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- ACHIEVEMENTS (reference catalog)
-- =========================================================
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  requirement_type text NOT NULL,
  requirement_value integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- USER ACHIEVEMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notif_type_chk CHECK (type IN ('task_due','goal_milestone','achievement','streak','focus','daily_summary','pet','recovery'))
);

-- =========================================================
-- PRODUCTIVITY INSIGHTS
-- =========================================================
CREATE TABLE IF NOT EXISTS productivity_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_focus_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prodscores_user_date ON productivity_scores(user_id, score_date);
CREATE INDEX IF NOT EXISTS idx_dailyprod_user_date ON daily_productivity(user_id, productivity_date);
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_petstates_pet_id ON pet_states(pet_id);
CREATE INDEX IF NOT EXISTS idx_petinter_pet_id ON pet_interactions(pet_id);
CREATE INDEX IF NOT EXISTS idx_xptx_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_userach_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON productivity_insights(user_id);

-- =========================================================
-- updated_at TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pets_updated ON pets;
CREATE TRIGGER trg_pets_updated BEFORE UPDATE ON pets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_goals_updated ON goals;
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated ON tasks;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_dailyprod_updated ON daily_productivity;
CREATE TRIGGER trg_dailyprod_updated BEFORE UPDATE ON daily_productivity
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_streaks_updated ON streaks;
CREATE TRIGGER trg_streaks_updated BEFORE UPDATE ON streaks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- AUTO PROFILE CREATION ON SIGNUP
-- =========================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1)
  );
  INSERT INTO streaks (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable RLS on all user-owned tables (policies added in 002)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_productivity ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
