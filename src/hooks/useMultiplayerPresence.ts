/**
 * useMultiplayerPresence.ts
 *
 * Lightweight hook for pages that only need the lobby presence (no room).
 * Used by AcademyPage, AdventurePage, etc. to broadcast their current activity.
 * Full room management uses useMultiplayerRoom instead.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useGameData } from './useGameData';
import {
  joinLobbyChannel,
  leaveLobbyChannel,
  updateLobbyPresence,
  heartbeatActivity,
  type LobbyPresence,
  type AreaKey,
} from '@/services/multiplayerRealtimeService';
import { useState } from 'react';
import { fetchLeaderboard, type LeaderboardEntry } from '@/services/multiplayerRoomService';

const HEARTBEAT_MS = 30_000;

export function useMultiplayerPresence(
  currentArea: AreaKey = 'multiplayer',
  activityTag  = 'exploring'
) {
  const { user } = useAuth();
  const { profile, pet } = useGameData();

  const [livePlayers, setLivePlayers] = useState<LobbyPresence[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState(false);

  const heartbeatRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const areaRef       = useRef<AreaKey>(currentArea);
  const tagRef        = useRef<string>(activityTag);

  areaRef.current = currentArea;
  tagRef.current  = activityTag;

  const myUserId = user?.id;
  const username = profile?.username ?? 'Explorer';
  const petType  = pet?.pet_type ?? 'fox';
  const petStage = pet?.stage ?? 'infant';
  const level    = profile?.current_level ?? 1;
  const xp       = profile?.total_xp ?? 0;

  const buildPresence = useCallback((): LobbyPresence => ({
    userId:    myUserId!,
    username,
    petType,
    petStage,
    status:    'online',
    roomId:    null,
    level,
    missionId: null,
    progress:  0,
    isReady:   false,
    joinedAt:  new Date().toISOString(),
  }), [myUserId, username, petType, petStage, level]);

  const updateMyActivity = useCallback(async (area: AreaKey, tag: string) => {
    areaRef.current = area;
    tagRef.current  = tag;
    await updateLobbyPresence({ status: 'online' });
    if (myUserId) {
      await heartbeatActivity(myUserId, username, petType, petStage, area, tag, level, xp);
    }
  }, [myUserId, username, petType, petStage, level, xp]);

  useEffect(() => {
    if (!myUserId) return;

    joinLobbyChannel(buildPresence(), setLivePlayers);
    heartbeatActivity(myUserId, username, petType, petStage, currentArea, activityTag, level, xp);

    heartbeatRef.current = setInterval(() => {
      heartbeatActivity(myUserId, username, petType, petStage, areaRef.current, tagRef.current, level, xp);
    }, HEARTBEAT_MS);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      void leaveLobbyChannel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId]);

  const refreshLeaderboard = useCallback(async () => {
    setLoadingLb(true);
    try {
      const lb = await fetchLeaderboard('global');
      setLeaderboard(lb);
    } finally {
      setLoadingLb(false);
    }
  }, []);

  useEffect(() => { refreshLeaderboard(); }, [refreshLeaderboard]);

  return {
    livePlayers,
    liveCount: livePlayers.length,
    leaderboard,
    loadingLb,
    updateMyActivity,
    refreshLeaderboard,
  };
}
