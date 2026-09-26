/**
 * useFriends.ts
 *
 * Real-time social hooks for PETSLYVIA:
 *  - Single source of truth for friends, incoming requests, and outgoing requests
 *  - Authoritative relationship status resolver
 *  - Live Realtime Presence binding (online, lobby, playing, finished, offline)
 *  - Real-time instant updates on request receive, accept, decline, and invite
 *  - Window focus sync & multi-channel broadcast listener
 *  - Automatic public directory registration
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './useAuth';
import { useGameData } from './useGameData';
import { supabase } from '@/lib/supabase';
import {
  fetchFriendsList,
  fetchPendingRequests,
  fetchSentRequests,
  fetchPendingRoomInvitations,
  sendFriendRequest as apiSendFriendRequest,
  respondFriendRequest as apiRespondFriendRequest,
  cancelFriendRequest as apiCancelFriendRequest,
  removeFriend as apiRemoveFriend,
  blockUser as apiBlockUser,
  unblockUser as apiUnblockUser,
  searchPlayerByFriendId as apiSearchPlayerByFriendId,
  getFriendshipStatus as apiGetFriendshipStatus,
  inviteFriendToRoom as apiInviteFriendToRoom,
  respondRoomInvitation as apiRespondRoomInvitation,
  ensureFriendId,
  generateFriendId,
  registerPublicProfile,
  type FriendEntry,
  type PendingFriendRequest,
  type RoomInvitation,
  type SafePublicProfile,
  type FriendshipStatus,
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
  const [sentRequests, setSentRequests] = useState<PendingFriendRequest[]>([]);
  const [roomInvitations, setRoomInvitations] = useState<RoomInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignedFriendId, setAssignedFriendId] = useState<string | null>(profile?.friend_id || null);

  const currentUserId = user?.id || profile?.id || 'guest_user';
  const socialChannelRef = useRef<any>(null);
  const fidChannelRef = useRef<any>(null);
  const globalChannelRef = useRef<any>(null);

  // Sync / Ensure friend ID & auto-register public profile
  useEffect(() => {
    if (!currentUserId) return;
    const fid = profile?.friend_id || assignedFriendId || generateFriendId(currentUserId);
    setAssignedFriendId(fid);
    if (profile && !profile.friend_id) {
      profile.friend_id = fid;
    }

    void ensureFriendId(currentUserId, fid).then((confirmedFid) => {
      const activeFid = confirmedFid || fid;
      setAssignedFriendId(activeFid);
      if (profile) profile.friend_id = activeFid;

      // Auto-register in global cloud directory
      void registerPublicProfile({
        user_id: currentUserId,
        friend_id: activeFid,
        username: profile?.display_name || profile?.username || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Explorer',
        level: profile?.current_level || 1,
        xp: profile?.total_xp || 50,
        score: profile?.coins || 100,
        avatar_url: profile?.avatar_url || null,
        wins: profile?.bugs_solved || 0,
        pet_type: profile?.pet_type || 'fox',
        pet_name: profile?.pet_name || 'Companion',
        pet_stage: profile?.pet_stage || 'infant',
      });
    });
  }, [currentUserId, profile?.friend_id, profile?.display_name, profile?.current_level, profile?.total_xp]);

  // Load initial friends, incoming & outgoing requests
  const refreshFriends = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const [fList, inList, outList, invList] = await Promise.all([
        fetchFriendsList(),
        fetchPendingRequests(),
        fetchSentRequests(),
        fetchPendingRoomInvitations(),
      ]);
      setFriends(fList);
      setPendingRequests(inList);
      setSentRequests(outList);
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

  // Refreshes on window focus so switching tabs/windows updates instantly
  useEffect(() => {
    const handleFocus = () => {
      void refreshFriends();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshFriends]);

  // Subscribe to Realtime social updates with cleanup across user & friend ID channels
  useEffect(() => {
    if (!currentUserId) return;

    // 1. User ID channel
    const socialChannel = supabase
      .channel(`user-social:${currentUserId}`)
      .on('broadcast', { event: 'friend_request' }, () => void refreshFriends())
      .on('broadcast', { event: 'friend_request_accepted' }, () => void refreshFriends())
      .on('broadcast', { event: 'friend_removed' }, () => void refreshFriends())
      .on('broadcast', { event: 'friend_request_cancelled' }, () => void refreshFriends())
      .on('broadcast', { event: 'room_invitation' }, () => void refreshFriends())
      .subscribe();
    socialChannelRef.current = socialChannel;

    // 2. Friend ID channel
    const fid = assignedFriendId || profile?.friend_id;
    if (fid) {
      const fidChannel = supabase
        .channel(`user-social:${fid}`)
        .on('broadcast', { event: 'friend_request' }, () => void refreshFriends())
        .on('broadcast', { event: 'friend_request_accepted' }, () => void refreshFriends())
        .on('broadcast', { event: 'friend_removed' }, () => void refreshFriends())
        .on('broadcast', { event: 'friend_request_cancelled' }, () => void refreshFriends())
        .subscribe();
      fidChannelRef.current = fidChannel;
    }

    // 3. Global social channel
    const globalChannel = supabase
      .channel('petslyvia:social_global')
      .on('broadcast', { event: 'friend_request' }, (p: any) => {
        if (p?.payload?.to === currentUserId || (fid && p?.payload?.toFid === fid)) {
          void refreshFriends();
        }
      })
      .on('broadcast', { event: 'friend_request_accepted' }, (p: any) => {
        if (p?.payload?.to === currentUserId || (fid && p?.payload?.toFid === fid) || p?.payload?.from === currentUserId) {
          void refreshFriends();
        }
      })
      .on('broadcast', { event: 'friend_removed' }, () => void refreshFriends())
      .subscribe();
    globalChannelRef.current = globalChannel;

    // 4. Lobby arena channel
    const lobbyChan = supabase.channel('arena:lobby');
    lobbyChan.on('broadcast', { event: 'social_event' }, (payload: any) => {
      const p = payload?.payload;
      if (p?.to === currentUserId || p?.from === currentUserId || (fid && (p?.toFid === fid || p?.fromFid === fid))) {
        void refreshFriends();
      }
    });

    return () => {
      if (socialChannelRef.current) {
        supabase.removeChannel(socialChannelRef.current);
        socialChannelRef.current = null;
      }
      if (fidChannelRef.current) {
        supabase.removeChannel(fidChannelRef.current);
        fidChannelRef.current = null;
      }
      if (globalChannelRef.current) {
        supabase.removeChannel(globalChannelRef.current);
        globalChannelRef.current = null;
      }
      supabase.removeChannel(lobbyChan);
    };
  }, [currentUserId, assignedFriendId, profile?.friend_id, refreshFriends]);

  // Combine friends with live presence status
  const friendsWithPresence = useMemo<FriendWithPresence[]>(() => {
    const presenceMap = new Map<string, LobbyPresence>();
    for (const p of onlinePlayers) {
      if (p.userId) presenceMap.set(p.userId, p);
    }

    return friends.map((f) => {
      const p = presenceMap.get(f.user_id) || Array.from(presenceMap.values()).find((pm) => pm.friendId?.toUpperCase() === f.friend_id.toUpperCase());
      return {
        ...f,
        presence: p,
        isOnline: Boolean(p),
      };
    });
  }, [friends, onlinePlayers]);

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

  const cancelRequest = async (requestId: string) => {
    setError(null);
    const res = await apiCancelFriendRequest(requestId);
    if (!res.success) {
      setError(res.error || 'Failed to cancel request');
      return res;
    }
    await refreshFriends();
    return res;
  };

  const removeFriend = async (friendUserId: string) => {
    setError(null);
    const res = await apiRemoveFriend(friendUserId);
    if (!res.success) {
      setError(res.error || 'Failed to remove friend');
      return res;
    }
    await refreshFriends();
    return res;
  };

  const blockUser = async (targetUserId: string) => {
    setError(null);
    const res = await apiBlockUser(targetUserId);
    if (!res.success) {
      setError(res.error || 'Failed to block user');
      return res;
    }
    await refreshFriends();
    return res;
  };

  const unblockUser = async (targetUserId: string) => {
    setError(null);
    const res = await apiUnblockUser(targetUserId);
    if (!res.success) {
      setError(res.error || 'Failed to unblock user');
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

  const getFriendshipStatus = async (targetUserId: string): Promise<FriendshipStatus> => {
    return apiGetFriendshipStatus(targetUserId);
  };

  return {
    friends: friendsWithPresence,
    pendingRequests,
    sentRequests,
    roomInvitations,
    notificationCount,
    loading,
    error,
    myFriendId: profile?.friend_id || assignedFriendId || 'PVS-EXPLORER',
    refreshFriends,
    sendRequest,
    respondRequest,
    cancelRequest,
    removeFriend,
    blockUser,
    unblockUser,
    inviteToRoom,
    respondInvite,
    searchFriend,
    getFriendshipStatus,
  };
}
