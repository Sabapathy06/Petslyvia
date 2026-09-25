import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, User, Mail, ShieldCheck, Heart, Compass } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { sound } from '@/utils/audio';
import type { PetType } from '@/types/game';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GoogleAuthModal({ isOpen, onClose, onSuccess }: GoogleAuthModalProps) {
  const { loginWithGoogleAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedPet, setSelectedPet] = useState<PetType>('fox');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid Google email address (e.g. yourname@gmail.com).');
      sound.playError();
      return;
    }

    setLoading(true);
    sound.playClick();

    const res = await loginWithGoogleAccount(
      cleanEmail,
      displayName || cleanEmail.split('@')[0],
      selectedPet,
      'Sparky'
    );

    setLoading(false);

    if (res.success) {
      sound.playVictory();
      onSuccess();
      onClose();
    } else {
      sound.playError();
      setError(res.error || 'Failed to sign in with Google account.');
    }
  };

  const handleQuickSelect = async (quickEmail: string, quickName: string) => {
    setLoading(true);
    sound.playClick();
    const res = await loginWithGoogleAccount(quickEmail, quickName, selectedPet, 'Sparky');
    setLoading(false);
    if (res.success) {
      sound.playVictory();
      onSuccess();
      onClose();
    } else {
      sound.playError();
      setError(res.error || 'Failed to sign in.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100"
        >
          {/* Top Google Header */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  Sign in with Google
                </h3>
                <p className="text-xs text-slate-400">
                  Connect your Google account to Petslyvia
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs rounded-xl font-bold">
                {error}
              </div>
            )}

            {/* Quick 1-Click Select Cards */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Fast Sign-In Accounts
              </span>

              {/* Pavan Sreeram 1-Click Sign-In */}
              <button
                type="button"
                onClick={() => handleQuickSelect('pavansreeram15@gmail.com', 'Pavan Sreeram')}
                disabled={loading}
                className="w-full p-3 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/40 hover:border-indigo-400 rounded-2xl flex items-center justify-between transition-all cursor-pointer group text-left shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                    P
                  </div>
                  <div>
                    <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                      Pavan Sreeram
                    </div>
                    <div className="text-[10px] text-amber-300/80 font-mono">
                      pavansreeram15@gmail.com
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  1-Click Access ➔
                </span>
              </button>

              {/* Demo Google Explorer */}
              <button
                type="button"
                onClick={() => handleQuickSelect('google.player@gmail.com', 'Google Explorer')}
                disabled={loading}
                className="w-full p-3 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl flex items-center justify-between transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                    G
                  </div>
                  <div>
                    <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                      Google Explorer (Demo)
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      google.player@gmail.com
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                  Sign In ➔
                </span>
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase font-mono font-bold">
                or enter your google email
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Google Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-500" size={16} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. yourname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Your Display Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-500" size={16} />
                  <input
                    type="text"
                    placeholder="e.g. Alex"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Starter Companion Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Companion Choice (If new account):</span>
                  <span className="text-[10px] text-amber-400 capitalize">{selectedPet}</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { type: 'fox', label: 'Fox 🦊' },
                    { type: 'cat', label: 'Cat 🐱' },
                    { type: 'dog', label: 'Dog 🐶' },
                    { type: 'dragon', label: 'Dragon 🐲' },
                  ].map((p) => (
                    <button
                      key={p.type}
                      type="button"
                      onClick={() => {
                        setSelectedPet(p.type as PetType);
                        sound.playSnap();
                      }}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        selectedPet === p.type
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Sparkles size={16} />
                {loading ? 'CONNECTING GOOGLE ACCOUNT...' : 'CONTINUE WITH THIS GOOGLE ACCOUNT'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
