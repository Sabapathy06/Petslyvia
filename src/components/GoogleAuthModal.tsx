import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, User, Mail, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { sound } from '@/utils/audio';
import type { PetType } from '@/types/database';
import { PET_LIST } from '@/data/pets';

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
  const [petName, setPetName] = useState('Sparky');
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

    const effectiveName = displayName.trim() || cleanEmail.split('@')[0];
    const effectivePetName = petName.trim() || `${effectiveName}'s Companion`;

    const res = await loginWithGoogleAccount(
      cleanEmail,
      effectiveName,
      selectedPet,
      effectivePetName
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="relative w-full max-w-md bg-white border border-[#e2ece5] rounded-3xl shadow-card overflow-hidden text-[#1b382b]"
        >
          {/* Top Google Header */}
          <div className="p-6 bg-[#f4f8f5] border-b border-[#e2ece5] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white p-2 flex items-center justify-center shadow-soft shrink-0 border border-[#e2ece5]">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-[#1b382b] flex items-center gap-1.5">
                  Sign in with Google
                </h3>
                <p className="text-xs text-[#5b7566] font-medium">
                  Connect your Google account to Petslyvia
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-white text-[#5b7566] hover:text-[#1b382b] border border-[#e2ece5] cursor-pointer shadow-soft"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-[#eaf2ec] border border-[#d8e5dc] rounded-2xl text-xs text-[#2d6a4f] font-medium leading-relaxed">
                Connect your Google account directly. Enter your Google email address below to sign in or create your player profile.
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1b382b] mb-1">
                  Google Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-[#7a9386]" size={16} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. yourname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#f4f8f5] border border-[#e2ece5] rounded-xl text-xs text-[#1b382b] placeholder-[#7a9386] focus:outline-none focus:border-[#2d6a4f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#1b382b] mb-1">
                    Your Nickname
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-[#7a9386]" size={16} />
                    <input
                      type="text"
                      placeholder="e.g. Alex"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-[#f4f8f5] border border-[#e2ece5] rounded-xl text-xs text-[#1b382b] placeholder-[#7a9386] focus:outline-none focus:border-[#2d6a4f]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1b382b] mb-1">
                    Pet Name
                  </label>
                  <div className="relative">
                    <Heart className="absolute left-3 top-2.5 text-[#7a9386]" size={16} />
                    <input
                      type="text"
                      placeholder="e.g. Sparky"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-[#f4f8f5] border border-[#e2ece5] rounded-xl text-xs text-[#1b382b] placeholder-[#7a9386] focus:outline-none focus:border-[#2d6a4f]"
                    />
                  </div>
                </div>
              </div>

              {/* Starter Companion Choice */}
              <div>
                <label className="block text-xs font-bold text-[#1b382b] mb-1.5 flex items-center justify-between">
                  <span>Companion Species (If new account):</span>
                  <span className="text-[10px] text-[#2d6a4f] capitalize font-bold">{selectedPet}</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PET_LIST.map((p) => (
                    <button
                      key={p.type}
                      type="button"
                      onClick={() => {
                        setSelectedPet(p.type);
                        sound.playSnap();
                      }}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        selectedPet === p.type
                          ? 'bg-[#eaf2ec] text-[#2d6a4f] border-[#2d6a4f] shadow-sm font-black'
                          : 'bg-[#f4f8f5] text-[#5b7566] border-[#e2ece5] hover:border-[#2d6a4f]'
                      }`}
                    >
                      <span>{p.emoji}</span>
                      <span className="capitalize text-[10px]">{p.type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#2d6a4f] hover:bg-[#245840] text-white font-black text-xs rounded-xl shadow-card transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
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
