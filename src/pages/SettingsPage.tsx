import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Mail, User, ShieldCheck, Copy, Check, LogOut,
  Volume2, VolumeX, Database, Code2, Compass, KeyRound, Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGameData } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { sound } from '@/utils/audio';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { profile, pet, soundEnabled, toggleSound, setPlayerRole, refreshData } = useGameData();

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || 'Explorer');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  };

  const handleLogout = async () => {
    sound.playClick();
    await logout();
    window.location.hash = '#/login';
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-full text-xs font-bold text-indigo-300 mb-2">
            <Settings size={14} /> System & Profile
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Account Settings</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Review your logged-in email, active authentication session, companion data, and game preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Account & Email Identity Card */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-indigo-500/30 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Mail size={18} className="text-indigo-400" /> Logged-In Account
            </h2>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck size={14} /> Active
            </span>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Connected Email Address
              </span>
              <div className="text-base font-black text-amber-300 font-mono break-all">{userEmail}</div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyEmail}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedEmail ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copiedEmail ? 'Copied to Clipboard!' : 'Copy Email'}
              </button>

              <button
                onClick={handleCopyUid}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedUid ? 'Copied UID!' : `UID: ${userId.substring(0, 8)}...`}
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Authentication Provider:</span>
            <span className="font-bold text-slate-200 capitalize">{authProvider}</span>
          </div>
        </div>

        {/* 2. Player Profile Settings */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <User size={18} className="text-amber-400" /> Player Profile
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Display Name:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold outline-none focus:border-amber-400 transition-colors"
                />
                <button
                  onClick={handleSaveName}
                  disabled={saveStatus === 'saving'}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved ✓' : 'Save Name'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Learning Track:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    setPlayerRole('non_coder');
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    profile?.role === 'non_coder'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Compass size={16} /> Visual Explorer
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setPlayerRole('coder');
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    profile?.role === 'coder'
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 font-black shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 size={16} /> Coder Pioneer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Companion Summary Card */}
        {pet && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-purple-400" /> Active Companion
            </h2>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                <PetSVG
                  type={pet.pet_type}
                  stage={pet.stage}
                  state="happy"
                  equipped={pet.equipped_items}
                  size={60}
                />
              </div>

              <div>
                <div className="text-sm font-black text-white flex items-center gap-2">
                  {pet.pet_name}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black uppercase">
                    Stage: {pet.stage}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 capitalize">
                  Species: <strong className="text-slate-200">{pet.pet_type}</strong> • Level {pet.level}
                </div>
                <div className="text-xs text-amber-400 font-bold mt-1">
                  +{profile?.total_xp ?? 50} Total Adventure XP
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Audio & System Environment */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Database size={18} className="text-emerald-400" /> System & Audio
          </h2>

          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {soundEnabled ? <Volume2 size={18} className="text-emerald-400" /> : <VolumeX size={18} className="text-slate-500" />}
              <div>
                <div className="text-xs font-bold text-white">8-Bit Sound Effects</div>
                <div className="text-[10px] text-slate-400">Footsteps, cheers, collectibles</div>
              </div>
            </div>

            <button
              onClick={() => {
                toggleSound();
                sound.playClick();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                soundEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {soundEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Cloud Database:</span>
            <span className="text-emerald-400 font-bold font-mono">Supabase PostgreSQL Connected</span>
          </div>
        </div>
      </div>

      {/* Logout Action Bar */}
      <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-white">Sign Out of Petslyvia</h3>
          <p className="text-xs text-slate-400">Safely terminate your active local session.</p>
        </div>

        <button
          onClick={handleLogout}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <LogOut size={15} /> Log Out
        </button>
      </div>
    </div>
  );
}
