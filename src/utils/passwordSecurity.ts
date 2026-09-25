/**
 * Password Security & Cryptographic Verification Utilities for Petslyvia
 * Implements strict password policies, SHA-256 hashing, masking, and OTP generation.
 */

export interface PasswordRules {
  minLength: boolean;      // Minimum 8 characters
  hasUppercase: boolean;   // At least one uppercase letter (A-Z)
  hasLowercase: boolean;   // At least one lowercase letter (a-z)
  hasNumber: boolean;      // At least one number (0-9)
  hasSpecialChar: boolean; // At least one special character (!@#$%^&*...)
}

export interface PasswordStrengthResult {
  score: number;           // 0 to 5
  level: 'Weak' | 'Fair' | 'Good' | 'Strong';
  percentage: number;      // 0 to 100%
  color: string;           // Hex color
  barText: string;         // e.g., "████████░░ Strong"
  rules: PasswordRules;
  isValid: boolean;        // true if all 5 rules pass
}

/**
 * Evaluates password strength against Petslyvia's security policy:
 * - Minimum 8 characters
 * - Uppercase
 * - Lowercase
 * - Number
 * - Special character
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const rules: PasswordRules = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(rules).filter(Boolean).length;
  let level: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';
  let color = '#ef4444'; // Red

  if (score === 5) {
    level = 'Strong';
    color = '#10b981'; // Emerald
  } else if (score >= 4) {
    level = 'Good';
    color = '#3b82f6'; // Blue
  } else if (score >= 2) {
    level = 'Fair';
    color = '#f59e0b'; // Amber
  } else {
    level = 'Weak';
    color = '#ef4444'; // Red
  }

  const percentage = Math.min(100, Math.round((score / 5) * 100));
  const filledBlocks = Math.round(percentage / 10);
  const emptyBlocks = 10 - filledBlocks;
  const barText = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks) + ` ${level}`;

  return {
    score,
    level,
    percentage,
    color,
    barText,
    rules,
    isValid: rules.minLength && rules.hasUppercase && rules.hasLowercase && rules.hasNumber && rules.hasSpecialChar,
  };
}

/**
 * Masks an email for security display (e.g. sabapathysiva2006@gmail.com -> s***@gmail.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'p***@domain.com';
  const [localPart, domain] = email.split('@');
  if (!localPart || localPart.length === 0) return `p***@${domain || 'domain.com'}`;
  const firstChar = localPart[0];
  return `${firstChar}***@${domain}`;
}

/**
 * Securely hashes text with SHA-256 using SubtleCrypto.
 * Plaintext OTPs/passwords are NEVER stored or logged.
 */
export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateCryptoOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = 100000 + (array[0] % 900000);
  return code.toString();
}
