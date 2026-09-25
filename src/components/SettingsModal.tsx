import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Mail, User, ShieldCheck, Copy, Check, LogOut,
  Volume2, VolumeX, Sparkles, Database, Code2, Compass,
  X, RefreshCw, KeyRound, ExternalLink, Heart
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGameData } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { sound } from '@/utils/audio';
import { generateFriendId } from '@/services/friendService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, logout, changePassword } = useAuth();
  const { profile, pet, soundEnabled, toggleSound, setPlayerRole, updateProfile } = useGameData();

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedFriendId, setCopiedFriendId] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      sound.playError();
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      sound.playError();
      return;
    }

    setPasswordLoading(true);
    sound.playClick();

    const res = await changePassword(newPassword);
    setPasswordLoading(false);

    if (res.success) {
      setPasswordSuccess('Password successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
      sound.playVictory();
      setTimeout(() => {
        setPasswordSuccess('');
        setShowPasswordChange(false);
      }, 3000);
    } else {
      setPasswordError(res.error || 'Failed to update password.');
      sound.playError();
    }
  };

  React.useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  if (!isOpen) return null;

  const userEmail = user?.email || profile?.email || 'player@petslyvia.world';
  const userId = user?.id || profile?.id || 'uid_unknown';
  const authProvider = user?.app_metadata?.provider || 'email';
  const publicFriendId = profile?.friend_id || ((profile?.skills as any)?.friend_id) || generateFriendId(userId);

  const handleCopyEmail = () => {
    sound.playSnap();
    navigator.clipboard.writeText(userEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyFriendId = () => {
    sound.playSnap();
    navigator.clipboard.writeText(publicFriendId);
    setCopiedFriendId(true);
    setTimeout(() => setCopiedFriendId(false), 2000);
  };

  const handleCopyUid = () => {
    sound.playSnap();
    navigator.clipboard.writeText(userId);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleSaveName = async () => {
    if (!profile || !displayName.trim()) return;
    sound.playClick();
    setSaveStatus('saving');
    try {
      await updateProfile({ display_name: displayName.trim() });
      setSaveStatus('saved');
      setIsEditingName(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  };

  const handleLogout = async () => {
    sound.playClick();
    onClose();
    await logout();
    window.location.hash = '#/login';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#163324]/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 15 }}
        className="bg-white border border-[#e2ece5] rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar text-[#1b382b]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2ece5] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eaf2ec] border border-[#d8e5dc] flex items-center justify-center shadow-soft">
              <Settings size={20} className="text-[#2d6a4f]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1b382b] flex items-center gap-1.5">
                Account & Settings
              </h2>
              <p className="text-xs text-[#5b7566]">
                Manage your credentials, companion, and preferences
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-[#5b7566] hover:text-[#1b382b] p-1.5 rounded-xl bg-[#f4f8f5] border border-[#d8e5dc] hover:bg-[#eaf2ec] cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section 1: User Profile & Email Authentication Card */}
        <div className="p-4 bg-[#f8faf8] border border-[#d8e5dc] rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#2d6a4f] uppercase tracking-wider bg-[#eaf2ec] border border-[#d5e3da] px-2 py-0.5 rounded-full">
              Authentication Credentials
            </span>
            <span className="text-[10px] font-mono text-[#5b7566] flex items-center gap-1">
              <ShieldCheck size={12} className="text-[#2d6a4f]" /> Provider: {authProvider}
            </span>
          </div>

          {/* Display Name Edit */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#e2ece5] shadow-sm">
            <div className="flex-1 min-w-0 mr-3">
              <span className="text-[10px] font-bold text-[#7a9386] block uppercase">Player Name</span>
              {isEditingName ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-[#f4f8f5] text-xs font-bold text-[#1b382b] px-2 py-1 rounded-lg border border-[#2d6a4f] outline-none w-full mt-0.5"
                  autoFocus
                />
              ) : (
                <span className="text-xs font-bold text-[#1b382b] truncate block">
                  {profile?.display_name || 'Adventurer'}
                </span>
              )}
            </div>

            {isEditingName ? (
              <button
                onClick={handleSaveName}
                disabled={saveStatus === 'saving'}
                className="px-3 py-1 bg-[#2d6a4f] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#23533e]"
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save'}
              </button>
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="text-[11px] font-bold text-[#2d6a4f] hover:underline cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          {/* Email Address with Copy */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#e2ece5] shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <Mail size={15} className="text-[#5b7566] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#7a9386] block uppercase">Logged-In Email</span>
                <span className="text-xs font-mono text-[#1b382b] truncate block">
                  {userEmail}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyEmail}
              className="p-1.5 rounded-lg bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#d8e5dc] text-[#5b7566] hover:text-[#1b382b] transition-colors cursor-pointer"
              title="Copy Email"
            >
              {copiedEmail ? <Check size={14} className="text-[#2d6a4f]" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Public User ID / Friend ID with Copy */}
          <div className="flex items-center justify-between bg-gradient-to-r from-[#f0f8f4] to-white p-3 rounded-xl border border-[#b7dfcb] shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#2d6a4f] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#2d6a4f] block uppercase tracking-wider">
                  Public User ID / Friend ID
                </span>
                <span className="text-sm font-mono font-black text-[#1b382b] tracking-wider block">
                  {publicFriendId}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyFriendId}
              className="px-3 py-1.5 rounded-lg bg-[#2d6a4f] hover:bg-[#23533e] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-soft"
              title="Copy User ID / Friend ID"
            >
              {copiedFriendId ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedFriendId ? 'Copied!' : 'Copy ID'}</span>
            </button>
          </div>
        </div>

        {/* Section 2: Audio & Exploration Mode Preferences */}
        <div className="p-4 bg-[#f8faf8] border border-[#d8e5dc] rounded-2xl space-y-3">
          <span className="text-[10px] font-bold text-[#2d6a4f] uppercase tracking-wider bg-[#eaf2ec] border border-[#d5e3da] px-2 py-0.5 rounded-full">
            Preferences & Controls
          </span>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                toggleSound();
                sound.playClick();
              }}
              className="p-3 bg-white border border-[#e2ece5] hover:border-[#2d6a4f] rounded-xl flex items-center justify-between transition-all cursor-pointer shadow-sm text-left"
            >
              <div>
                <span className="text-xs font-bold text-[#1b382b] block">Sound FX</span>
                <span className="text-[10px] text-[#7a9386]">{soundEnabled ? 'Enabled' : 'Muted'}</span>
              </div>
              <div className={`p-1.5 rounded-lg ${soundEnabled ? 'bg-[#eaf2ec] text-[#2d6a4f]' : 'bg-[#f4f8f5] text-[#7a9386]'}`}>
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </div>
            </button>

            {/* Track Switcher */}
            <button
              onClick={() => {
                sound.playClick();
                setPlayerRole(profile?.role === 'coder' ? 'non_coder' : 'coder');
              }}
              className="p-3 bg-white border border-[#e2ece5] hover:border-[#2d6a4f] rounded-xl flex items-center justify-between transition-all cursor-pointer shadow-sm text-left"
            >
              <div>
                <span className="text-xs font-bold text-[#1b382b] block">Mode Track</span>
                <span className="text-[10px] text-[#2d6a4f] font-semibold">
                  {profile?.role === 'coder' ? '💻 Coder Pioneer' : '🧩 Visual Explorer'}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#eaf2ec] text-[#2d6a4f]">
                {profile?.role === 'coder' ? <Code2 size={16} /> : <Compass size={16} />}
              </div>
            </button>
          </div>
        </div>

        {/* Section 3: Security & Password */}
        <div className="p-4 bg-[#f8faf8] border border-[#d8e5dc] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#2d6a4f] uppercase tracking-wider bg-[#eaf2ec] border border-[#d5e3da] px-2 py-0.5 rounded-full flex items-center gap-1">
              <KeyRound size={12} /> Security & Password
            </span>
            <button
              onClick={() => {
                setShowPasswordChange(!showPasswordChange);
                sound.playClick();
              }}
              className="text-xs text-[#2d6a4f] hover:underline font-bold cursor-pointer"
            >
              {showPasswordChange ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {showPasswordChange && (
            <form onSubmit={handleChangePassword} className="space-y-2.5 pt-1">
              <div>
                <label className="text-[11px] font-bold text-[#5b7566] block mb-1">New Password (min 6 chars):</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-[#e2ece5] rounded-xl px-3 py-1.5 text-xs text-[#1b382b] font-medium outline-none focus:border-[#2d6a4f]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5b7566] block mb-1">Confirm New Password:</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-[#e2ece5] rounded-xl px-3 py-1.5 text-xs text-[#1b382b] font-medium outline-none focus:border-[#2d6a4f]"
                />
              </div>

              {passwordError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-lg">
                  ⚠️ {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1">
                  <Check size={12} className="text-emerald-600" /> {passwordSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading || !newPassword}
                className="w-full py-2 bg-[#2d6a4f] hover:bg-[#245840] disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-soft transition-all cursor-pointer"
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        {/* Section 4: Sign Out Button */}
        <div className="pt-1">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-[#ffe4e6] hover:bg-[#fecdd3] border border-[#fecdd3] text-rose-700 font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <LogOut size={15} />
            <span>Sign Out of Petslyvia</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
