import React, { useState, useEffect } from 'react';
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
  const { user, logout, loginWithPassword, requestOtp, verifyOtpAndLogin } = useAuth();

  const [mode, setMode] = useState<'password' | 'otp_request' | 'otp_verify'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto redirect if user is authenticated (e.g. from magic link or session)
  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  // Cooldown countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
    if (resendCooldown > 0) {
      setError(`Please wait ${resendCooldown}s before requesting a new verification code.`);
      return;
    }
    setError('');
    setLoading(true);
    sound.playClick();

    const res = await requestOtp(email);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(res.message);
      setResendCooldown(60);
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

  // Google Sign-In — Always prompts the user to enter or select their Google email address!
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
      {user && (
        <div className="mb-5 p-4 bg-[#eaf2ec] border border-[#d8e5dc] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[#5b7566] block text-[10px] font-bold uppercase tracking-wider">Currently Logged In</span>
            <span className="font-black text-[#1b382b] text-sm">{user.email}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="px-3.5 py-2 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-xl font-black text-xs cursor-pointer shadow-soft"
            >
              Continue to App →
            </button>
            <button
              type="button"
              onClick={async () => {
                sound.playClick();
                await logout();
                setEmail('');
                setPassword('');
              }}
              className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-[#d8e5dc] rounded-xl font-bold text-xs cursor-pointer shadow-soft"
            >
              Switch Email
            </button>
          </div>
        </div>
      )}

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
                className="text-[#2d6a4f] hover:underline font-bold transition-colors flex items-center gap-1 cursor-pointer"
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
              className="w-full py-3.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black tracking-wide rounded-2xl shadow-soft transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
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
            <div className="p-3.5 bg-[#eef8f2] border border-[#bfe2ce] rounded-2xl text-xs text-[#1e583d] font-medium leading-relaxed flex items-start gap-2.5">
              <KeyRound size={16} className="text-[#2d6a4f] shrink-0 mt-0.5" />
              <span>
                <strong>Passwordless Login:</strong> We will send a secure 6-digit verification code and instant magic link directly to your registered email address.
              </span>
            </div>

            <Field label="Registered Email" icon={<Mail size={18} />}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@petslyvia.world"
                className="w-full pl-11 pr-4 py-3 bg-[#f8faf8] text-[#1b382b] rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] outline-none transition-all placeholder:text-[#7a9386] text-sm font-medium"
              />
            </Field>

            {error && <ErrorBanner message={error} />}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black tracking-wide rounded-2xl shadow-soft transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              {loading ? 'Sending Code...' : <>SEND OTP CODE <ArrowRight size={18} /></>}
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setMode('password');
              }}
              className="w-full text-center text-xs text-[#5b7566] hover:text-[#1b382b] font-bold pt-1 transition-colors cursor-pointer"
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
            {/* Verification Status */}
            <div className="p-3.5 bg-[#eef8f2] border border-[#bfe2ce] rounded-2xl text-xs text-[#1e583d] font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#1e583d]">
                <CheckCircle2 size={16} className="text-[#2d6a4f]" /> Verification Email Dispatched
              </div>
              <p className="text-[#2a503c] leading-relaxed">
                We sent a verification email with your code & login link to{' '}
                <span className="font-mono font-bold text-[#13402b] bg-white px-2 py-0.5 rounded border border-[#cde5d7]">
                  {email}
                </span>
              </p>
            </div>

            {/* Gmail Deliverability Alert with high contrast */}
            <div className="p-3.5 bg-[#fef9ee] border border-[#f4dfb4] rounded-2xl text-xs text-[#6d4c13] font-medium space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-[#8a5d12]">
                <Mail size={15} className="text-[#b45309]" /> Check Spam / Junk & Promotions:
              </div>
              <p className="text-[#6d4c13] text-xs leading-relaxed">
                Automated security emails often route into your <strong>Spam / Junk</strong> folder or <strong>Promotions</strong> tab. Check there or search for <span className="font-mono font-bold text-[#553b0c]">noreply@mail.app.supabase.io</span>.
              </p>
              <p className="text-[#8a5d12] text-[11px] font-semibold">
                Tip: You can either enter the 6-digit code below or click the "Log In" link directly in your email!
              </p>
            </div>

            <Field label="6-Digit Verification Code" icon={<KeyRound size={18} />}>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full pl-11 pr-4 py-3.5 bg-[#f8faf8] text-[#1b382b] font-mono text-center tracking-[0.35em] text-xl font-bold rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20 outline-none transition-all placeholder:text-[#9bb3a6] placeholder:tracking-normal placeholder:text-sm"
              />
            </Field>

            {error && <ErrorBanner message={error} />}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleRequestOtp()}
                disabled={loading || resendCooldown > 0}
                className="py-3 bg-white hover:bg-[#f0f6f2] text-[#2d6a4f] text-xs font-bold rounded-2xl border border-[#d8e5dc] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-soft transition-all active:scale-[0.98]"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'RESEND CODE'}
              </button>
              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="py-3 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-xs tracking-wide rounded-2xl shadow-soft transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
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
              className="w-full text-center text-xs text-[#5b7566] hover:text-[#1b382b] font-bold py-1 transition-colors cursor-pointer"
            >
              ← Back to Password Login
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#d8e5dc]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white border border-[#d8e5dc] px-3 py-0.5 text-[#7a9386] font-bold text-[10px] tracking-wider rounded-full">OR</span>
        </div>
      </div>

      {/* Google Sign-in */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-3 bg-white hover:bg-[#f8faf8] text-[#1b382b] font-bold text-sm rounded-2xl border border-[#d8e5dc] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-soft hover:border-[#b8dec8] active:scale-[0.98]"
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
      <p className="text-center text-xs text-[#5b7566] mt-6 font-medium">
        Don't have an account yet?{' '}
        <Link to="/signup" className="font-black text-[#2d6a4f] hover:text-[#1b382b] underline decoration-[#2d6a4f]/30">
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
  const { user, logout, signupWithEmail, loginWithGoogleAccount } = useAuth();

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
      const errLower = (res.error || '').toLowerCase();
      if (errLower.includes('already registered') || errLower.includes('already exists') || errLower.includes('one email')) {
        setIsExistingAccountError(true);
      }
    }
  };

  // Google Sign-Up — Always prompts user to enter or choose their Google email address!
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
      {user && (
        <div className="mb-5 p-4 bg-[#eaf2ec] border border-[#d8e5dc] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[#5b7566] block text-[10px] font-bold uppercase tracking-wider">Currently Logged In</span>
            <span className="font-black text-[#1b382b] text-sm">{user.email}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="px-3.5 py-2 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-xl font-black text-xs cursor-pointer shadow-soft"
            >
              Continue to App →
            </button>
            <button
              type="button"
              onClick={async () => {
                sound.playClick();
                await logout();
                setEmail('');
                setPassword('');
              }}
              className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-[#d8e5dc] rounded-xl font-bold text-xs cursor-pointer shadow-soft"
            >
              Switch Email
            </button>
          </div>
        </div>
      )}
      <form onSubmit={handleSignup} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Player Nickname" icon={<Compass size={16} />}>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Nova_Dev"
              className="w-full pl-9 pr-3 py-2.5 bg-[#f8faf8] text-[#1b382b] rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] outline-none text-xs font-medium placeholder:text-[#7a9386]"
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
              className="w-full pl-9 pr-3 py-2.5 bg-[#f8faf8] text-[#1b382b] rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] outline-none text-xs font-medium placeholder:text-[#7a9386]"
            />
          </Field>
        </div>

        {/* Pet Selection Carousel / Palette */}
        <div>
          <label className="block text-xs font-bold text-[#1b382b] mb-1.5">
            Choose Your First Companion Pet:
          </label>
          <div className="grid grid-cols-4 gap-2 bg-[#f8faf8] p-2.5 rounded-2xl border border-[#d8e5dc]">
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
                  className={`flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#eef8f2] border-[#2d6a4f] scale-105 shadow-soft text-[#1b382b]'
                      : 'bg-white border-[#d8e5dc] hover:border-[#b8dec8] text-[#5b7566]'
                  }`}
                >
                  <span className="text-xl mb-1">{p.emoji}</span>
                  <span className="text-[11px] font-bold capitalize">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Pet Preview Badge */}
        <div className="flex items-center justify-center p-3.5 bg-[#eef8f2] rounded-2xl border border-[#bfe2ce] gap-4">
          <PetSVG type={selectedPetType} stage="infant" state="happy" size={70} />
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#2d6a4f]">Infant Companion</span>
            <p className="font-black text-sm text-[#1b382b]">{petName || 'Your Pet'}</p>
            <p className="text-[11px] text-[#5b7566] font-medium">Starting Ability: Runner ⚡ · 100 Energy</p>
          </div>
        </div>

        {/* Player Track / Role Selection */}
        <div>
          <label className="block text-xs font-bold text-[#1b382b] mb-1.5">
            Select Your Learning Track / Role:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setRole('non_coder');
                sound.playClick();
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                role === 'non_coder'
                  ? 'bg-[#eef8f2] border-[#2d6a4f] shadow-soft'
                  : 'bg-white border-[#d8e5dc] hover:border-[#b8dec8]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-[#1b382b] flex items-center gap-1.5">
                  🧩 Non-Coder
                </span>
                {role === 'non_coder' && (
                  <span className="text-[10px] bg-[#2d6a4f] text-white font-bold px-1.5 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#5b7566] leading-tight font-medium">
                Visual Explorer. Learn logic through directional arrows & visual blocks.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('coder');
                sound.playClick();
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                role === 'coder'
                  ? 'bg-[#eef8f2] border-[#2d6a4f] shadow-soft'
                  : 'bg-white border-[#d8e5dc] hover:border-[#b8dec8]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-[#1b382b] flex items-center gap-1.5">
                  💻 Coder / Pioneer
                </span>
                {role === 'coder' && (
                  <span className="text-[10px] bg-[#2d6a4f] text-white font-bold px-1.5 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#5b7566] leading-tight font-medium">
                Code Pioneer. Unlock direct Python, JavaScript & C syntax challenges.
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
            className="w-full pl-9 pr-3 py-2.5 bg-[#f8faf8] text-[#1b382b] rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] outline-none text-xs font-medium placeholder:text-[#7a9386]"
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
              className="w-full pl-9 pr-3 py-2.5 bg-[#f8faf8] text-[#1b382b] rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] outline-none text-xs font-medium placeholder:text-[#7a9386]"
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
              className="w-full pl-9 pr-3 py-2.5 bg-[#f8faf8] text-[#1b382b] rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] outline-none text-xs font-medium placeholder:text-[#7a9386]"
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-bold rounded-xl text-xs shadow-soft transition-all"
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
          className="w-full py-3.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black tracking-wide rounded-2xl shadow-soft transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          {loading ? 'Initializing Player...' : <>CREATE ACCOUNT & ADOPT PET <ArrowRight size={18} /></>}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#d8e5dc]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white border border-[#d8e5dc] px-3 py-0.5 text-[#7a9386] font-bold text-[10px] tracking-wider rounded-full">OR</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full py-3 bg-white hover:bg-[#f8faf8] text-[#1b382b] font-bold text-sm rounded-2xl border border-[#d8e5dc] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-soft hover:border-[#b8dec8] active:scale-[0.98]"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Continue with Google
      </button>

      <p className="text-center text-xs text-[#5b7566] mt-5 font-medium">
        Already registered?{' '}
        <Link to="/login" className="font-black text-[#2d6a4f] hover:text-[#1b382b] underline decoration-[#2d6a4f]/30">
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
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendRecoveryCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    if (resendCooldown > 0) {
      setError(`Please wait ${resendCooldown}s before requesting a new code.`);
      return;
    }
    setError('');
    setLoading(true);
    sound.playClick();

    const res = await requestOtp(email);
    setLoading(false);

    if (res.success) {
      setResendCooldown(60);
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
          <div className="w-14 h-14 rounded-2xl bg-[#eef8f2] border border-[#bfe2ce] flex items-center justify-center mx-auto shadow-soft">
            <CheckCircle2 size={32} className="text-[#2d6a4f]" />
          </div>
          <h3 className="font-black text-xl text-[#1b382b]">Password Reset Successfully!</h3>
          <p className="text-xs text-[#5b7566] leading-relaxed font-medium">
            Your credentials have been updated. All your pets, coins, XP, and mission progress remain completely intact.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3.5 bg-[#2d6a4f] hover:bg-[#23533e] font-black text-white rounded-2xl text-sm shadow-soft transition-all cursor-pointer active:scale-[0.98]"
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
              className="w-full pl-11 pr-4 py-3 bg-[#f8faf8] text-[#1b382b] rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] outline-none text-sm font-medium placeholder:text-[#7a9386]"
            />
          </Field>

          {error && <ErrorBanner message={error} />}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black rounded-2xl text-sm shadow-soft transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
          >
            {loading ? 'Sending Code...' : 'SEND RECOVERY CODE'}
          </button>

          <p className="text-center text-xs text-[#5b7566] pt-2 font-medium">
            Remembered your password?{' '}
            <Link to="/login" className="text-[#2d6a4f] font-black hover:text-[#1b382b] underline decoration-[#2d6a4f]/30">
              Log in
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="p-3.5 bg-[#eef8f2] border border-[#bfe2ce] rounded-2xl text-xs text-[#1e583d] font-medium space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#1e583d]">
              <CheckCircle2 size={16} className="text-[#2d6a4f]" /> Verification Email Dispatched
            </div>
            <p className="text-[#2a503c] leading-relaxed">
              Recovery code dispatched to{' '}
              <span className="font-mono font-bold text-[#13402b] bg-white px-2 py-0.5 rounded border border-[#cde5d7]">
                {email}
              </span>
            </p>
          </div>

          {/* Gmail deliverability alert */}
          <div className="p-3.5 bg-[#fef9ee] border border-[#f4dfb4] rounded-2xl text-xs text-[#6d4c13] font-medium space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-[#8a5d12]">
              <Mail size={15} className="text-[#b45309]" /> Check Spam / Junk & Promotions:
            </div>
            <p className="text-[#6d4c13] text-xs leading-relaxed">
              Automated security emails frequently land in your <strong>Spam / Junk</strong> folder or <strong>Promotions</strong> tab. Please check those folders or search for <span className="text-[#553b0c] font-mono font-bold">noreply@mail.app.supabase.io</span>.
            </p>
          </div>

          <Field label="6-Digit Recovery Code" icon={<KeyRound size={18} />}>
            <input
              type="text"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full pl-11 pr-4 py-3.5 bg-[#f8faf8] text-[#1b382b] font-mono text-center tracking-[0.35em] text-xl font-bold rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20 outline-none transition-all placeholder:text-[#9bb3a6] placeholder:tracking-normal placeholder:text-sm"
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
              className="w-full pl-11 pr-4 py-3 bg-[#f8faf8] text-[#1b382b] rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] outline-none text-sm font-medium placeholder:text-[#7a9386]"
            />
          </Field>

          {error && <ErrorBanner message={error} />}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleSendRecoveryCode()}
              disabled={loading || resendCooldown > 0}
              className="py-3 bg-white hover:bg-[#f0f6f2] text-[#2d6a4f] text-xs font-bold rounded-2xl border border-[#d8e5dc] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-soft transition-all active:scale-[0.98]"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'RESEND CODE'}
            </button>
            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="py-3 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-xs tracking-wide rounded-2xl shadow-soft transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? 'Updating...' : 'SET PASSWORD'}
            </button>
          </div>
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
