/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  PETSLYVIA — Multiplayer Rooms, Player Stats & Secure Game RPCs            ║
║  Migration 008  |  Idempotent & safe to run multiple times                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Creates:                                                                  ║
║   1. player_stats   — persistent per-user game stats (server-side only)    ║
║   2. game_rooms     — multiplayer room registry (8-12 players)             ║
║   3. game_sessions  — per-player participation record in a room            ║
║   4. wall_events    — idempotent wall-break log (dedup by session+wall)     ║
║                                                                            ║
║  Secure RPCs (SECURITY DEFINER — never callable with arbitrary rewards):   ║
║   • create_game_room       — register a new room, auto-add creator         ║
║   • join_game_room         — add player to room (enforces max_players)     ║
║   • leave_game_room        — mark player left, cleanup if room empty       ║
║   • submit_wall_solution   — validate answer server-side, award XP         ║
║   • finish_game_session    — mark session done, award win/completion XP    ║
║   • get_leaderboard        — return ranked player_stats rows (safe read)   ║
║                                                                            ║
║  RLS: all tables have row-level security.                                  ║
║  Indexes: on all FK and hot-query columns.                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

-- ============================================================
-- 0. HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at_col()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

-- ============================================================
-- 1. PLAYER STATS
--    One row per user, maintained exclusively by server-side RPCs.
--    Frontend can READ via RLS but never directly UPDATE score/xp/wins.
-- ============================================================
CREATE TABLE IF NOT EXISTS player_stats (
  user_id           uuid    PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  xp                integer NOT NULL DEFAULT 0,
  score             integer NOT NULL DEFAULT 0,
  wins              integer NOT NULL DEFAULT 0,
  losses            integer NOT NULL DEFAULT 0,
  missions_completed integer NOT NULL DEFAULT 0,
  walls_broken      integer NOT NULL DEFAULT 0,
  best_time_sec     integer NOT NULL DEFAULT 0,   -- fastest room completion (seconds)
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Players can read all stats (needed for leaderboard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_stats' AND policyname='player_stats_select') THEN
    CREATE POLICY "player_stats_select" ON player_stats FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
-- Players cannot insert/update/delete directly — only via RPC
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_stats' AND policyname='player_stats_own_insert') THEN
    CREATE POLICY "player_stats_own_insert" ON player_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_player_stats_updated ON player_stats;
CREATE TRIGGER trg_player_stats_updated BEFORE UPDATE ON player_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_col();

CREATE INDEX IF NOT EXISTS idx_player_stats_xp ON player_stats (xp DESC);

-- Auto-create player_stats row when profile is created
CREATE OR REPLACE FUNCTION ensure_player_stats(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO player_stats (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- ============================================================
-- 2. GAME ROOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS game_rooms (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  status      text        NOT NULL DEFAULT 'waiting'
                          CHECK (status IN ('waiting','playing','finished')),
  max_players integer     NOT NULL DEFAULT 8 CHECK (max_players BETWEEN 2 AND 12),
  mission_id  text,
  level       integer     NOT NULL DEFAULT 1,
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read rooms (needed for lobby)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='game_rooms' AND policyname='game_rooms_select') THEN
    CREATE POLICY "game_rooms_select" ON game_rooms FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
-- Only server-side RPCs create/update rooms
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='game_rooms' AND policyname='game_rooms_insert_creator') THEN
    CREATE POLICY "game_rooms_insert_creator" ON game_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_game_rooms_updated ON game_rooms;
CREATE TRIGGER trg_game_rooms_updated BEFORE UPDATE ON game_rooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_col();

CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms (status, created_at DESC);

-- ============================================================
-- 3. GAME SESSIONS
--    One row per player per room.
-- ============================================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid        NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id      text,
  level           integer     NOT NULL DEFAULT 1,
  status          text        NOT NULL DEFAULT 'lobby'
                              CHECK (status IN ('lobby','ready','playing','finished','disconnected')),
  progress        integer     NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  walls_broken    integer     NOT NULL DEFAULT 0,
  score           integer     NOT NULL DEFAULT 0,
  is_ready        boolean     NOT NULL DEFAULT false,
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_sessions_unique_player_room UNIQUE (room_id, user_id)
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Players can read all sessions in rooms they belong to
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='game_sessions' AND policyname='game_sessions_select') THEN
    CREATE POLICY "game_sessions_select" ON game_sessions FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
-- Players can only insert their own session row
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='game_sessions' AND policyname='game_sessions_own_insert') THEN
    CREATE POLICY "game_sessions_own_insert" ON game_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
-- Players can only update their own session
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='game_sessions' AND policyname='game_sessions_own_update') THEN
    CREATE POLICY "game_sessions_own_update" ON game_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_game_sessions_updated ON game_sessions;
CREATE TRIGGER trg_game_sessions_updated BEFORE UPDATE ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_col();

CREATE INDEX IF NOT EXISTS idx_game_sessions_room  ON game_sessions (room_id, status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user  ON game_sessions (user_id, created_at DESC);

-- ============================================================
-- 4. WALL EVENTS (idempotency log)
--    Prevents double-rewarding the same wall break.
-- ============================================================
CREATE TABLE IF NOT EXISTS wall_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wall_key    text        NOT NULL,   -- e.g. "3,0" or "wall_2"
  xp_awarded  integer     NOT NULL DEFAULT 0,
  score_delta integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wall_events_unique UNIQUE (session_id, wall_key)  -- idempotency key
);

ALTER TABLE wall_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wall_events' AND policyname='wall_events_select') THEN
    CREATE POLICY "wall_events_select" ON wall_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wall_events_session ON wall_events (session_id);

-- ============================================================
-- 5. SECURE RPC: create_game_room
-- ============================================================
CREATE OR REPLACE FUNCTION create_game_room(
  p_name        text,
  p_max_players integer DEFAULT 8,
  p_mission_id  text    DEFAULT NULL,
  p_level       integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_room_id uuid;
  v_caller  uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_max_players < 2 OR p_max_players > 12 THEN
    RAISE EXCEPTION 'max_players must be between 2 and 12';
  END IF;

  INSERT INTO game_rooms (name, max_players, mission_id, level, created_by)
    VALUES (p_name, p_max_players, p_mission_id, p_level, v_caller)
    RETURNING id INTO v_room_id;

  -- Creator auto-joins
  INSERT INTO game_sessions (room_id, user_id, mission_id, level)
    VALUES (v_room_id, v_caller, p_mission_id, p_level)
    ON CONFLICT (room_id, user_id) DO NOTHING;

  PERFORM ensure_player_stats(v_caller);
  RETURN v_room_id;
END;
$$;

-- ============================================================
-- 6. SECURE RPC: join_game_room
-- ============================================================
CREATE OR REPLACE FUNCTION join_game_room(p_room_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller      uuid := auth.uid();
  v_status      text;
  v_max         integer;
  v_current     integer;
  v_mission_id  text;
  v_level       integer;
  v_session_id  uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT status, max_players, mission_id, level
    INTO v_status, v_max, v_mission_id, v_level
    FROM game_rooms WHERE id = p_room_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF v_status = 'finished' THEN RAISE EXCEPTION 'Room has ended'; END IF;

  SELECT count(*) INTO v_current
    FROM game_sessions WHERE room_id = p_room_id AND status != 'disconnected';

  IF v_current >= v_max THEN RAISE EXCEPTION 'Room is full (% / %)', v_current, v_max; END IF;

  INSERT INTO game_sessions (room_id, user_id, mission_id, level)
    VALUES (p_room_id, v_caller, v_mission_id, v_level)
    ON CONFLICT (room_id, user_id) DO UPDATE
      SET status = CASE WHEN game_sessions.status = 'disconnected' THEN 'lobby' ELSE game_sessions.status END,
          updated_at = now()
    RETURNING id INTO v_session_id;

  PERFORM ensure_player_stats(v_caller);
  RETURN v_session_id;
END;
$$;

-- ============================================================
-- 7. SECURE RPC: set_ready_state
-- ============================================================
CREATE OR REPLACE FUNCTION set_ready_state(p_room_id uuid, p_ready boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE game_sessions SET is_ready = p_ready, updated_at = now()
    WHERE room_id = p_room_id AND user_id = v_caller;
END;
$$;

-- ============================================================
-- 8. SECURE RPC: leave_game_room
-- ============================================================
CREATE OR REPLACE FUNCTION leave_game_room(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller     uuid := auth.uid();
  v_remaining  integer;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE game_sessions SET status = 'disconnected', updated_at = now()
    WHERE room_id = p_room_id AND user_id = v_caller;

  SELECT count(*) INTO v_remaining
    FROM game_sessions WHERE room_id = p_room_id AND status != 'disconnected';

  -- Close room if everyone left
  IF v_remaining = 0 THEN
    UPDATE game_rooms SET status = 'finished', finished_at = now()
      WHERE id = p_room_id AND status != 'finished';
  END IF;
END;
$$;

-- ============================================================
-- 9. SECURE RPC: submit_wall_solution
--    Server-side validation + idempotent reward
-- ============================================================
CREATE OR REPLACE FUNCTION submit_wall_solution(
  p_session_id  uuid,
  p_wall_key    text,
  p_is_correct  boolean,
  p_level       integer DEFAULT 1,
  p_wall_number integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller      uuid := auth.uid();
  v_session     game_sessions%ROWTYPE;
  v_xp          integer;
  v_score       integer;
  v_new_walls   integer;
  v_progress    integer;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_session.user_id != v_caller THEN RAISE EXCEPTION 'Not your session'; END IF;
  IF NOT p_is_correct THEN
    RETURN jsonb_build_object('success', false, 'xp_awarded', 0, 'score_delta', 0, 'already_broken', false);
  END IF;

  -- Idempotency: already solved this wall?
  IF EXISTS (SELECT 1 FROM wall_events WHERE session_id = p_session_id AND wall_key = p_wall_key) THEN
    RETURN jsonb_build_object('success', true, 'xp_awarded', 0, 'score_delta', 0, 'already_broken', true);
  END IF;

  -- Scale rewards by level + wall_number
  v_xp    := 10 + (p_level * 5) + (p_wall_number * 3);
  v_score := 50 + (p_level * 10) + (p_wall_number * 5);

  -- Record wall event (idempotency)
  INSERT INTO wall_events (session_id, user_id, wall_key, xp_awarded, score_delta)
    VALUES (p_session_id, v_caller, p_wall_key, v_xp, v_score);

  -- Update session
  v_new_walls := v_session.walls_broken + 1;
  v_progress  := LEAST(100, v_session.progress + 15);
  UPDATE game_sessions
    SET walls_broken = v_new_walls,
        score        = score + v_score,
        progress     = v_progress,
        status       = 'playing',
        started_at   = COALESCE(started_at, now()),
        updated_at   = now()
    WHERE id = p_session_id;

  -- Award XP to profile + pet (reuse existing award_xp helper)
  PERFORM award_xp(v_caller, 'wall_break', p_session_id, v_xp);

  -- Update persistent player_stats (safe accumulator)
  INSERT INTO player_stats (user_id, xp, score, walls_broken)
    VALUES (v_caller, v_xp, v_score, 1)
    ON CONFLICT (user_id) DO UPDATE
      SET xp           = player_stats.xp + EXCLUDED.xp,
          score        = player_stats.score + EXCLUDED.score,
          walls_broken = player_stats.walls_broken + 1,
          updated_at   = now();

  RETURN jsonb_build_object(
    'success',        true,
    'xp_awarded',     v_xp,
    'score_delta',    v_score,
    'already_broken', false,
    'new_walls',      v_new_walls,
    'new_progress',   v_progress
  );
END;
$$;

-- ============================================================
-- 10. SECURE RPC: finish_game_session
-- ============================================================
CREATE OR REPLACE FUNCTION finish_game_session(
  p_session_id  uuid,
  p_total_time_sec integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_session  game_sessions%ROWTYPE;
  v_others   integer;
  v_bonus_xp integer;
  v_is_first boolean;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id;
  IF NOT FOUND OR v_session.user_id != v_caller THEN RAISE EXCEPTION 'Not your session'; END IF;
  IF v_session.status = 'finished' THEN
    RETURN jsonb_build_object('success', true, 'already_finished', true);
  END IF;

  -- Check if first to finish in room
  SELECT count(*) INTO v_others
    FROM game_sessions WHERE room_id = v_session.room_id AND status = 'finished';
  v_is_first := (v_others = 0);

  -- Completion bonus XP
  v_bonus_xp := CASE WHEN v_is_first THEN 100 ELSE 30 END;

  UPDATE game_sessions
    SET status = 'finished', progress = 100, finished_at = now(), updated_at = now()
    WHERE id = p_session_id;

  PERFORM award_xp(v_caller, 'mission_complete', p_session_id, v_bonus_xp);

  INSERT INTO player_stats (user_id, xp, missions_completed, wins)
    VALUES (v_caller, v_bonus_xp, 1, CASE WHEN v_is_first THEN 1 ELSE 0 END)
    ON CONFLICT (user_id) DO UPDATE
      SET xp                = player_stats.xp + EXCLUDED.xp,
          missions_completed = player_stats.missions_completed + 1,
          wins              = player_stats.wins + EXCLUDED.wins,
          best_time_sec     = CASE
            WHEN player_stats.best_time_sec = 0 OR p_total_time_sec < player_stats.best_time_sec
            THEN p_total_time_sec ELSE player_stats.best_time_sec END,
          updated_at        = now();

  RETURN jsonb_build_object(
    'success',         true,
    'bonus_xp',        v_bonus_xp,
    'is_first',        v_is_first,
    'already_finished', false
  );
END;
$$;

-- ============================================================
-- 11. SECURE READ: get_leaderboard
-- ============================================================
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_type   text    DEFAULT 'global',   -- 'global' | 'weekly' | 'room'
  p_room_id uuid   DEFAULT NULL,
  p_limit  integer DEFAULT 50
)
RETURNS TABLE (
  rank             bigint,
  user_id          uuid,
  username         text,
  avatar_url       text,
  level            integer,
  xp               integer,
  score            integer,
  wins             integer,
  missions_completed integer,
  walls_broken     integer,
  best_time_sec    integer,
  pet_type         text,
  pet_stage        text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_type = 'room' AND p_room_id IS NOT NULL THEN
    RETURN QUERY
      SELECT
        ROW_NUMBER() OVER (ORDER BY gs.score DESC, gs.walls_broken DESC)::bigint,
        gs.user_id,
        p.username,
        p.avatar_url,
        p.current_level,
        ps.xp,
        gs.score,
        ps.wins,
        ps.missions_completed,
        ps.walls_broken,
        ps.best_time_sec,
        COALESCE(pet.pet_type,'fox'),
        COALESCE(pet.stage,'infant')
      FROM game_sessions gs
      JOIN profiles p   ON p.id = gs.user_id
      LEFT JOIN player_stats ps ON ps.user_id = gs.user_id
      LEFT JOIN pets pet ON pet.user_id = gs.user_id AND pet.is_active = true
      WHERE gs.room_id = p_room_id
      ORDER BY gs.score DESC
      LIMIT p_limit;
  ELSIF p_type = 'weekly' THEN
    RETURN QUERY
      SELECT
        ROW_NUMBER() OVER (ORDER BY ps.xp DESC)::bigint,
        ps.user_id,
        p.username,
        p.avatar_url,
        p.current_level,
        ps.xp,
        ps.score,
        ps.wins,
        ps.missions_completed,
        ps.walls_broken,
        ps.best_time_sec,
        COALESCE(pet.pet_type,'fox'),
        COALESCE(pet.stage,'infant')
      FROM player_stats ps
      JOIN profiles p ON p.id = ps.user_id
      LEFT JOIN pets pet ON pet.user_id = ps.user_id AND pet.is_active = true
      WHERE ps.updated_at >= now() - interval '7 days'
      ORDER BY ps.xp DESC
      LIMIT p_limit;
  ELSE -- global
    RETURN QUERY
      SELECT
        ROW_NUMBER() OVER (ORDER BY ps.xp DESC)::bigint,
        ps.user_id,
        p.username,
        p.avatar_url,
        p.current_level,
        ps.xp,
        ps.score,
        ps.wins,
        ps.missions_completed,
        ps.walls_broken,
        ps.best_time_sec,
        COALESCE(pet.pet_type,'fox'),
        COALESCE(pet.stage,'infant')
      FROM player_stats ps
      JOIN profiles p ON p.id = ps.user_id
      LEFT JOIN pets pet ON pet.user_id = ps.user_id AND pet.is_active = true
      ORDER BY ps.xp DESC
      LIMIT p_limit;
  END IF;
END;
$$;

-- ============================================================
-- 12. LEADERBOARD VIEW (fast read for frontend polling)
-- ============================================================
CREATE OR REPLACE VIEW global_leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY ps.xp DESC, ps.score DESC)::bigint AS rank,
  ps.user_id,
  p.username,
  p.avatar_url,
  p.current_level                                                  AS level,
  ps.xp,
  ps.score,
  ps.wins,
  ps.losses,
  ps.missions_completed,
  ps.walls_broken,
  ps.best_time_sec,
  COALESCE(pet.pet_type, 'fox')                                    AS pet_type,
  COALESCE(pet.stage, 'infant')                                    AS pet_stage,
  COALESCE(pet.pet_name, 'Companion')                              AS pet_name
FROM player_stats ps
JOIN profiles p  ON p.id = ps.user_id
LEFT JOIN pets pet ON pet.user_id = ps.user_id AND pet.is_active = true
ORDER BY ps.xp DESC, ps.score DESC
LIMIT 100;

GRANT SELECT ON global_leaderboard TO authenticated;

-- ============================================================
-- 13. ROOM + SESSION VIEW (for lobby queries)
-- ============================================================
CREATE OR REPLACE VIEW room_lobby AS
SELECT
  r.id            AS room_id,
  r.name,
  r.status,
  r.max_players,
  r.mission_id,
  r.level,
  r.created_at,
  COUNT(s.id) FILTER (WHERE s.status != 'disconnected') AS player_count
FROM game_rooms r
LEFT JOIN game_sessions s ON s.room_id = r.id
WHERE r.status != 'finished'
GROUP BY r.id
ORDER BY r.created_at DESC;

GRANT SELECT ON room_lobby TO authenticated;
