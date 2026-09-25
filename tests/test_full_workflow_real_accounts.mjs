// tests/test_full_workflow_real_accounts.mjs
// Comprehensive End-to-End Real Account Workflow Verification Suite
// Tests 100% real Supabase Auth, real database data, real-time presence, friend requests, and multiplayer room

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fgxjnowrzxlinbpozker.supabase.co';
const SUPABASE_KEY = 'sb_publishable_l30DMOPfJgXNItzbN0geeA_P5y1QskO';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function generateFriendId(seed) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    let id = 'PVS-';
    const absHash = Math.abs(hash);
    for (let i = 0; i < 6; i++) {
      id += chars.charAt((absHash + i * 7 + (seed.charCodeAt(i % seed.length) || 0)) % chars.length);
    }
    return id;
  }
  let id = 'PVS-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

async function runTest() {
  console.log('========================================================================');
  console.log('🚀 REAL ACCOUNT FULL WORKFLOW TEST (START TO FINISH)');
  console.log('========================================================================\n');

  // Client A and Client B instances
  const clientA = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const clientB = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const ts = Date.now();
  const emailA = `player_a_${ts}@petslyvia.test`;
  const emailB = `player_b_${ts}@petslyvia.test`;
  const passA = 'SecurePassA123!';
  const passB = 'SecurePassB123!';

  // --------------------------------------------------------------------
  // STEP 1: SIGN UP & AUTHENTICATE TWO REAL USERS
  // --------------------------------------------------------------------
  console.log('--- STEP 1: Sign Up / Sign In (Two Real Authenticated Users) ---');

  const { data: signUpDataA, error: errSignUpA } = await clientA.auth.signUp({
    email: emailA,
    password: passA,
    options: { data: { display_name: 'NovaExplorer' } },
  });
  assert(!errSignUpA && signUpDataA.user?.id, `Account A successfully signed up (User ID: ${signUpDataA.user?.id})`);

  const { data: signUpDataB, error: errSignUpB } = await clientB.auth.signUp({
    email: emailB,
    password: passB,
    options: { data: { display_name: 'AeroCoder' } },
  });
  assert(!errSignUpB && signUpDataB.user?.id, `Account B successfully signed up (User ID: ${signUpDataB.user?.id})`);

  const userA = signUpDataA.user;
  const userB = signUpDataB.user;

  // Verify immediate sign in for both accounts
  const { data: signInA, error: errInA } = await clientA.auth.signInWithPassword({ email: emailA, password: passA });
  assert(!errInA && signInA.session?.access_token, 'Account A signed in with real Supabase session and JWT');

  const { data: signInB, error: errInB } = await clientB.auth.signInWithPassword({ email: emailB, password: passB });
  assert(!errInB && signInB.session?.access_token, 'Account B signed in with real Supabase session and JWT');

  // --------------------------------------------------------------------
  // STEP 2: USER ID / FRIEND ID ASSIGNMENT & PERSISTENCE
  // --------------------------------------------------------------------
  console.log('\n--- STEP 2: Public User ID / Friend ID Verification ---');

  const friendIdA = generateFriendId(userA.id);
  const friendIdB = generateFriendId(userB.id);

  assert(/^PVS-[A-Z0-9]{6}$/.test(friendIdA), `Account A Friend ID generated in valid format: ${friendIdA}`);
  assert(/^PVS-[A-Z0-9]{6}$/.test(friendIdB), `Account B Friend ID generated in valid format: ${friendIdB}`);
  assert(friendIdA !== friendIdB, 'Account A and Account B have unique distinct Friend IDs');

  // Save profiles in Supabase with friend_id in skills JSON
  const profileA = {
    id: userA.id,
    email: emailA,
    username: 'nova_explorer',
    display_name: 'NovaExplorer',
    role: 'explorer',
    coins: 100,
    total_xp: 50,
    current_level: 1,
    skills: { logic: 15, debugging: 10, friend_id: friendIdA, friends: [], friend_requests: [] },
  };
  const { error: profErrA } = await clientA.from('profiles').upsert(profileA);
  assert(!profErrA, 'Account A profile saved to Supabase profiles table');

  const petA = {
    user_id: userA.id,
    pet_type: 'fox',
    pet_name: 'Sparky',
    stage: 'infant',
    level: 1,
    xp: 50,
    happiness: 100,
    energy: 100,
    is_active: true,
  };
  const { error: petErrA } = await clientA.from('pets').upsert(petA);
  assert(!petErrA, 'Account A companion pet (Sparky the Fox) saved to Supabase pets table');

  const profileB = {
    id: userB.id,
    email: emailB,
    username: 'aero_coder',
    display_name: 'AeroCoder',
    role: 'coder',
    coins: 100,
    total_xp: 50,
    current_level: 2,
    skills: { logic: 20, coding: 20, friend_id: friendIdB, friends: [], friend_requests: [] },
  };
  const { error: profErrB } = await clientB.from('profiles').upsert(profileB);
  assert(!profErrB, 'Account B profile saved to Supabase profiles table');

  const petB = {
    user_id: userB.id,
    pet_type: 'panda',
    pet_name: 'Bamboo',
    stage: 'infant',
    level: 2,
    xp: 150,
    happiness: 100,
    energy: 100,
    is_active: true,
  };
  const { error: petErrB } = await clientB.from('pets').upsert(petB);
  assert(!petErrB, 'Account B companion pet (Bamboo the Panda) saved to Supabase pets table');

  // --------------------------------------------------------------------
  // STEP 3: ADD FRIEND (Search by Friend ID & Send Request)
  // --------------------------------------------------------------------
  console.log('\n--- STEP 3: Add Friend (Search & Send Request) ---');

  // Account A searches for Account B by Friend ID
  const { data: searchResults, error: searchErr } = await clientA
    .from('profiles')
    .select('id, display_name, current_level, total_xp, skills')
    .eq('skills->>friend_id', friendIdB);

  assert(!searchErr && searchResults?.length === 1, `Account A search by Friend ID '${friendIdB}' found exactly 1 user`);
  const foundUserB = searchResults[0];
  assert(foundUserB.id === userB.id, `Search correctly identified Account B (Display Name: ${foundUserB.display_name})`);

  // Account A sends friend request to Account B
  const reqId = `req_${Date.now()}`;
  const friendRequestPayload = {
    request_id: reqId,
    sender_user_id: userA.id,
    username: 'NovaExplorer',
    friend_id: friendIdA,
    level: 1,
    pet_type: 'fox',
    pet_stage: 'infant',
    created_at: new Date().toISOString(),
  };

  // Add request to Account B's skills.friend_requests in Supabase
  const updatedSkillsB = {
    ...foundUserB.skills,
    friend_requests: [friendRequestPayload, ...(foundUserB.skills?.friend_requests || [])],
  };
  const { error: sendErr } = await clientA.from('profiles').update({ skills: updatedSkillsB }).eq('id', userB.id);
  assert(!sendErr, 'Friend request stored in Account B profile on Supabase');

  // --------------------------------------------------------------------
  // STEP 4: RECEIVER SEES AND ACCEPTS REQUEST
  // --------------------------------------------------------------------
  console.log('\n--- STEP 4: Receiver Sees & Accepts Friend Request ---');

  // Account B fetches pending requests from Supabase
  const { data: bProfFetch } = await clientB.from('profiles').select('skills').eq('id', userB.id).single();
  const pendingRequests = bProfFetch?.skills?.friend_requests || [];
  assert(pendingRequests.some((r) => r.sender_user_id === userA.id && r.friend_id === friendIdA),
    'Account B sees incoming friend request from Account A with correct Friend ID');

  // Account B accepts the request
  const acceptedFriendForB = {
    user_id: userA.id,
    username: 'NovaExplorer',
    friend_id: friendIdA,
    level: 1,
    xp: 50,
    pet_type: 'fox',
    pet_stage: 'infant',
    pet_name: 'Sparky',
    request_id: reqId,
    friendship_since: new Date().toISOString(),
  };

  const acceptedFriendForA = {
    user_id: userB.id,
    username: 'AeroCoder',
    friend_id: friendIdB,
    level: 2,
    xp: 150,
    pet_type: 'dragon',
    pet_stage: 'infant',
    pet_name: 'Blaze',
    request_id: reqId,
    friendship_since: new Date().toISOString(),
  };

  // Account B adds Account A to friends and clears pending request
  const newSkillsB = {
    ...bProfFetch.skills,
    friend_requests: (bProfFetch.skills.friend_requests || []).filter((r) => r.request_id !== reqId),
    friends: [acceptedFriendForB, ...(bProfFetch.skills.friends || [])],
  };
  const { error: acceptErrB } = await clientB.from('profiles').update({ skills: newSkillsB }).eq('id', userB.id);
  assert(!acceptErrB, 'Account B accepted request and added Account A to friends list in Supabase');

  // Add Account B to Account A's friends list
  const { data: aProfFetch } = await clientA.from('profiles').select('skills').eq('id', userA.id).single();
  const newSkillsA = {
    ...aProfFetch.skills,
    friends: [acceptedFriendForA, ...(aProfFetch.skills?.friends || [])],
  };
  const { error: acceptErrA } = await clientA.from('profiles').update({ skills: newSkillsA }).eq('id', userA.id);
  assert(!acceptErrA, 'Account A friends list updated in Supabase with Account B');

  // --------------------------------------------------------------------
  // STEP 5: MUTUAL FRIENDS LIST & REALTIME ONLINE PRESENCE
  // --------------------------------------------------------------------
  console.log('\n--- STEP 5: Mutual Friends List & Realtime Online Status ---');

  // Verify mutual friends in database
  const { data: finalProfA } = await clientA.from('profiles').select('skills').eq('id', userA.id).single();
  const { data: finalProfB } = await clientB.from('profiles').select('skills').eq('id', userB.id).single();

  const isBInAFriends = finalProfA.skills.friends.some((f) => f.user_id === userB.id && f.friend_id === friendIdB);
  const isAInBFriends = finalProfB.skills.friends.some((f) => f.user_id === userA.id && f.friend_id === friendIdA);

  assert(isBInAFriends, 'Account B is confirmed present in Account A friends list in database');
  assert(isAInBFriends, 'Account A is confirmed present in Account B friends list in database');

  // Test Realtime Online Presence on arena:lobby
  console.log('Testing Realtime Presence on arena:lobby channel...');
  const lobbyChanA = clientA.channel('arena:lobby');
  const lobbyChanB = clientB.channel('arena:lobby');

  let accountBDetectedByA = false;
  let accountADetectedByB = false;

  const checkPresenceA = () => {
    const state = lobbyChanA.presenceState();
    for (const key of Object.keys(state)) {
      for (const p of state[key]) {
        if (p.userId === userB.id || p.friendId === friendIdB) {
          accountBDetectedByA = true;
        }
      }
    }
  };

  const checkPresenceB = () => {
    const state = lobbyChanB.presenceState();
    for (const key of Object.keys(state)) {
      for (const p of state[key]) {
        if (p.userId === userA.id || p.friendId === friendIdA) {
          accountADetectedByB = true;
        }
      }
    }
  };

  lobbyChanA.on('presence', { event: 'sync' }, checkPresenceA);
  lobbyChanA.on('presence', { event: 'join' }, checkPresenceA);

  lobbyChanB.on('presence', { event: 'sync' }, checkPresenceB);
  lobbyChanB.on('presence', { event: 'join' }, checkPresenceB);

  await new Promise((resolve) => {
    lobbyChanA.subscribe(async (statusA) => {
      if (statusA === 'SUBSCRIBED') {
        await lobbyChanA.track({
          userId: userA.id,
          friendId: friendIdA,
          username: 'NovaExplorer',
          status: 'online',
          level: 1,
        });

        lobbyChanB.subscribe(async (statusB) => {
          if (statusB === 'SUBSCRIBED') {
            await lobbyChanB.track({
              userId: userB.id,
              friendId: friendIdB,
              username: 'AeroCoder',
              status: 'online',
              level: 2,
            });

            // Wait 3.5 seconds for bidirectional presence state exchange
            setTimeout(() => {
              checkPresenceA();
              checkPresenceB();
              resolve();
            }, 3500);
          }
        });
      }
    });
  });

  assert(accountBDetectedByA, `Account A sees Account B as LIVE ONLINE via Realtime Presence (Friend ID: ${friendIdB})`);
  assert(accountADetectedByB, `Account B sees Account A as LIVE ONLINE via Realtime Presence (Friend ID: ${friendIdA})`);

  // --------------------------------------------------------------------
  // STEP 6: MULTIPLAYER (Invitation & Both Join Room)
  // --------------------------------------------------------------------
  console.log('\n--- STEP 6: Multiplayer Room Invitation & Both Users Join ---');

  const testRoomId = `room_${ts}_${Math.random().toString(36).substring(2, 6)}`;
  console.log(`Created Room ID: ${testRoomId}`);

  // Account A sends room invite to Account B on user-social:<userB.id>
  const socialChanB = clientB.channel(`user-social:${userB.id}`);
  let receivedInvite = null;

  socialChanB.on('broadcast', { event: 'room_invitation' }, (payload) => {
    receivedInvite = payload;
  });

  await new Promise((resolve) => {
    socialChanB.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
    });
  });

  // Account A broadcasts invitation to Account B
  const socialChanA = clientA.channel(`user-social:${userB.id}`);
  await new Promise((resolve) => {
    socialChanA.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await socialChanA.send({
          type: 'broadcast',
          event: 'room_invitation',
          payload: {
            id: `inv_${ts}`,
            room_id: testRoomId,
            room_name: 'Cosmic Arena Match',
            sender_user_id: userA.id,
            sender_name: 'NovaExplorer',
            sender_friend_id: friendIdA,
          },
        });
        setTimeout(resolve, 1500);
      }
    });
  });

  assert(receivedInvite !== null && receivedInvite.payload?.room_id === testRoomId,
    `Account B received live room invitation for room: ${testRoomId}`);

  // Both users join the multiplayer room channel `room:<testRoomId>`
  const roomChanA = clientA.channel(`room:${testRoomId}`);
  const roomChanB = clientB.channel(`room:${testRoomId}`);

  let roomPresenceASeesB = false;
  let roomPresenceBSeesA = false;
  let bReceivedReadyA = false;
  let aReceivedReadyB = false;

  roomChanA.on('presence', { event: 'sync' }, () => {
    const state = roomChanA.presenceState();
    for (const key of Object.keys(state)) {
      for (const p of state[key]) {
        if (p.userId === userB.id) roomPresenceASeesB = true;
      }
    }
  });

  roomChanB.on('presence', { event: 'sync' }, () => {
    const state = roomChanB.presenceState();
    for (const key of Object.keys(state)) {
      for (const p of state[key]) {
        if (p.userId === userA.id) roomPresenceBSeesA = true;
      }
    }
  });

  roomChanB.on('broadcast', { event: 'player_ready' }, (msg) => {
    if (msg.payload?.userId === userA.id) bReceivedReadyA = true;
  });

  roomChanA.on('broadcast', { event: 'player_ready' }, (msg) => {
    if (msg.payload?.userId === userB.id) aReceivedReadyB = true;
  });

  await new Promise((resolve) => {
    roomChanA.subscribe(async (statusA) => {
      if (statusA === 'SUBSCRIBED') {
        await roomChanA.track({
          userId: userA.id,
          username: 'NovaExplorer',
          friendId: friendIdA,
          petType: 'fox',
          status: 'lobby',
          isReady: true,
          joinedAt: new Date().toISOString(),
        });

        roomChanB.subscribe(async (statusB) => {
          if (statusB === 'SUBSCRIBED') {
            await roomChanB.track({
              userId: userB.id,
              username: 'AeroCoder',
              friendId: friendIdB,
              petType: 'dragon',
              status: 'lobby',
              isReady: true,
              joinedAt: new Date().toISOString(),
            });

            // Account A announces ready
            await roomChanA.send({
              type: 'broadcast',
              event: 'player_ready',
              payload: { userId: userA.id, isReady: true },
            });

            // Account B announces ready
            await roomChanB.send({
              type: 'broadcast',
              event: 'player_ready',
              payload: { userId: userB.id, isReady: true },
            });

            // Wait 2.5 seconds for bidirectional broadcast and presence sync
            setTimeout(resolve, 2500);
          }
        });
      }
    });
  });

  assert(roomPresenceASeesB, `Account A sees Account B joined in multiplayer room: ${testRoomId}`);
  assert(roomPresenceBSeesA, `Account B sees Account A joined in multiplayer room: ${testRoomId}`);
  assert(bReceivedReadyA, 'Account B received Account A player_ready broadcast in room');
  assert(aReceivedReadyB, 'Account A received Account B player_ready broadcast in room');

  // Clean up channels
  await Promise.all([
    lobbyChanA.unsubscribe(),
    lobbyChanB.unsubscribe(),
    socialChanA.unsubscribe(),
    socialChanB.unsubscribe(),
    roomChanA.unsubscribe(),
    roomChanB.unsubscribe(),
  ]);

  // --------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`FINAL RESULT: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
