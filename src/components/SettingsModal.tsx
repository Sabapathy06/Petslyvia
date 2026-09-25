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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, logout } = useAuth();
  const { profile, pet, soundEnabled, toggleSound, setPlayerRole, refreshData } = useGameData();

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || 'Explorer');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  if (!isOpen) return null;

  const userEmail = user?.email || profile?.email || 'player@petslyvia.world';
  const userId = user?.id || profile?.id || 'uid_unknown';
  const authProvider = user?.app_metadata?.provider || 'email';

  const handleCopyEmail = () => {
    sound.playSnap();
    navigator.clipboard.writeText(userEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
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
      profile.display_name = displayName.trim();
      await refreshData();
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 15 }}
        className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        {/* Glow Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Settings size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-1.5">
                Account & Settings
              </h2>
              <p className="text-xs text-slate-400">
                Manage your credentials, companion, and preferences
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 1. Logged In Account Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/30 space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Mail size={13} className="text-indigo-400" /> Logged In Account
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck size={12} /> Active Session
            </span>
          </div>

          {/* Email Address Highlight Box */}
          <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Email Account</div>
              <div className="text-sm font-black text-amber-300 font-mono truncate">{userEmail}</div>
            </div>

            <button
              onClick={handleCopyEmail}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Copy email to clipboard"
            >
              {copiedEmail ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span className="text-[10px]">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* UID & Provider Meta */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-400 font-mono">
            <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-500">Method:</span>
              <span className="text-slate-200 capitalize font-bold">{authProvider}</span>
            </div>

            <button
              onClick={handleCopyUid}
              className="p-2 bg-slate-950/60 hover:bg-slate-850 rounded-xl border border-slate-800/80 flex items-center justify-between cursor-pointer transition-colors text-left"
            >
              <span className="text-slate-500">UID:</span>
              <span className="text-slate-300 truncate max-w-[90px] font-bold">
                {copiedUid ? 'Copied!' : userId.substring(0, 10) + '...'}
              </span>
            </button>
          </div>
        </div>

        {/* 2. Player Profile & Track */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <User size={14} className="text-amber-400" /> Player Profile
            </span>
            <span className="text-xs font-mono text-amber-300 font-bold">
              Level {profile?.current_level ?? 1} • {profile?.coins ?? 100} Coins
            </span>
          </div>

          {/* Display Name Editor */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter player display name"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <button
              onClick={handleSaveName}
              disabled={saveStatus === 'saving'}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved ✓' : 'Save'}
            </button>
          </div>

          {/* Learning Track Switcher */}
          <div>
            <div className="text-[11px] text-slate-400 font-semibold mb-1.5">Primary Learning Track:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setPlayerRole('non_coder');
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  profile?.role === 'non_coder'
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400 text-amber-300 font-black shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass size={14} /> 🧩 Visual Explorer
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setPlayerRole('coder');
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  profile?.role === 'coder'
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-400 text-indigo-300 font-black shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 size={14} /> 💻 Coder Pioneer
              </button>
            </div>
          </div>
        </div>

        {/* 3. Pet Companion Summary */}
        {pet && (
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center shrink-0">
                <PetSVG
                  type={pet.pet_type}
                  stage={pet.stage}
                  state="happy"
                  equipped={pet.equipped_items}
                  size={46}
                />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  {pet.pet_name}
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 uppercase">
                    {pet.stage}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 capitalize">
                  Species: <strong className="text-slate-200">{pet.pet_type}</strong> • Level {pet.level}
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] font-mono text-slate-400">
              <div className="text-amber-400 font-bold">+{profile?.total_xp ?? 50} Total XP</div>
              <div className="text-[10px] text-emerald-400">⚡ {pet.energy}% Energy</div>
            </div>
          </div>
        )}

        {/* 4. Audio & System Preferences */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} className="text-slate-500" />}
              <span className="text-xs font-bold text-slate-200">8-Bit Sound Effects</span>
            </div>
            <button
              onClick={() => {
                toggleSound();
                sound.playClick();
              }}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                soundEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {soundEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database size={13} className="text-emerald-400" /> Cloud Database
            </span>
            <span className="text-emerald-400 font-mono font-bold">Supabase PostgreSQL Connected</span>
          </div>
        </div>

        {/* 5. Logout & Footer */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 hover:text-rose-200 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <LogOut size={16} /> Sign Out of Account
          </button>
        </div>
      </motion.div>
    </div>
  );
}
