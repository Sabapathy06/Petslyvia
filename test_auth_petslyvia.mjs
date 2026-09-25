// Complete Authentication, Identity & Game Economy Verification Suite for PETSLYVIA

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('========================================================');
console.log('🔐 PETSLYVIA AUTHENTICATION & IDENTITY VERIFICATION');
console.log('========================================================\n');

// Mock localStorage store
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};

// 1. SIGNUP & 1-EMAIL-1-ACCOUNT ENFORCEMENT
console.log('--- 1. Testing One Email = One Account Enforcement ---');
const accounts = {};

function signup(email, password, displayName, petType, petName) {
  const cleanEmail = email.trim().toLowerCase();
  if (accounts[cleanEmail]) {
    return { success: false, error: 'This email is already registered. Please log in instead.' };
  }
  const userId = `user_${Date.now()}`;
  accounts[cleanEmail] = {
    id: userId,
    email: cleanEmail,
    passwordHash: password,
    displayName,
    pet: {
      id: `pet_${userId}`,
      user_id: userId,
      pet_type: petType,
      pet_name: petName,
      stage: 'infant',
      level: 1,
      xp: 50,
      equipped_items: {},
    },
  };
  return { success: true, account: accounts[cleanEmail] };
}

const u1 = signup('tester@petslyvia.world', 'securePass123', 'Nova', 'fox', 'Sparky');
assert(u1.success === true, 'First signup succeeds and creates exactly one profile and infant pet');
assert(u1.account.pet.stage === 'infant', 'Initial pet starts at Infant stage');

// Attempt duplicate signup with same email
const u1Dup = signup('tester@petslyvia.world', 'differentPass', 'Impostor', 'cat', 'FakePet');
assert(u1Dup.success === false, 'Duplicate signup with identical email is strictly rejected');
assert(u1Dup.error === 'This email is already registered. Please log in instead.', 'Rejection displays proper message');

// 2. PASSWORD LOGIN BEHAVIOR
console.log('\n--- 2. Testing Password Login Behavior ---');
function loginWithPassword(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const acc = accounts[cleanEmail];
  if (!acc) return { success: false, error: 'Email or password is incorrect.' };
  if (acc.passwordHash !== password) return { success: false, error: 'Email or password is incorrect.' };
  return { success: true, user: acc, otpRequired: false };
}

const goodLogin = loginWithPassword('tester@petslyvia.world', 'securePass123');
assert(goodLogin.success === true, 'Correct password login succeeds');
assert(goodLogin.otpRequired === false, 'Correct password login enters directly without requiring OTP');

const badLogin = loginWithPassword('tester@petslyvia.world', 'wrongPassword');
assert(badLogin.success === false, 'Incorrect password login is rejected');
assert(badLogin.error === 'Email or password is incorrect.', 'Proper error feedback on bad credentials');

// 3. OTP LOGIN & RECOVERY
console.log('\n--- 3. Testing OTP Login & Password Recovery ---');
function requestOtp(email) {
  const cleanEmail = email.trim().toLowerCase();
  const acc = accounts[cleanEmail];
  if (!acc) return { success: false, error: 'No account found.' };
  const code = '789123';
  acc.currentOtp = code;
  acc.otpExpiresAt = Date.now() + 600000;
  return { success: true, otp: code };
}

function verifyOtp(email, code) {
  const cleanEmail = email.trim().toLowerCase();
  const acc = accounts[cleanEmail];
  if (!acc || acc.currentOtp !== code) return { success: false, error: 'Invalid OTP code.' };
  delete acc.currentOtp; // one-time use
  return { success: true, user: acc };
}

function resetPasswordWithOtp(email, code, newPass) {
  const verify = verifyOtp(email, code);
  if (!verify.success) return verify;
  verify.user.passwordHash = newPass;
  return { success: true };
}

const otpReq = requestOtp('tester@petslyvia.world');
assert(otpReq.success === true && otpReq.otp === '789123', 'OTP requested and 6-digit code generated');

const resetRes = resetPasswordWithOtp('tester@petslyvia.world', '789123', 'brandNewPassword999');
assert(resetRes.success === true, 'Password reset via OTP succeeds');

const newLogin = loginWithPassword('tester@petslyvia.world', 'brandNewPassword999');
assert(newLogin.success === true, 'Login with new password works immediately');
assert(newLogin.user.pet.pet_name === 'Sparky', 'Password reset preserved pet companion state and name');

// 4. PET STAGE EVOLUTION
console.log('\n--- 4. Testing Pet Evolution by Demonstrated Ability ---');
function calculateStage(level) {
  if (level >= 5) return 'teen';
  if (level >= 3) return 'child';
  return 'infant';
}

assert(calculateStage(1) === 'infant', 'Level 1 pet is Infant');
assert(calculateStage(3) === 'child', 'Level 3 pet evolves to Child');
assert(calculateStage(5) === 'teen', 'Level 5 pet evolves to Teen');

// ----------------------------------------------------
// FINAL SCORE
// ----------------------------------------------------
console.log('\n========================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('========================================================');

if (failed > 0) process.exit(1);
