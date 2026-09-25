/**
 * useFriends.ts
 *
 * Real-time social hooks for PETSLYVIA:
 *  - Friend list with live Presence status
 *  - Pending inbound friend requests
 *  - Room invitations & instant responses
 *  - Search by public Friend ID
 *  - Send/respond/remove friend requests
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useGameData } from './useGameData';
import { supabase } from '@/lib/supabase';
import {
  fetchFriendsList,
  fetchPendingRequests,
  fetchPendingRoomInvitations,
  sendFriendRequest as apiSendFriendRequest,
  respondFriendRequest as apiRespondFriendRequest,
  removeFriend as apiRemoveFriend,
  searchPlayerByFriendId as apiSearchPlayerByFriendId,
  inviteFriendToRoom as apiInviteFriendToRoom,
  respondRoomInvitation as apiRespondRoomInvitation,
  ensureFriendId,
  type FriendEntry,
  type PendingFriendRequest,
  type RoomInvitation,
  type SafePublicProfile,
} from '@/services/friendService';
import type { LobbyPresence } from '@/services/multiplayerRealtimeService';

export interface FriendWithPresence extends FriendEntry {
  presence?: LobbyPresence;
  isOnline: boolean;
}

export function useFriends(onlinePlayers: LobbyPresence[] = []) {
  const { user } = useAuth();
  const { profile } = useGameData();

  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [roomInvitations, setRoomInvitations] = useState<RoomInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignedFriendId, setAssignedFriendId] = useState<string | null>(profile?.friend_id || null);

  useEffect(() => {
    const currentUserId = user?.id || profile?.id;
    if (!currentUserId) return;
    const fid = profile?.friend_id || generateFriendId(currentUserId);
    setAssignedFriendId(fid);
    if (profile) profile.friend_id = fid;
    void ensureFriendId(currentUserId, fid);
  }, [user?.id, profile?.id, profile?.friend_id]);

  // Load initial friends & pending requests
  const currentUserId = user?.id || profile?.id;

  const refreshFriends = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const [fList, pList, invList] = await Promise.all([
        fetchFriendsList(),
        fetchPendingRequests(),
        fetchPendingRoomInvitations(),
      ]);
      setFriends(fList);
      setPendingRequests(pList);
      setRoomInvitations(invList);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    refreshFriends();
  }, [refreshFriends]);

  // Subscribe to friend_requests and room_invitations realtime changes
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`user-social:${currentUserId}`)
      .on('broadcast', { event: 'friend_request' }, () => {
        refreshFriends();
      })
      .on('broadcast', { event: 'friend_request_accepted' }, () => {
        refreshFriends();
      })
      .on('broadcast', { event: 'room_invitation' }, () => {
        refreshFriends();
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_user_id=eq.${currentUserId}`,
        },
        () => {
          refreshFriends();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `sender_user_id=eq.${currentUserId}`,
        },
        () => {
          refreshFriends();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_invitations',
          filter: `receiver_user_id=eq.${currentUserId}`,
        },
        () => {
          refreshFriends();
        }
      )
      .subscribe();

    const lobbyChan = supabase.channel('arena:lobby');
    lobbyChan.on('broadcast', { event: 'social_event' }, (payload: any) => {
      if (payload?.payload?.to === currentUserId || payload?.payload?.from === currentUserId) {
        refreshFriends();
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refreshFriends]);

  // Match presence for friends
  const friendsWithPresence = useMemo<FriendWithPresence[]>(() => {
    const presenceMap = new Map<string, LobbyPresence>();
    for (const p of onlinePlayers) {
      if (p.userId) presenceMap.set(p.userId, p);
    }

    return friends.map((f) => {
      const p = presenceMap.get(f.user_id) || Array.from(presenceMap.values()).find((pm) => pm.friendId === f.friend_id);
      return {
        ...f,
        presence: p,
        isOnline: Boolean(p),
      };
    });
  }, [friends, onlinePlayers]);

  // Count active requests & invites for notification badge
  const notificationCount = pendingRequests.length + roomInvitations.length;

  // Actions
  const sendRequest = async (targetFriendId: string) => {
    setError(null);
    const res = await apiSendFriendRequest(targetFriendId, onlinePlayers);
    if (!res.success) {
      setError(res.error || 'Failed to send request');
      return res;
    }
    await refreshFriends();
    return res;
  };

  const respondRequest = async (requestId: string, action: 'accept' | 'reject' | 'block') => {
    setError(null);
    const res = await apiRespondFriendRequest(requestId, action);
    if (!res.success) {
      setError(res.error || 'Action failed');
      return res;
    }
    await refreshFriends();
    return res;
  };

  const removeExistingFriend = async (friendUserId: string) => {
    setError(null);
    const res = await apiRemoveFriend(friendUserId);
    if (!res.success) {
      setError(res.error || 'Failed to remove friend');
      return res;
    }
    await refreshFriends();
    return res;
  };

  const inviteToRoom = async (roomId: string, targetFriendId: string) => {
    setError(null);
    const res = await apiInviteFriendToRoom(roomId, targetFriendId);
    if (!res.success) {
      setError(res.error || 'Failed to invite friend');
    }
    return res;
  };

  const respondInvite = async (invitationId: string, action: 'accept' | 'decline') => {
    setError(null);
    const res = await apiRespondRoomInvitation(invitationId, action);
    if (!res.success) {
      setError(res.error || 'Failed to respond to invite');
      return res;
    }
    await refreshFriends();
    return res;
  };

  const searchFriend = async (friendId: string): Promise<{ profile: SafePublicProfile | null; error?: string }> => {
    return apiSearchPlayerByFriendId(friendId, onlinePlayers);
  };

  return {
    friends: friendsWithPresence,
    pendingRequests,
    roomInvitations,
    notificationCount,
    loading,
    error,
    myFriendId: profile?.friend_id || assignedFriendId,
    refreshFriends,
    sendRequest,
    respondRequest,
    removeFriend: removeExistingFriend,
    inviteToRoom,
    respondInvite,
    searchFriend,
  };
}
