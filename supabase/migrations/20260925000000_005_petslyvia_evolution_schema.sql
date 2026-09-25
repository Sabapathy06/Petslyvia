/*
# PETSLYVIA — Master Schema & Evolution Migration

## Overview
Extends and enforces the complete database architecture for PETSLYVIA:
1. One Email = One Account = One Profile = One Primary Pet (HARD 1:1 CONSTRAINTS).
2. Pet Evolution Stages (infant, child, teen, adult) & Unlocked Abilities.
3. Equippable Cosmetic Accessories & Wardrobe Inventory.
4. Deterministic Mission Progress & Skill Ratings.
5. Bug Exchange & Community Problem Sharing.
6. Contacts & Multiplayer Social Graph.
7. Row Level Security ensuring user privacy and deterministic server-side integrity.
*/

-- ---------------------------------------------------------
-- 1. PROFILES UPGRADE
-- ---------------------------------------------------------
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS skills jsonb NOT NULL DEFAULT '{"logic":15,"debugging":10,"creativity":15,"coding":0,"collaboration":10}'::jsonb,
  ADD COLUMN IF NOT EXISTS unlocked_areas text[] NOT NULL DEFAULT ARRAY['pet_home','logic_forest','shop'],
  ADD COLUMN IF NOT EXISTS coding_mode_unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bugs_created integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bugs_solved integer NOT NULL DEFAULT 0;

-- Ensure 1:1 profile ownership
ALTER TABLE IF EXISTS profiles
  DROP CONSTRAINT IF EXISTS profiles_id_unique,
  ADD CONSTRAINT profiles_id_unique UNIQUE (id);

-- ---------------------------------------------------------
-- 2. PETS UPGRADE & 1:1 ENFORCEMENT
-- ---------------------------------------------------------
ALTER TABLE IF EXISTS pets
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'infant',
  ADD COLUMN IF NOT EXISTS unlocked_abilities text[] NOT NULL DEFAULT ARRAY['runner'],
  ADD COLUMN IF NOT EXISTS equipped_items jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS pets
  DROP CONSTRAINT IF EXISTS pets_stage_chk,
  ADD CONSTRAINT pets_stage_chk CHECK (stage IN ('infant','child','teen','adult'));

-- Hard constraint: One active primary pet per user
CREATE UNIQUE INDEX IF NOT EXISTS pets_single_active_pet_idx ON pets (user_id) WHERE is_active = true;

-- ---------------------------------------------------------
-- 3. ACCESSORIES & INVENTORY
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS accessories (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('head','eyes','body','back','feet','special')),
  price integer NOT NULL DEFAULT 0,
  description text,
  icon text,
  rarity text NOT NULL DEFAULT 'common',
  required_level integer DEFAULT 1,
  visual_color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accessory_id text NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_accessory_unique UNIQUE (user_id, accessory_id)
);

ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own inventory" ON user_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own inventory purchases" ON user_inventory FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 4. MISSIONS & MISSION PROGRESS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS mission_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  stars integer NOT NULL DEFAULT 0,
  best_steps integer NOT NULL DEFAULT 999,
  attempts integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  CONSTRAINT user_mission_prog_unique UNIQUE (user_id, mission_id)
);

ALTER TABLE mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and update their own progress" ON mission_progress FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 5. BUG EXCHANGE & COMMUNITY PROBLEMS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS bug_exchanges (
  id text PRIMARY KEY,
  title text NOT NULL,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_name text NOT NULL,
  intended_goal text NOT NULL,
  broken_blocks jsonb NOT NULL,
  solution_blocks jsonb,
  grid_data jsonb NOT NULL,
  clue text,
  solvers_count integer NOT NULL DEFAULT 0,
  attempts_count integer NOT NULL DEFAULT 0,
  avg_solve_time_sec integer NOT NULL DEFAULT 0,
  reward_xp integer NOT NULL DEFAULT 50,
  reward_coins integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bug_exchanges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view bug exchanges" ON bug_exchanges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert bug exchanges" ON bug_exchanges FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

CREATE TABLE IF NOT EXISTS community_problems (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_name text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  grid_data jsonb NOT NULL,
  available_blocks text[] NOT NULL DEFAULT ARRAY['move_forward','turn_left','turn_right'],
  plays_count integer NOT NULL DEFAULT 0,
  solves_count integer NOT NULL DEFAULT 0,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view community problems" ON community_problems FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can publish community problems" ON community_problems FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

-- ---------------------------------------------------------
-- 6. CONTACTS & FRIENDS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_friend_unique UNIQUE (user_id, friend_user_id)
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their contacts" ON contacts FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_user_id);
