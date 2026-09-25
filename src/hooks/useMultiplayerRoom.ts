/**
 * useMultiplayerRoom.ts
 *
 * Master hook for all real-time multiplayer room functionality:
 *  - Lobby channel (global presence of all online players)
 *  - Room channel (per-room presence + broadcast)
 *  - Room CRUD (create, join, leave)
 *  - Wall solution submission (idempotent, server-validated)
 *  - Session state management
 *  - Reconnect handling with exponential backoff
 *  - Connection status tracking
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useGameData } from './useGameData';
import {
  joinLobbyChannel,
  joinRoomChannel,
  leaveLobbyChannel,
  leaveRoomChannel,
  broadcastRoomEvent,
  updateLobbyPresence,
  updateRoomPresence,
  heartbeatActivity,
  type LobbyPresence,
  type RoomPresence,
  type BroadcastEvent,
  type AreaKey,
} from '@/services/multiplayerRealtimeService';
import {
  listOpenRooms,
  createRoom,
  joinRoom,
  leaveRoom,
  setReadyState,
  getRoomSessions,
  submitWallSolution,
  finishSession,
  fetchLeaderboard,
  type GameRoom,
  type GameSession,
  type LeaderboardEntry,
  type LeaderboardType,
  type WallSolutionResult,
} from '@/services/multiplayerRoomService';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'offline';

export interface UseMultiplayerRoomReturn {
  // Connection
  connectionStatus:  ConnectionStatus;
  reconnectCount:    number;
  isOnline:          boolean;

  // Lobby
  onlinePlayers:     LobbyPresence[];
  liveCount:         number;
  openRooms:         GameRoom[];
  loadingRooms:      boolean;
  refreshRooms:      () => Promise<void>;

  // Current room
  currentRoom:       GameRoom | null;
  currentSession:    GameSession | null;
  roomPlayers:       RoomPresence[];
  roomSessions:      GameSession[];
  recentEvents:      BroadcastEvent[];

  // Room actions
  createAndJoinRoom: (name: string, maxPlayers?: number, missionId?: string, level?: number) => Promise<{ error?: string }>;
  joinExistingRoom:  (roomId: string) => Promise<{ error?: string }>;
  quickMatch:        () => Promise<{ error?: string }>;
  leaveCurrentRoom:  () => Promise<void>;
  toggleReady:       () => Promise<void>;

  // Gameplay
  submitWall:        (wallKey: string, isCorrect: boolean, wallNumber?: number) => Promise<WallSolutionResult>;
  broadcastWallBreak: (wallKey: string, xpAwarded: number) => Promise<void>;
  broadcastProgress: (progress: number) => Promise<void>;
  finishCurrentSession: (totalTimeSec?: number) => Promise<void>;
  updateActivity:    (area: AreaKey, tag: string) => void;

  // Leaderboard
  leaderboard:       LeaderboardEntry[];
  leaderboardType:   LeaderboardType;
  loadingLb:         boolean;
  setLeaderboardType: (t: LeaderboardType) => void;
  refreshLeaderboard: () => Promise<void>;
}

const HEARTBEAT_MS    = 30_000;
const ROOM_POLL_MS    = 10_000;  // refresh room list every 10s
const MAX_EVENTS      = 50;      // keep last N broadcast events

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------

export function useMultiplayerRoom(): UseMultiplayerRoomReturn {
  const { user } = useAuth();
  const { profile, pet } = useGameData();

  // ── Connection state ────────────────────────────────────────
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [reconnectCount, setReconnectCount] = useState(0);
  const isOnline = connectionStatus === 'connected';

  // ── Lobby ───────────────────────────────────────────────────
  const [onlinePlayers, setOnlinePlayers] = useState<LobbyPresence[]>([]);
  const [openRooms, setOpenRooms] = useState<GameRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // ── Room ────────────────────────────────────────────────────
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPresence[]>([]);
  const [roomSessions, setRoomSessions] = useState<GameSession[]>([]);
  const [recentEvents, setRecentEvents] = useState<BroadcastEvent[]>([]);

  // ── Leaderboard ─────────────────────────────────────────────
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('global');
  const [loadingLb, setLoadingLb] = useState(false);

  // ── Refs ────────────────────────────────────────────────────
  const heartbeatRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomPollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const lbPollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAreaRef = useRef<AreaKey>('multiplayer');
  const currentTagRef  = useRef<string>('lobby');
  const seenEventIds   = useRef<Set<string>>(new Set());

  // ── Derived presence payload ─────────────────────────────────
  const myUserId  = user?.id ?? '';
  const username  = profile?.username ?? 'Explorer';
  const petType   = pet?.pet_type ?? 'fox';
  const petStage  = pet?.stage ?? 'infant';
  const level     = profile?.current_level ?? 1;
  const xp        = profile?.total_xp ?? 0;
  const friendId  = profile?.friend_id ?? null;

  const buildLobbyPresence = useCallback((): LobbyPresence => ({
    userId:    myUserId,
    username,
    friendId,
    petType,
    petStage,
    status:    currentRoom ? (currentRoom.status === 'playing' ? 'playing' : 'lobby') : 'online',
    roomId:    currentRoom?.room_id ?? null,
    level,
    missionId: currentRoom?.mission_id ?? null,
    progress:  currentSession?.progress ?? 0,
    isReady:   currentSession?.is_ready ?? false,
    joinedAt:  new Date().toISOString(),
  }), [myUserId, username, friendId, petType, petStage, level, currentRoom, currentSession]);

  const buildRoomPresence = useCallback((): RoomPresence => ({
    ...buildLobbyPresence(),
    score:       currentSession?.score ?? 0,
    wallsBroken: currentSession?.walls_broken ?? 0,
  }), [buildLobbyPresence, currentSession]);

  // ── Handlers ────────────────────────────────────────────────

  const handleBroadcast = useCallback((event: BroadcastEvent) => {
    // Deduplicate by ts+userId
    const key = `${event.type}:${event.userId}:${event.ts}`;
    if (seenEventIds.current.has(key)) return;
    seenEventIds.current.add(key);
    if (seenEventIds.current.size > 500) {
      // Trim oldest entries to prevent memory leak
      const arr = Array.from(seenEventIds.current);
      seenEventIds.current = new Set(arr.slice(-200));
    }

    setRecentEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
  }, []);

  // ── Room list refresh ────────────────────────────────────────

  const refreshRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const rooms = await listOpenRooms();
      setOpenRooms(rooms);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  // ── Leaderboard refresh ──────────────────────────────────────

  const refreshLeaderboard = useCallback(async () => {
    setLoadingLb(true);
    try {
      const roomId = leaderboardType === 'room' ? currentRoom?.room_id : undefined;
      const entries = await fetchLeaderboard(leaderboardType, roomId);
      setLeaderboard(entries);
    } finally {
      setLoadingLb(false);
    }
  }, [leaderboardType, currentRoom?.room_id]);

  // ── Room sessions refresh ────────────────────────────────────

  const refreshRoomSessions = useCallback(async (roomId: string) => {
    const sessions = await getRoomSessions(roomId);
    setRoomSessions(sessions);
  }, []);

  // ── Connect to lobby on mount ────────────────────────────────

  useEffect(() => {
    if (!myUserId) return;

    const presence = buildLobbyPresence();

    joinLobbyChannel(
      presence,
      setOnlinePlayers,
      (status, rc) => {
        setConnectionStatus(
          status === 'connected'    ? 'connected'    :
          status === 'reconnecting' ? 'reconnecting' :
          'disconnected'
        );
        setReconnectCount(rc);
      }
    );

    setConnectionStatus('connected');

    // Heartbeat — updates DB every 30s
    heartbeatRef.current = setInterval(() => {
      heartbeatActivity(
        myUserId, username, petType, petStage,
        currentAreaRef.current, currentTagRef.current, level, xp
      );
    }, HEARTBEAT_MS);

    // Initial heartbeat
    heartbeatActivity(myUserId, username, petType, petStage, 'multiplayer', 'lobby', level, xp);

    // Room list poll
    refreshRooms();
    roomPollRef.current = setInterval(refreshRooms, ROOM_POLL_MS);

    // Leaderboard poll (every 8s)
    refreshLeaderboard();
    lbPollRef.current = setInterval(refreshLeaderboard, 8000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (roomPollRef.current)  clearInterval(roomPollRef.current);
      if (lbPollRef.current)    clearInterval(lbPollRef.current);
      void leaveLobbyChannel();
      void leaveRoomChannel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId]);

  // ── Sync lobby presence when room/session changes ────────────

  useEffect(() => {
    if (!myUserId) return;
    void updateLobbyPresence(buildLobbyPresence());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom?.room_id, currentSession?.status, currentSession?.progress, currentSession?.is_ready]);

  // ── Room actions ─────────────────────────────────────────────

  const enterRoom = useCallback(async (room: GameRoom, sessionId: string) => {
    // Clear previous room events and deduplication cache
    setRecentEvents([]);
    seenEventIds.current.clear();

    const sessions = await getRoomSessions(room.room_id);
    const mySession = sessions.find((s) => s.user_id === myUserId) ?? null;

    setCurrentRoom(room);
    setCurrentSession(mySession ?? null);
    setRoomSessions(sessions);

    const presence = buildRoomPresence();
    joinRoomChannel(
      room.room_id,
      presence,
      setRoomPlayers,
      handleBroadcast
    );

    void broadcastRoomEvent('player_joined', myUserId, { username, petType, level });
    void updateLobbyPresence({ ...buildLobbyPresence(), status: 'lobby', roomId: room.room_id });
    void sessionId; // stored in DB; local state synced from roomSessions
  }, [myUserId, username, petType, level, buildLobbyPresence, buildRoomPresence, handleBroadcast]);

  const createAndJoinRoom = useCallback(async (
    name: string,
    maxPlayers = 8,
    missionId?: string,
    lvl = 1
  ): Promise<{ error?: string }> => {
    const { roomId, error } = await createRoom(name, maxPlayers, missionId, lvl, myUserId);
    if (error || !roomId) return { error: error ?? 'Failed to create room' };

    // Reload room list to get the full GameRoom object
    await refreshRooms();
    const rooms = await listOpenRooms();
    const room  = rooms.find((r) => r.room_id === roomId) ?? {
      room_id: roomId, name, status: 'waiting' as const,
      max_players: maxPlayers, mission_id: missionId ?? null,
      level: lvl, created_at: new Date().toISOString(), player_count: 1,
      player_ids: [myUserId],
    };

    await enterRoom(room, roomId);
    return {};
  }, [myUserId, refreshRooms, enterRoom]);

  const joinExistingRoom = useCallback(async (roomId: string): Promise<{ error?: string }> => {
    const { sessionId, error } = await joinRoom(roomId, myUserId);
    if (error || !sessionId) return { error: error ?? 'Failed to join room' };

    await refreshRooms();
    const rooms = await listOpenRooms();
    const room  = rooms.find((r) => r.room_id === roomId);
    if (!room) return { error: 'Room not found after joining' };

    await enterRoom(room, sessionId);
    return {};
  }, [myUserId, refreshRooms, enterRoom]);

  const quickMatch = useCallback(async (): Promise<{ error?: string }> => {
    await refreshRooms();
    const rooms = await listOpenRooms();
    const candidates = rooms.filter(
      (r) => r.status === 'waiting' && r.player_count < r.max_players
    );

    if (candidates.length > 0) {
      // Pick best room (closest to filling up)
      candidates.sort((a, b) => b.player_count - a.player_count);
      return joinExistingRoom(candidates[0].room_id);
    }

    // No available room — auto create one
    const roomName = `${username}'s Quick Match`;
    return createAndJoinRoom(roomName, 8, undefined, level);
  }, [refreshRooms, joinExistingRoom, createAndJoinRoom, username, level]);

  const leaveCurrentRoom = useCallback(async () => {
    if (!currentRoom) return;
    void broadcastRoomEvent('player_left', myUserId, { username });
    await leaveRoom(currentRoom.room_id, myUserId);
    await leaveRoomChannel();
    setCurrentRoom(null);
    setCurrentSession(null);
    setRoomPlayers([]);
    setRoomSessions([]);
    setRecentEvents([]);
    seenEventIds.current.clear();
    void updateLobbyPresence({ status: 'online', roomId: null });
    await refreshRooms();
  }, [currentRoom, myUserId, username, refreshRooms]);

  const toggleReady = useCallback(async () => {
    if (!currentRoom || !currentSession) return;
    const newReady = !currentSession.is_ready;
    setCurrentSession((s) => s ? { ...s, is_ready: newReady } : s);
    await setReadyState(currentRoom.room_id, newReady);
    void broadcastRoomEvent('player_ready', myUserId, { username, isReady: newReady });
    void updateRoomPresence({ isReady: newReady });
    await refreshRoomSessions(currentRoom.room_id);
  }, [currentRoom, currentSession, myUserId, username, refreshRoomSessions]);

  // ── Gameplay ─────────────────────────────────────────────────

  const submitWall = useCallback(async (
    wallKey:    string,
    isCorrect:  boolean,
    wallNumber  = 1
  ): Promise<WallSolutionResult> => {
    if (!currentSession) {
      return { success: false, xp_awarded: 0, score_delta: 0, already_broken: false };
    }

    const result = await submitWallSolution(
      currentSession.id,
      wallKey,
      isCorrect,
      currentRoom?.level ?? 1,
      wallNumber
    );

    if (result.success && !result.already_broken) {
      const updated: GameSession = {
        ...currentSession,
        walls_broken: result.new_walls ?? currentSession.walls_broken + 1,
        score:        currentSession.score + (result.score_delta ?? 0),
        progress:     result.new_progress ?? Math.min(100, currentSession.progress + 15),
      };
      setCurrentSession(updated);
      void updateRoomPresence({
        wallsBroken: updated.walls_broken,
        score:       updated.score,
        progress:    updated.progress,
      });
    }

    return result;
  }, [currentSession, currentRoom?.level]);

  const broadcastWallBreak = useCallback(async (wallKey: string, xpAwarded: number) => {
    void broadcastRoomEvent('wall_broken', myUserId, { username, wallKey, xpAwarded });
  }, [myUserId, username]);

  const broadcastProgress = useCallback(async (progress: number) => {
    void broadcastRoomEvent('progress_updated', myUserId, { username, progress });
    void updateRoomPresence({ progress });
  }, [myUserId, username]);

  const finishCurrentSession = useCallback(async (totalTimeSec = 0) => {
    if (!currentSession) return;
    const result = await finishSession(currentSession.id, totalTimeSec);
    if (result.success) {
      setCurrentSession((s) => s ? { ...s, status: 'finished', progress: 100 } : s);
      void broadcastRoomEvent('player_finished', myUserId, {
        username,
        isFirst: result.is_first,
        bonusXp: result.bonus_xp,
      });
      void updateLobbyPresence({ status: 'finished', progress: 100 });
    }
  }, [currentSession, myUserId, username]);

  const updateActivity = useCallback((area: AreaKey, tag: string) => {
    currentAreaRef.current = area;
    currentTagRef.current  = tag;
    void updateLobbyPresence({ status: area === 'multiplayer' ? 'lobby' : 'online' });
  }, []);

  return {
    connectionStatus,
    reconnectCount,
    isOnline,
    onlinePlayers,
    liveCount:            onlinePlayers.length,
    openRooms,
    loadingRooms,
    refreshRooms,
    currentRoom,
    currentSession,
    roomPlayers,
    roomSessions,
    recentEvents,
    createAndJoinRoom,
    joinExistingRoom,
    quickMatch,
    leaveCurrentRoom,
    toggleReady,
    submitWall,
    broadcastWallBreak,
    broadcastProgress,
    finishCurrentSession,
    updateActivity,
    leaderboard,
    leaderboardType,
    loadingLb,
    setLeaderboardType,
    refreshLeaderboard,
  };
}
