import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, Copy, Check, ShieldAlert,
  Send, UserCheck, UserX, Loader2, Sparkles, Trophy,
  Clock, Flame, Radio, Bell, ArrowRight
} from 'lucide-react';
import { useGameData } from '@/hooks/useGameData';
import { useFriends, type FriendWithPresence } from '@/hooks/useFriends';
import { useMultiplayerRoom } from '@/hooks/useMultiplayerRoom';
import { PetSVG } from '@/components/PetSVG';
import { sound } from '@/utils/audio';
import type { SafePublicProfile } from '@/services/friendService';

export function FriendsPage() {
  const { profile } = useGameData();
  const { onlinePlayers } = useMultiplayerRoom();
  const {
    friends,
    pendingRequests,
    roomInvitations,
    notificationCount,
    loading,
    error,
    myFriendId,
    sendRequest,
    respondRequest,
    removeFriend,
    respondInvite,
    searchFriend,
  } = useFriends(onlinePlayers);

  const [activeTab, setActiveTab] = useState<'friends' | 'add' | 'requests'>('friends');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SafePublicProfile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [sentRequestMap, setSentRequestMap] = useState<Record<string, boolean>>({});
  const [viewingProfile, setViewingProfile] = useState<SafePublicProfile | FriendWithPresence | null>(null);

  const handleCopyId = () => {
    const idToCopy = myFriendId || profile?.friend_id;
    if (!idToCopy) return;
    navigator.clipboard.writeText(idToCopy);
    setCopied(true);
    sound.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    setRequestSent(false);

    try {
      const res = await searchFriend(searchQuery.trim());
      if (res.error) {
        setSearchError(res.error);
        sound.playError();
      } else {
        setSearchResult(res.profile);
        sound.playClick();
      }
    } catch {
      setSearchError('Failed to search player');
      sound.playError();
    } finally {
      setSearching(false);
    }
  };

  const handleSendFriendRequest = async (targetId: string, itemKey?: string) => {
    setSendingRequest(true);
    setSearchError(null);
    sound.playClick();
    try {
      const res = await sendRequest(targetId);
      if (res.success) {
        setRequestSent(true);
        if (itemKey) {
          setSentRequestMap((prev) => ({ ...prev, [itemKey]: true }));
        }
        sound.playVictory();
      } else {
        setSearchError(res.error || 'Failed to send request');
        sound.playError();
      }
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Banner & Public Friend ID Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eaf2ec] border border-[#d3e2d8] rounded-full text-xs font-bold text-[#2d6a4f] mb-2">
            <Users size={14} /> Social & Companions
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1b382b] tracking-tight">
            Petslyvia Friends & Rivals
          </h1>
          <p className="text-xs sm:text-sm text-[#5b7566] mt-1">
            Connect with explorers across desktop and mobile using permanent public Friend IDs.
          </p>
        </div>

        {/* My Public Friend ID Box */}
        <div className="bg-[#f4f8f5] border border-[#dbe7df] p-4 rounded-2xl flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-start">
          <div>
            <span className="text-[10px] font-bold text-[#7a9386] tracking-wider uppercase block">
              Your Public Friend ID
            </span>
            <span className="font-mono text-lg font-black text-[#1b382b] tracking-wider">
              {myFriendId || profile?.friend_id || 'PVS-EXPLORER'}
            </span>
          </div>

          <button
            onClick={handleCopyId}
            disabled={!myFriendId && !profile?.friend_id}
            className="px-4 py-2 bg-[#2d6a4f] hover:bg-[#22533d] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy ID'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-[#e2ece5] gap-1 shadow-soft max-w-md">
        <button
          onClick={() => { setActiveTab('friends'); sound.playClick(); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'friends'
              ? 'bg-[#2d6a4f] text-white shadow-sm'
              : 'text-[#5b7566] hover:text-[#1b382b]'
          }`}
        >
          <Users size={14} />
          My Friends ({friends.length})
        </button>

        <button
          onClick={() => { setActiveTab('add'); sound.playClick(); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'add'
              ? 'bg-[#2d6a4f] text-white shadow-sm'
              : 'text-[#5b7566] hover:text-[#1b382b]'
          }`}
        >
          <UserPlus size={14} />
          Add Friend
        </button>

        <button
          onClick={() => { setActiveTab('requests'); sound.playClick(); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === 'requests'
              ? 'bg-[#2d6a4f] text-white shadow-sm'
              : 'text-[#5b7566] hover:text-[#1b382b]'
          }`}
        >
          <Bell size={14} />
          Requests
          {notificationCount > 0 && (
            <span className="w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl">
          ⚠️ {error}
        </div>
      )}

      {/* TAB CONTENT: Friends List */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-3xl p-12 border border-[#e2ece5] text-center">
              <Loader2 size={28} className="animate-spin text-[#2d6a4f] mx-auto" />
              <p className="text-xs text-[#5b7566] mt-2 font-medium">Loading friends list...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#e2ece5] text-center space-y-3">
              <div className="text-4xl">🐾</div>
              <h3 className="font-extrabold text-base text-[#1b382b]">No Friends Yet</h3>
              <p className="text-xs text-[#5b7566] max-w-sm mx-auto">
                Share your Friend ID ({myFriendId ?? 'PVS-XXXXXX'}) or add a rival using their Friend ID to see their live status and race together!
              </p>
              <button
                onClick={() => setActiveTab('add')}
                className="mt-2 px-5 py-2.5 bg-[#2d6a4f] hover:bg-[#22533d] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Find & Add Friends
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <div
                  key={friend.user_id}
                  className="bg-white rounded-2xl p-4 border border-[#e2ece5] hover:border-[#2d6a4f] transition-all shadow-soft flex items-center gap-3 relative group"
                >
                  {/* Avatar & Presence badge */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-[#f4f8f5] border border-[#e2ece5] flex items-center justify-center">
                      <PetSVG type={friend.pet_type as any} stage={friend.pet_stage as any} state="happy" size={36} />
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        friend.isOnline
                          ? friend.presence?.status === 'playing'
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-yellow-400'
                          : 'bg-slate-300'
                      }`}
                      title={friend.isOnline ? `Online (${friend.presence?.status ?? 'active'})` : 'Offline'}
                    />
                  </div>

                  {/* Profile info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-black text-xs text-[#1b382b] truncate">{friend.username}</h4>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#f4f8f5] text-[#5b7566] rounded border border-[#e2ece5]">
                        {friend.friend_id}
                      </span>
                    </div>

                    <p className="text-[10px] text-[#7a9386] truncate mt-0.5">
                      {friend.isOnline ? (
                        <span className="text-emerald-700 font-bold">
                          🟢 {friend.presence?.status === 'playing' ? 'In a Match' : 'In Lobby'}
                        </span>
                      ) : (
                        <span>⚫ Offline</span>
                      )}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 text-[9px] text-[#5b7566]">
                      <span>Lv {friend.level}</span>
                      <span>•</span>
                      <span>{friend.xp.toLocaleString()} XP</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => setViewingProfile(friend)}
                      className="px-2.5 py-1 text-[10px] font-bold text-[#2d6a4f] bg-[#eaf2ec] hover:bg-[#ddebe0] rounded-lg transition-all cursor-pointer"
                    >
                      Profile
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Remove ${friend.username} from your friends?`)) {
                          removeFriend(friend.user_id);
                        }
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Add Friend */}
      {activeTab === 'add' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card space-y-4">
            <h3 className="font-black text-lg text-[#1b382b] flex items-center gap-2">
              <Search size={18} className="text-[#2d6a4f]" /> Add Friend
            </h3>
            <p className="text-xs text-[#5b7566]">
              Search by Friend ID (e.g. <span className="font-mono font-bold text-[#1b382b]">PVS-XXXXXX</span> or 6 characters) or by player username.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Friend ID (PVS-XXXXXX) or Username"
                className="flex-1 px-4 py-3 border border-[#e2ece5] rounded-2xl text-sm focus:border-[#2d6a4f] outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-6 py-3 bg-[#2d6a4f] hover:bg-[#22533d] text-white font-black text-xs rounded-2xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Search
              </button>
            </div>

            {searchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
                ⚠️ {searchError}
              </div>
            )}

            {/* Search Result Card */}
            {searchResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-[#f4f8f5] rounded-2xl border border-[#dbe7df] space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-[#e2ece5] flex items-center justify-center shrink-0">
                    <PetSVG type={searchResult.pet_type as any} stage={searchResult.pet_stage as any} state="happy" size={42} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-base text-[#1b382b] truncate">{searchResult.username}</h4>
                      <span className="font-mono text-xs px-2 py-0.5 bg-white border border-[#e2ece5] rounded-md font-bold text-[#2d6a4f]">
                        {searchResult.friend_id}
                      </span>
                    </div>
                    <p className="text-xs text-[#5b7566] mt-0.5">
                      Companion: <strong className="text-[#1b382b]">{searchResult.pet_name}</strong> ({searchResult.pet_stage} {searchResult.pet_type})
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[#5b7566] mt-1 font-semibold">
                      <span>Level {searchResult.level}</span>
                      <span>•</span>
                      <span>{searchResult.xp.toLocaleString()} XP</span>
                      <span>•</span>
                      <span>{searchResult.wins} Wins</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#dbe7df] flex items-center justify-between">
                  <span className="text-[11px] text-[#7a9386]">Safe public profile</span>
                  {requestSent ? (
                    <div className="px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <Check size={14} /> Request Sent!
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSendFriendRequest(searchResult.user_id || searchResult.friend_id || searchResult.username)}
                      disabled={sendingRequest}
                      className="px-5 py-2.5 bg-[#2d6a4f] hover:bg-[#22533d] text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      {sendingRequest ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                      Send Friend Request
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Online Players Available to Add */}
          {onlinePlayers.filter((p) => p.userId && p.userId !== profile?.id && !friends.some((f) => f.user_id === p.userId)).length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-[#1b382b] flex items-center gap-2">
                  <Sparkles size={15} className="text-amber-500" /> Online Players Right Now
                </h3>
                <span className="text-[10px] font-bold text-[#2d6a4f] bg-[#eaf2ec] px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>
              <p className="text-xs text-[#5b7566]">
                These explorers are active right now. Send an instant friend request to team up!
              </p>
              <div className="space-y-2">
                {onlinePlayers
                  .filter((p) => p.userId && p.userId !== profile?.id && !friends.some((f) => f.user_id === p.userId))
                  .map((p) => (
                    <div key={p.userId} className="flex items-center gap-3 p-3 bg-[#f4f8f5] rounded-xl border border-[#e2ece5] justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white border border-[#e2ece5] flex items-center justify-center shrink-0">
                          <PetSVG type={p.petType as any} stage={p.petStage as any} state="happy" size={30} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-xs text-[#1b382b] truncate">{p.username}</p>
                          <p className="text-[10px] text-[#7a9386]">
                            Lv {p.level} · {p.friendId || 'Online Explorer'}
                          </p>
                        </div>
                      </div>
                      {sentRequestMap[p.userId] ? (
                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1 shrink-0">
                          <Check size={12} /> Sent!
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendFriendRequest(p.userId, p.userId)}
                          disabled={sendingRequest}
                          className="px-3.5 py-1.5 bg-[#2d6a4f] hover:bg-[#22533d] disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                        >
                          <UserPlus size={12} /> Add
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Pending Requests & Room Invites */}
      {activeTab === 'requests' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Room Invitations */}
          {roomInvitations.length > 0 && (
            <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200 shadow-sm space-y-3">
              <h3 className="font-black text-sm text-amber-900 flex items-center gap-2">
                <Flame size={16} className="text-amber-600" /> Room Invitations
              </h3>
              <div className="space-y-2">
                {roomInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-[#1b382b]">
                        {inv.sender_name ?? 'Friend'} invited you to join:
                      </p>
                      <p className="text-[11px] text-amber-700 font-bold">{inv.room_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondInvite(inv.id, 'accept')}
                        className="px-3 py-1.5 bg-[#2d6a4f] text-white font-bold rounded-lg cursor-pointer hover:bg-[#22533d]"
                      >
                        Accept & Join
                      </button>
                      <button
                        onClick={() => respondInvite(inv.id, 'decline')}
                        className="px-3 py-1.5 bg-slate-100 text-[#5b7566] font-bold rounded-lg cursor-pointer hover:bg-slate-200"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Inbound Requests */}
          <div className="bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card space-y-4">
            <h3 className="font-black text-base text-[#1b382b] flex items-center gap-2">
              <Bell size={16} className="text-[#2d6a4f]" /> Pending Friend Requests ({pendingRequests.length})
            </h3>

            {pendingRequests.length === 0 ? (
              <p className="text-xs text-[#7a9386] py-6 text-center">No pending friend requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.request_id}
                    className="p-4 bg-[#f4f8f5] rounded-2xl border border-[#e2ece5] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#e2ece5] flex items-center justify-center shrink-0">
                        <PetSVG type={req.pet_type as any} stage={req.pet_stage as any} state="happy" size={32} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-black text-xs text-[#1b382b] truncate">{req.username}</p>
                          <span className="font-mono text-[9px] px-1 bg-white border border-[#e2ece5] rounded text-[#5b7566]">
                            {req.friend_id}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#7a9386]">Level {req.level} Explorer</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => respondRequest(req.request_id, 'accept')}
                        className="px-3 py-1.5 bg-[#2d6a4f] hover:bg-[#22533d] text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <UserCheck size={13} /> Accept
                      </button>
                      <button
                        onClick={() => respondRequest(req.request_id, 'reject')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#5b7566] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        <UserX size={13} /> Decline
                      </button>
                      <button
                        onClick={() => respondRequest(req.request_id, 'block')}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                        title="Block Player"
                      >
                        <ShieldAlert size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Safe Public Profile Modal */}
      <AnimatePresence>
        {viewingProfile && (
          <div
            onClick={() => setViewingProfile(null)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-card border border-[#e2ece5] space-y-4 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#f4f8f5] border border-[#e2ece5] mx-auto flex items-center justify-center">
                <PetSVG type={viewingProfile.pet_type as any} stage={viewingProfile.pet_stage as any} state="happy" size={48} />
              </div>

              <div>
                <h3 className="font-black text-lg text-[#1b382b]">{viewingProfile.username}</h3>
                <span className="font-mono text-xs font-bold text-[#2d6a4f] px-2.5 py-0.5 bg-[#eaf2ec] rounded-full inline-block mt-1">
                  {viewingProfile.friend_id}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#e2ece5] text-left text-xs">
                <div className="bg-[#f4f8f5] p-2.5 rounded-xl border border-[#e2ece5]">
                  <span className="text-[10px] text-[#7a9386] font-bold block">Explorer Level</span>
                  <span className="font-black text-[#1b382b] text-sm">Level {viewingProfile.level}</span>
                </div>
                <div className="bg-[#f4f8f5] p-2.5 rounded-xl border border-[#e2ece5]">
                  <span className="text-[10px] text-[#7a9386] font-bold block">Total XP</span>
                  <span className="font-black text-[#2d6a4f] text-sm">{viewingProfile.xp.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => setViewingProfile(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-[#1b382b] font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
