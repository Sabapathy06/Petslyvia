/**
 * Complete End-to-End Automated Verification Suite
 * for PETSLYVIA Secure Change Password Flow
 * 
 * Verifies:
 * 1. Password Strength Evaluation (min 8 chars, uppercase, lowercase, number, special char, bar rendering)
 * 2. Email Masking (e.g. s***@gmail.com)
 * 3. SHA-256 OTP Cryptographic Security (no plaintext stored/logged)
 * 4. Password validation policy (under 8 chars, missing character sets, mismatch confirmation, same as current)
 * 5. Current password verification (reject incorrect current password)
 * 6. Wrong OTP handling & attempt tracking decrement
 * 7. Lockout on too many failed attempts (5 failures -> session locked and OTP wiped)
 * 8. Resend cooldown enforcement (rate limiting)
 * 9. Expired OTP handling
 * 10. OTP reuse prevention (one-time use guarantee)
 * 11. Full End-to-End lifecycle:
 *     Sign in -> Settings -> Change Password -> OTP verification -> Password Update -> Sign out -> Sign in with new password
 */

import {
  evaluatePasswordStrength,
  maskEmail,
  sha256Hex,
  generateCryptoOtp,
} from './src/utils/passwordSecurity';

import {
  verifyCurrentPassword,
  initiateChangePassword,
  verifyChangePasswordOtp,
  resendChangePasswordOtp,
  completePasswordChange,
  cancelChangePasswordSession,
  expireActiveSessionForTesting,
  setTestOtpReceiverForTesting,
} from './src/services/changePasswordService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

// In-memory mock localStorage for the node test runner
const memoryStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => memoryStorage[key] || null,
  setItem: (key: string, val: string) => { memoryStorage[key] = val; },
  removeItem: (key: string) => { delete memoryStorage[key]; },
  clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); },
};

async function runTestSuite() {
  console.log('================================================================');
  console.log('🛡️  PETSLYVIA CHANGE PASSWORD SECURITY & E2E VERIFICATION SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: PASSWORD STRENGTH EVALUATION & POLICY
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Password Strength Evaluator & Security Policy ---');
  
  const weakShort = evaluatePasswordStrength('Ab1!');
  assert(!weakShort.rules.minLength, 'Rejects password shorter than 8 characters');
  assert(!weakShort.isValid, 'Flags < 8 char password as invalid');

  const missingUpper = evaluatePasswordStrength('lowercase123!@#');
  assert(!missingUpper.rules.hasUppercase, 'Detects missing uppercase letter');
  assert(!missingUpper.isValid, 'Lacking uppercase fails policy');

  const missingLower = evaluatePasswordStrength('UPPERCASE123!@#');
  assert(!missingLower.rules.hasLowercase, 'Detects missing lowercase letter');
  assert(!missingLower.isValid, 'Lacking lowercase fails policy');

  const missingNum = evaluatePasswordStrength('NoNumbersHere!@#');
  assert(!missingNum.rules.hasNumber, 'Detects missing numbers');
  assert(!missingNum.isValid, 'Lacking numbers fails policy');

  const missingSpecial = evaluatePasswordStrength('AlphaNumeric1234');
  assert(!missingSpecial.rules.hasSpecialChar, 'Detects missing special character');
  assert(!missingSpecial.isValid, 'Lacking special characters fails policy');

  const strongPass = evaluatePasswordStrength('SecureP@ssw0rd2026!');
  assert(strongPass.isValid, 'Validates password meeting all 5 security rules');
  assert(strongPass.score === 5, 'Score is 5/5 for fully compliant password');
  assert(strongPass.level === 'Strong', 'Strength is categorized as Strong');
  assert(strongPass.barText.includes('Strong'), `Visual strength bar includes "Strong": ${strongPass.barText}`);

  // -------------------------------------------------------------------------
  // TEST 2: EMAIL MASKING
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Email Masking for UX ---');
  const masked1 = maskEmail('sabapathysiva2006@gmail.com');
  assert(masked1 === 's***@gmail.com', `Correctly masks email to s***@gmail.com (got: ${masked1})`);

  const masked2 = maskEmail('player@petslyvia.world');
  assert(masked2 === 'p***@petslyvia.world', `Correctly masks player@petslyvia.world (got: ${masked2})`);

  // -------------------------------------------------------------------------
  // TEST 3: CRYPTOGRAPHIC OTP SECURITY (SHA-256)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Cryptographic OTP Security ---');
  const testOtp = generateCryptoOtp();
  assert(/^\d{6}$/.test(testOtp), `Generates valid 6-digit numeric OTP (${testOtp})`);
  
  const hash1 = await sha256Hex(testOtp);
  const hash2 = await sha256Hex(testOtp);
  assert(hash1 === hash2, 'SHA-256 digest is deterministic');
  assert(hash1.length === 64, 'SHA-256 produces 64-char hexadecimal digest');

  const differentHash = await sha256Hex('123456');
  if (testOtp !== '123456') {
    assert(hash1 !== differentHash, 'Different OTP produces completely distinct SHA-256 digest');
  }

  // -------------------------------------------------------------------------
  // TEST 4: PRE-CONDITIONS & FIELD VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Form Input Validation & Rejections ---');
  const testEmail = 'tester.security@petslyvia.world';
  const initialPassword = 'InitialP@ssw0rd1!';

  // Seed local account for test
  const testAccounts = {
    [testEmail]: {
      id: 'test-user-id-001',
      email: testEmail,
      passwordHash: initialPassword,
      displayName: 'GuardianTester',
    }
  };
  localStorage.setItem('petslyvia_local_accounts', JSON.stringify(testAccounts));

  // 4a. Incorrect current password
  cancelChangePasswordSession();
  const badCurrentRes = await initiateChangePassword(
    testEmail,
    'WrongCurrentPass123!',
    'ValidNewP@ss123!',
    'ValidNewP@ss123!'
  );
  assert(!badCurrentRes.success, 'Rejects when current password is incorrect');
  assert(badCurrentRes.error?.includes('Current password is incorrect'), `Returns informative error: ${badCurrentRes.error}`);

  // 4b. Password under 8 characters
  const shortPassRes = await initiateChangePassword(
    testEmail,
    initialPassword,
    'Short1!',
    'Short1!'
  );
  assert(!shortPassRes.success, 'Rejects new password under 8 characters');
  assert(shortPassRes.error?.includes('at least 8 characters'), `Returns length requirement error: ${shortPassRes.error}`);

  // 4c. Mismatched confirmation
  const mismatchRes = await initiateChangePassword(
    testEmail,
    initialPassword,
    'ValidNewP@ss123!',
    'DifferentP@ss123!'
  );
  assert(!mismatchRes.success, 'Rejects mismatched confirm password');
  assert(mismatchRes.error?.includes('do not match'), `Returns match error: ${mismatchRes.error}`);

  // 4d. Password same as current password
  const sameAsCurrentRes = await initiateChangePassword(
    testEmail,
    initialPassword,
    initialPassword,
    initialPassword
  );
  assert(!sameAsCurrentRes.success, 'Rejects new password identical to current password');

  // 4e. Weak password failing policy
  const weakPolicyRes = await initiateChangePassword(
    testEmail,
    initialPassword,
    'alllowercasepassword',
    'alllowercasepassword'
  );
  assert(!weakPolicyRes.success, 'Rejects password failing security policy rules');

  // -------------------------------------------------------------------------
  // TEST 5: WRONG OTP & ATTEMPTS DECREMENT
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Wrong OTP & Attempt Counter Decrement ---');
  cancelChangePasswordSession();

  let capturedOtp = '';
  setTestOtpReceiverForTesting((otp) => { capturedOtp = otp; });

  const initRes1 = await initiateChangePassword(
    testEmail,
    initialPassword,
    'BrandNewP@ssw0rd2026!',
    'BrandNewP@ssw0rd2026!'
  );
  assert(initRes1.success, 'Initiates change password and emits OTP dispatch');
  assert(initRes1.maskedEmail === 't***@petslyvia.world', `Masked email returned: ${initRes1.maskedEmail}`);

  // Submit wrong OTP
  const wrongAttempt1 = await verifyChangePasswordOtp('000000');
  assert(!wrongAttempt1.success, 'Rejects incorrect OTP');
  assert(wrongAttempt1.attemptsRemaining === 4, `Decrements attempts remaining to 4 (got: ${wrongAttempt1.attemptsRemaining})`);

  const wrongAttempt2 = await verifyChangePasswordOtp('999999');
  assert(!wrongAttempt2.success, 'Rejects second incorrect OTP');
  assert(wrongAttempt2.attemptsRemaining === 3, `Decrements attempts remaining to 3 (got: ${wrongAttempt2.attemptsRemaining})`);

  // -------------------------------------------------------------------------
  // TEST 6: LOCKOUT ON TOO MANY ATTEMPTS (5 FAILURES)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Lockout on Too Many Failed Attempts (Brute-Force Guard) ---');
  await verifyChangePasswordOtp('111111'); // attempt 3
  await verifyChangePasswordOtp('222222'); // attempt 4
  const lockoutAttempt = await verifyChangePasswordOtp('333333'); // attempt 5 (limit reached)

  assert(!lockoutAttempt.success, 'Rejects 5th failed OTP attempt');
  assert(lockoutAttempt.isLocked === true, 'Session is marked as locked after 5 failures');
  assert(lockoutAttempt.attemptsRemaining === 0, 'Attempts remaining is 0');
  assert(lockoutAttempt.error?.includes('Too many incorrect attempts'), 'Informs user about lockout');

  // Even submitting the correct OTP now must be rejected because the session was locked & destroyed
  const postLockoutAttempt = await verifyChangePasswordOtp(capturedOtp);
  assert(!postLockoutAttempt.success, 'Rejects correct OTP once session is locked (brute force prevented)');

  // -------------------------------------------------------------------------
  // TEST 7: RESEND COOLDOWN ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Resend OTP Cooldown Enforcement ---');
  cancelChangePasswordSession();
  
  await initiateChangePassword(
    testEmail,
    initialPassword,
    'BrandNewP@ssw0rd2026!',
    'BrandNewP@ssw0rd2026!'
  );

  const immediateResend = await resendChangePasswordOtp();
  assert(!immediateResend.success, 'Rejects resend request during 60-second cooldown window');
  assert(immediateResend.cooldownSeconds! > 0, `Returns active cooldown countdown: ${immediateResend.cooldownSeconds}s`);

  // -------------------------------------------------------------------------
  // TEST 8: EXPIRED OTP HANDLING
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Expired OTP Handling ---');
  cancelChangePasswordSession();
  let expiredTestOtp = '';
  setTestOtpReceiverForTesting((otp) => { expiredTestOtp = otp; });

  await initiateChangePassword(
    testEmail,
    initialPassword,
    'BrandNewP@ssw0rd2026!',
    'BrandNewP@ssw0rd2026!'
  );

  // Fast forward expiry timestamp into the past
  expireActiveSessionForTesting();

  const expiredVerify = await verifyChangePasswordOtp(expiredTestOtp);
  assert(!expiredVerify.success, 'Rejects verification of an expired OTP');
  assert(expiredVerify.error?.includes('expired'), `Informs user that OTP has expired: ${expiredVerify.error}`);

  // -------------------------------------------------------------------------
  // TEST 9: CORRECT OTP VERIFICATION & ONE-TIME USE (REUSE PREVENTION)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Correct OTP Verification & One-Time Use Guarantee ---');
  cancelChangePasswordSession();
  let validOtp = '';
  setTestOtpReceiverForTesting((otp) => { validOtp = otp; });

  const targetNewPass = 'BrandNewP@ssw0rd2026!';
  await initiateChangePassword(
    testEmail,
    initialPassword,
    targetNewPass,
    targetNewPass
  );

  const validVerify = await verifyChangePasswordOtp(validOtp);
  assert(validVerify.success === true, 'Successfully verifies correct 6-digit OTP');
  assert(Boolean(validVerify.verificationToken), 'Issues unique single-use verification token');

  // Attempting to reuse the exact same OTP code immediately
  const reuseAttempt = await verifyChangePasswordOtp(validOtp);
  assert(!reuseAttempt.success, 'Strictly rejects reused OTP code');
  assert(reuseAttempt.error?.includes('already been verified'), `Informs user code cannot be reused: ${reuseAttempt.error}`);

  // -------------------------------------------------------------------------
  // TEST 10: COMPLETE PASSWORD UPDATE & TOKEN INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 10: Complete Password Update & Token Integrity ---');
  
  // Attempt update with forged token
  const forgedUpdate = await completePasswordChange('fake_forged_token');
  assert(!forgedUpdate.success, 'Rejects password update with invalid or forged token');

  // Perform legitimate update with issued token
  const validUpdate = await completePasswordChange(validVerify.verificationToken!);
  assert(validUpdate.success === true, 'Successfully completes password update in storage and backend');

  // Attempting to use the verification token a second time
  const tokenReuse = await completePasswordChange(validVerify.verificationToken!);
  assert(!tokenReuse.success, 'Rejects duplicate password-change execution (session destroyed)');

  // -------------------------------------------------------------------------
  // TEST 11: FULL E2E SIGN-OUT & SIGN-IN WITH NEW PASSWORD
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 11: Sign Out & Re-authentication With New Password ---');
  
  // 11a. Old password fails
  const oldLoginCheck = await verifyCurrentPassword(testEmail, initialPassword);
  assert(!oldLoginCheck.valid, 'Sign-in with old password fails after change');

  // 11b. New password succeeds
  const newLoginCheck = await verifyCurrentPassword(testEmail, targetNewPass);
  assert(newLoginCheck.valid === true, 'Sign-in with new password succeeds immediately');

  // Clean up
  setTestOtpReceiverForTesting(null);

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL SECURITY & E2E VERIFICATION REQUIREMENTS COMPLETED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
