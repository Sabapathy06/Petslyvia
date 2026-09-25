import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Mail, Lock, KeyRound, ArrowRight, AlertCircle,
  CheckCircle2, RefreshCw, Compass, ShieldCheck, Heart
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PetSVG } from '@/components/PetSVG';
import { PET_LIST } from '@/data/pets';
import type { PetType } from '@/types/database';
import { sound } from '@/utils/audio';
import { GoogleAuthModal } from '@/components/GoogleAuthModal';

// ----------------------------------------------------
// LOGIN PAGE
// ----------------------------------------------------
export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithPassword, requestOtp, verifyOtpAndLogin, loginWithGoogle, loginWithGoogleAccount } = useAuth();

  const [mode, setMode] = useState<'password' | 'otp_request' | 'otp_verify'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Normal Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    sound.playClick();

    const res = await loginWithPassword(email, password);
    setLoading(false);

    if (res.success) {
      sound.playVictory();
      navigate('/app');
    } else {
      sound.playError();
      setError(res.error || 'Email or password is incorrect.');
    }
  };

  // Request OTP for Login / Recovery
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    setLoading(true);
    sound.playClick();

    const res = await requestOtp(email);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(res.message);
      if (res.testOtpCode) {
        setDemoCodeHint(res.testOtpCode);
        setOtpCode(res.testOtpCode);
      }
      setMode('otp_verify');
      sound.playCrystal();
    } else {
      sound.playError();
      setError(res.error || 'Could not send verification code.');
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    sound.playClick();

    const res = await verifyOtpAndLogin(email, otpCode);
    setLoading(false);

    if (res.success) {
      sound.playVictory();
      navigate('/app');
    } else {
      sound.playError();
      setError(res.error || 'Invalid or expired OTP code.');
    }
  };

  // Google Sign-In
  const handleGoogleLogin = async () => {
    setError('');
    sound.playClick();
    setShowGoogleModal(true);
  };

  return (
    <AuthShell
      title="Welcome Back, Player!"
      subtitle="Enter Petslyvia to explore, raise your companion, and solve logic puzzles."
    >
      <AnimatePresence mode="wait">
        {mode === 'password' && (
          <motion.form
            key="login-password"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onSubmit={handlePasswordLogin}
            className="space-y-4"
          >
            <Field label="Player Email" icon={<Mail size={18} />}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@petslyvia.world"
                className="w-full pl-11 pr-4 py-3 bg-[#f8faf8] text-[#1b382b] rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] outline-none transition-all placeholder:text-[#7a9386] text-sm font-medium"
              />
            </Field>

            <Field label="Password" icon={<Lock size={18} />}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-[#f8faf8] text-[#1b382b] rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] outline-none transition-all placeholder:text-[#7a9386] text-sm font-medium"
              />
            </Field>

            {error && (
              <div className="space-y-2">
                <ErrorBanner message={error} />
                <div className="flex flex-wrap gap-2 text-xs">
                  {error.toLowerCase().includes('email not confirmed') ? (
                    <button
                      type="button"
                      onClick={() => handleRequestOtp()}
                      className="w-full py-2.5 px-3 rounded-2xl bg-[#2d6a4f] hover:bg-[#23533e] text-white font-bold text-xs shadow-soft flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound size={15} /> Send OTP & Enter with 6-Digit Code ➔
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setPassword('');
                        }}
                        className="px-2.5 py-1 rounded-xl bg-[#eaf2ec] text-[#2d6a4f] hover:bg-[#dde8df] font-bold cursor-pointer"
                      >
                        Try Again
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setMode('otp_request');
                        }}
                        className="px-2.5 py-1 rounded-xl bg-[#eaf2ec] text-[#2d6a4f] hover:bg-[#dde8df] font-bold cursor-pointer"
                      >
                        Login with OTP
                      </button>
                      <Link
                        to="/reset"
                        className="px-2.5 py-1 rounded-xl bg-[#f4f8f5] text-[#5b7566] hover:text-[#1b382b] font-semibold border border-[#d8e5dc]"
                      >
                        Forgot Password?
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('otp_request');
                }}
                className="text-[#2d6a4f] hover:underline font-bold transition-colors flex items-center gap-1"
              >
                <KeyRound size={13} /> Login with OTP
              </button>
              <Link to="/reset" className="text-[#5b7566] hover:text-[#1b382b] font-semibold transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black tracking-wide rounded-2xl shadow-soft transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {loading ? 'Entering Petslyvia...' : <>LOG IN <ArrowRight size={18} /></>}
            </button>
          </motion.form>
        )}

        {mode === 'otp_request' && (
          <motion.form
            key="login-otp-request"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onSubmit={handleRequestOtp}
            className="space-y-4"
          >
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 leading-relaxed">
              🔑 <strong>Passwordless Login:</strong> We will send a secure 6-digit one-time code to your registered email address.
            </div>

            <Field label="Registered Email" icon={<Mail size={18} />}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@petslyvia.world"
                className="w-full pl-11 pr-4 py-3 bg-slate-900/60 text-white rounded-xl border border-slate-700/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all placeholder:text-slate-500 text-sm"
              />
            </Field>

            {error && <ErrorBanner message={error} />}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Sending Code...' : <>SEND OTP CODE <ArrowRight size={18} /></>}
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setMode('password');
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-1"
            >
              ← Back to Password Login
            </button>
          </motion.form>
        )}

        {mode === 'otp_verify' && (
          <motion.form
            key="login-otp-verify"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onSubmit={handleVerifyOtp}
            className="space-y-4"
          >
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <CheckCircle2 size={14} className="text-emerald-400" /> Code Dispatched
              </div>
              We sent a 6-digit verification code to <span className="text-white font-mono">{email}</span>.
            </div>

            {demoCodeHint && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                <span>⚡ Test OTP Code: <strong className="text-white tracking-widest font-mono text-sm">{demoCodeHint}</strong></span>
                <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-200 font-bold">Auto-filled</span>
              </div>
            )}

            <Field label="6-Digit Verification Code" icon={<KeyRound size={18} />}>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full pl-11 pr-4 py-3 bg-slate-900/60 text-white font-mono text-center tracking-[0.4em] text-lg rounded-xl border border-slate-700/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all placeholder:tracking-normal placeholder:text-slate-500"
              />
            </Field>

            {error && <ErrorBanner message={error} />}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleRequestOtp()}
                disabled={loading}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} /> RESEND OTP
              </button>
              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? 'Verifying...' : 'VERIFY & ENTER'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setError('');
                setMode('password');
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-1"
            >
              ← Back to Password Login
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-900/90 px-3 text-slate-400 font-semibold tracking-wider">OR</span>
        </div>
      </div>

      {/* Option C: Google Sign-in */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-3 bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-sm rounded-xl border border-slate-700/80 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:border-slate-600"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Continue with Google
      </button>

      {/* Footer Link */}
      <p className="text-center text-xs text-slate-400 mt-6">
        Don't have an account yet?{' '}
        <Link to="/signup" className="font-bold text-amber-400 hover:text-amber-300">
          CREATE ACCOUNT
        </Link>
      </p>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={() => navigate('/app')}
      />
    </AuthShell>
  );
}

const DEFAULT_PET_NAMES: Record<PetType, string> = {
  fox: 'Sparky',
  cat: 'Whiskers',
  dog: 'Buddy',
  bunny: 'Hoppy',
  panda: 'Bamboo',
  koala: 'Koko',
  hamster: 'Nibbles',
  penguin: 'Pippin',
};

// ----------------------------------------------------
// SIGN UP PAGE (ONE EMAIL = ONE ACCOUNT)
// ----------------------------------------------------
export function SignupPage() {
  const navigate = useNavigate();
  const { signupWithEmail } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedPetType, setSelectedPetType] = useState<PetType>('fox');
  const [petName, setPetName] = useState('Sparky');
  const [hasCustomPetName, setHasCustomPetName] = useState(false);
  const [role, setRole] = useState<'non_coder' | 'coder'>('non_coder');
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const [error, setError] = useState('');
  const [isExistingAccountError, setIsExistingAccountError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsExistingAccountError(false);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      sound.playError();
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      sound.playError();
      return;
    }

    setLoading(true);
    sound.playClick();

    const res = await signupWithEmail(email, password, displayName, selectedPetType, petName, role);
    setLoading(false);

    if (res.success) {
      sound.playEvolve();
      navigate('/app');
    } else {
      sound.playError();
      setError(res.error || 'Could not create account.');
      if (res.error?.includes('already registered')) {
        setIsExistingAccountError(true);
      }
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    sound.playClick();
    setShowGoogleModal(true);
  };

  return (
    <AuthShell
      title="Create Your Player Account"
      subtitle="One email = One account = One companion pet. Begin your logic journey!"
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Player Nickname" icon={<Compass size={16} />}>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Nova_Dev"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 text-white rounded-xl border border-slate-700/80 focus:border-amber-400 outline-none text-xs"
            />
          </Field>

          <Field label="Companion Name" icon={<Heart size={16} />}>
            <input
              type="text"
              required
              value={petName}
              onChange={(e) => {
                setPetName(e.target.value);
                setHasCustomPetName(true);
              }}
              placeholder={`e.g. ${DEFAULT_PET_NAMES[selectedPetType] || 'Buddy'}`}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 text-white rounded-xl border border-slate-700/80 focus:border-amber-400 outline-none text-xs"
            />
          </Field>
        </div>

        {/* Pet Selection Carousel / Palette */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Choose Your First Infant Pet:
          </label>
          <div className="grid grid-cols-4 gap-2 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
            {PET_LIST.map((p) => {
              const isSelected = selectedPetType === p.type;
              return (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => {
                    setSelectedPetType(p.type);
                    if (!hasCustomPetName) {
                      setPetName(DEFAULT_PET_NAMES[p.type] || p.name);
                    }
                    sound.playStep();
                  }}
                  className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 scale-105 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-xl mb-1">{p.emoji}</span>
                  <span className="text-[11px] font-bold text-white capitalize">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Pet Preview Badge */}
        <div className="flex items-center justify-center p-3 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 rounded-2xl border border-slate-700/60 gap-4">
          <PetSVG type={selectedPetType} stage="infant" state="happy" size={70} />
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Infant Stage Companion</span>
            <p className="font-extrabold text-sm text-white">{petName || 'Your Pet'}</p>
            <p className="text-[11px] text-slate-400">Starting Ability: Runner ⚡ · 100 Energy</p>
          </div>
        </div>

        {/* Player Track / Role Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Select Your Learning Track / Role:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setRole('non_coder');
                sound.playClick();
              }}
              className={`p-3 rounded-2xl border text-left transition-all ${
                role === 'non_coder'
                  ? 'bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  🧩 Non-Coder
                </span>
                {role === 'non_coder' && (
                  <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Visual Explorer. Learn logic through directional arrows & visual blocks.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('coder');
                sound.playClick();
              }}
              className={`p-3 rounded-2xl border text-left transition-all ${
                role === 'coder'
                  ? 'bg-indigo-500/15 border-indigo-400 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  💻 Coder / Pioneer
                </span>
                {role === 'coder' && (
                  <span className="text-[10px] bg-indigo-500 text-white font-black px-1.5 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Code Pioneer. Unlock direct Python & JavaScript editors and syntax challenges.
              </p>
            </button>
          </div>
        </div>

        <Field label="Email Address" icon={<Mail size={16} />}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="player@petslyvia.world"
            className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 text-white rounded-xl border border-slate-700/80 focus:border-amber-400 outline-none text-xs"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" icon={<Lock size={16} />}>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 chars"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 text-white rounded-xl border border-slate-700/80 focus:border-amber-400 outline-none text-xs"
            />
          </Field>

          <Field label="Confirm Password" icon={<ShieldCheck size={16} />}>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 text-white rounded-xl border border-slate-700/80 focus:border-amber-400 outline-none text-xs"
            />
          </Field>
        </div>

        {error && (
          <div>
            <ErrorBanner message={error} />
            {isExistingAccountError && (
              <div className="mt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs"
                >
                  LOG IN TO EXISTING ACCOUNT <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black tracking-wide rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? 'Initializing Player...' : <>CREATE ACCOUNT & ADOPT PET <ArrowRight size={18} /></>}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-900/90 px-3 text-slate-400 font-semibold">OR</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Continue with Google
      </button>

      <p className="text-center text-xs text-slate-400 mt-5">
        Already registered?{' '}
        <Link to="/login" className="font-bold text-amber-400 hover:text-amber-300">
          LOG IN
        </Link>
      </p>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={() => navigate('/app')}
      />
    </AuthShell>
  );
}

// ----------------------------------------------------
// RESET PASSWORD PAGE
// ----------------------------------------------------
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { requestOtp, resetPasswordWithOtp } = useAuth();

  const [step, setStep] = useState<'request' | 'verify_and_set'>('request');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    sound.playClick();

    const res = await requestOtp(email);
    setLoading(false);

    if (res.success) {
      if (res.testOtpCode) {
        setDemoCode(res.testOtpCode);
        setOtpCode(res.testOtpCode);
      }
      setStep('verify_and_set');
      sound.playCrystal();
    } else {
      sound.playError();
      setError(res.error || 'No registered account found with this email.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    sound.playClick();

    const res = await resetPasswordWithOtp(email, otpCode, newPassword);
    setLoading(false);

    if (res.success) {
      sound.playVictory();
      setSuccess(true);
    } else {
      sound.playError();
      setError(res.error || 'Invalid OTP code.');
    }
  };

  return (
    <AuthShell
      title="Password Recovery"
      subtitle="Verify your registered email with a 6-digit code to securely set a new password."
    >
      {success ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h3 className="font-extrabold text-lg text-white">Password Reset Successfully!</h3>
          <p className="text-xs text-slate-400">
            Your credentials have been updated. All your pets, coins, XP, and mission progress remain completely intact.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 font-bold text-slate-950 rounded-xl text-sm"
          >
            RETURN TO LOG IN
          </button>
        </div>
      ) : step === 'request' ? (
        <form onSubmit={handleSendRecoveryCode} className="space-y-4">
          <Field label="Registered Email" icon={<Mail size={18} />}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@petslyvia.world"
              className="w-full pl-11 pr-4 py-3 bg-slate-900/60 text-white rounded-xl border border-slate-700/80 focus:border-amber-400 outline-none text-sm"
            />
          </Field>

          {error && <ErrorBanner message={error} />}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Sending Code...' : 'SEND RECOVERY CODE'}
          </button>

          <p className="text-center text-xs text-slate-400 pt-2">
            Remembered your password?{' '}
            <Link to="/login" className="text-amber-400 font-bold">Log in</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200">
            Code sent to <span className="text-white font-mono">{email}</span>.
          </div>

          {demoCode && (
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
              <span>⚡ Recovery Code: <strong className="text-white tracking-widest font-mono text-sm">{demoCode}</strong></span>
              <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-200 font-bold">Auto-filled</span>
            </div>
          )}

          <Field label="6-Digit Recovery Code" icon={<KeyRound size={18} />}>
            <input
              type="text"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full pl-11 pr-4 py-3 bg-slate-900/60 text-white font-mono text-center tracking-[0.4em] text-lg rounded-xl border border-slate-700/80 focus:border-amber-400 outline-none"
            />
          </Field>

          <Field label="New Password" icon={<Lock size={18} />}>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full pl-11 pr-4 py-3 bg-slate-900/60 text-white rounded-xl border border-slate-700/80 focus:border-amber-400 outline-none text-sm"
            />
          </Field>

          {error && <ErrorBanner message={error} />}

          <button
            type="submit"
            disabled={loading || otpCode.length < 6}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : 'SET NEW PASSWORD'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

// ----------------------------------------------------
// AUTH SHELL & REUSABLE UI
// ----------------------------------------------------
function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f8f5] text-[#1b382b] flex items-center justify-center px-4 py-10 relative overflow-hidden font-sans">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Header */}
        <Link to="/" className="flex flex-col items-center justify-center gap-1.5 mb-6 group">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#1e3a2b] group-hover:scale-110 transition-transform"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#2e6849] group-hover:scale-110 transition-transform"></div>
              <div className="w-2 h-2 rounded-full bg-[#52936f] group-hover:scale-110 transition-transform"></div>
            </div>
            <span className="font-black text-2xl tracking-tight text-[#1b382b]">
              petslyvia<span className="text-[#2d6a4f]">.</span>
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#7a9386] tracking-[0.18em] uppercase">
            A LITTLE PLAY. A LOT OF POSSIBILITY.
          </span>
        </Link>

        {/* Card Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e2ece5] shadow-card relative">
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-[#1b382b]">{title}</h1>
            <p className="text-xs text-[#5b7566] mt-1.5 leading-relaxed font-medium">{subtitle}</p>
          </div>

          {children}
        </div>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#1b382b] mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a9386] pointer-events-none">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
      <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
      <span>{message}</span>
    </div>
  );
}
