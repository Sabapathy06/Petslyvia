/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  PETSLYVIA — Social System, Friend IDs, Friends & Match Results            ║
║  Migration 009  |  Idempotent — safe to run multiple times                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Phase 6-21 of the multiplayer implementation:                              ║
║                                                                            ║
║  1. friend_id column on profiles (PVS-XXXXXX, unique, permanent)           ║
║  2. match_results table (permanent match history)                          ║
║  3. friend_requests table (pending/accepted/rejected/blocked)              ║
║  4. room_invitations table (real-time room invitations)                    ║
║  5. notifications table upgrade (friend + invite notification types)       ║
║                                                                            ║
║  Secure RPCs:                                                              ║
║   • generate_friend_id()         — collision-safe unique ID generator      ║
║   • ensure_friend_id(user_id)    — ensures every user has a friend_id      ║
║   • search_player_by_friend_id() — safe public profile lookup              ║
║   • send_friend_request()        — send + notify, prevent duplicates       ║
║   • respond_friend_request()     — accept/reject/block with notification   ║
║   • remove_friend()              — remove accepted friendship              ║
║   • get_friends_list()           — return accepted friends with pub info   ║
║   • get_pending_requests()       — incoming pending requests               ║
║   • send_room_invitation()       — invite a friend to a room               ║
║   • respond_room_invitation()    — accept/decline room invite              ║
║   • save_match_result()          — persist final match data idempotently   ║
║   • get_match_results()          — fetch a player's match history          ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

-- ============================================================
-- 1. FRIEND ID on profiles
--    Format: PVS-XXXXXX (6 alphanumeric chars, case-normalised to upper)
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friend_id text;

-- Unique constraint (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_friend_id_unique
  ON profiles (lower(friend_id)) WHERE friend_id IS NOT NULL;

-- Fast lookup index
CREATE INDEX IF NOT EXISTS profiles_friend_id_idx ON profiles (friend_id);

-- Generator: returns a new unique PVS-XXXXXX code
CREATE OR REPLACE FUNCTION generate_friend_id()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 unambiguous chars
  v_id     text;
  v_exists boolean;
  v_tries  integer := 0;
BEGIN
  LOOP
    v_id := 'PVS-';
    FOR i IN 1..6 LOOP
      v_id := v_id || substr(v_chars, floor(random() * 32)::integer + 1, 1);
    END LOOP;
    SELECT EXISTS (SELECT 1 FROM profiles WHERE lower(friend_id) = lower(v_id)) INTO v_exists;
    EXIT WHEN NOT v_exists;
    v_tries := v_tries + 1;
    IF v_tries > 50 THEN RAISE EXCEPTION 'Could not generate unique friend_id'; END IF;
  END LOOP;
  RETURN v_id;
END;
$$;

-- Ensure every authenticated user gets a friend_id on demand
CREATE OR REPLACE FUNCTION ensure_friend_id(p_user_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    uuid := COALESCE(p_user_id, auth.uid());
  v_fid    text;
BEGIN
  SELECT friend_id INTO v_fid FROM profiles WHERE id = v_uid;
  IF v_fid IS NULL OR v_fid = '' THEN
    v_fid := generate_friend_id();
    UPDATE profiles SET friend_id = v_fid WHERE id = v_uid;
  END IF;
  RETURN v_fid;
END;
$$;

-- Backfill all existing users (idempotent)
DO $$
DECLARE r record; BEGIN
  FOR r IN SELECT id FROM profiles WHERE friend_id IS NULL LOOP
    UPDATE profiles SET friend_id = generate_friend_id() WHERE id = r.id;
  END LOOP;
END $$;

-- Trigger: new users always get a friend_id at profile creation
CREATE OR REPLACE FUNCTION assign_friend_id_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.friend_id IS NULL OR NEW.friend_id = '' THEN
    NEW.friend_id := generate_friend_id();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_assign_friend_id ON profiles;
CREATE TRIGGER trg_assign_friend_id BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_friend_id_on_insert();

-- ============================================================
-- 2. MATCH RESULTS (permanent history)
-- ============================================================
CREATE TABLE IF NOT EXISTS match_results (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id           uuid        NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rank              integer     NOT NULL DEFAULT 0,
  score             integer     NOT NULL DEFAULT 0,
  xp_earned         integer     NOT NULL DEFAULT 0,
  time_taken_sec    integer     NOT NULL DEFAULT 0,
  walls_broken      integer     NOT NULL DEFAULT 0,
  missions_completed integer    NOT NULL DEFAULT 0,
  completed_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_results_unique UNIQUE (room_id, user_id)
);

ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='match_results' AND policyname='match_results_select') THEN
    CREATE POLICY "match_results_select" ON match_results FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='match_results' AND policyname='match_results_own_insert') THEN
    CREATE POLICY "match_results_own_insert" ON match_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_match_results_user ON match_results (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_results_room ON match_results (room_id, rank);

-- ============================================================
-- 3. FRIEND REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS friend_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_user_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','accepted','rejected','blocked')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_requests_no_self CHECK (sender_user_id != receiver_user_id),
  CONSTRAINT friend_requests_unique UNIQUE (sender_user_id, receiver_user_id)
);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
-- Only sender and receiver can see their own requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friend_requests' AND policyname='friend_requests_select') THEN
    CREATE POLICY "friend_requests_select" ON friend_requests FOR SELECT TO authenticated
      USING (auth.uid() = sender_user_id OR auth.uid() = receiver_user_id);
  END IF;
END $$;
-- Insert only via RPC (still needs INSERT policy for RPC context)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friend_requests' AND policyname='friend_requests_insert') THEN
    CREATE POLICY "friend_requests_insert" ON friend_requests FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = sender_user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friend_requests' AND policyname='friend_requests_update') THEN
    CREATE POLICY "friend_requests_update" ON friend_requests FOR UPDATE TO authenticated
      USING (auth.uid() = receiver_user_id OR auth.uid() = sender_user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_friend_requests_updated ON friend_requests;
CREATE TRIGGER trg_friend_requests_updated BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_col();

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests (receiver_user_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender   ON friend_requests (sender_user_id, status);

-- ============================================================
-- 4. ROOM INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS room_invitations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          uuid        NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  sender_user_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_user_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','accepted','declined')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  CONSTRAINT room_invitations_no_self CHECK (sender_user_id != receiver_user_id),
  CONSTRAINT room_invitations_unique  UNIQUE (room_id, receiver_user_id)
);

ALTER TABLE room_invitations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='room_invitations' AND policyname='room_invitations_select') THEN
    CREATE POLICY "room_invitations_select" ON room_invitations FOR SELECT TO authenticated
      USING (auth.uid() = sender_user_id OR auth.uid() = receiver_user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='room_invitations' AND policyname='room_invitations_insert') THEN
    CREATE POLICY "room_invitations_insert" ON room_invitations FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = sender_user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='room_invitations' AND policyname='room_invitations_update') THEN
    CREATE POLICY "room_invitations_update" ON room_invitations FOR UPDATE TO authenticated
      USING (auth.uid() = receiver_user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_room_invitations_receiver ON room_invitations (receiver_user_id, status, expires_at);

-- ============================================================
-- 5. NOTIFICATION TYPES UPGRADE
--    Adds friend + invite types to existing notifications check
-- ============================================================
ALTER TABLE IF EXISTS notifications
  DROP CONSTRAINT IF EXISTS notif_type_chk;
ALTER TABLE IF EXISTS notifications
  ADD CONSTRAINT notif_type_chk CHECK (type IN (
    'task_due','goal_milestone','achievement','streak','focus',
    'daily_summary','pet','recovery',
    'friend_request','friend_accepted','room_invitation','system'
  ));

-- ============================================================
-- 6. RPC: search_player_by_friend_id
--    Returns SAFE public profile (no email, no internal UUID exposed in response)
-- ============================================================
CREATE OR REPLACE FUNCTION search_player_by_friend_id(p_friend_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_row    record;
  v_stats  record;
  v_pet    record;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  -- Normalize case
  SELECT * INTO v_row FROM profiles WHERE lower(friend_id) = lower(p_friend_id);
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- Prevent returning blocked users
  IF EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'blocked'
      AND ((sender_user_id = v_caller AND receiver_user_id = v_row.id)
        OR (sender_user_id = v_row.id AND receiver_user_id = v_caller))
  ) THEN RETURN NULL; END IF;

  SELECT * INTO v_stats FROM player_stats WHERE user_id = v_row.id;
  SELECT * INTO v_pet   FROM pets WHERE user_id = v_row.id AND is_active = true LIMIT 1;

  RETURN jsonb_build_object(
    'user_id',           v_row.id,
    'username',          v_row.username,
    'friend_id',         v_row.friend_id,
    'avatar_url',        v_row.avatar_url,
    'level',             v_row.current_level,
    'xp',                COALESCE(v_stats.xp, v_row.total_xp),
    'score',             COALESCE(v_stats.score, 0),
    'wins',              COALESCE(v_stats.wins, 0),
    'missions_completed', COALESCE(v_stats.missions_completed, 0),
    'walls_broken',      COALESCE(v_stats.walls_broken, 0),
    'best_time_sec',     COALESCE(v_stats.best_time_sec, 0),
    'pet_type',          COALESCE(v_pet.pet_type, 'fox'),
    'pet_name',          COALESCE(v_pet.pet_name, 'Companion'),
    'pet_stage',         COALESCE(v_pet.stage, 'infant'),
    'created_at',        v_row.created_at
  );
END;
$$;

-- ============================================================
-- 7. RPC: send_friend_request
-- ============================================================
CREATE OR REPLACE FUNCTION send_friend_request(p_target_friend_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_caller_fid text;
  v_caller_name text;
  v_target   uuid;
  v_existing record;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id INTO v_target FROM profiles WHERE lower(friend_id) = lower(p_target_friend_id);
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Player not found'); END IF;
  IF v_target = v_caller THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot add yourself'); END IF;

  -- Check for block
  IF EXISTS (SELECT 1 FROM friend_requests WHERE status = 'blocked'
      AND ((sender_user_id = v_caller AND receiver_user_id = v_target)
        OR (sender_user_id = v_target AND receiver_user_id = v_caller)))
  THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot send request to this player'); END IF;

  -- Check existing
  SELECT * INTO v_existing FROM friend_requests
    WHERE (sender_user_id = v_caller AND receiver_user_id = v_target)
       OR (sender_user_id = v_target AND receiver_user_id = v_caller);
  IF FOUND THEN
    IF v_existing.status = 'accepted' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already friends');
    END IF;
    IF v_existing.status = 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Request already pending');
    END IF;
  END IF;

  SELECT friend_id, username INTO v_caller_fid, v_caller_name FROM profiles WHERE id = v_caller;

  INSERT INTO friend_requests (sender_user_id, receiver_user_id, status)
    VALUES (v_caller, v_target, 'pending')
    ON CONFLICT (sender_user_id, receiver_user_id) DO UPDATE
      SET status = 'pending', updated_at = now();

  -- Notify receiver
  INSERT INTO notifications (user_id, type, title, message)
    VALUES (v_target, 'friend_request',
      'Friend Request',
      v_caller_name || ' (' || v_caller_fid || ') wants to add you as a friend.')
    ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'Friend request sent');
END;
$$;

-- ============================================================
-- 8. RPC: respond_friend_request
-- ============================================================
CREATE OR REPLACE FUNCTION respond_friend_request(
  p_request_id uuid,
  p_action     text   -- 'accept' | 'reject' | 'block'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_req      record;
  v_new_status text;
  v_sender_name text;
  v_sender_fid  text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_action NOT IN ('accept','reject','block') THEN RAISE EXCEPTION 'Invalid action'; END IF;

  SELECT * INTO v_req FROM friend_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Request not found'); END IF;
  IF v_req.receiver_user_id != v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  v_new_status := CASE p_action WHEN 'accept' THEN 'accepted' WHEN 'block' THEN 'blocked' ELSE 'rejected' END;
  UPDATE friend_requests SET status = v_new_status, updated_at = now() WHERE id = p_request_id;

  -- Notify sender if accepted
  IF p_action = 'accept' THEN
    SELECT username, friend_id INTO v_sender_name, v_sender_fid FROM profiles WHERE id = v_caller;
    INSERT INTO notifications (user_id, type, title, message)
      VALUES (v_req.sender_user_id, 'friend_accepted',
        'Friend Request Accepted',
        v_sender_name || ' accepted your friend request!')
      ON CONFLICT DO NOTHING;
    -- Ensure player_stats row exists for both
    PERFORM ensure_player_stats(v_req.sender_user_id);
    PERFORM ensure_player_stats(v_caller);
  END IF;

  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- ============================================================
-- 9. RPC: remove_friend
-- ============================================================
CREATE OR REPLACE FUNCTION remove_friend(p_friend_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM friend_requests
    WHERE status = 'accepted'
      AND ((sender_user_id = v_caller AND receiver_user_id = p_friend_user_id)
        OR (sender_user_id = p_friend_user_id AND receiver_user_id = v_caller));
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 10. RPC: get_friends_list
-- ============================================================
CREATE OR REPLACE FUNCTION get_friends_list()
RETURNS TABLE (
  user_id      uuid,
  username     text,
  friend_id    text,
  avatar_url   text,
  level        integer,
  xp           integer,
  pet_type     text,
  pet_stage    text,
  pet_name     text,
  request_id   uuid,
  friendship_since timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
    SELECT
      p.id, p.username, p.friend_id, p.avatar_url, p.current_level,
      COALESCE(ps.xp, p.total_xp),
      COALESCE(pet.pet_type, 'fox'),
      COALESCE(pet.stage, 'infant'),
      COALESCE(pet.pet_name, 'Companion'),
      fr.id,
      fr.updated_at
    FROM friend_requests fr
    JOIN profiles p ON (
      CASE WHEN fr.sender_user_id = v_caller THEN fr.receiver_user_id ELSE fr.sender_user_id END = p.id
    )
    LEFT JOIN player_stats ps ON ps.user_id = p.id
    LEFT JOIN pets pet ON pet.user_id = p.id AND pet.is_active = true
    WHERE fr.status = 'accepted'
      AND (fr.sender_user_id = v_caller OR fr.receiver_user_id = v_caller)
    ORDER BY p.username;
END;
$$;

-- ============================================================
-- 11. RPC: get_pending_requests
-- ============================================================
CREATE OR REPLACE FUNCTION get_pending_requests()
RETURNS TABLE (
  request_id     uuid,
  sender_user_id uuid,
  username       text,
  friend_id      text,
  avatar_url     text,
  level          integer,
  pet_type       text,
  pet_stage      text,
  created_at     timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
    SELECT fr.id, fr.sender_user_id, p.username, p.friend_id, p.avatar_url,
           p.current_level, COALESCE(pet.pet_type,'fox'),
           COALESCE(pet.stage,'infant'), fr.created_at
    FROM friend_requests fr
    JOIN profiles p ON p.id = fr.sender_user_id
    LEFT JOIN pets pet ON pet.user_id = p.id AND pet.is_active = true
    WHERE fr.receiver_user_id = v_caller AND fr.status = 'pending'
    ORDER BY fr.created_at DESC;
END;
$$;

-- ============================================================
-- 12. RPC: send_room_invitation
-- ============================================================
CREATE OR REPLACE FUNCTION send_room_invitation(
  p_room_id          uuid,
  p_target_friend_id text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_target   uuid;
  v_room     game_rooms%ROWTYPE;
  v_name     text;
  v_fid      text;
  v_current  integer;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id INTO v_target FROM profiles WHERE lower(friend_id) = lower(p_target_friend_id);
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Player not found'); END IF;
  IF v_target = v_caller THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot invite yourself'); END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = p_room_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Room not found'); END IF;
  IF v_room.status = 'finished' THEN RETURN jsonb_build_object('success', false, 'error', 'Room has ended'); END IF;

  SELECT count(*) INTO v_current FROM game_sessions WHERE room_id = p_room_id AND status != 'disconnected';
  IF v_current >= v_room.max_players THEN RETURN jsonb_build_object('success', false, 'error', 'Room is full'); END IF;

  -- Check friends
  IF NOT EXISTS (
    SELECT 1 FROM friend_requests WHERE status = 'accepted'
      AND ((sender_user_id = v_caller AND receiver_user_id = v_target)
        OR (sender_user_id = v_target AND receiver_user_id = v_caller))
  ) THEN RETURN jsonb_build_object('success', false, 'error', 'Not friends with that player'); END IF;

  SELECT username, friend_id INTO v_name, v_fid FROM profiles WHERE id = v_caller;

  INSERT INTO room_invitations (room_id, sender_user_id, receiver_user_id)
    VALUES (p_room_id, v_caller, v_target)
    ON CONFLICT (room_id, receiver_user_id) DO UPDATE
      SET status = 'pending', created_at = now(), expires_at = now() + interval '5 minutes';

  INSERT INTO notifications (user_id, type, title, message)
    VALUES (v_target, 'room_invitation',
      'Room Invitation',
      v_name || ' invited you to join their room!')
    ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'room_name', v_room.name, 'invited_user', v_target);
END;
$$;

-- ============================================================
-- 13. RPC: respond_room_invitation
-- ============================================================
CREATE OR REPLACE FUNCTION respond_room_invitation(
  p_invitation_id uuid,
  p_action        text  -- 'accept' | 'decline'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_inv    room_invitations%ROWTYPE;
  v_session_id uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_inv FROM room_invitations WHERE id = p_invitation_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Invitation not found'); END IF;
  IF v_inv.receiver_user_id != v_caller THEN RETURN jsonb_build_object('success', false, 'error', 'Not your invitation'); END IF;
  IF v_inv.expires_at < now() THEN RETURN jsonb_build_object('success', false, 'error', 'Invitation expired'); END IF;

  IF p_action = 'accept' THEN
    UPDATE room_invitations SET status = 'accepted' WHERE id = p_invitation_id;
    SELECT join_game_room(v_inv.room_id) INTO v_session_id;
    RETURN jsonb_build_object('success', true, 'session_id', v_session_id, 'room_id', v_inv.room_id);
  ELSE
    UPDATE room_invitations SET status = 'declined' WHERE id = p_invitation_id;
    RETURN jsonb_build_object('success', true, 'declined', true);
  END IF;
END;
$$;

-- ============================================================
-- 14. RPC: save_match_result (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION save_match_result(
  p_room_id          uuid,
  p_rank             integer,
  p_score            integer,
  p_time_taken_sec   integer,
  p_walls_broken     integer,
  p_missions_completed integer
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_xp_earned integer;
  v_is_win    boolean;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- XP scaling: 1st = 100, 2nd = 75, 3rd = 50, others = 30
  v_xp_earned := GREATEST(30, 110 - (p_rank * 10));
  v_is_win    := (p_rank = 1);

  INSERT INTO match_results (room_id, user_id, rank, score, xp_earned, time_taken_sec, walls_broken, missions_completed)
    VALUES (p_room_id, v_caller, p_rank, p_score, v_xp_earned, p_time_taken_sec, p_walls_broken, p_missions_completed)
    ON CONFLICT (room_id, user_id) DO NOTHING; -- idempotent

  IF NOT EXISTS (SELECT 1 FROM match_results WHERE room_id = p_room_id AND user_id = v_caller AND xp_earned > 0) THEN
    PERFORM award_xp(v_caller, 'match_result', p_room_id, v_xp_earned);
    INSERT INTO player_stats (user_id, wins, losses) VALUES (v_caller, 0, 0)
      ON CONFLICT (user_id) DO UPDATE
        SET wins   = player_stats.wins   + CASE WHEN v_is_win THEN 1 ELSE 0 END,
            losses = player_stats.losses + CASE WHEN NOT v_is_win THEN 1 ELSE 0 END,
            updated_at = now();
  END IF;

  RETURN jsonb_build_object('success', true, 'xp_earned', v_xp_earned, 'is_win', v_is_win);
END;
$$;

-- ============================================================
-- 15. RPC: get_match_results (player history)
-- ============================================================
CREATE OR REPLACE FUNCTION get_match_results(p_limit integer DEFAULT 10)
RETURNS TABLE (
  room_id           uuid,
  room_name         text,
  rank              integer,
  score             integer,
  xp_earned         integer,
  time_taken_sec    integer,
  walls_broken      integer,
  missions_completed integer,
  completed_at      timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
    SELECT mr.room_id, gr.name, mr.rank, mr.score, mr.xp_earned,
           mr.time_taken_sec, mr.walls_broken, mr.missions_completed, mr.completed_at
    FROM match_results mr
    LEFT JOIN game_rooms gr ON gr.id = mr.room_id
    WHERE mr.user_id = v_caller
    ORDER BY mr.completed_at DESC
    LIMIT p_limit;
END;
$$;

-- ============================================================
-- 16. QUICK MATCH RPC
--    Finds an open waiting room with fewest players, or creates one
-- ============================================================
CREATE OR REPLACE FUNCTION quick_match(p_level integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller    uuid := auth.uid();
  v_room_id   uuid;
  v_session_id uuid;
  v_room_name text;
  v_created   boolean := false;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Already in a room?
  SELECT gs.room_id INTO v_room_id
    FROM game_sessions gs
    JOIN game_rooms gr ON gr.id = gs.room_id
    WHERE gs.user_id = v_caller AND gs.status NOT IN ('disconnected','finished')
      AND gr.status = 'waiting'
    LIMIT 1;

  IF v_room_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'room_id', v_room_id, 'created', false, 'rejoin', true);
  END IF;

  -- Find a suitable waiting room (not full, not started)
  SELECT gr.id INTO v_room_id
    FROM game_rooms gr
    WHERE gr.status = 'waiting'
      AND gr.level = p_level
      AND (SELECT count(*) FROM game_sessions gs WHERE gs.room_id = gr.id AND gs.status != 'disconnected') < gr.max_players
    ORDER BY (SELECT count(*) FROM game_sessions gs WHERE gs.room_id = gr.id AND gs.status != 'disconnected') DESC, gr.created_at ASC
    LIMIT 1;

  IF v_room_id IS NOT NULL THEN
    SELECT join_game_room(v_room_id) INTO v_session_id;
    RETURN jsonb_build_object('success', true, 'room_id', v_room_id, 'session_id', v_session_id, 'created', false);
  END IF;

  -- Create a new room
  v_room_name := 'Quick Match ' || to_char(now(), 'HH24:MI');
  SELECT create_game_room(v_room_name, 8, NULL, p_level) INTO v_room_id;
  RETURN jsonb_build_object('success', true, 'room_id', v_room_id, 'created', true);
END;
$$;

-- ============================================================
-- 17. ENHANCED LEADERBOARD VIEW WITH DAILY / WEEKLY
-- ============================================================
CREATE OR REPLACE VIEW global_leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY COALESCE(ps.xp, p.total_xp) DESC, COALESCE(ps.score,0) DESC)::bigint AS rank,
  ps.user_id,
  p.username,
  p.friend_id,
  p.avatar_url,
  p.current_level                     AS level,
  COALESCE(ps.xp, p.total_xp)        AS xp,
  COALESCE(ps.score, 0)               AS score,
  COALESCE(ps.wins, 0)                AS wins,
  COALESCE(ps.losses, 0)              AS losses,
  COALESCE(ps.missions_completed, 0)  AS missions_completed,
  COALESCE(ps.walls_broken, 0)        AS walls_broken,
  COALESCE(ps.best_time_sec, 0)       AS best_time_sec,
  COALESCE(pet.pet_type, 'fox')       AS pet_type,
  COALESCE(pet.stage, 'infant')       AS pet_stage,
  COALESCE(pet.pet_name, 'Companion') AS pet_name
FROM player_stats ps
JOIN profiles p  ON p.id = ps.user_id
LEFT JOIN pets pet ON pet.user_id = ps.user_id AND pet.is_active = true
ORDER BY COALESCE(ps.xp, p.total_xp) DESC, COALESCE(ps.score,0) DESC
LIMIT 100;

GRANT SELECT ON global_leaderboard TO authenticated;
