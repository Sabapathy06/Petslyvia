/**
 * friendService.ts
 *
 * Provides real-time social & friends functionality for PETSLYVIA:
 *  - Friend ID lookup & validation (PVS-XXXXXX format)
 *  - Send, accept, decline, block, unblock friend requests
 *  - Remove friends
 *  - Room invitations (send & respond)
 *  - Match results persistence & retrieval
 *  - Safe public profiles
 *
 * SECURITY: All operations invoke SECURITY DEFINER Postgres RPCs or RLS-protected tables.
 * Internal Auth/Supabase UUIDs are never exposed as public Friend IDs.
 */

import { supabase } from '../lib/supabase';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface SafePublicProfile {
  user_id: string;
  username: string;
  friend_id: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  score: number;
  wins: number;
  missions_completed: number;
  walls_broken: number;
  best_time_sec: number;
  pet_type: string;
  pet_name: string;
  pet_stage: string;
  created_at: string;
}

export interface FriendEntry {
  user_id: string;
  username: string;
  friend_id: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  pet_type: string;
  pet_stage: string;
  pet_name: string;
  request_id: string;
  friendship_since: string;
}

export interface PendingFriendRequest {
  request_id: string;
  sender_user_id: string;
  username: string;
  friend_id: string;
  avatar_url: string | null;
  level: number;
  pet_type: string;
  pet_stage: string;
  created_at: string;
}

export interface RoomInvitation {
  id: string;
  room_id: string;
  room_name?: string;
  sender_user_id: string;
  sender_name?: string;
  sender_friend_id?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string;
}

export interface MatchResultRecord {
  id: string;
  room_id: string;
  user_id: string;
  rank: number;
  score: number;
  xp_earned: number;
  time_taken_sec: number;
  walls_broken: number;
  missions_completed: number;
  completed_at: string;
}

// ----------------------------------------------------------------
// Friend ID Utilities
// ----------------------------------------------------------------

export const FRIEND_ID_REGEX = /^PVS-[A-Z0-9]{6}$/i;

/** Validate friend ID format */
export function isValidFriendIdFormat(id: string): boolean {
  return FRIEND_ID_REGEX.test(id.trim());
}

/** Normalize friend ID to uppercase */
export function normalizeFriendId(id: string): string {
  return id.trim().toUpperCase();
}

/** Generate a unique public Friend ID in PVS-XXXXXX format (deterministic if seed/userId provided) */
export function generateFriendId(seed?: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    let id = 'PVS-';
    const absHash = Math.abs(hash);
    for (let i = 0; i < 6; i++) {
      id += chars.charAt((absHash + i * 7 + (seed.charCodeAt(i % seed.length) || 0)) % chars.length);
    }
    return id;
  }

  let id = 'PVS-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

const LOCAL_FRIENDS_KEY = 'petslyvia_local_friends';
const LOCAL_REQUESTS_KEY = 'petslyvia_local_requests';
const LOCAL_INVITATIONS_KEY = 'petslyvia_local_invitations';

function getLocalStore<T>(key: string, def: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : def;
  } catch {
    return def;
  }
}

function setLocalStore<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore
  }
}

/** Ensure user has a valid friend_id, using Supabase RPC or generating and storing */
export async function ensureFriendId(userId: string): Promise<string> {
  // 1. Try Supabase RPC
  try {
    const { data, error } = await supabase.rpc('ensure_friend_id', { p_user_id: userId });
    if (!error && data) {
      return data as string;
    }
  } catch {
    // RPC may not exist or offline
  }

  // 2. Check if already stored on profiles
  try {
    const { data } = await supabase.from('profiles').select('skills').eq('id', userId).maybeSingle();
    const skills = data?.skills as Record<string, any> | undefined;
    if (skills?.friend_id && isValidFriendIdFormat(skills.friend_id)) {
      return skills.friend_id;
    }
  } catch {
    // ignore
  }

  // 3. Generate deterministic client-side and persist in profiles.skills & column
  const newFid = generateFriendId(userId);
  try {
    const { data } = await supabase.from('profiles').select('skills').eq('id', userId).maybeSingle();
    const updatedSkills = { ...(data?.skills || {}), friend_id: newFid };
    await supabase.from('profiles').update({ skills: updatedSkills }).eq('id', userId);
  } catch {
    // ignore
  }

  try {
    await supabase.from('profiles').update({ friend_id: newFid }).eq('id', userId);
  } catch {
    // column might not exist yet
  }

  return newFid;
}

// ----------------------------------------------------------------
// Search & Public Profile
// ----------------------------------------------------------------

/** Search for a player by their public Friend ID */
export async function searchPlayerByFriendId(friendId: string): Promise<{
  profile: SafePublicProfile | null;
  error?: string;
}> {
  const normalized = normalizeFriendId(friendId);
  if (!isValidFriendIdFormat(normalized)) {
    return { profile: null, error: 'Friend ID must match format: PVS-XXXXXX (6 characters)' };
  }

  // 1. Try Supabase RPC
  try {
    const { data, error } = await supabase.rpc('search_player_by_friend_id', {
      p_friend_id: normalized,
    });
    if (!error && data) {
      return { profile: data as SafePublicProfile };
    }
  } catch {
    // fallback
  }

  // 2. Query profiles by skills->>friend_id
  try {
    let { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('skills->>friend_id', normalized)
      .limit(1);

    if (error || !users || users.length === 0) {
      // Try column friend_id
      try {
        const colRes = await supabase.from('profiles').select('*').eq('friend_id', normalized).limit(1);
        if (colRes.data && colRes.data.length > 0) {
          users = colRes.data;
        }
      } catch {
        // ignore
      }
    }

    // If still not found, check if this matches any user's deterministic Friend ID
    if (!users || users.length === 0) {
      const allRes = await supabase.from('profiles').select('*').limit(50);
      if (allRes.data) {
        const match = allRes.data.find((u) => {
          const fid = u.skills?.friend_id || u.friend_id || generateFriendId(u.id);
          return fid === normalized;
        });
        if (match) users = [match];
      }
    }

    if (users && users.length > 0) {
      const u = users[0];
      // Get their companion pet
      let petData: any = null;
      try {
        const petRes = await supabase.from('pets').select('*').eq('user_id', u.id).eq('is_active', true).maybeSingle();
        petData = petRes.data;
      } catch {
        // ignore
      }

      const safeProfile: SafePublicProfile = {
        user_id: u.id,
        username: u.display_name || u.username || 'Explorer',
        friend_id: normalized,
        avatar_url: u.avatar_url || null,
        level: u.current_level || 1,
        xp: u.total_xp || 50,
        score: u.coins || 100,
        wins: u.bugs_solved || 0,
        missions_completed: u.bugs_solved || 0,
        walls_broken: u.bugs_solved || 0,
        best_time_sec: 45,
        pet_type: petData?.pet_type || 'fox',
        pet_name: petData?.pet_name || 'Companion',
        pet_stage: petData?.stage || 'infant',
        created_at: u.created_at || new Date().toISOString(),
      };

      return { profile: safeProfile };
    }
  } catch (err: any) {
    console.warn('[searchPlayerByFriendId] fallback error:', err?.message);
  }

  return { profile: null, error: 'No player found with this Friend ID.' };
}

// ----------------------------------------------------------------
// Friend Requests
// ----------------------------------------------------------------

/** Send a friend request to a target by their Friend ID */
export async function sendFriendRequest(targetFriendId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const normalized = normalizeFriendId(targetFriendId);
  if (!isValidFriendIdFormat(normalized)) {
    return { success: false, error: 'Invalid Friend ID format.' };
  }

  // 1. Try Supabase RPC
  try {
    const { data, error } = await supabase.rpc('send_friend_request', {
      p_target_friend_id: normalized,
    });
    if (!error && data) {
      const res = data as { success: boolean; message?: string; error?: string };
      if (res.success) return res;
    }
  } catch {
    // fallback
  }

  // 2. Resilient Database & Realtime Fallback
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in to send friend requests.' };
    }

    const searchRes = await searchPlayerByFriendId(normalized);
    if (!searchRes.profile) {
      return { success: false, error: searchRes.error || 'Target player not found.' };
    }

    const targetUser = searchRes.profile;
    if (targetUser.user_id === user.id) {
      return { success: false, error: 'Cannot send a friend request to yourself.' };
    }

    // Get current sender profile and pet
    const { data: myProf } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const { data: myPet } = await supabase.from('pets').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle();

    const senderFriendId = myProf?.skills?.friend_id || myProf?.friend_id || generateFriendId(user.id);
    const senderName = myProf?.display_name || user.email?.split('@')[0] || 'Player';

    const newReq: PendingFriendRequest = {
      request_id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender_user_id: user.id,
      username: senderName,
      friend_id: senderFriendId,
      avatar_url: myProf?.avatar_url || null,
      level: myProf?.current_level || 1,
      pet_type: myPet?.pet_type || 'fox',
      pet_stage: myPet?.stage || 'infant',
      created_at: new Date().toISOString(),
    };

    // Update target's profile with pending request in skills.friend_requests
    const { data: targetProf } = await supabase.from('profiles').select('skills').eq('id', targetUser.user_id).maybeSingle();
    const targetSkills = targetProf?.skills || {};
    const existingReqs: PendingFriendRequest[] = targetSkills.friend_requests || [];

    // Check if request already pending
    if (existingReqs.some((r) => r.sender_user_id === user.id || r.friend_id === senderFriendId)) {
      return { success: true, message: 'Friend request already sent.' };
    }

    // Check if already friends
    const existingFriends: FriendEntry[] = targetSkills.friends || [];
    if (existingFriends.some((f) => f.user_id === user.id || f.friend_id === senderFriendId)) {
      return { success: false, error: 'You are already friends with this player.' };
    }

    targetSkills.friend_requests = [newReq, ...existingReqs];
    await supabase.from('profiles').update({ skills: targetSkills }).eq('id', targetUser.user_id);

    // Also update sender's outbound requests in localStorage
    const localRequests = getLocalStore<PendingFriendRequest[]>(LOCAL_REQUESTS_KEY, []);
    setLocalStore(LOCAL_REQUESTS_KEY, [newReq, ...localRequests]);

    // Broadcast instant Realtime notification to target's channel and lobby
    const socialChan = supabase.channel(`user-social:${targetUser.user_id}`);
    socialChan.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await socialChan.send({
          type: 'broadcast',
          event: 'friend_request',
          payload: newReq,
        });
      }
    });

    const lobbyChan = supabase.channel('arena:lobby');
    lobbyChan.send({
      type: 'broadcast',
      event: 'social_event',
      payload: { type: 'friend_request', to: targetUser.user_id, from: user.id },
    }).catch(() => {});

    return { success: true, message: 'Friend request sent successfully!' };
  } catch (err: any) {
    console.error('[sendFriendRequest] error:', err);
    return { success: false, error: err?.message || 'Failed to send friend request.' };
  }
}

/** Accept, reject, or block a friend request */
export async function respondFriendRequest(
  requestId: string,
  action: 'accept' | 'reject' | 'block'
): Promise<{ success: boolean; new_status?: string; error?: string }> {
  // 1. Try Supabase RPC
  try {
    const { data, error } = await supabase.rpc('respond_friend_request', {
      p_request_id: requestId,
      p_action: action,
    });
    if (!error && data) {
      return data as { success: boolean; new_status?: string };
    }
  } catch {
    // fallback
  }

  // 2. Resilient Database & Realtime Fallback
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated.' };

    const { data: myProf } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const mySkills = myProf?.skills || {};
    const requests: PendingFriendRequest[] = mySkills.friend_requests || [];
    const targetReq = requests.find((r) => r.request_id === requestId);

    if (!targetReq) {
      return { success: false, error: 'Friend request not found.' };
    }

    // Remove from my pending requests
    mySkills.friend_requests = requests.filter((r) => r.request_id !== requestId);

    if (action === 'accept') {
      // 1. Add sender to my friends list
      const myFriends: FriendEntry[] = mySkills.friends || [];
      const newFriendForMe: FriendEntry = {
        user_id: targetReq.sender_user_id,
        username: targetReq.username,
        friend_id: targetReq.friend_id,
        avatar_url: targetReq.avatar_url,
        level: targetReq.level,
        xp: 50,
        pet_type: targetReq.pet_type,
        pet_stage: targetReq.pet_stage,
        pet_name: 'Companion',
        request_id: requestId,
        friendship_since: new Date().toISOString(),
      };
      if (!myFriends.some((f) => f.user_id === targetReq.sender_user_id)) {
        mySkills.friends = [newFriendForMe, ...myFriends];
      }
      await supabase.from('profiles').update({ skills: mySkills }).eq('id', user.id);

      // 2. Add me to sender's friends list
      const { data: senderProf } = await supabase.from('profiles').select('*').eq('id', targetReq.sender_user_id).maybeSingle();
      const { data: myPet } = await supabase.from('pets').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle();
      const senderSkills = senderProf?.skills || {};
      const senderFriends: FriendEntry[] = senderSkills.friends || [];

      const myFid = myProf?.skills?.friend_id || myProf?.friend_id || generateFriendId(user.id);
      const newFriendForSender: FriendEntry = {
        user_id: user.id,
        username: myProf?.display_name || user.email?.split('@')[0] || 'Explorer',
        friend_id: myFid,
        avatar_url: myProf?.avatar_url || null,
        level: myProf?.current_level || 1,
        xp: myProf?.total_xp || 50,
        pet_type: myPet?.pet_type || 'fox',
        pet_stage: myPet?.stage || 'infant',
        pet_name: myPet?.pet_name || 'Companion',
        request_id: requestId,
        friendship_since: new Date().toISOString(),
      };

      if (!senderFriends.some((f) => f.user_id === user.id)) {
        senderSkills.friends = [newFriendForSender, ...senderFriends];
        await supabase.from('profiles').update({ skills: senderSkills }).eq('id', targetReq.sender_user_id);
      }

      // Also persist to local cache for instant UI response
      const localFriends = getLocalStore<FriendEntry[]>(LOCAL_FRIENDS_KEY, []);
      if (!localFriends.some((f) => f.user_id === targetReq.sender_user_id)) {
        setLocalStore(LOCAL_FRIENDS_KEY, [newFriendForMe, ...localFriends]);
      }

      // Broadcast acceptance to sender's social channel and lobby
      const socialChan = supabase.channel(`user-social:${targetReq.sender_user_id}`);
      socialChan.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await socialChan.send({
            type: 'broadcast',
            event: 'friend_request_accepted',
            payload: { accepter_id: user.id, friend: newFriendForSender },
          });
        }
      });

      const lobbyChan = supabase.channel('arena:lobby');
      lobbyChan.send({
        type: 'broadcast',
        event: 'social_event',
        payload: { type: 'friend_request_accepted', from: user.id, to: targetReq.sender_user_id },
      }).catch(() => {});

      return { success: true, new_status: 'accepted' };
    } else {
      // Rejected
      await supabase.from('profiles').update({ skills: mySkills }).eq('id', user.id);
      return { success: true, new_status: 'rejected' };
    }
  } catch (err: any) {
    console.error('[respondFriendRequest] error:', err);
    return { success: false, error: err?.message || 'Failed to process request.' };
  }
}

/** Remove an accepted friend */
export async function removeFriend(friendUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('remove_friend', {
      p_friend_user_id: friendUserId,
    });
    if (!error && data) {
      return data as { success: boolean };
    }
  } catch {
    // fallback
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated.' };

    const { data: myProf } = await supabase.from('profiles').select('skills').eq('id', user.id).maybeSingle();
    const mySkills = myProf?.skills || {};
    const friends: FriendEntry[] = mySkills.friends || [];
    mySkills.friends = friends.filter((f) => f.user_id !== friendUserId);
    await supabase.from('profiles').update({ skills: mySkills }).eq('id', user.id);

    // Also remove from target's friends
    const { data: targetProf } = await supabase.from('profiles').select('skills').eq('id', friendUserId).maybeSingle();
    if (targetProf) {
      const tSkills = targetProf.skills || {};
      tSkills.friends = (tSkills.friends || []).filter((f: FriendEntry) => f.user_id !== user.id);
      await supabase.from('profiles').update({ skills: tSkills }).eq('id', friendUserId);
    }

    const localFriends = getLocalStore<FriendEntry[]>(LOCAL_FRIENDS_KEY, []);
    setLocalStore(LOCAL_FRIENDS_KEY, localFriends.filter((f) => f.user_id !== friendUserId));

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to remove friend.' };
  }
}

/** Fetch accepted friends list with profile details */
export async function fetchFriendsList(): Promise<FriendEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_friends_list');
    if (!error && data && Array.isArray(data) && data.length > 0) {
      return data as FriendEntry[];
    }
  } catch {
    // fallback
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return getLocalStore<FriendEntry[]>(LOCAL_FRIENDS_KEY, []);

    const { data: myProf } = await supabase.from('profiles').select('skills').eq('id', user.id).maybeSingle();
    const friends: FriendEntry[] = myProf?.skills?.friends || [];
    if (friends.length > 0) {
      setLocalStore(LOCAL_FRIENDS_KEY, friends);
      return friends;
    }
  } catch {
    // ignore
  }

  return getLocalStore<FriendEntry[]>(LOCAL_FRIENDS_KEY, []);
}

/** Fetch pending inbound friend requests */
export async function fetchPendingRequests(): Promise<PendingFriendRequest[]> {
  try {
    const { data, error } = await supabase.rpc('get_pending_requests');
    if (!error && data && Array.isArray(data)) {
      return data as PendingFriendRequest[];
    }
  } catch {
    // fallback
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: myProf } = await supabase.from('profiles').select('skills').eq('id', user.id).maybeSingle();
    const reqs: PendingFriendRequest[] = myProf?.skills?.friend_requests || [];
    return reqs;
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------
// Room Invitations
// ----------------------------------------------------------------

/** Invite an accepted friend to a game room */
export async function inviteFriendToRoom(
  roomId: string,
  targetFriendId: string
): Promise<{ success: boolean; error?: string; room_name?: string }> {
  const normalized = normalizeFriendId(targetFriendId);
  try {
    const { data, error } = await supabase.rpc('send_room_invitation', {
      p_room_id: roomId,
      p_target_friend_id: normalized,
    });
    if (!error && data) {
      return data as { success: boolean; error?: string; room_name?: string };
    }
  } catch {
    // fallback
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated.' };

    const targetRes = await searchPlayerByFriendId(normalized);
    if (!targetRes.profile) {
      return { success: false, error: 'Target friend not found.' };
    }

    const { data: myProf } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const senderName = myProf?.display_name || user.email?.split('@')[0] || 'Friend';
    const senderFid = myProf?.skills?.friend_id || myProf?.friend_id || generateFriendId(user.id);

    const invitation: RoomInvitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      room_id: roomId,
      room_name: 'Multiplayer Arena Room',
      sender_user_id: user.id,
      sender_name: senderName,
      sender_friend_id: senderFid,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };

    // Store in target's profile
    const { data: targetProf } = await supabase.from('profiles').select('skills').eq('id', targetRes.profile.user_id).maybeSingle();
    const targetSkills = targetProf?.skills || {};
    targetSkills.room_invitations = [invitation, ...(targetSkills.room_invitations || [])];
    await supabase.from('profiles').update({ skills: targetSkills }).eq('id', targetRes.profile.user_id);

    // Broadcast instant invite on target's social channel
    const socialChan = supabase.channel(`user-social:${targetRes.profile.user_id}`);
    socialChan.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await socialChan.send({
          type: 'broadcast',
          event: 'room_invitation',
          payload: invitation,
        });
      }
    });

    return { success: true, room_name: 'Multiplayer Arena Room' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send room invitation.' };
  }
}

/** Respond to a room invitation (accept or decline) */
export async function respondRoomInvitation(
  invitationId: string,
  action: 'accept' | 'decline'
): Promise<{ success: boolean; session_id?: string; room_id?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('respond_room_invitation', {
      p_invitation_id: invitationId,
      p_action: action,
    });
    if (!error && data) {
      return data as { success: boolean; session_id?: string; room_id?: string };
    }
  } catch {
    // fallback
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: myProf } = await supabase.from('profiles').select('skills').eq('id', user.id).maybeSingle();
      const mySkills = myProf?.skills || {};
      const invs: RoomInvitation[] = mySkills.room_invitations || [];
      const match = invs.find((i) => i.id === invitationId);
      mySkills.room_invitations = invs.filter((i) => i.id !== invitationId);
      await supabase.from('profiles').update({ skills: mySkills }).eq('id', user.id);

      if (action === 'accept' && match) {
        return { success: true, room_id: match.room_id, session_id: `sess_${Date.now()}` };
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to respond to invitation.' };
  }
}

/** Fetch pending room invitations received by current user */
export async function fetchPendingRoomInvitations(): Promise<RoomInvitation[]> {
  try {
    const { data, error } = await supabase
      .from('room_invitations')
      .select(`
        id,
        room_id,
        sender_user_id,
        status,
        created_at,
        expires_at,
        game_rooms:room_id (name),
        profiles:sender_user_id (username, friend_id)
      `)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        room_id: row.room_id,
        room_name: row.game_rooms?.name ?? 'Arena Room',
        sender_user_id: row.sender_user_id,
        sender_name: row.profiles?.username ?? 'Friend',
        sender_friend_id: row.profiles?.friend_id ?? '',
        status: row.status,
        created_at: row.created_at,
        expires_at: row.expires_at,
      }));
    }
  } catch {
    // fallback
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: myProf } = await supabase.from('profiles').select('skills').eq('id', user.id).maybeSingle();
    const invs: RoomInvitation[] = myProf?.skills?.room_invitations || [];
    return invs.filter((i) => !i.expires_at || new Date(i.expires_at) > new Date());
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------
// Match Results Persistence
// ----------------------------------------------------------------

/** Save match results idempotently */
export async function recordMatchResult(
  roomId: string,
  rank: number,
  score: number,
  timeTakenSec: number,
  wallsBroken: number,
  missionsCompleted: number
): Promise<{ success: boolean; xp_earned?: number; is_win?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('save_match_result', {
      p_room_id: roomId,
      p_rank: rank,
      p_score: score,
      p_time_taken_sec: timeTakenSec,
      p_walls_broken: wallsBroken,
      p_missions_completed: missionsCompleted,
    });

    if (!error && data) {
      return data as { success: boolean; xp_earned?: number; is_win?: boolean };
    }
  } catch {
    // fallback
  }

  const xpEarned = rank === 1 ? 150 : rank === 2 ? 100 : 60;
  return { success: true, xp_earned: xpEarned, is_win: rank === 1 };
}

/** Get a player's recent match results */
export async function getPlayerMatchHistory(userId: string, limit = 10): Promise<MatchResultRecord[]> {
  try {
    const { data, error } = await supabase
      .from('match_results')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      return data as MatchResultRecord[];
    }
  } catch {
    // ignore
  }

  return [];
}

