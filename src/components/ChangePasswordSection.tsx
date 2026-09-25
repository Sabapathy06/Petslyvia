import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, Lock, Eye, EyeOff, ShieldCheck, Check,
  AlertCircle, RefreshCw, X, ArrowRight, ShieldAlert, Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { evaluatePasswordStrength, maskEmail } from '@/utils/passwordSecurity';
import { sound } from '@/utils/audio';

export function ChangePasswordSection() {
  const {
    user,
    profile,
    initiateChangePassword,
    verifyChangePasswordOtp,
    resendChangePasswordOtp,
    completePasswordChange,
    cancelChangePasswordSession,
  } = useAuth();

  const userEmail = user?.email || profile?.email || '';

  // Form Fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Flow & Modal State
  const [stage, setStage] = useState<'form' | 'otp_modal' | 'success'>('form');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // OTP limits & timer
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresInSeconds, setExpiresInSeconds] = useState(300); // 5 min
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [isLocked, setIsLocked] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  // Strength evaluation
  const strength = evaluatePasswordStrength(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferentFromCurrent = currentPassword.length > 0 && newPassword !== currentPassword;

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Expiration countdown timer during OTP modal
  useEffect(() => {
    if (stage !== 'otp_modal' || expiresInSeconds <= 0) return;
    const timer = setInterval(() => {
      setExpiresInSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, expiresInSeconds]);

  // Format expiration seconds as M:SS
  const formatExpiration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Submit Change Password Request -> Validate & Dispatch OTP
  const handleInitiateChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    sound.playClick();

    if (!currentPassword) {
      setError('Please enter your current password.');
      sound.playError();
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      sound.playError();
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      sound.playError();
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from current password.');
      sound.playError();
      return;
    }

    if (!strength.isValid) {
      setError('Please fulfill all 5 password security requirements.');
      sound.playError();
      return;
    }

    setLoading(true);
    const res = await initiateChangePassword(currentPassword, newPassword, confirmPassword);
    setLoading(false);

    if (res.success) {
      setMaskedEmail(res.maskedEmail || maskEmail(userEmail));
      setExpiresInSeconds(300);
      setAttemptsRemaining(5);
      setIsLocked(false);
      setResendCooldown(res.cooldownSeconds || 60);
      setOtpCode('');
      setStage('otp_modal');
      sound.playCrystal();
    } else {
      sound.playError();
      setError(res.error || 'Failed to initiate password change.');
    }
  };

  // 2. Verify OTP & Complete Password Change
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    sound.playClick();

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter the full 6-digit OTP code.');
      sound.playError();
      return;
    }

    if (expiresInSeconds <= 0) {
      setError('This OTP has expired. Please request a new one.');
      sound.playError();
      return;
    }

    setLoading(true);
    const verifyRes = await verifyChangePasswordOtp(otpCode);

    if (!verifyRes.success) {
      setLoading(false);
      sound.playError();
      setError(verifyRes.error || 'Invalid OTP code.');
      if (typeof verifyRes.attemptsRemaining === 'number') {
        setAttemptsRemaining(verifyRes.attemptsRemaining);
      }
      if (verifyRes.isLocked) {
        setIsLocked(true);
      }
      return;
    }

    // OTP Verified! Complete the password update
    sound.playVictory();
    setStage('success');

    const updateRes = await completePasswordChange(verifyRes.verificationToken || '', newPassword);
    setLoading(false);

    if (updateRes.success) {
      setSuccessMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');

      // Auto return to form after celebration
      setTimeout(() => {
        setStage('form');
        setTimeout(() => setSuccessMessage(''), 5000);
      }, 2500);
    } else {
      sound.playError();
      setError(updateRes.error || 'Failed to update password.');
      setStage('otp_modal');
    }
  };

  // 3. Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    sound.playClick();
    setLoading(true);

    const res = await resendChangePasswordOtp();
    setLoading(false);

    if (res.success) {
      setResendCooldown(res.cooldownSeconds || 60);
      setExpiresInSeconds(300);
      setAttemptsRemaining(5);
      setIsLocked(false);
      setOtpCode('');
      sound.playCrystal();
    } else {
      sound.playError();
      setError(res.error || 'Could not resend OTP. Please wait.');
    }
  };

  // Cancel OTP modal
  const handleCancelModal = () => {
    sound.playClick();
    cancelChangePasswordSession();
    setStage('form');
    setError('');
    setOtpCode('');
  };

  return (
    <div className="p-6 rounded-3xl bg-white border border-[#e2ece5] shadow-card space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-[#1b382b] flex items-center gap-2">
          <KeyRound size={18} className="text-[#2d6a4f]" /> Change Password
        </h2>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#eef8f2] text-[#1e583d] border border-[#bfe2ce]">
          OTP Verified Security
        </span>
      </div>

      {successMessage && (
        <div className="p-3 bg-[#eef8f2] border border-[#bfe2ce] text-[#1e583d] text-xs font-bold rounded-2xl flex items-center gap-2 shadow-soft">
          <Check size={16} className="text-[#2d6a4f]" />
          <span>✓ {successMessage}</span>
        </div>
      )}

      {error && stage === 'form' && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-start gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Password Input Form */}
      <form onSubmit={handleInitiateChangePassword} className="space-y-4">
        {/* Current Password */}
        <div>
          <label className="text-xs font-bold text-[#1b382b] block mb-1">Current Password:</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#f8faf8] border border-[#d8e5dc] rounded-2xl pl-3.5 pr-10 py-2.5 text-sm text-[#1b382b] font-medium outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] transition-all placeholder:text-[#9bb3a6]"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a9386] hover:text-[#1b382b] cursor-pointer"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="text-xs font-bold text-[#1b382b] block mb-1">New Password:</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters with numbers & symbols"
              className="w-full bg-[#f8faf8] border border-[#d8e5dc] rounded-2xl pl-3.5 pr-10 py-2.5 text-sm text-[#1b382b] font-medium outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] transition-all placeholder:text-[#9bb3a6]"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a9386] hover:text-[#1b382b] cursor-pointer"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Password Strength Checker */}
        {newPassword.length > 0 && (
          <div className="p-3.5 bg-[#f8faf8] border border-[#d8e5dc] rounded-2xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1b382b]">Password Strength:</span>
              <span className="font-black text-xs px-2 py-0.5 rounded-md font-mono" style={{ color: strength.color }}>
                {strength.level} ({strength.score}/5)
              </span>
            </div>

            {/* Segmented Strength Bar */}
            <div className="grid grid-cols-5 gap-1.5 h-2">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className="rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: idx <= strength.score ? strength.color : '#e2ece5',
                  }}
                />
              ))}
            </div>

            {/* Terminal Style Visual Bar as Requested */}
            <div className="text-[11px] font-mono tracking-widest font-bold" style={{ color: strength.color }}>
              {strength.barText}
            </div>

            {/* 5 Security Rules Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
              <div className={`flex items-center gap-1.5 font-medium ${strength.rules.minLength ? 'text-emerald-700' : 'text-[#7a9386]'}`}>
                <span>{strength.rules.minLength ? '✓' : '○'}</span> Minimum 8 characters
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${strength.rules.hasUppercase ? 'text-emerald-700' : 'text-[#7a9386]'}`}>
                <span>{strength.rules.hasUppercase ? '✓' : '○'}</span> Uppercase letter (A-Z)
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${strength.rules.hasLowercase ? 'text-emerald-700' : 'text-[#7a9386]'}`}>
                <span>{strength.rules.hasLowercase ? '✓' : '○'}</span> Lowercase letter (a-z)
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${strength.rules.hasNumber ? 'text-emerald-700' : 'text-[#7a9386]'}`}>
                <span>{strength.rules.hasNumber ? '✓' : '○'}</span> Number (0-9)
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${strength.rules.hasSpecialChar ? 'text-emerald-700' : 'text-[#7a9386]'}`}>
                <span>{strength.rules.hasSpecialChar ? '✓' : '○'}</span> Special character (!@#$)
              </div>
            </div>
          </div>
        )}

        {/* Confirm Password */}
        <div>
          <label className="text-xs font-bold text-[#1b382b] block mb-1">Confirm New Password:</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#f8faf8] border border-[#d8e5dc] rounded-2xl pl-3.5 pr-10 py-2.5 text-sm text-[#1b382b] font-medium outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] transition-all placeholder:text-[#9bb3a6]"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a9386] hover:text-[#1b382b] cursor-pointer"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmPassword.length > 0 && (
            <p className={`text-[11px] mt-1 font-bold ${passwordsMatch ? 'text-emerald-700' : 'text-rose-600'}`}>
              {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !currentPassword || !newPassword || !confirmPassword || !passwordsMatch || !strength.isValid}
          className="w-full py-3 bg-[#2d6a4f] hover:bg-[#23533e] disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-soft transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {loading ? (
            <>
              <RefreshCw size={15} className="animate-spin" /> Verifying Credentials...
            </>
          ) : (
            <>
              CHANGE PASSWORD <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {stage === 'otp_modal' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white border border-[#e2ece5] rounded-3xl shadow-card p-6 sm:p-7 space-y-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#e2ece5]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#eef8f2] border border-[#bfe2ce] flex items-center justify-center text-[#2d6a4f]">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1b382b]">Verify Your Email</h3>
                    <p className="text-[11px] text-[#5b7566] font-medium">One-Time Password Verification</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelModal}
                  className="p-1.5 text-[#7a9386] hover:text-[#1b382b] hover:bg-[#f4f8f5] rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Instructions */}
              <div className="p-3.5 bg-[#eef8f2] border border-[#bfe2ce] rounded-2xl text-xs space-y-1">
                <p className="text-[#1e583d] font-bold">
                  We've sent a 6-digit OTP to your registered email:
                </p>
                <p className="font-mono font-black text-sm text-[#13402b]">
                  {maskedEmail}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* OTP Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1b382b] mb-1.5 text-center">
                    Enter 6-Digit OTP:
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    disabled={isLocked || expiresInSeconds <= 0}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="[ _ _ _ _ _ _ ]"
                    className="w-full py-3.5 bg-[#f8faf8] text-[#1b382b] font-mono font-bold text-center tracking-[0.4em] text-2xl rounded-2xl border border-[#d8e5dc] focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20 outline-none transition-all placeholder:text-[#9bb3a6] placeholder:tracking-normal placeholder:text-base disabled:opacity-50"
                  />
                </div>

                {/* Expiration and Security Limits */}
                <div className="flex items-center justify-between text-xs px-1">
                  <span className={`font-bold flex items-center gap-1 ${expiresInSeconds <= 60 ? 'text-rose-600 animate-pulse' : 'text-[#5b7566]'}`}>
                    ⏱ OTP expires: {formatExpiration(expiresInSeconds)}
                  </span>
                  <span className={`font-semibold ${attemptsRemaining <= 2 ? 'text-amber-700' : 'text-[#5b7566]'}`}>
                    🛡️ {attemptsRemaining} attempts left
                  </span>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading || resendCooldown > 0}
                    className="py-3 bg-white hover:bg-[#f0f6f2] text-[#2d6a4f] text-xs font-bold rounded-2xl border border-[#d8e5dc] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-soft transition-all active:scale-[0.98]"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'RESEND OTP'}
                  </button>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 6 || isLocked || expiresInSeconds <= 0}
                    className="py-3 bg-[#2d6a4f] hover:bg-[#23533e] disabled:opacity-50 text-white font-black text-xs tracking-wide rounded-2xl shadow-soft transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    {loading ? 'Verifying...' : 'VERIFY OTP'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Celebration Modal / Banner on Verification */}
      <AnimatePresence>
        {stage === 'success' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white border border-[#bfe2ce] rounded-3xl p-8 max-w-sm w-full text-center space-y-3.5 shadow-card"
            >
              <div className="w-16 h-16 rounded-full bg-[#eef8f2] border-2 border-[#2d6a4f] flex items-center justify-center mx-auto text-[#2d6a4f]">
                <Check size={32} />
              </div>
              <h3 className="text-lg font-black text-[#1b382b]">OTP VERIFIED ✓</h3>
              <p className="text-xs text-[#5b7566] font-medium leading-relaxed">
                Updating your password securely in Supabase backend...
              </p>
              <div className="inline-block px-3 py-1 bg-[#eef8f2] text-[#1e583d] rounded-xl text-xs font-bold border border-[#bfe2ce]">
                Password changed successfully.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
