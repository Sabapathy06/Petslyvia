/**
 * multiplayerRoomService.ts
 *
 * Manages multiplayer game rooms via Supabase:
 *  - Room CRUD (create, join, leave, list)
 *  - Session state updates (ready, progress, finished)
 *  - Wall-break submission (idempotent, server-validated via RPC)
 *  - Leaderboard reads (global / weekly / room)
 *
 * SECURITY: Score/XP changes happen exclusively through SECURITY DEFINER RPCs.
 * This file uses only the PUBLISHABLE (anon) key — never the service_role key.
 */

import { supabase } from '../lib/supabase';
import { broadcastLobbyRoomEvent } from './multiplayerRealtimeService';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface GameRoom {
  room_id:      string;
  name:         string;
  status:       'waiting' | 'playing' | 'finished';
  max_players:  number;
  mission_id:   string | null;
  level:        number;
  created_at:   string;
  player_count: number;
  player_ids?:  string[];
  host_id?:     string;
  host_name?:   string;
}

export interface GameSession {
  id:           string;
  room_id:      string;
  user_id:      string;
  mission_id:   string | null;
  level:        number;
  status:       'lobby' | 'ready' | 'playing' | 'finished' | 'disconnected';
  progress:     number;
  walls_broken: number;
  score:        number;
  is_ready:     boolean;
  started_at:   string | null;
  finished_at:  string | null;
}

export interface LeaderboardEntry {
  rank:               number;
  user_id:            string;
  username:           string | null;
  avatar_url:         string | null;
  level:              number;
  xp:                 number;
  score:              number;
  wins:               number;
  missions_completed: number;
  walls_broken:       number;
  best_time_sec:      number;
  pet_type:           string;
  pet_stage:          string;
}

export interface WallSolutionResult {
  success:       boolean;
  xp_awarded:    number;
  score_delta:   number;
  already_broken: boolean;
  new_walls?:    number;
  new_progress?: number;
}

export interface FinishSessionResult {
  success:          boolean;
  bonus_xp:         number;
  is_first:         boolean;
  already_finished: boolean;
}

// ----------------------------------------------------------------
// ROOMS & DISTRIBUTED REGISTRY
// ----------------------------------------------------------------

const LOCAL_ROOMS_KEY = 'petslyvia_active_rooms';
const _networkRooms = new Map<string, GameRoom>();

export function registerNetworkRoom(room: GameRoom): void {
  if (!room || !room.room_id) return;
  _networkRooms.set(room.room_id, { ...room });
}

export function unregisterNetworkRoom(roomId: string): void {
  _networkRooms.delete(roomId);
}

export function getNetworkRooms(): GameRoom[] {
  return Array.from(_networkRooms.values());
}

function getLocalRooms(): GameRoom[] {
  try {
    const raw = localStorage.getItem(LOCAL_ROOMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRooms(rooms: GameRoom[]) {
  try {
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
  } catch {
    // ignore
  }
}

/** List open rooms available for joining (fused from live presence, broadcast memory, DB, & local storage) */
export async function listOpenRooms(presenceRooms?: GameRoom[]): Promise<GameRoom[]> {
  const roomMap = new Map<string, GameRoom>();

  // 1. Live presence-hosted rooms (absolute freshest real-time source from online hosts)
  if (presenceRooms && presenceRooms.length > 0) {
    for (const r of presenceRooms) {
      if (r && r.room_id) {
        roomMap.set(r.room_id, r);
        _networkRooms.set(r.room_id, r);
      }
    }
  }

  // 2. In-memory network broadcast rooms
  for (const [id, r] of _networkRooms.entries()) {
    if (!roomMap.has(id)) {
      roomMap.set(id, r);
    }
  }

  // 3. Try remote Supabase table if available
  try {
    const { data, error } = await supabase
      .from('room_lobby')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      for (const r of data as GameRoom[]) {
        if (!roomMap.has(r.room_id)) {
          roomMap.set(r.room_id, r);
        }
      }
    }
  } catch {
    // fallback
  }

  // 4. Local storage fallback (filtered to last 60 minutes and player_count > 0)
  const cutoff = Date.now() - 60 * 60 * 1000;
  const local = getLocalRooms().filter(
    (r) => new Date(r.created_at).getTime() > cutoff && (r.player_count ?? 1) > 0
  );
  for (const r of local) {
    if (!roomMap.has(r.room_id)) {
      roomMap.set(r.room_id, r);
    }
  }

  const list = Array.from(roomMap.values());
  return list.sort((a, b) => {
    if (a.status === 'waiting' && b.status !== 'waiting') return -1;
    if (a.status !== 'waiting' && b.status === 'waiting') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/** Create a new room and auto-join as creator */
export async function createRoom(
  name: string,
  maxPlayers = 8,
  missionId?: string,
  level = 1,
  creatorUserId?: string,
  creatorName?: string
): Promise<{ roomId: string | null; room?: GameRoom; error?: string }> {
  const roomId = `room_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const creatorId = creatorUserId || 'creator';
  const hostName = creatorName || 'Host';

  const newRoom: GameRoom = {
    room_id: roomId,
    name: name.trim() || 'Arena Room',
    status: 'waiting',
    max_players: maxPlayers,
    mission_id: missionId ?? null,
    level: level,
    created_at: new Date().toISOString(),
    player_count: 1,
    player_ids: [creatorId],
    host_id: creatorId,
    host_name: hostName,
  };

  try {
    const { data, error } = await supabase.rpc('create_game_room', {
      p_name:        name,
      p_max_players: maxPlayers,
      p_mission_id:  missionId ?? null,
      p_level:       level,
    });

    if (!error && data) {
      newRoom.room_id = data as string;
    }
  } catch {
    // fallback
  }

  registerNetworkRoom(newRoom);

  const currentRooms = getLocalRooms();
  const filtered = currentRooms.filter((r) => r.room_id !== newRoom.room_id && (r.player_count ?? 0) > 0);
  saveLocalRooms([newRoom, ...filtered]);

  // Broadcast to arena:lobby so all clients discover this room immediately
  void broadcastLobbyRoomEvent('room_created', newRoom);

  return { roomId: newRoom.room_id, room: newRoom };
}

/** Join an existing room — returns the session id */
export async function joinRoom(
  roomId: string,
  userId?: string,
  userName?: string
): Promise<{ sessionId: string | null; room?: GameRoom; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('join_game_room', {
      p_room_id: roomId,
    });

    if (!error && data) {
      return { sessionId: data as string };
    }
  } catch {
    // fallback
  }

  const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const rooms = getLocalRooms();
  let room = rooms.find((r) => r.room_id === roomId) || _networkRooms.get(roomId);

  if (room) {
    if (!room.player_ids) {
      room.player_ids = [];
    }
    const uid = userId || sessionId;
    if (!room.player_ids.includes(uid)) {
      room.player_ids.push(uid);
    }
    room.player_count = Math.min(room.player_ids.length, room.max_players);

    registerNetworkRoom(room);
    const existingIdx = rooms.findIndex((r) => r.room_id === roomId);
    if (existingIdx !== -1) {
      rooms[existingIdx] = room;
      saveLocalRooms(rooms);
    } else {
      saveLocalRooms([room, ...rooms]);
    }

    void broadcastLobbyRoomEvent('room_updated', {
      room_id: roomId,
      player_count: room.player_count,
      player_ids: room.player_ids,
    });
  }

  return { sessionId, room };
}

/** Set ready state for the current player in a room */
export async function setReadyState(roomId: string, ready: boolean): Promise<void> {
  try {
    await supabase.rpc('set_ready_state', { p_room_id: roomId, p_ready: ready });
  } catch {
    // ignore
  }
}

/** Close a room completely (by host) */
export async function closeRoom(roomId: string, userId?: string): Promise<void> {
  unregisterNetworkRoom(roomId);

  const rooms = getLocalRooms().filter((r) => r.room_id !== roomId);
  saveLocalRooms(rooms);

  try {
    await supabase.rpc('leave_game_room', { p_room_id: roomId });
  } catch {
    // ignore
  }

  // Broadcast room_closed to arena:lobby so all clients remove this room immediately
  void broadcastLobbyRoomEvent('room_closed', { room_id: roomId, closed_by: userId });

  // Broadcast to room channel so any connected guests are gracefully returned to lobby
  const roomChan = supabase.channel(`room:${roomId}`);
  roomChan.send({
    type: 'broadcast',
    event: 'room_closed',
    payload: { room_id: roomId, closed_by: userId },
  }).catch(() => {});
}

/** Leave a room gracefully */
export async function leaveRoom(roomId: string, userId?: string): Promise<void> {
  try {
    await supabase.rpc('leave_game_room', { p_room_id: roomId });
  } catch {
    // ignore
  }

  const rooms = getLocalRooms();
  const roomIndex = rooms.findIndex((r) => r.room_id === roomId);
  const networkRoom = _networkRooms.get(roomId);

  if (roomIndex !== -1 || networkRoom) {
    const room = roomIndex !== -1 ? rooms[roomIndex] : networkRoom!;
    const isHost = room.host_id === userId || (room.player_ids && room.player_ids[0] === userId);

    if (room.player_ids && userId) {
      room.player_ids = room.player_ids.filter((id) => id !== userId);
      room.player_count = room.player_ids.length;
    } else {
      room.player_count = Math.max(0, (room.player_count || 1) - 1);
    }

    // If host left, or room is now empty, close the room completely!
    if (isHost || room.player_count <= 0) {
      await closeRoom(roomId, userId);
      return;
    }

    registerNetworkRoom(room);
    if (roomIndex !== -1) {
      saveLocalRooms(rooms);
    }

    // Broadcast room update
    void broadcastLobbyRoomEvent('room_updated', {
      room_id: roomId,
      player_count: room.player_count,
      player_ids: room.player_ids,
    });
  }
}

/** Get sessions for a specific room */
export async function getRoomSessions(roomId: string): Promise<GameSession[]> {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('room_id', roomId)
      .neq('status', 'disconnected')
      .order('created_at', { ascending: true });

    if (!error && data) {
      return data as GameSession[];
    }
  } catch {
    // ignore
  }
  return [];
}

/** Update my own session progress (lightweight local update before RPC) */
export async function updateSessionProgress(
  sessionId: string,
  progress: number,
  status?: GameSession['status']
): Promise<void> {
  const update: Partial<GameSession> = { progress };
  if (status) update.status = status;

  try {
    await supabase
      .from('game_sessions')
      .update(update)
      .eq('id', sessionId);
  } catch {
    // ignore
  }
}

// ----------------------------------------------------------------
// WALL SOLVING (server-validated, idempotent)
// ----------------------------------------------------------------

/**
 * Submit a wall solution answer.
 * The server validates idempotency, awards XP/score, and updates stats.
 * NEVER award XP client-side — always go through this RPC.
 */
export async function submitWallSolution(
  sessionId:  string,
  wallKey:    string,
  isCorrect:  boolean,
  level       = 1,
  wallNumber  = 1
): Promise<WallSolutionResult> {
  const { data, error } = await supabase.rpc('submit_wall_solution', {
    p_session_id:  sessionId,
    p_wall_key:    wallKey,
    p_is_correct:  isCorrect,
    p_level:       level,
    p_wall_number: wallNumber,
  });

  if (error) {
    console.error('[Rooms] submitWallSolution error:', error.message);
    return { success: false, xp_awarded: 0, score_delta: 0, already_broken: false };
  }

  const result = data as WallSolutionResult;
  return result;
}

// ----------------------------------------------------------------
// FINISH SESSION
// ----------------------------------------------------------------

export async function finishSession(
  sessionId:     string,
  totalTimeSec   = 0
): Promise<FinishSessionResult> {
  const { data, error } = await supabase.rpc('finish_game_session', {
    p_session_id:     sessionId,
    p_total_time_sec: totalTimeSec,
  });

  if (error) {
    console.error('[Rooms] finishSession error:', error.message);
    return { success: false, bonus_xp: 0, is_first: false, already_finished: false };
  }

  return data as FinishSessionResult;
}

// ----------------------------------------------------------------
// LEADERBOARD
// ----------------------------------------------------------------

export type LeaderboardType = 'global' | 'weekly' | 'room';

export async function fetchLeaderboard(
  type: LeaderboardType = 'global',
  roomId?: string,
  limit = 50
): Promise<LeaderboardEntry[]> {
  // Try the secure RPC first
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_type:    type,
    p_room_id: roomId ?? null,
    p_limit:   limit,
  });

  if (!error && data) {
    return (data as any[]).map((r) => ({
      rank:               Number(r.rank),
      user_id:            r.user_id,
      username:           r.username,
      avatar_url:         r.avatar_url,
      level:              r.level,
      xp:                 r.xp,
      score:              r.score,
      wins:               r.wins,
      missions_completed: r.missions_completed,
      walls_broken:       r.walls_broken,
      best_time_sec:      r.best_time_sec,
      pet_type:           r.pet_type,
      pet_stage:          r.pet_stage,
    }));
  }

  // Fallback: query the view directly
  const { data: viewData } = await supabase
    .from('global_leaderboard')
    .select('*')
    .order('rank', { ascending: true })
    .limit(limit);

  if (!viewData) return [];
  return (viewData as any[]).map((r) => ({
    rank:               Number(r.rank),
    user_id:            r.user_id,
    username:           r.username,
    avatar_url:         r.avatar_url,
    level:              r.level,
    xp:                 r.xp,
    score:              r.score,
    wins:               r.wins,
    missions_completed: r.missions_completed,
    walls_broken:       r.walls_broken,
    best_time_sec:      r.best_time_sec,
    pet_type:           r.pet_type,
    pet_stage:          r.pet_stage,
  }));
}
