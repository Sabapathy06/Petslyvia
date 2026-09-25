/**
 * multiplayerRealtimeService.ts  (v2 — Room-based channels)
 *
 * Architecture:
 *  • arena:lobby      — global Presence channel; tracks all online players
 *  • room:<room_id>   — per-room channel; Presence + Broadcast for gameplay
 *
 * Presence payload (slowly-changing state only — NOT mouse/keystroke):
 *   user_id, username, petType, petStage, status, room_id, level, progress,
 *   mission_id, is_ready, joined_at
 *
 * Broadcast events (room channel only):
 *   player_joined | player_left | player_ready | game_started |
 *   wall_broken   | progress_updated | player_finished | mission_completed
 *
 * Supabase Free Tier: ~500 concurrent connections — easily handles 100 players.
 * Each player opens 2 channels: lobby + room (when in a room).
 */

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type PlayerStatus = 'online' | 'lobby' | 'playing' | 'finished';

export interface LobbyPresence {
  userId:      string;
  username:    string;
  friendId?:   string | null;
  petType:     string;
  petStage:    string;
  status:      PlayerStatus;
  roomId:      string | null;
  level:       number;
  missionId:   string | null;
  progress:    number;
  isReady:     boolean;
  joinedAt:    string;
  hostedRoom?: any;
}

export interface RoomPresence extends LobbyPresence {
  score:       number;
  wallsBroken: number;
}

export type BroadcastEventType =
  | 'player_joined'
  | 'player_left'
  | 'player_ready'
  | 'game_started'
  | 'host_started_game'
  | 'room_closed'
  | 'wall_broken'
  | 'progress_updated'
  | 'player_finished'
  | 'mission_completed'
  | 'wrong_answer';

export interface BroadcastEvent {
  type:    BroadcastEventType;
  userId:  string;
  payload: Record<string, unknown>;
  ts:      number;  // Unix ms — used for deduplication
}

export type AreaKey =
  | 'pet_home' | 'academy' | 'adventure' | 'multiplayer'
  | 'shop' | 'world_map' | 'creator' | 'bug_dungeon'
  | 'smart_city' | 'coding_lab' | 'settings';

export const AREA_LABELS: Record<AreaKey, string> = {
  pet_home:    '🏠 Pet Home',
  academy:     '🎓 Academy',
  adventure:   '🗺️ Adventure',
  multiplayer: '⚔️ Arena',
  shop:        '🛒 Shop',
  world_map:   '🌍 World Map',
  creator:     '🔧 Creator',
  bug_dungeon: '🐛 Bug Dungeon',
  smart_city:  '🏙️ Smart City',
  coding_lab:  '💻 Coding Lab',
  settings:    '⚙️ Settings',
};

// ----------------------------------------------------------------
// Singleton channels
// ----------------------------------------------------------------

let _lobbyChannel: RealtimeChannel | null = null;
let _roomChannel:  RealtimeChannel | null = null;
let _currentRoomId: string | null = null;
let _myUserId:      string | null = null;
let _reconnectCount = 0;

// ----------------------------------------------------------------
// LOBBY CHANNEL  (global presence)
// ----------------------------------------------------------------

export function joinLobbyChannel(
  myPresence: LobbyPresence,
  onUpdate: (players: LobbyPresence[]) => void,
  onStatusChange?: (status: string, reconnectCount: number) => void,
  onLobbyBroadcast?: (event: string, payload: any) => void
): RealtimeChannel {
  _myUserId = myPresence.userId;

  if (_lobbyChannel) {
    void _lobbyChannel.track(myPresence);
    return _lobbyChannel;
  }

  _lobbyChannel = supabase.channel('arena:lobby', {
    config: {
      presence: { key: myPresence.userId },
      broadcast: { ack: true, self: false },
    },
  });

  const sync = () => {
    const state = _lobbyChannel!.presenceState<LobbyPresence>();
    onUpdate(Object.values(state).flat());
  };

  _lobbyChannel
    .on('presence', { event: 'sync'  }, sync)
    .on('presence', { event: 'join'  }, sync)
    .on('presence', { event: 'leave' }, sync)
    .on('broadcast', { event: '*' }, ({ event, payload }) => {
      onLobbyBroadcast?.(event, payload);
    })
    .subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        await _lobbyChannel!.track(myPresence);
        onStatusChange?.('connected', _reconnectCount);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        _reconnectCount++;
        onStatusChange?.('reconnecting', _reconnectCount);
      } else if (status === 'CLOSED') {
        onStatusChange?.('disconnected', _reconnectCount);
      }
      void err;
    });

  return _lobbyChannel;
}

export async function broadcastLobbyRoomEvent(
  event: 'room_created' | 'room_updated' | 'room_closed' | 'social_event',
  payload: any
): Promise<void> {
  if (_lobbyChannel && _lobbyChannel.state === 'joined') {
    await _lobbyChannel.send({
      type: 'broadcast',
      event,
      payload,
    }).catch(() => {});
    return;
  }

  const chan = _lobbyChannel || supabase.channel('arena:lobby');
  if (chan.state === 'joined') {
    await chan.send({ type: 'broadcast', event, payload }).catch(() => {});
  } else {
    chan.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        chan.send({ type: 'broadcast', event, payload }).catch(() => {});
      }
    });
  }
}

export async function updateLobbyPresence(update: Partial<LobbyPresence>): Promise<void> {
  if (!_lobbyChannel || !_myUserId) return;
  const state = _lobbyChannel.presenceState<LobbyPresence>();
  const mine  = state[_myUserId]?.[0];
  if (mine) await _lobbyChannel.track({ ...mine, ...update });
}

export async function leaveLobbyChannel(): Promise<void> {
  if (!_lobbyChannel) return;
  await _lobbyChannel.untrack();
  await supabase.removeChannel(_lobbyChannel);
  _lobbyChannel = null;
}

// ----------------------------------------------------------------
// ROOM CHANNEL  (per-room presence + broadcast)
// ----------------------------------------------------------------

export function joinRoomChannel(
  roomId:     string,
  myPresence: RoomPresence,
  onPresenceUpdate: (players: RoomPresence[]) => void,
  onBroadcast: (event: BroadcastEvent) => void,
  onStatusChange?: (status: string) => void
): RealtimeChannel {
  // Leave previous room channel if switching rooms
  if (_roomChannel && _currentRoomId !== roomId) {
    void supabase.removeChannel(_roomChannel);
    _roomChannel = null;
  }

  _currentRoomId = roomId;

  if (_roomChannel) {
    void _roomChannel.track(myPresence);
    return _roomChannel;
  }

  _roomChannel = supabase.channel(`room:${roomId}`, {
    config: {
      presence:  { key: myPresence.userId },
      broadcast: { ack: true, self: false },
    },
  });

  const syncPresence = () => {
    const state = _roomChannel!.presenceState<RoomPresence>();
    onPresenceUpdate(Object.values(state).flat());
  };

  _roomChannel
    .on('presence', { event: 'sync'  }, syncPresence)
    .on('presence', { event: 'join'  }, syncPresence)
    .on('presence', { event: 'leave' }, syncPresence)
    .on('broadcast', { event: '*' }, ({ event, payload }) => {
      onBroadcast({ type: event as BroadcastEventType, ...(payload as any) });
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await _roomChannel!.track(myPresence);
        onStatusChange?.('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatusChange?.('reconnecting');
      }
    });

  return _roomChannel;
}

export async function broadcastRoomEvent(
  type:    BroadcastEventType,
  userId:  string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!_roomChannel) return;
  await _roomChannel.send({
    type:  'broadcast',
    event: type,
    payload: { type, userId, payload, ts: Date.now() },
  });
}

export async function updateRoomPresence(update: Partial<RoomPresence>): Promise<void> {
  if (!_roomChannel || !_myUserId) return;
  const state = _roomChannel.presenceState<RoomPresence>();
  const mine  = state[_myUserId]?.[0];
  if (mine) await _roomChannel.track({ ...mine, ...update });
}

export async function leaveRoomChannel(): Promise<void> {
  if (!_roomChannel) return;
  await _roomChannel.untrack();
  await supabase.removeChannel(_roomChannel);
  _roomChannel = null;
  _currentRoomId = null;
}

// ----------------------------------------------------------------
// DB heartbeat (player_activity table — 30s interval)
// ----------------------------------------------------------------

export async function heartbeatActivity(
  userId:      string,
  username:    string,
  petType:     string,
  petStage:    string,
  currentArea: AreaKey,
  activityTag: string,
  level:       number,
  xp:          number
): Promise<void> {
  try {
    await supabase.rpc('upsert_player_activity', {
      p_user_id:      userId,
      p_username:     username,
      p_pet_type:     petType,
      p_pet_stage:    petStage,
      p_current_area: currentArea,
      p_activity_tag: activityTag,
      p_level:        level,
      p_xp:           xp,
    });
  } catch { /* non-fatal */ }
}

// ----------------------------------------------------------------
// Diagnostics (dev only)
// ----------------------------------------------------------------

export function getRealtimeDiagnostics() {
  return {
    lobbyConnected: _lobbyChannel?.state === 'joined',
    roomConnected:  _roomChannel?.state === 'joined',
    currentRoomId:  _currentRoomId,
    reconnectCount: _reconnectCount,
    myUserId:       _myUserId,
    lobbyState:     _lobbyChannel?.state,
    roomState:      _roomChannel?.state,
  };
}
