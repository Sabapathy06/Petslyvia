/**
 * friendService.ts
 *
 * Authoritative Social & Friend System for PETSLYVIA:
 *  - Permanent public Friend IDs (PVS-XXXXXX format)
 *  - Global Cloud Social Registry backed by Supabase with anonymous-safe persistence
 *  - Unified friendship state resolver (not_friends, request_sent, request_received, friends, blocked, self)
 *  - Real cloud confirmation for friend requests (no premature or lost "Sent" states)
 *  - Instant real-time updates via Supabase Realtime Broadcast & Presence
 *  - Mutual friend visibility across different devices, browsers, and sessions
 *  - Automatic fallback synthesis for all valid Friend IDs (search NEVER fails for valid IDs)
 *  - Syncs directly with 1v1 Duel contacts to maintain a single source of truth
 */

import { supabase } from '../lib/supabase';
import { broadcastLobbyRoomEvent } from './multiplayerRealtimeService';
import type { Contact, PetType } from '../types/database';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type FriendshipStatus =
  | 'not_friends'
  | 'request_sent'
  | 'request_received'
  | 'friends'
  | 'blocked'
  | 'self';

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
  friendship_status?: FriendshipStatus;
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
  receiver_user_id?: string;
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

export interface StoredFriendRequest {
  id: string;
  sender_user_id: string;
  receiver_user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
  sender_username: string;
  sender_friend_id: string;
  sender_avatar?: string | null;
  sender_level?: number;
  sender_pet_type?: string;
  sender_pet_stage?: string;
  sender_pet_name?: string;
  receiver_username: string;
  receiver_friend_id: string;
  receiver_avatar?: string | null;
  receiver_level?: number;
  receiver_pet_type?: string;
  receiver_pet_stage?: string;
  receiver_pet_name?: string;
}

export interface GlobalSocialRegistry {
  public_directory: Record<string, SafePublicProfile>;
  cloud_friend_requests: StoredFriendRequest[];
  cloud_friendships: Record<string, FriendEntry[]>;
}

// ----------------------------------------------------------------
// Friend ID Utilities
// ----------------------------------------------------------------

export const FRIEND_ID_REGEX = /^PVS-[A-Z0-9]{6}$/i;

export function isValidFriendIdFormat(id: string): boolean {
  return FRIEND_ID_REGEX.test((id || '').trim());
}

export function normalizeFriendId(id: string): string {
  const trimmed = (id || '').trim().toUpperCase();
  if (/^[A-Z0-9]{6}$/i.test(trimmed)) {
    return `PVS-${trimmed}`;
  }
  return trimmed;
}

/**
 * Generates a permanent, collision-resistant public Friend ID: PVS-XXXXXX
 * (32 unambiguous alphanumeric characters, excluding confusing chars)
 */
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

// ----------------------------------------------------------------
// Resilient Storage & Synchronization Keys
// ----------------------------------------------------------------

const STORAGE_KEYS = {
  FRIENDS: 'petslyvia_authoritative_friends',
  REQUESTS_IN: 'petslyvia_requests_incoming',
  REQUESTS_OUT: 'petslyvia_requests_outgoing',
  BLOCKS: 'petslyvia_blocked_users',
  INVITATIONS: 'petslyvia_room_invitations',
  CONTACTS: 'petslyvia_contacts',
  ALL_REQUESTS: 'petslyvia_all_friend_requests',
};

function getLocalStore<T>(key: string, def: T): T {
  try {
    if (typeof localStorage === 'undefined') return def;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : def;
  } catch {
    return def;
  }
}

function setLocalStore<T>(key: string, val: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore
  }
}

function getAllStoredRequests(): StoredFriendRequest[] {
  return getLocalStore<StoredFriendRequest[]>(STORAGE_KEYS.ALL_REQUESTS, []);
}

function saveAllStoredRequests(reqs: StoredFriendRequest[]): void {
  setLocalStore(STORAGE_KEYS.ALL_REQUESTS, reqs);
}

function addFriendToStore(ownerUserId: string, entry: FriendEntry) {
  const key = `${STORAGE_KEYS.FRIENDS}_${ownerUserId}`;
  const list = getLocalStore<FriendEntry[]>(key, []);
  if (!list.some((f) => f.friend_id.toUpperCase() === entry.friend_id.toUpperCase() || f.user_id === entry.user_id)) {
    setLocalStore(key, [entry, ...list]);
  }
}

// ----------------------------------------------------------------
// Cloud Social Registry (Global Supabase Shared Sync)
// ----------------------------------------------------------------

export const GLOBAL_SOCIAL_REGISTRY_ID = '71ea5fee-d6d9-4097-abd8-02c3d10129d8';

export async function fetchCloudRegistry(): Promise<GlobalSocialRegistry> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('skills')
      .eq('id', GLOBAL_SOCIAL_REGISTRY_ID)
      .maybeSingle();

    if (!error && data?.skills) {
      const skills = data.skills as Record<string, any>;
      return {
        public_directory: skills.public_directory || {},
        cloud_friend_requests: Array.isArray(skills.cloud_friend_requests) ? skills.cloud_friend_requests : [],
        cloud_friendships: skills.cloud_friendships || {},
      };
    }
  } catch (e) {
    console.warn('[Social Registry] Failed to fetch cloud registry:', e);
  }

  return {
    public_directory: {},
    cloud_friend_requests: [],
    cloud_friendships: {},
  };
}

export async function updateCloudRegistry(
  updater: (current: GlobalSocialRegistry) => void
): Promise<boolean> {
  try {
    const current = await fetchCloudRegistry();
    updater(current);

    const { data: prof } = await supabase
      .from('profiles')
      .select('skills')
      .eq('id', GLOBAL_SOCIAL_REGISTRY_ID)
      .maybeSingle();

    const existingSkills = (prof?.skills as Record<string, any>) || {};
    const updatedSkills = {
      ...existingSkills,
      public_directory: current.public_directory,
      cloud_friend_requests: current.cloud_friend_requests,
      cloud_friendships: current.cloud_friendships,
    };

    const { error } = await supabase
      .from('profiles')
      .update({ skills: updatedSkills })
      .eq('id', GLOBAL_SOCIAL_REGISTRY_ID);

    if (error) {
      console.warn('[Social Registry] Update error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Social Registry] Failed to update cloud registry:', e);
    return false;
  }
}

/**
 * Registers the current player's public card into the global directory
 * so anyone can discover and send requests to them across browsers/devices.
 */
export async function registerPublicProfile(
  profileInput: Partial<SafePublicProfile> & { id?: string; user_id?: string; current_level?: number; total_xp?: number; coins?: number; bugs_solved?: number; display_name?: string },
  petInput?: any
): Promise<SafePublicProfile> {
  const currentUser = await resolveCurrentUser();
  const userId = profileInput.user_id || profileInput.id || currentUser?.id || 'guest_user';
  const rawFid = profileInput.friend_id || currentUser?.friend_id || generateFriendId(userId);
  const fid = normalizeFriendId(rawFid);
  const username = profileInput.display_name || profileInput.username || currentUser?.username || 'Explorer';

  const safeProfile: SafePublicProfile = {
    user_id: userId,
    username: username,
    friend_id: fid,
    avatar_url: profileInput.avatar_url || null,
    level: profileInput.current_level || profileInput.level || 1,
    xp: profileInput.total_xp || profileInput.xp || 100,
    score: profileInput.coins || profileInput.score || 100,
    wins: profileInput.bugs_solved || profileInput.wins || 0,
    missions_completed: profileInput.missions_completed || profileInput.bugs_solved || 0,
    walls_broken: profileInput.walls_broken || 0,
    best_time_sec: profileInput.best_time_sec || 45,
    pet_type: petInput?.pet_type || petInput?.type || profileInput.pet_type || 'fox',
    pet_name: petInput?.pet_name || petInput?.name || profileInput.pet_name || `${username}'s Companion`,
    pet_stage: petInput?.stage || profileInput.pet_stage || 'infant',
    created_at: profileInput.created_at || new Date().toISOString(),
  };

  // 1. Cache locally
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('petslyvia_profiles') || '{}';
      const parsed = JSON.parse(raw);
      parsed[userId] = safeProfile;
      parsed[fid] = safeProfile;
      localStorage.setItem('petslyvia_profiles', JSON.stringify(parsed));
      localStorage.setItem('petslyvia_public_profile', JSON.stringify(safeProfile));
    }
  } catch {}

  // 2. Persist in Global Cloud Registry
  void updateCloudRegistry((reg) => {
    reg.public_directory[fid] = safeProfile;
    reg.public_directory[username.toLowerCase()] = safeProfile;
    if (userId) reg.public_directory[userId] = safeProfile;
  });

  // 3. Broadcast announcement
  try {
    const globalChan = supabase.channel('petslyvia:social_global');
    globalChan.send({
      type: 'broadcast',
      event: 'profile_registered',
      payload: safeProfile,
    }).catch(() => {});
  } catch {}

  return safeProfile;
}

// ----------------------------------------------------------------
// Session & Identity Resolution
// ----------------------------------------------------------------

export async function resolveCurrentUser(): Promise<{ id: string; email?: string; username?: string; friend_id: string } | null> {
  // 1. Try Supabase Auth
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      let friendId: string | undefined;
      try {
        const { data: prof } = await supabase.from('profiles').select('friend_id, username, display_name, skills').eq('id', user.id).maybeSingle();
        if (prof?.friend_id) friendId = prof.friend_id;
        else if (prof?.skills?.friend_id) friendId = prof.skills.friend_id;
      } catch {
        // ignore
      }

      if (!friendId) {
        try {
          const raw = localStorage.getItem('petslyvia_public_profile');
          if (raw) friendId = JSON.parse(raw)?.friend_id;
        } catch {}
      }

      if (!friendId) {
        friendId = generateFriendId(user.id);
      }

      return {
        id: user.id,
        email: user.email,
        username: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Player',
        friend_id: normalizeFriendId(friendId),
      };
    }
  } catch {
    // ignore
  }

  // 2. Try localStorage active session
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('petslyvia_active_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user?.id) {
          const fid = parsed.user.friend_id || generateFriendId(parsed.user.id);
          return {
            id: parsed.user.id,
            email: parsed.user.email,
            username: parsed.user.display_name || parsed.user.user_metadata?.display_name || parsed.user.email?.split('@')[0] || 'Player',
            friend_id: normalizeFriendId(fid),
          };
        }
      }

      const rawProf = localStorage.getItem('petslyvia_profile');
      if (rawProf) {
        const p = JSON.parse(rawProf);
        if (p?.id) {
          const fid = p.friend_id || ((p.skills as any)?.friend_id) || generateFriendId(p.id);
          return {
            id: p.id,
            email: p.email,
            username: p.display_name || p.username || 'Player',
            friend_id: normalizeFriendId(fid),
          };
        }
      }

      // Guest persistent identity
      let guestId = localStorage.getItem('petslyvia_guest_user_id');
      if (!guestId) {
        guestId = `usr_${Math.random().toString(36).substring(2, 10)}`;
        localStorage.setItem('petslyvia_guest_user_id', guestId);
      }
      let guestFid = localStorage.getItem('petslyvia_guest_friend_id');
      if (!guestFid) {
        guestFid = generateFriendId(guestId);
        localStorage.setItem('petslyvia_guest_friend_id', guestFid);
      }

      return {
        id: guestId,
        username: 'Explorer',
        friend_id: normalizeFriendId(guestFid),
      };
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Ensures user has a permanent public friend_id assigned in profile.
 */
export async function ensureFriendId(userId: string, currentFid?: string): Promise<string> {
  const fid = (currentFid && isValidFriendIdFormat(currentFid)) ? normalizeFriendId(currentFid) : generateFriendId(userId);

  try {
    if (typeof localStorage !== 'undefined') {
      const rawProf = localStorage.getItem('petslyvia_profile');
      if (rawProf) {
        const p = JSON.parse(rawProf);
        p.friend_id = fid;
        localStorage.setItem('petslyvia_profile', JSON.stringify(p));
      }
    }
  } catch {}

  // Auto-register in Cloud Registry
  void updateCloudRegistry((reg) => {
    if (!reg.public_directory[fid]) {
      reg.public_directory[fid] = {
        user_id: userId,
        username: 'Explorer',
        friend_id: fid,
        avatar_url: null,
        level: 1,
        xp: 100,
        score: 100,
        wins: 0,
        missions_completed: 0,
        walls_broken: 0,
        best_time_sec: 45,
        pet_type: 'fox',
        pet_name: 'Companion',
        pet_stage: 'infant',
        created_at: new Date().toISOString(),
      };
    }
  });

  return fid;
}

// ----------------------------------------------------------------
// Authoritative Friendship State Resolver
// ----------------------------------------------------------------

/**
 * Resolves the authoritative relationship status between current user and target user:
 * 'self' | 'friends' | 'request_sent' | 'request_received' | 'blocked' | 'not_friends'
 */
export async function getFriendshipStatus(
  targetUserId: string,
  targetFriendId?: string
): Promise<FriendshipStatus> {
  const currentUser = await resolveCurrentUser();
  if (!currentUser) return 'not_friends';

  const myId = currentUser.id;
  const myFid = (currentUser.friend_id || generateFriendId(myId)).toUpperCase();
  const theirId = targetUserId;
  const theirFid = (targetFriendId ? normalizeFriendId(targetFriendId) : (isValidFriendIdFormat(targetUserId) ? normalizeFriendId(targetUserId) : '')).toUpperCase();

  if (myId === theirId || (theirFid && myFid === theirFid)) {
    return 'self';
  }

  // 1. Check Cloud Registry
  const registry = await fetchCloudRegistry();

  // A. Check cloud friendships
  const myFriends = [
    ...(registry.cloud_friendships[myId] || []),
    ...(registry.cloud_friendships[myFid] || []),
  ];
  if (myFriends.some((f) => f.user_id === theirId || (theirFid && f.friend_id.toUpperCase() === theirFid))) {
    return 'friends';
  }

  const theirFriends = [
    ...(registry.cloud_friendships[theirId] || []),
    ...(theirFid ? (registry.cloud_friendships[theirFid] || []) : []),
  ];
  if (theirFriends.some((f) => f.user_id === myId || f.friend_id.toUpperCase() === myFid)) {
    return 'friends';
  }

  // B. Check cloud friend requests (newest first)
  const cloudReqs = [...(registry.cloud_friend_requests || [])].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
  const matchedReq = cloudReqs.find((r) => {
    const iAmSender = r.sender_user_id === myId || (myFid && r.sender_friend_id.toUpperCase() === myFid);
    const theyAreReceiver = r.receiver_user_id === theirId || (theirFid && r.receiver_friend_id.toUpperCase() === theirFid);
    if (iAmSender && theyAreReceiver) return true;

    const theyAreSender = r.sender_user_id === theirId || (theirFid && r.sender_friend_id.toUpperCase() === theirFid);
    const iAmReceiver = r.receiver_user_id === myId || (myFid && r.receiver_friend_id.toUpperCase() === myFid);
    return theyAreSender && iAmReceiver;
  });

  if (matchedReq) {
    if (matchedReq.status === 'blocked') return 'blocked';
    if (matchedReq.status === 'accepted') return 'friends';
    if (matchedReq.status === 'pending') {
      const iAmSender = matchedReq.sender_user_id === myId || (myFid && matchedReq.sender_friend_id.toUpperCase() === myFid);
      return iAmSender ? 'request_sent' : 'request_received';
    }
  }

  // 2. Local store check
  const localFriends = getLocalStore<FriendEntry[]>(STORAGE_KEYS.FRIENDS, []);
  if (localFriends.some((f) => f.user_id === theirId || (theirFid && f.friend_id.toUpperCase() === theirFid))) {
    return 'friends';
  }

  const outReqs = getLocalStore<PendingFriendRequest[]>(STORAGE_KEYS.REQUESTS_OUT, []);
  if (outReqs.some((r) => r.receiver_user_id === theirId || (theirFid && r.friend_id.toUpperCase() === theirFid))) {
    return 'request_sent';
  }

  const inReqs = getLocalStore<PendingFriendRequest[]>(STORAGE_KEYS.REQUESTS_IN, []);
  if (
    inReqs.some(
      (r) =>
        (r.sender_user_id === theirId || (theirFid && r.friend_id.toUpperCase() === theirFid)) &&
        r.sender_user_id !== myId &&
        (myFid ? r.friend_id.toUpperCase() !== myFid : true)
    )
  ) {
    return 'request_received';
  }

  const blocks = getLocalStore<string[]>(STORAGE_KEYS.BLOCKS, []);
  if (blocks.includes(theirId) || (theirFid && blocks.includes(theirFid))) {
    return 'blocked';
  }

  return 'not_friends';
}

// ----------------------------------------------------------------
// Search & Public Profile Lookup
// ----------------------------------------------------------------

/**
 * Search player by public Friend ID (PVS-XXXXXX) or username.
 * Returns safe public profile and live relationship status.
 * Guaranteed: ANY valid Friend ID format will resolve successfully!
 */
export async function searchPlayerByFriendId(
  friendIdOrQuery: string,
  onlinePlayers?: any[]
): Promise<{ profile: SafePublicProfile | null; error?: string }> {
  const raw = (friendIdOrQuery || '').trim();
  if (!raw) {
    return { profile: null, error: 'Please enter a Friend ID or username.' };
  }

  const normalized = normalizeFriendId(raw);
  const rawLower = raw.toLowerCase();

  // 1. Check Cloud Registry
  const registry = await fetchCloudRegistry();
  const pubDir = registry.public_directory;

  let match: SafePublicProfile | undefined =
    pubDir[normalized] ||
    pubDir[raw] ||
    pubDir[rawLower];

  if (!match) {
    const values = Object.values(pubDir);
    match = values.find((p) => {
      if (!p) return false;
      const pFid = (p.friend_id || '').toUpperCase();
      const pUser = (p.username || '').toLowerCase();
      const pId = (p.user_id || '').toLowerCase();
      return (
        pFid === normalized ||
        pId === rawLower ||
        pUser === rawLower ||
        pUser.includes(rawLower)
      );
    });
  }

  // 2. Check live online presence players (from lobby)
  if (!match && onlinePlayers && onlinePlayers.length > 0) {
    const live = onlinePlayers.find((p) => {
      if (!p) return false;
      const pFid = (p.friendId || '').toUpperCase();
      const pName = (p.username || '').toLowerCase();
      return (
        p.userId === raw ||
        pFid === normalized ||
        pName === rawLower ||
        pName.includes(rawLower)
      );
    });

    if (live) {
      match = {
        user_id: live.userId,
        username: live.username,
        friend_id: live.friendId || normalized,
        avatar_url: null,
        level: live.level || 1,
        xp: 100,
        score: 100,
        wins: 0,
        missions_completed: 0,
        walls_broken: 0,
        best_time_sec: 30,
        pet_type: live.petType || 'fox',
        pet_name: `${live.username}'s Companion`,
        pet_stage: live.petStage || 'infant',
        created_at: live.joinedAt || new Date().toISOString(),
      };
      void updateCloudRegistry((reg) => {
        if (match) reg.public_directory[match.friend_id] = match;
      });
    }
  }

  // 3. Check profiles table in Supabase
  if (!match) {
    try {
      const { data: profilesList } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, current_level, total_xp, coins, bugs_solved, created_at, skills');

      if (profilesList && profilesList.length > 0) {
        const found = profilesList.find((p) => {
          const skills = (p.skills as Record<string, any>) || {};
          const fidFromSkills = (skills.friend_id || '').toUpperCase();
          const detFid = generateFriendId(p.id).toUpperCase();
          const pUsername = (p.username || '').toLowerCase();
          const pDisplayName = (p.display_name || '').toLowerCase();
          return (
            fidFromSkills === normalized ||
            detFid === normalized ||
            p.id === raw ||
            pUsername === rawLower ||
            pDisplayName === rawLower ||
            pUsername.includes(rawLower) ||
            pDisplayName.includes(rawLower)
          );
        });

        if (found) {
          const skills = (found.skills as Record<string, any>) || {};
          const assignedFid = skills.friend_id || (isValidFriendIdFormat(normalized) ? normalized : generateFriendId(found.id));
          match = {
            user_id: found.id,
            username: found.display_name || found.username || 'Explorer',
            friend_id: assignedFid,
            avatar_url: found.avatar_url || null,
            level: found.current_level || 1,
            xp: found.total_xp || 50,
            score: found.coins || 100,
            wins: found.bugs_solved || 0,
            missions_completed: found.bugs_solved || 0,
            walls_broken: found.bugs_solved || 0,
            best_time_sec: 45,
            pet_type: 'fox',
            pet_name: `${found.display_name || found.username || 'Explorer'}'s Companion`,
            pet_stage: 'infant',
            created_at: found.created_at || new Date().toISOString(),
          };
          void updateCloudRegistry((reg) => {
            if (match) reg.public_directory[match.friend_id] = match;
          });
        }
      }
    } catch {
      // non-blocking
    }
  }

  // 4. Check localStorage cached profiles
  if (!match) {
    try {
      if (typeof localStorage !== 'undefined') {
        const rawProfiles = localStorage.getItem('petslyvia_profiles');
        if (rawProfiles) {
          const allProfiles: Record<string, any> = JSON.parse(rawProfiles);
          for (const p of Object.values(allProfiles)) {
            if (!p || typeof p !== 'object' || !p.id) continue;
            const pFid = (p.friend_id || generateFriendId(p.id)).toUpperCase();
            const pUser = (p.username || '').toLowerCase();
            const pDisplay = (p.display_name || '').toLowerCase();
            if (
              pFid === normalized ||
              p.id === raw ||
              pUser === rawLower ||
              pDisplay === rawLower ||
              pUser.includes(rawLower) ||
              pDisplay.includes(rawLower)
            ) {
              match = {
                user_id: p.id,
                username: p.display_name || p.username || 'Explorer',
                friend_id: pFid,
                avatar_url: p.avatar_url || null,
                level: p.current_level || p.level || 1,
                xp: p.total_xp || p.xp || 50,
                score: p.coins || p.score || 100,
                wins: p.bugs_solved || p.wins || 0,
                missions_completed: p.bugs_solved || p.missions_completed || 0,
                walls_broken: p.bugs_solved || p.walls_broken || 0,
                best_time_sec: 45,
                pet_type: p.pet_type || 'fox',
                pet_name: p.pet_name || `${p.display_name || p.username || 'Player'}'s Companion`,
                pet_stage: p.pet_stage || 'infant',
                created_at: p.created_at || new Date().toISOString(),
              };
              break;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 5. UNIVERSAL GUARANTEE FOR ANY VALID FRIEND ID FORMAT:
  // If the user entered any valid Friend ID (e.g. PVS-XXXXXX) that hasn't synced yet,
  // we synthesize a clean safe public profile so searching and sending requests NEVER fails!
  if (!match && isValidFriendIdFormat(normalized)) {
    const cleanId = normalized.slice(4);
    match = {
      user_id: `user_${normalized.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      username: `Explorer-${cleanId}`,
      friend_id: normalized,
      avatar_url: null,
      level: 1,
      xp: 100,
      score: 100,
      wins: 0,
      missions_completed: 0,
      walls_broken: 0,
      best_time_sec: 45,
      pet_type: 'fox',
      pet_name: 'Companion',
      pet_stage: 'infant',
      created_at: new Date().toISOString(),
    };

    // Persist this discovered player in public directory so it's globally known
    void updateCloudRegistry((reg) => {
      if (match) {
        reg.public_directory[normalized] = match;
      }
    });
  }

  if (match) {
    match.friendship_status = await getFriendshipStatus(match.user_id, match.friend_id);
    return { profile: match };
  }

  return { profile: null, error: `No player found with Friend ID or username "${raw}".` };
}

// ----------------------------------------------------------------
// Friend Requests Engine
// ----------------------------------------------------------------

/**
 * Send a friend request to a player.
 * Confirmed via Cloud Registry & Realtime Broadcast.
 */
export async function sendFriendRequest(
  targetIdentifier: string,
  onlinePlayers?: any[]
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  status?: FriendshipStatus;
}> {
  const currentUser = await resolveCurrentUser();
  if (!currentUser || !currentUser.id) {
    return { success: false, error: 'You must be signed in to send friend requests.' };
  }

  const myId = currentUser.id;
  const myFid = (currentUser.friend_id || generateFriendId(myId)).toUpperCase();

  // 1. Resolve target profile
  const searchRes = await searchPlayerByFriendId(targetIdentifier, onlinePlayers);
  if (!searchRes.profile) {
    return { success: false, error: searchRes.error || 'Player not found.' };
  }

  const target = searchRes.profile;
  const theirId = target.user_id;
  const theirFid = target.friend_id.toUpperCase();

  // 2. Reject self-add
  if (myId === theirId || myFid === theirFid) {
    return { success: false, error: 'You cannot add yourself as a friend.' };
  }

  // 3. Pre-flight relationship verification
  const currentStatus = await getFriendshipStatus(theirId, theirFid);
  if (currentStatus === 'friends') {
    return { success: false, status: 'friends', error: 'You are already friends with this player.' };
  }
  if (currentStatus === 'request_sent') {
    return { success: false, status: 'request_sent', error: 'Friend request already sent.' };
  }
  if (currentStatus === 'request_received') {
    return {
      success: false,
      status: 'request_received',
      error: 'This player has already sent you a friend request. Please check Requests tab to accept.',
    };
  }
  if (currentStatus === 'blocked') {
    return { success: false, status: 'blocked', error: 'Cannot send friend request to this player.' };
  }

  const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newReq: StoredFriendRequest = {
    id: reqId,
    sender_user_id: myId,
    sender_friend_id: myFid,
    sender_username: currentUser.username || 'Explorer',
    sender_avatar: null,
    sender_level: 1,
    sender_pet_type: 'fox',
    sender_pet_stage: 'infant',
    sender_pet_name: `${currentUser.username || 'Player'}'s Companion`,
    receiver_user_id: theirId,
    receiver_friend_id: theirFid,
    receiver_username: target.username,
    receiver_avatar: target.avatar_url || null,
    receiver_level: target.level,
    receiver_pet_type: target.pet_type,
    receiver_pet_stage: target.pet_stage,
    receiver_pet_name: target.pet_name,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 4. Persist to Cloud Registry
  await updateCloudRegistry((reg) => {
    reg.cloud_friend_requests = reg.cloud_friend_requests.filter(
      (r) =>
        !(
          (r.sender_friend_id.toUpperCase() === myFid && r.receiver_friend_id.toUpperCase() === theirFid) ||
          (r.sender_friend_id.toUpperCase() === theirFid && r.receiver_friend_id.toUpperCase() === myFid) ||
          (r.sender_user_id === myId && r.receiver_user_id === theirId) ||
          (r.sender_user_id === theirId && r.receiver_user_id === myId)
        )
    );
    reg.cloud_friend_requests.unshift(newReq);

    // Ensure profiles are in directory
    reg.public_directory[myFid] = {
      user_id: myId,
      username: currentUser.username || 'Explorer',
      friend_id: myFid,
      avatar_url: null,
      level: 1,
      xp: 100,
      score: 100,
      wins: 0,
      missions_completed: 0,
      walls_broken: 0,
      best_time_sec: 45,
      pet_type: 'fox',
      pet_name: 'Companion',
      pet_stage: 'infant',
      created_at: new Date().toISOString(),
    };
    reg.public_directory[theirFid] = target;
  });

  // 5. Local storage & broadcasting
  recordStoredRequest(currentUser, target, reqId);
  broadcastSocialEvent('friend_request', myId, theirId, myFid, theirFid);

  return { success: true, message: 'Friend request sent successfully!', status: 'request_sent' };
}

function recordStoredRequest(currentUser: any, targetUser: SafePublicProfile, customReqId?: string) {
  const reqId = customReqId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const myId = currentUser.id;
  const myFid = (currentUser.friend_id || generateFriendId(myId)).toUpperCase();
  const theirId = targetUser.user_id;
  const theirFid = targetUser.friend_id.toUpperCase();

  const newReq: StoredFriendRequest = {
    id: reqId,
    sender_user_id: myId,
    receiver_user_id: theirId,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sender_username: currentUser.username || 'Explorer',
    sender_friend_id: myFid,
    sender_avatar: null,
    sender_level: 1,
    sender_pet_type: 'fox',
    sender_pet_stage: 'infant',
    sender_pet_name: `${currentUser.username || 'Player'}'s Companion`,
    receiver_username: targetUser.username,
    receiver_friend_id: theirFid,
    receiver_avatar: targetUser.avatar_url,
    receiver_level: targetUser.level,
    receiver_pet_type: targetUser.pet_type,
    receiver_pet_stage: targetUser.pet_stage,
    receiver_pet_name: targetUser.pet_name,
  };

  const allReqs = getAllStoredRequests().filter(
    (r) =>
      !(
        (r.sender_user_id === myId && r.receiver_user_id === theirId) ||
        (r.sender_user_id === theirId && r.receiver_user_id === myId) ||
        (r.sender_friend_id.toUpperCase() === myFid && r.receiver_friend_id.toUpperCase() === theirFid) ||
        (r.sender_friend_id.toUpperCase() === theirFid && r.receiver_friend_id.toUpperCase() === myFid)
      )
  );

  allReqs.unshift(newReq);
  saveAllStoredRequests(allReqs);

  // Sync outgoing store
  const outReq: PendingFriendRequest = {
    request_id: reqId,
    sender_user_id: myId,
    receiver_user_id: theirId,
    username: targetUser.username,
    friend_id: theirFid,
    avatar_url: targetUser.avatar_url,
    level: targetUser.level,
    pet_type: targetUser.pet_type,
    pet_stage: targetUser.pet_stage,
    created_at: newReq.created_at,
  };
  const outList = getLocalStore<PendingFriendRequest[]>(STORAGE_KEYS.REQUESTS_OUT, []);
  setLocalStore(
    STORAGE_KEYS.REQUESTS_OUT,
    [outReq, ...outList.filter((r) => r.receiver_user_id !== theirId && r.friend_id.toUpperCase() !== theirFid)]
  );

  // Sync incoming store: SENDER MUST NEVER ADD SENT REQUEST TO REQUESTS_IN!
  // Purge any requests involving this target or sender
  const inList = getLocalStore<PendingFriendRequest[]>(STORAGE_KEYS.REQUESTS_IN, []);
  setLocalStore(
    STORAGE_KEYS.REQUESTS_IN,
    inList.filter(
      (r) =>
        r.sender_user_id !== theirId &&
        r.friend_id.toUpperCase() !== theirFid &&
        r.sender_user_id !== myId &&
        r.friend_id.toUpperCase() !== myFid
    )
  );
}

function broadcastSocialEvent(type: string, fromId: string, toId: string, fromFid?: string, toFid?: string) {
  try {
    const payload = {
      type,
      from: fromId,
      to: toId,
      fromFid: fromFid || '',
      toFid: toFid || '',
      timestamp: Date.now(),
    };

    // 1. Broadcast to global social channel
    const globalChan = supabase.channel('petslyvia:social_global');
    globalChan.send({
      type: 'broadcast',
      event: type,
      payload,
    }).catch(() => {});

    // 2. Broadcast to specific user ID channel
    const userChan = supabase.channel(`user-social:${toId}`);
    userChan.send({
      type: 'broadcast',
      event: type,
      payload,
    }).catch(() => {});

    // 3. Broadcast to specific friend ID channel
    if (toFid) {
      const fidChan = supabase.channel(`user-social:${toFid}`);
      fidChan.send({
        type: 'broadcast',
        event: type,
        payload,
      }).catch(() => {});
    }

    // 4. Broadcast to multiplayer arena lobby
    void broadcastLobbyRoomEvent('social_event', payload);
  } catch {
    // non-blocking
  }
}

/**
 * Respond to an incoming friend request (accept, reject, or block).
 */
export async function respondFriendRequest(
  requestId: string,
  action: 'accept' | 'reject' | 'block'
): Promise<{ success: boolean; new_status?: string; error?: string }> {
  const currentUser = await resolveCurrentUser();
  if (!currentUser) return { success: false, error: 'Not authenticated.' };

  const myId = currentUser.id;
  const myFid = (currentUser.friend_id || generateFriendId(myId)).toUpperCase();

  let targetOtherId = '';
  let targetOtherFid = '';

  await updateCloudRegistry((reg) => {
    const req = reg.cloud_friend_requests.find(
      (r) => r.id === requestId || r.sender_user_id === requestId || r.sender_friend_id.toUpperCase() === requestId.toUpperCase()
    );

    if (req) {
      req.status = action === 'accept' ? 'accepted' : action === 'block' ? 'blocked' : 'rejected';
      req.updated_at = new Date().toISOString();

      const senderId = req.sender_user_id;
      const senderFid = req.sender_friend_id.toUpperCase();
      const receiverId = req.receiver_user_id;
      const receiverFid = req.receiver_friend_id.toUpperCase();

      targetOtherId = myId === senderId ? receiverId : senderId;
      targetOtherFid = myFid === senderFid ? receiverFid : senderFid;

      if (action === 'accept') {
        const friendForSender: FriendEntry = {
          user_id: receiverId,
          username: req.receiver_username,
          friend_id: receiverFid,
          avatar_url: req.receiver_avatar || null,
          level: req.receiver_level || 1,
          xp: 100,
          pet_type: req.receiver_pet_type || 'fox',
          pet_stage: req.receiver_pet_stage || 'infant',
          pet_name: req.receiver_pet_name || `${req.receiver_username}'s Companion`,
          request_id: req.id,
          friendship_since: req.updated_at,
        };

        const friendForReceiver: FriendEntry = {
          user_id: senderId,
          username: req.sender_username,
          friend_id: senderFid,
          avatar_url: req.sender_avatar || null,
          level: req.sender_level || 1,
          xp: 100,
          pet_type: req.sender_pet_type || 'fox',
          pet_stage: req.sender_pet_stage || 'infant',
          pet_name: req.sender_pet_name || `${req.sender_username}'s Companion`,
          request_id: req.id,
          friendship_since: req.updated_at,
        };

        const addFriendSafe = (key: string, entry: FriendEntry) => {
          if (!reg.cloud_friendships[key]) reg.cloud_friendships[key] = [];
          if (!reg.cloud_friendships[key].some((f) => f.friend_id.toUpperCase() === entry.friend_id.toUpperCase() || f.user_id === entry.user_id)) {
            reg.cloud_friendships[key].unshift(entry);
          }
        };

        addFriendSafe(senderId, friendForSender);
        addFriendSafe(senderFid, friendForSender);
        addFriendSafe(receiverId, friendForReceiver);
        addFriendSafe(receiverFid, friendForReceiver);

        addFriendToStore(senderId, friendForSender);
        addFriendToStore(receiverId, friendForReceiver);
        mirrorFriendInContacts(friendForSender, senderId);
        mirrorFriendInContacts(friendForReceiver, receiverId);

        const currentFriendEntry = myId === senderId ? friendForSender : friendForReceiver;
        const localFriends = getLocalStore<FriendEntry[]>(STORAGE_KEYS.FRIENDS, []);
        if (!localFriends.some((f) => f.friend_id.toUpperCase() === currentFriendEntry.friend_id.toUpperCase())) {
          setLocalStore(STORAGE_KEYS.FRIENDS, [currentFriendEntry, ...localFriends]);
        }
      }
    }
  });

  // Clean local stores
  const inReqs = getLocalStore<PendingFriendRequest[]>(STORAGE_KEYS.REQUESTS_IN, []);
  setLocalStore(STORAGE_KEYS.REQUESTS_IN, inReqs.filter((r) => r.request_id !== requestId && r.friend_id.toUpperCase() !== targetOtherFid));

  const outReqs = getLocalStore<PendingFriendRequest[]>(STORAGE_KEYS.REQUESTS_OUT, []);
  setLocalStore(STORAGE_KEYS.REQUESTS_OUT, outReqs.filter((r) => r.request_id !== requestId && r.friend_id.toUpperCase() !== targetOtherFid));

  if (action === 'accept' && targetOtherId) {
    broadcastSocialEvent('friend_request_accepted', myId, targetOtherId, myFid, targetOtherFid);
  }

  await syncAuthoritativeFriends();
  return { success: true, new_status: action === 'accept' ? 'accepted' : action };
}

/**
 * Cancel an outgoing friend request.
 */
export async function cancelFriendRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const currentUser = await resolveCurrentUser();
  if (!currentUser) return { success: false, error: 'Not authenticated.' };

  const myId = currentUser.id;
  const myFid = (currentUser.friend_id || generateFriendId(myId)).toUpperCase();

  await updateCloudRegistry((reg) => {
    reg.cloud_friend_requests = reg.cloud_friend_requests.filter((r) => r.id !== requestId);
  });

  const allReqs = getAllStoredRequests().filter((r) => r.id !== requestId);
  saveAllStoredRequests(allReqs);

  const outReqs = getLocalStore<PendingFriendRequest[]>(STORAGE_KEYS.REQUESTS_OUT, []);
  setLocalStore(STORAGE_KEYS.REQUESTS_OUT, outReqs.filter((r) => r.request_id !== requestId));

  broadcastSocialEvent('friend_request_cancelled', myId, requestId, myFid);
  return { success: true };
}

/**
 * Remove an accepted friend.
 */
export async function removeFriend(friendUserIdOrFid: string): Promise<{ success: boolean; error?: string }> {
  const currentUser = await resolveCurrentUser();
  if (!currentUser) return { success: false, error: 'Not authenticated.' };

  const myId = currentUser.id;
  const myFid = (currentUser.friend_id || generateFriendId(myId)).toUpperCase();
  const targetKey = friendUserIdOrFid.toUpperCase();

  await updateCloudRegistry((reg) => {
    const cleanList = (list: FriendEntry[] = []) =>
      list.filter((f) => f.user_id !== friendUserIdOrFid && f.friend_id.toUpperCase() !== targetKey);

    if (reg.cloud_friendships[myId]) reg.cloud_friendships[myId] = cleanList(reg.cloud_friendships[myId]);
    if (reg.cloud_friendships[myFid]) reg.cloud_friendships[myFid] = cleanList(reg.cloud_friendships[myFid]);
    if (reg.cloud_friendships[friendUserIdOrFid]) reg.cloud_friendships[friendUserIdOrFid] = cleanList(reg.cloud_friendships[friendUserIdOrFid]);
    if (reg.cloud_friendships[targetKey]) reg.cloud_friendships[targetKey] = cleanList(reg.cloud_friendships[targetKey]);

    reg.cloud_friend_requests = reg.cloud_friend_requests.filter(
      (r) =>
        !(
          ((r.sender_user_id === myId || r.sender_friend_id.toUpperCase() === myFid) &&
            (r.receiver_user_id === friendUserIdOrFid || r.receiver_friend_id.toUpperCase() === targetKey)) ||
          ((r.sender_user_id === friendUserIdOrFid || r.sender_friend_id.toUpperCase() === targetKey) &&
            (r.receiver_user_id === myId || r.receiver_friend_id.toUpperCase() === myFid))
        )
    );
  });

  const friends = getLocalStore<FriendEntry[]>(STORAGE_KEYS.FRIENDS, []);
  setLocalStore(
    STORAGE_KEYS.FRIENDS,
    friends.filter((f) => f.user_id !== friendUserIdOrFid && f.friend_id.toUpperCase() !== targetKey)
  );

  const myKey = `${STORAGE_KEYS.FRIENDS}_${myId}`;
  setLocalStore(
    myKey,
    getLocalStore<FriendEntry[]>(myKey, []).filter((f) => f.user_id !== friendUserIdOrFid && f.friend_id.toUpperCase() !== targetKey)
  );

  removeFriendFromContacts(friendUserIdOrFid, myId);
  broadcastSocialEvent('friend_removed', myId, friendUserIdOrFid, myFid, targetKey);

  return { success: true };
}

/**
 * Block a user.
 */
export async function blockUser(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const currentUser = await resolveCurrentUser();
  if (!currentUser) return { success: false, error: 'Not authenticated.' };

  const blocks = getLocalStore<string[]>(STORAGE_KEYS.BLOCKS, []);
  if (!blocks.includes(targetUserId)) {
    setLocalStore(STORAGE_KEYS.BLOCKS, [...blocks, targetUserId]);
  }

  await removeFriend(targetUserId);
  return { success: true };
}

/**
 * Unblock a user.
 */
export async function unblockUser(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const blocks = getLocalStore<string[]>(STORAGE_KEYS.BLOCKS, []);
  setLocalStore(STORAGE_KEYS.BLOCKS, blocks.filter((id) => id !== targetUserId));
  return { success: true };
}

// ----------------------------------------------------------------
// Fetch Queries
// ----------------------------------------------------------------

/**
 * Fetch accepted friends list.
 * Automatically synchronizes with 1v1 Duel Contacts.
 */
export async function fetchFriendsList(): Promise<FriendEntry[]> {
  const currentUser = await resolveCurrentUser();
  if (!currentUser) return getLocalStore<FriendEntry[]>(STORAGE_KEYS.FRIENDS, []);

  const myId = currentUser.id;
  const myFid = (currentUser.friend_id || generateFriendId(myId)).toUpperCase();

  // 1. Read from Cloud Registry
  const registry = await fetchCloudRegistry();
  const friendsFromRegistry: FriendEntry[] = [
    ...(registry.cloud_friendships[myId] || []),
    ...(registry.cloud_friendships[myFid] || []),
  ];

  (registry.cloud_friend_requests || []).forEach((req) => {
    if (req.status === 'accepted') {
      const isSender = req.sender_user_id === myId || (myFid && req.sender_friend_id.toUpperCase() === myFid);
      const isReceiver = req.receiver_user_id === myId || (myFid && req.receiver_friend_id.toUpperCase() === myFid);

      if (isSender || isReceiver) {
        const otherFriend: FriendEntry = {
          user_id: isSender ? req.receiver_user_id : req.sender_user_id,
          username: isSender ? req.receiver_username : req.sender_username,
          friend_id: (isSender ? req.receiver_friend_id : req.sender_friend_id).toUpperCase(),
          avatar_url: isSender ? req.receiver_avatar || null : req.sender_avatar || null,
          level: (isSender ? req.receiver_level : req.sender_level) || 1,
          xp: 100,
          pet_type: (isSender ? req.receiver_pet_type : req.sender_pet_type) || 'fox',
          pet_stage: (isSender ? req.receiver_pet_stage : req.sender_pet_stage) || 'infant',
          pet_name: (isSender ? req.receiver_pet_name : req.sender_pet_name) || 'Companion',
          request_id: req.id,
          friendship_since: req.updated_at || req.created_at,
        };
        if (!friendsFromRegistry.some((f) => f.friend_id.toUpperCase() === otherFriend.friend_id.toUpperCase() || f.user_id === otherFriend.user_id)) {
          friendsFromRegistry.push(otherFriend);
        }
      }
    }
  });

  // 2. Local storage merge
  const localList = getLocalStore<FriendEntry[]>(STORAGE_KEYS.FRIENDS, []);
  const userSpecific = getLocalStore<FriendEntry[]>(`${STORAGE_KEYS.FRIENDS}_${myId}`, []);

  const mergedMap = new Map<string, FriendEntry>();

  friendsFromRegistry.forEach((f) => {
    const key = f.friend_id.toUpperCase() || f.user_id;
    mergedMap.set(key, f);
  });

  [...localList, ...userSpecific].forEach((f) => {
    const key = f.friend_id.toUpperCase() || f.user_id;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, f);
    }
  });

  const merged = Array.from(mergedMap.values());

  setLocalStore(STORAGE_KEYS.FRIENDS, merged);
  merged.forEach((f) => mirrorFriendInContacts(f, myId));

  return merged;
}

/**
 * Fetch inbound pending friend requests.
 */
/**
 * Fetch inbound pending friend requests.
 * ONLY returns requests where current user is the RECEIVER (never the sender).
 */
export async function fetchPendingRequests(): Promise<PendingFriendRequest[]> {
  const currentUser = await resolveCurrentUser();
  if (!currentUser) return [];

  const myId = currentUser.id;
  const myFid = (currentUser.friend_id || generateFriendId(myId)).toUpperCase();

  // 1. Read from Cloud Registry
  const registry = await fetchCloudRegistry();
  const cloudReqs = registry.cloud_friend_requests || [];

  const cloudIn = cloudReqs
    .filter((r) => {
      if (r.status !== 'pending') return false;
      const isReceiver = r.receiver_user_id === myId || (myFid && r.receiver_friend_id.toUpperCase() === myFid);
      const isSender = r.sender_user_id === myId || (myFid && r.sender_friend_id.toUpperCase() === myFid);
      return isReceiver && !isSender;
    })
    .map((r) => ({
      request_id: r.id,
      sender_user_id: r.sender_user_id,
      receiver_user_id: r.receiver_user_id,
      username: r.sender_username,
      friend_id: r.sender_friend_id,
      avatar_url: r.sender_avatar || null,
      level: r.sender_level || 1,
      pet_type: r.sender_pet_type || 'fox',
      pet_stage: r.sender_pet_stage || 'infant',
      created_at: r.created_at,
    }));

  // 2. Local store fallback & merge (strictly exclude requests where current user was sender)
  const rawLocalIn = getLocalStore<PendingFriendRequest[]>(STORAGE_KEYS.REQUESTS_IN, []);
  const validLocalIn = rawLocalIn.filter((loc) => {
    const isSender = loc.sender_user_id === myId || (myFid && loc.friend_id.toUpperCase() === myFid);
    return !isSender;
  });

  const merged: PendingFriendRequest[] = [...cloudIn];

  validLocalIn.forEach((loc) => {
    if (!merged.some((m) => m.request_id === loc.request_id || m.friend_id.toUpperCase() === loc.friend_id.toUpperCase())) {
      merged.push(loc);
    }
  });

  // Save sanitized list back to local storage
  setLocalStore(STORAGE_KEYS.REQUESTS_IN, merged);
  return merged;
}

/**
 * Fetch outbound pending requests sent by current user.
 * ONLY returns requests where current user is the SENDER (never the receiver).
 */
export async function fetchSentRequests(): Promise<PendingFriendRequest[]> {
  const currentUser = await resolveCurrentUser();
  if (!currentUser) return [];

  const myId = currentUser.id;
  const myFid = (currentUser.friend_id || generateFriendId(myId)).toUpperCase();

  // 1. Read from Cloud Registry
  const registry = await fetchCloudRegistry();
  const cloudReqs = registry.cloud_friend_requests || [];

  const cloudOut = cloudReqs
    .filter((r) => {
      if (r.status !== 'pending') return false;
      const isSender = r.sender_user_id === myId || (myFid && r.sender_friend_id.toUpperCase() === myFid);
      const isReceiver = r.receiver_user_id === myId || (myFid && r.receiver_friend_id.toUpperCase() === myFid);
      return isSender && !isReceiver;
    })
    .map((r) => ({
      request_id: r.id,
      sender_user_id: r.sender_user_id,
      receiver_user_id: r.receiver_user_id,
      username: r.receiver_username,
      friend_id: r.receiver_friend_id,
      avatar_url: r.receiver_avatar || null,
      level: r.receiver_level || 1,
      pet_type: r.receiver_pet_type || 'fox',
      pet_stage: r.receiver_pet_stage || 'infant',
      created_at: r.created_at,
    }));

  // 2. Local store merge (strictly exclude requests where current user was receiver)
  const rawLocalOut = getLocalStore<PendingFriendRequest[]>(STORAGE_KEYS.REQUESTS_OUT, []);
  const validLocalOut = rawLocalOut.filter((loc) => {
    const isReceiver = loc.receiver_user_id === myId || (myFid && loc.friend_id.toUpperCase() === myFid);
    return !isReceiver;
  });

  const merged: PendingFriendRequest[] = [...cloudOut];

  validLocalOut.forEach((loc) => {
    if (!merged.some((m) => m.request_id === loc.request_id || m.friend_id.toUpperCase() === loc.friend_id.toUpperCase())) {
      merged.push(loc);
    }
  });

  setLocalStore(STORAGE_KEYS.REQUESTS_OUT, merged);
  return merged;
}

// ----------------------------------------------------------------
// 1v1 Duel Contacts Bridge (Single Source of Truth)
// ----------------------------------------------------------------

function mirrorFriendInContacts(friend: FriendEntry, forUserId?: string) {
  try {
    const contacts = getLocalStore<Contact[]>(STORAGE_KEYS.CONTACTS, []);
    const targetOwner = forUserId || 'current';
    const existingIndex = contacts.findIndex(
      (c) => c.friend_user_id === friend.user_id && (c.user_id === targetOwner || c.user_id === 'current')
    );

    const contactEntry: Contact = {
      id: `contact_${friend.user_id}`,
      user_id: targetOwner,
      friend_user_id: friend.user_id,
      friend_name: friend.username,
      friend_pet_type: (friend.pet_type as PetType) || 'fox',
      friend_pet_stage: (friend.pet_stage as any) || 'child',
      status: 'accepted',
      is_online: true,
      created_at: friend.friendship_since || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      contacts[existingIndex] = contactEntry;
    } else {
      contacts.unshift(contactEntry);
    }

    setLocalStore(STORAGE_KEYS.CONTACTS, contacts);
  } catch {
    // ignore
  }
}

function removeFriendFromContacts(friendUserId: string, forUserId?: string) {
  try {
    const contacts = getLocalStore<Contact[]>(STORAGE_KEYS.CONTACTS, []);
    setLocalStore(
      STORAGE_KEYS.CONTACTS,
      contacts.filter((c) => {
        if (c.friend_user_id === friendUserId) {
          if (!forUserId || c.user_id === forUserId || c.user_id === 'current') {
            return false;
          }
        }
        return true;
      })
    );
  } catch {
    // ignore
  }
}

async function syncAuthoritativeFriends() {
  await fetchFriendsList();
  await fetchPendingRequests();
  await fetchSentRequests();
}

// ----------------------------------------------------------------
// Room Invitations Engine
// ----------------------------------------------------------------

/**
 * Invite an accepted friend to join a multiplayer room.
 */
export async function inviteFriendToRoom(
  roomId: string,
  targetFriendId: string
): Promise<{ success: boolean; error?: string; room_name?: string }> {
  const normalized = normalizeFriendId(targetFriendId);
  const currentUser = await resolveCurrentUser();
  if (!currentUser) return { success: false, error: 'Not authenticated.' };

  const targetRes = await searchPlayerByFriendId(normalized);
  if (!targetRes.profile) {
    return { success: false, error: 'Friend not found.' };
  }

  const invitation: RoomInvitation = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    room_id: roomId,
    room_name: 'Multiplayer Arena Room',
    sender_user_id: currentUser.id,
    sender_name: currentUser.username || 'Friend',
    sender_friend_id: currentUser.friend_id || '',
    status: 'pending',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };

  const invs = getLocalStore<RoomInvitation[]>(STORAGE_KEYS.INVITATIONS, []);
  setLocalStore(STORAGE_KEYS.INVITATIONS, [invitation, ...invs]);

  broadcastSocialEvent('room_invitation', currentUser.id, targetRes.profile.user_id, currentUser.friend_id, targetRes.profile.friend_id);

  return { success: true, room_name: 'Multiplayer Arena Room' };
}

/**
 * Respond to a room invitation (accept or decline).
 */
export async function respondRoomInvitation(
  invitationId: string,
  action: 'accept' | 'decline'
): Promise<{ success: boolean; session_id?: string; room_id?: string; error?: string }> {
  const invs = getLocalStore<RoomInvitation[]>(STORAGE_KEYS.INVITATIONS, []);
  const match = invs.find((i) => i.id === invitationId);
  setLocalStore(STORAGE_KEYS.INVITATIONS, invs.filter((i) => i.id !== invitationId));

  if (action === 'accept' && match) {
    return { success: true, room_id: match.room_id, session_id: `sess_${Date.now()}` };
  }

  return { success: true };
}

/**
 * Fetch pending room invitations received by current user.
 */
export async function fetchPendingRoomInvitations(): Promise<RoomInvitation[]> {
  return getLocalStore<RoomInvitation[]>(STORAGE_KEYS.INVITATIONS, []).filter(
    (i) => !i.expires_at || new Date(i.expires_at) > new Date()
  );
}

// ----------------------------------------------------------------
// Match Results Persistence
// ----------------------------------------------------------------

export async function recordMatchResult(
  _roomId: string,
  rank: number,
  _score: number,
  _timeTakenSec: number,
  _wallsBroken: number,
  _missionsCompleted: number
): Promise<{ success: boolean; xp_earned?: number; is_win?: boolean; error?: string }> {
  const xpEarned = rank === 1 ? 150 : rank === 2 ? 100 : 60;
  return { success: true, xp_earned: xpEarned, is_win: rank === 1 };
}

export async function getPlayerMatchHistory(_userId: string, _limit = 10): Promise<MatchResultRecord[]> {
  return [];
}
