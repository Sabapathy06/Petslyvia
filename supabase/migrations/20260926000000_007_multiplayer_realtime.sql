/*
# PETSLYVIA — Multiplayer Realtime & Leaderboard Migration

## Features Added
1. Player activity tracking table (heartbeat for last-seen + current activity)
2. Leaderboard view (top players ordered by XP)
3. RLS policies that allow authenticated reads for the social/arena pages
4. Presence channel via Supabase Realtime (handled in JS — no extra SQL needed)

Supabase Realtime Free Tier supports up to 500 concurrent WebSocket connections,
comfortably covering the 100+ concurrent user target.
*/

-- ---------------------------------------------------------
-- 1. PLAYER ACTIVITY TABLE
--    Each online user upserts their activity here on a heartbeat.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_activity (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  username      text        NOT NULL,
  pet_type      text        NOT NULL DEFAULT 'fox',
  pet_stage     text        NOT NULL DEFAULT 'infant',
  current_area  text        NOT NULL DEFAULT 'pet_home',
  activity_tag  text        NOT NULL DEFAULT 'exploring',
  level         integer     NOT NULL DEFAULT 1,
  xp            integer     NOT NULL DEFAULT 0,
  last_seen     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_activity_user_unique UNIQUE (user_id)
);

ALTER TABLE player_activity ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='player_activity' AND policyname='Authenticated users can read player activity'
  ) THEN
    CREATE POLICY "Authenticated users can read player activity"
      ON player_activity FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='player_activity' AND policyname='Users manage their own activity'
  ) THEN
    CREATE POLICY "Users manage their own activity"
      ON player_activity FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------
-- 2. LEADERBOARD VIEW
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id                                                        AS user_id,
  p.username,
  p.avatar_url,
  p.level,
  p.xp,
  p.coins,
  p.bugs_solved,
  p.bugs_created,
  COALESCE(pet.type, 'fox')                                   AS pet_type,
  COALESCE(pet.stage, 'infant')                               AS pet_stage,
  COALESCE(pet.name, 'Unnamed')                               AS pet_name,
  ROW_NUMBER() OVER (ORDER BY p.xp DESC, p.level DESC)        AS rank
FROM profiles p
LEFT JOIN pets pet ON pet.user_id = p.id AND pet.is_active = true
ORDER BY p.xp DESC, p.level DESC
LIMIT 100;

GRANT SELECT ON leaderboard TO authenticated;

-- ---------------------------------------------------------
-- 3. FUNCTION: upsert_player_activity (heartbeat RPC)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_player_activity(
  p_user_id      uuid,
  p_username     text,
  p_pet_type     text,
  p_pet_stage    text,
  p_current_area text,
  p_activity_tag text,
  p_level        integer,
  p_xp           integer
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO player_activity (
    user_id, username, pet_type, pet_stage, current_area, activity_tag, level, xp, last_seen
  ) VALUES (
    p_user_id, p_username, p_pet_type, p_pet_stage, p_current_area, p_activity_tag, p_level, p_xp, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username     = EXCLUDED.username,
    pet_type     = EXCLUDED.pet_type,
    pet_stage    = EXCLUDED.pet_stage,
    current_area = EXCLUDED.current_area,
    activity_tag = EXCLUDED.activity_tag,
    level        = EXCLUDED.level,
    xp           = EXCLUDED.xp,
    last_seen    = now();
END;
$$;

-- ---------------------------------------------------------
-- 4. INDEX for efficient last_seen queries
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS player_activity_last_seen_idx
  ON player_activity (last_seen DESC);
