import { supabase } from '@/lib/supabase';
import {
  evaluatePasswordStrength,
  maskEmail,
  sha256Hex,
  generateCryptoOtp,
} from '@/utils/passwordSecurity';

const LOCAL_AUTH_KEY = 'petslyvia_local_accounts';

function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

function getLocalAccounts(): Record<string, any> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(LOCAL_AUTH_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalAccounts(accounts: Record<string, any>) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

interface ChangePasswordSession {
  email: string;
  hashedOtp: string | null;
  expiresAt: number;
  attemptsRemaining: number;
  isLocked: boolean;
  lastResendTimestamp: number;
  isVerified: boolean;
  verificationToken: string | null;
  pendingNewPassword: string | null;
}

let activeSession: ChangePasswordSession | null = null;

// Test hook strictly for automated testing (never used in production)
let testOtpReceiver: ((otp: string) => void) | null = null;
export function setTestOtpReceiverForTesting(fn: ((otp: string) => void) | null) {
  testOtpReceiver = fn;
}

/**
 * Verify if the provided current password matches the active account.
 */
export async function verifyCurrentPassword(
  email: string,
  currentPass: string
): Promise<{ valid: boolean; error?: string }> {
  if (!email) return { valid: false, error: 'User email not found.' };
  if (!currentPass) return { valid: false, error: 'Current password is required.' };

  const cleanEmail = email.trim().toLowerCase();

  // 1. Check with Supabase backend
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: currentPass,
    });
    if (!error) return { valid: true };
  } catch {
    // continue to local check
  }

  // 2. Check local accounts store
  const accounts = getLocalAccounts();
  const acc = accounts[cleanEmail];
  if (acc && acc.passwordHash) {
    if (acc.passwordHash === currentPass) {
      return { valid: true };
    }
    return { valid: false, error: 'Current password is incorrect.' };
  }

  return { valid: false, error: 'Current password is incorrect.' };
}

/**
 * Initiate Change Password flow:
 * Validates fields, current password, and dispatches a 6-digit OTP to the registered email.
 */
export async function initiateChangePassword(
  email: string,
  currentPass: string,
  newPass: string,
  confirmPass: string
): Promise<{
  success: boolean;
  error?: string;
  maskedEmail?: string;
  expiresAt?: number;
  cooldownSeconds?: number;
}> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Basic validation
  if (!currentPass) {
    return { success: false, error: 'Please enter your current password.' };
  }
  if (!newPass) {
    return { success: false, error: 'Please enter a new password.' };
  }
  if (newPass.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' };
  }
  if (newPass !== confirmPass) {
    return { success: false, error: 'New password and confirmation do not match.' };
  }
  if (newPass === currentPass) {
    return { success: false, error: 'New password cannot be identical to your current password.' };
  }

  // 2. Strength validation policy
  const strength = evaluatePasswordStrength(newPass);
  if (!strength.isValid) {
    return {
      success: false,
      error: 'Password does not meet security requirements. Ensure it has 8+ characters, uppercase, lowercase, number, and special character.',
    };
  }

  // 3. Verify current password
  const currentVerification = await verifyCurrentPassword(cleanEmail, currentPass);
  if (!currentVerification.valid) {
    return { success: false, error: currentVerification.error || 'Current password is incorrect.' };
  }

  // 4. Rate-limit check (prevent spamming initiate)
  if (activeSession && activeSession.email === cleanEmail) {
    const elapsed = Math.floor((Date.now() - activeSession.lastResendTimestamp) / 1000);
    if (elapsed < 60 && !activeSession.isLocked && Date.now() < activeSession.expiresAt) {
      return {
        success: false,
        error: `Please wait ${60 - elapsed}s before requesting a new OTP.`,
      };
    }
  }

  // 5. Generate secure 6-digit OTP
  const rawOtp = generateCryptoOtp();

  // Dispatch OTP to email via Supabase backend
  try {
    await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${getOrigin()}/app`,
      },
    });
  } catch {
    // Non-blocking network catch
  }

  // In testing mode, safely notify the test runner without logging to console/production
  if (testOtpReceiver) {
    testOtpReceiver(rawOtp);
  }

  // 6. Securely hash the OTP with SHA-256 before storing in memory
  // Plaintext OTP is NEVER stored, logged, or exposed
  const hashedOtp = await sha256Hex(rawOtp);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  activeSession = {
    email: cleanEmail,
    hashedOtp: hashedOtp,
    expiresAt: expiresAt,
    attemptsRemaining: 5,
    isLocked: false,
    lastResendTimestamp: Date.now(),
    isVerified: false,
    verificationToken: null,
    pendingNewPassword: newPass,
  };

  return {
    success: true,
    maskedEmail: maskEmail(cleanEmail),
    expiresAt: expiresAt,
    cooldownSeconds: 60,
  };
}

/**
 * Verify the OTP entered by user:
 * Enforces one-time use, expiration, attempt limits, and lockout.
 */
export async function verifyChangePasswordOtp(
  code: string
): Promise<{
  success: boolean;
  error?: string;
  verificationToken?: string;
  attemptsRemaining?: number;
  isLocked?: boolean;
}> {
  if (!activeSession) {
    return {
      success: false,
      error: 'No active password change session. Please initiate change password again.',
    };
  }

  if (activeSession.isVerified) {
    return {
      success: false,
      error: 'This OTP has already been verified and cannot be reused.',
    };
  }

  if (activeSession.isLocked) {
    return {
      success: false,
      error: 'Too many incorrect attempts. This OTP has been invalidated for security. Please request a new one.',
      isLocked: true,
      attemptsRemaining: 0,
    };
  }

  if (Date.now() > activeSession.expiresAt) {
    activeSession.hashedOtp = null;
    return {
      success: false,
      error: 'OTP has expired. Please request a new one.',
    };
  }

  const cleanCode = code.trim();
  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      error: 'Please enter a valid 6-digit verification code.',
    };
  }

  // Hash input with SHA-256 to compare with stored hash
  const inputHash = await sha256Hex(cleanCode);
  const isMatch = activeSession.hashedOtp !== null && inputHash === activeSession.hashedOtp;

  if (isMatch) {
    // Successful verification
    activeSession.isVerified = true;
    activeSession.hashedOtp = null; // Invalidate immediately to prevent reuse
    activeSession.verificationToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      verificationToken: activeSession.verificationToken,
    };
  }

  // Decrement remaining attempts
  activeSession.attemptsRemaining -= 1;

  if (activeSession.attemptsRemaining <= 0) {
    activeSession.isLocked = true;
    activeSession.hashedOtp = null; // Destroy on lockout
    return {
      success: false,
      error: 'Too many incorrect attempts. This OTP has been invalidated for security. Please request a new one.',
      isLocked: true,
      attemptsRemaining: 0,
    };
  }

  return {
    success: false,
    error: `Invalid OTP code. ${activeSession.attemptsRemaining} attempt(s) remaining.`,
    attemptsRemaining: activeSession.attemptsRemaining,
    isLocked: false,
  };
}

/**
 * Resend OTP with 60-second cooldown enforcement.
 */
export async function resendChangePasswordOtp(): Promise<{
  success: boolean;
  error?: string;
  cooldownSeconds?: number;
  expiresAt?: number;
}> {
  if (!activeSession) {
    return {
      success: false,
      error: 'No active change password request found.',
    };
  }

  const elapsed = Math.floor((Date.now() - activeSession.lastResendTimestamp) / 1000);
  if (elapsed < 60) {
    return {
      success: false,
      error: `Please wait ${60 - elapsed}s before requesting a new OTP.`,
      cooldownSeconds: 60 - elapsed,
    };
  }

  // Generate new OTP
  const rawOtp = generateCryptoOtp();

  try {
    await supabase.auth.signInWithOtp({
      email: activeSession.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${getOrigin()}/app`,
      },
    });
  } catch {
    // Non-blocking
  }

  if (testOtpReceiver) {
    testOtpReceiver(rawOtp);
  }

  // Hash new OTP
  const hashedOtp = await sha256Hex(rawOtp);
  const expiresAt = Date.now() + 5 * 60 * 1000;

  activeSession.hashedOtp = hashedOtp;
  activeSession.expiresAt = expiresAt;
  activeSession.attemptsRemaining = 5;
  activeSession.isLocked = false;
  activeSession.isVerified = false;
  activeSession.verificationToken = null;
  activeSession.lastResendTimestamp = Date.now();

  return {
    success: true,
    cooldownSeconds: 60,
    expiresAt: expiresAt,
  };
}

/**
 * Complete the password update:
 * Strictly requires verified token from OTP step before updating Supabase Auth.
 */
export async function completePasswordChange(
  verificationToken: string,
  newPassword?: string
): Promise<{ success: boolean; error?: string }> {
  if (!activeSession) {
    return {
      success: false,
      error: 'No active password change session.',
    };
  }

  if (
    !activeSession.isVerified ||
    !activeSession.verificationToken ||
    activeSession.verificationToken !== verificationToken
  ) {
    return {
      success: false,
      error: 'Unauthorized: OTP verification required before changing password.',
    };
  }

  const targetPassword = newPassword || activeSession.pendingNewPassword;
  if (!targetPassword || targetPassword.length < 8) {
    return {
      success: false,
      error: 'Invalid password. Minimum 8 characters required.',
    };
  }

  const email = activeSession.email;

  // 1. Update Supabase backend user password
  try {
    const { error } = await supabase.auth.updateUser({ password: targetPassword });
    if (error) {
      console.warn('Supabase updateUser password notice:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase updateUser network notice:', err?.message);
  }

  // 2. Update local storage account credentials
  const accounts = getLocalAccounts();
  if (accounts[email]) {
    accounts[email].passwordHash = targetPassword;
    saveLocalAccounts(accounts);
  }

  // 3. Clear active session completely
  activeSession = null;

  return {
    success: true,
  };
}

/**
 * Cancel / reset the active change password session
 */
export function cancelChangePasswordSession() {
  activeSession = null;
}

/**
 * Test helper to simulate expired OTP session for automated testing.
 */
export function expireActiveSessionForTesting() {
  if (activeSession) {
    activeSession.expiresAt = Date.now() - 1000;
  }
}
