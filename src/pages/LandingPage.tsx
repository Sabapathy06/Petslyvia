import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Compass, Bug, Brain, ArrowRight,
  ShieldCheck, ShoppingBag, Code2, Users, Flame,
  Mail, X, Lock, CheckCircle2, User, RefreshCw
} from 'lucide-react';
import { PetSVG } from '@/components/PetSVG';
import { PET_LIST } from '@/data/pets';
import { sound } from '@/utils/audio';
import { useAuth } from '@/hooks/useAuth';
import { GoogleAuthModal } from '@/components/GoogleAuthModal';

export function LandingPage() {
  const navigate = useNavigate();
  const { user, logout, loginWithPassword } = useAuth();
  const [showPlayNowModal, setShowPlayNowModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const handlePlayWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setModalError('Please enter a valid email address (e.g. yourname@gmail.com).');
      sound.playError();
      return;
    }

    setModalLoading(true);
    sound.playClick();

    const pass = passwordInput || 'petslyvia_player_pass';
    const res = await loginWithPassword(cleanEmail, pass);
    setModalLoading(false);

    if (res.success) {
      sound.playVictory();
      setShowPlayNowModal(false);
      navigate('/app');
    } else {
      sound.playError();
      setModalError(res.error || 'Failed to enter game. Try entering with password or OTP.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f8f5] text-[#1b382b] font-sans selection:bg-[#2d6a4f] selection:text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#1e3a2b]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#2e6849]"></div>
            <div className="w-2 h-2 rounded-full bg-[#52936f]"></div>
          </div>
          <span className="font-black text-2xl tracking-tight text-[#1b382b]">
            petslyvia<span className="text-[#2d6a4f]">.</span>
          </span>
        </div>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] text-[#5b7566] font-bold uppercase tracking-wider">Signed in as</span>
              <span className="text-xs font-black text-[#1b382b] max-w-[150px] truncate">{user.email}</span>
            </div>
            <Link
              to="/app"
              onClick={() => sound.playClick()}
              className="px-4 py-2.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-xs tracking-wide rounded-2xl shadow-soft transition-all"
            >
              CONTINUE TO APP →
            </Link>
            <button
              onClick={async () => {
                sound.playClick();
                await logout();
                setShowPlayNowModal(true);
              }}
              className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-[#e2ece5] text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-soft"
            >
              Switch Email
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              onClick={() => sound.playClick()}
              className="px-4 py-2 text-xs font-bold text-[#5b7566] hover:text-[#1b382b] transition-colors"
            >
              LOG IN
            </Link>
            <button
              onClick={() => {
                sound.playClick();
                setShowPlayNowModal(true);
              }}
              className="px-5 py-2.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-xs tracking-wide rounded-2xl shadow-soft transition-all cursor-pointer"
            >
              PLAY NOW →
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-10 pb-20 grid lg:grid-cols-12 gap-12 items-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7 space-y-6 relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#eaf2ec] border border-[#d8e5dc] rounded-full text-xs font-bold text-[#2d6a4f]">
            <Sparkles size={14} /> Zero Coding Experience Required
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1b382b] leading-tight tracking-tight">
            Raise your pet. <br />
            <span className="text-[#2d6a4f]">
              Build your logic.
            </span> <br />
            Fix the world.
          </h1>

          <p className="text-sm sm:text-base text-[#5b7566] max-w-xl leading-relaxed font-medium">
            PETSLYVIA is an adventure world where complete beginners start with zero knowledge and naturally learn programming through exploration, debugging battles, and multiplayer collaboration.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => {
                sound.playClick();
                setShowPlayNowModal(true);
              }}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-sm tracking-wide rounded-2xl shadow-soft transition-all cursor-pointer"
            >
              {user ? 'Enter Petslyvia →' : 'Start Adventure (Play Now)'} <ArrowRight size={18} />
            </button>
            <Link
              to="/login"
              onClick={() => sound.playClick()}
              className="px-6 py-3.5 bg-white hover:bg-[#eaf2ec] text-[#1b382b] font-bold text-sm rounded-2xl border border-[#d8e5dc] shadow-soft transition-all"
            >
              I Have an Account
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[#e2ece5] text-xs text-[#5b7566] font-semibold">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-[#2d6a4f]" />
              <span>Visual Quests</span>
            </div>
            <div className="flex items-center gap-2">
              <Bug size={16} className="text-[#2d6a4f]" />
              <span>Bug Exchange</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-[#2d6a4f]" />
              <span>Pet Evolution</span>
            </div>
          </div>
        </motion.div>

        {/* Hero Pet Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-5 relative"
        >
          <div className="relative bg-white rounded-3xl p-8 border border-[#e2ece5] shadow-card flex flex-col items-center text-center space-y-4">
            <div className="w-full aspect-square bg-[#dce8e0] rounded-2xl border border-[#d8e5dc] flex items-center justify-center relative overflow-hidden shadow-inner p-4">
              <PetSVG
                type="fox"
                stage="infant"
                state="happy"
                size={180}
              />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2d6a4f] bg-[#eaf2ec] px-2.5 py-0.5 rounded-full">
                Your AI Companion
              </span>
              <h3 className="text-xl font-black text-[#1b382b] mt-1.5">
                Meet Maple the Fox
              </h3>
              <p className="text-xs text-[#5b7566] mt-1">
                Evolves dynamically with every line of code and puzzle you conquer.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* PLAY NOW / EMAIL ENTRY MODAL */}
      <AnimatePresence>
        {showPlayNowModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white border border-[#e2ece5] rounded-3xl shadow-2xl p-6 sm:p-7 text-[#1b382b] space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#eaf2ec] border border-[#d8e5dc] flex items-center justify-center text-[#2d6a4f]">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#1b382b]">Play Now — Enter Email</h3>
                    <p className="text-xs text-[#5b7566]">Choose your player account to start</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlayNowModal(false)}
                  className="p-2 rounded-xl text-[#7a9386] hover:text-[#1b382b] hover:bg-[#f4f8f5] transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* If user is already logged in, show current session */}
              {user && (
                <div className="p-3.5 bg-[#eaf2ec] border border-[#d8e5dc] rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#5b7566] block text-[9px] font-bold uppercase tracking-wider">Signed in as</span>
                    <span className="font-black text-[#1b382b]">{user.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      sound.playClick();
                      await logout();
                      setEmailInput('');
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-[#d8e5dc] text-[11px] font-bold rounded-lg cursor-pointer"
                  >
                    Use Different Email
                  </button>
                </div>
              )}

              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
                  {modalError}
                </div>
              )}

              {/* Form asking for email */}
              <form onSubmit={handlePlayWithEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1b382b] mb-1">
                    Player Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 text-[#7a9386]" size={16} />
                    <input
                      type="email"
                      required
                      placeholder="e.g. yourname@gmail.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#f4f8f5] text-[#1b382b] rounded-xl border border-[#e2ece5] focus:border-[#2d6a4f] text-sm font-medium outline-none placeholder:text-[#7a9386]"
                    />
                  </div>
                  <span className="block text-[10px] text-[#5b7566] mt-1">
                    One email = One player account = One companion pet.
                  </span>
                </div>

                {usePassword && (
                  <div>
                    <label className="block text-xs font-bold text-[#1b382b] mb-1">
                      Password (Optional if new)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 text-[#7a9386]" size={16} />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#f4f8f5] text-[#1b382b] rounded-xl border border-[#e2ece5] focus:border-[#2d6a4f] text-sm font-medium outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => setUsePassword(!usePassword)}
                    className="text-[#2d6a4f] hover:underline font-bold cursor-pointer"
                  >
                    {usePassword ? '– Hide password field' : '+ Add password'}
                  </button>
                  <Link
                    to="/login"
                    onClick={() => setShowPlayNowModal(false)}
                    className="text-[#5b7566] hover:text-[#1b382b] font-semibold"
                  >
                    Login with OTP / Password →
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full py-3.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-sm rounded-2xl shadow-card transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles size={16} />
                  {modalLoading ? 'Entering Petslyvia...' : 'PLAY NOW WITH THIS EMAIL →'}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e2ece5]" /></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-[#7a9386]"><span className="bg-white px-2">OR</span></div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={() => {
                  setShowPlayNowModal(false);
                  setShowGoogleModal(true);
                }}
                className="w-full py-3 bg-[#f4f8f5] hover:bg-[#eaf2ec] text-[#1b382b] font-bold text-xs rounded-2xl border border-[#e2ece5] transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-soft"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Google Account
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GOOGLE AUTH MODAL */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={() => navigate('/app')}
      />
    </div>
  );
}
