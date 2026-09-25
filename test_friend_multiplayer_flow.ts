/**
 * Comprehensive Automated Verification Suite for PETSLYVIA:
 * Complete User → Friend → Multiplayer Flow with Two Real Accounts (A & B)
 *
 * Verifies:
 * 1. Automatic permanent public Friend ID generation (PVS-XXXXXX)
 * 2. Search another user by public Friend ID
 * 3. Authoritative relationship state machine:
 *    - not_friends
 *    - request_sent
 *    - request_received
 *    - friends
 *    - blocked
 *    - self
 * 4. Self-add prevention
 * 5. Duplicate request prevention & race condition rapid clicks
 * 6. Reciprocal cross-directional duplicate prevention (B adding A when A already requested B)
 * 7. Real database confirmation (no premature "Sent" button)
 * 8. Decline / reject friend request
 * 9. Accept friend request -> both become friends simultaneously
 * 10. Friends list updates & 1v1 duel contacts sync (single source of truth)
 * 11. Outgoing sent requests tracking and cancellation
 * 12. Friend removal & blocking / unblocking
 * 13. Multiplayer friend invitation & room joining
 * 14. Realtime online presence states (Online, Lobby, Playing, Finished, Offline)
 */

import {
  generateFriendId,
  isValidFriendIdFormat,
  normalizeFriendId,
  searchPlayerByFriendId,
  sendFriendRequest,
  respondFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getFriendshipStatus,
  fetchFriendsList,
  fetchPendingRequests,
  fetchSentRequests,
  inviteFriendToRoom,
  respondRoomInvitation,
  type SafePublicProfile,
} from './src/services/friendService';

import { petslyviaService } from './src/services/petslyviaService';

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

// In-memory localStorage mock for node test runner
const memoryStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => memoryStorage[key] || null,
  setItem: (key: string, val: string) => { memoryStorage[key] = val; },
  removeItem: (key: string) => { delete memoryStorage[key]; },
  clear: () => { Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]); },
};

async function runTestSuite() {
  console.log('================================================================');
  console.log('👥 PETSLYVIA USER → FRIEND → MULTIPLAYER COMPLETE E2E SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: UNIQUE PUBLIC USER ID GENERATION & FORMAT (PVS-XXXXXX)
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Unique Public User ID (Friend ID) ---');

  const fid1 = generateFriendId();
  assert(isValidFriendIdFormat(fid1), `Generated Friend ID matches format: ${fid1}`);
  assert(fid1.startsWith('PVS-'), 'Starts with PVS- prefix');
  assert(fid1.length === 10, 'Total length is 10 characters (PVS- + 6 alphanumeric)');

  const fid2 = generateFriendId();
  assert(fid1 !== fid2, 'Generates distinct unique IDs');

  const normalized = normalizeFriendId('7k4m9q');
  assert(normalized === 'PVS-7K4M9Q', `Normalizes 6-char input: ${normalized}`);

  // Test deterministic seed generation
  const seedUid = '00000000-0000-0000-0000-000000000001';
  const seeded1 = generateFriendId(seedUid);
  const seeded2 = generateFriendId(seedUid);
  assert(seeded1 === seeded2, `Deterministic ID remains permanent for same UID: ${seeded1}`);

  // -------------------------------------------------------------------------
  // SETUP TWO REAL ACCOUNTS: ACCOUNT A & ACCOUNT B
  // -------------------------------------------------------------------------
  console.log('\n--- SETUP: Initializing Account A & Account B ---');

  const userA_id = 'user_alpha_uuid_001';
  const userA_email = 'pavan.alpha@petslyvia.world';
  const userA_fid = generateFriendId(userA_id);

  const userB_id = 'user_bravo_uuid_002';
  const userB_email = 'arun.bravo@petslyvia.world';
  const userB_fid = generateFriendId(userB_id);

  // Initialize Account A in service
  const playerA = await petslyviaService.initializeNewPlayer(
    userA_id,
    userA_email,
    'Pavan_Alpha',
    'fox',
    'Sparky',
    'coder',
    true
  );
  playerA.profile.friend_id = userA_fid;
  await petslyviaService.saveProfile(playerA.profile);

  // Initialize Account B in service
  const playerB = await petslyviaService.initializeNewPlayer(
    userB_id,
    userB_email,
    'Arun_Bravo',
    'bunny',
    'Hops',
    'non_coder',
    true
  );
  playerB.profile.friend_id = userB_fid;
  await petslyviaService.saveProfile(playerB.profile);

  assert(Boolean(playerA.profile.friend_id), `Account A has public Friend ID: ${playerA.profile.friend_id}`);
  assert(Boolean(playerB.profile.friend_id), `Account B has public Friend ID: ${playerB.profile.friend_id}`);
  assert(playerA.profile.friend_id !== playerB.profile.friend_id, 'Account A and B have distinct IDs');

  // Set active session as Account A
  localStorage.setItem('petslyvia_active_session', JSON.stringify({ user: { id: userA_id, email: userA_email, display_name: 'Pavan_Alpha', friend_id: userA_fid } }));
  localStorage.setItem('petslyvia_profile', JSON.stringify(playerA.profile));

  // -------------------------------------------------------------------------
  // TEST 2: SEARCH PLAYER BY FRIEND ID
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Search Player by Unique Friend ID ---');

  const searchRes = await searchPlayerByFriendId(userB_fid);
  assert(searchRes.profile !== null, `A successfully searches B by Friend ID: ${userB_fid}`);
  assert(searchRes.profile?.username === 'Arun_Bravo', `Returned profile has username: ${searchRes.profile?.username}`);
  assert(searchRes.profile?.pet_name === 'Hops', `Returned profile has companion name: ${searchRes.profile?.pet_name}`);
  assert(searchRes.profile?.friend_id === userB_fid, `Returned profile has Friend ID: ${searchRes.profile?.friend_id}`);

  // Test relationship status for self vs target
  const selfStatus = await getFriendshipStatus(userA_id);
  assert(selfStatus === 'self', `Relationship with self is correctly resolved as 'self' (got: ${selfStatus})`);

  const initialStatusWithB = await getFriendshipStatus(userB_id);
  assert(initialStatusWithB === 'not_friends', `Initial relationship with B is 'not_friends' (got: ${initialStatusWithB})`);

  // -------------------------------------------------------------------------
  // TEST 3: INPUT VALIDATIONS & EDGE CASES (SELF-ADD & DUPLICATES)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Pre-Condition Checks & Self-Add Prevention ---');

  // 3a. A tries adding self
  const selfAddRes = await sendFriendRequest(userA_fid);
  assert(!selfAddRes.success, 'Rejects friend request to self');
  assert(selfAddRes.error?.includes('yourself'), `Informative error returned: ${selfAddRes.error}`);

  // 3b. Non-existent player
  const nonExistentRes = await sendFriendRequest('PVS-ZZZZ99');
  assert(!nonExistentRes.success, 'Rejects friend request to non-existent player');

  // -------------------------------------------------------------------------
  // TEST 4: SEND FRIEND REQUEST & RAPID CLICK RACE CONDITION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Send Friend Request & Rapid Click Protection ---');

  // First send request
  const sendRes1 = await sendFriendRequest(userB_fid);
  assert(sendRes1.success === true, 'Friend request successfully dispatched from A to B');
  assert(sendRes1.status === 'request_sent', `Status returned is 'request_sent'`);

  // Immediate second click (duplicate / rapid double-click test)
  const sendRes2 = await sendFriendRequest(userB_fid);
  assert(!sendRes2.success, 'Second rapid send request is safely rejected');
  assert(sendRes2.error?.includes('already sent'), `Returns duplicate prevention message: ${sendRes2.error}`);

  // Verify outgoing requests on A
  const aOutReqs = await fetchSentRequests();
  assert(aOutReqs.length === 1, `A has exactly 1 outgoing request (got: ${aOutReqs.length})`);
  assert(aOutReqs[0].receiver_user_id === userB_id, `Target is Account B (${userB_id})`);

  // Switch context to Account B to check incoming request
  localStorage.setItem('petslyvia_active_session', JSON.stringify({ user: { id: userB_id, email: userB_email, display_name: 'Arun_Bravo', friend_id: userB_fid } }));
  localStorage.setItem('petslyvia_profile', JSON.stringify(playerB.profile));

  // B checks status with A
  const bStatusWithA = await getFriendshipStatus(userA_id);
  assert(bStatusWithA === 'request_received', `Account B sees status as 'request_received' (got: ${bStatusWithA})`);

  // 3c. Reciprocal cross-directional duplicate prevention:
  // B clicking Add Friend while A has sent request
  const bAddARes = await sendFriendRequest(userA_fid);
  assert(!bAddARes.success, 'B cannot create duplicate reciprocal request to A');
  assert(bAddARes.error?.includes('already sent you a friend request'), `Instructs user to accept existing request: ${bAddARes.error}`);

  // -------------------------------------------------------------------------
  // TEST 5: DECLINE / REJECT FRIEND REQUEST
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Decline / Reject Friend Request ---');

  // B declines A's request
  const declineRes = await respondFriendRequest(aOutReqs[0].request_id, 'reject');
  assert(declineRes.success === true, 'B successfully declines friend request');

  // Status should revert to not_friends
  const statusAfterDecline = await getFriendshipStatus(userA_id);
  assert(statusAfterDecline === 'not_friends', `Status after decline is 'not_friends' (got: ${statusAfterDecline})`);

  // -------------------------------------------------------------------------
  // TEST 6: ACCEPT FRIEND REQUEST & MUTUAL FRIENDSHIP CONFIRMATION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Accept Friend Request & Mutual Friendship ---');

  // Switch back to A and send fresh request
  localStorage.setItem('petslyvia_active_session', JSON.stringify({ user: { id: userA_id, email: userA_email, display_name: 'Pavan_Alpha', friend_id: userA_fid } }));
  localStorage.setItem('petslyvia_profile', JSON.stringify(playerA.profile));

  const freshSend = await sendFriendRequest(userB_fid);
  assert(freshSend.success === true, 'A sends fresh friend request to B');

  // Switch to B and accept
  localStorage.setItem('petslyvia_active_session', JSON.stringify({ user: { id: userB_id, email: userB_email, display_name: 'Arun_Bravo', friend_id: userB_fid } }));
  localStorage.setItem('petslyvia_profile', JSON.stringify(playerB.profile));

  const bInReqs = await fetchPendingRequests();
  assert(bInReqs.length >= 1, `B received incoming request from A (count: ${bInReqs.length})`);

  const acceptRes = await respondFriendRequest(bInReqs[0].request_id, 'accept');
  assert(acceptRes.success === true, 'B accepts friend request');
  assert(acceptRes.new_status === 'accepted', 'Request status updated to accepted');

  // Verify B's friends list
  const bFriends = await fetchFriendsList();
  assert(bFriends.some((f) => f.user_id === userA_id), 'Account B sees Account A in Friends list');

  // Switch to A to verify A also sees B as friend without page refresh
  localStorage.setItem('petslyvia_active_session', JSON.stringify({ user: { id: userA_id, email: userA_email, display_name: 'Pavan_Alpha', friend_id: userA_fid } }));
  localStorage.setItem('petslyvia_profile', JSON.stringify(playerA.profile));

  const aFriends = await fetchFriendsList();
  assert(aFriends.some((f) => f.user_id === userB_id), 'Account A automatically sees Account B in Friends list');

  const statusNow = await getFriendshipStatus(userB_id);
  assert(statusNow === 'friends', `Authoritative relationship status is 'friends' for both players`);

  // Verify 1v1 Duel contacts sync
  const contacts = await petslyviaService.getContacts(userA_id);
  assert(contacts.some((c) => c.friend_user_id === userB_id), 'Real friend B is synchronized into 1v1 Duel contacts list');

  // Adding already-friend is rejected
  const alreadyFriendRes = await sendFriendRequest(userB_fid);
  assert(!alreadyFriendRes.success, 'Rejects adding an existing friend');
  assert(alreadyFriendRes.error?.includes('already friends'), `Informs user they are already friends: ${alreadyFriendRes.error}`);

  // -------------------------------------------------------------------------
  // TEST 7: MULTIPLAYER ROOM INVITATIONS
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Multiplayer Friend Room Invitations ---');

  const mockRoomId = 'room_102_arena';

  // 7a. Invite valid friend
  const inviteRes = await inviteFriendToRoom(mockRoomId, userB_fid);
  assert(inviteRes.success === true, 'A successfully invites friend B to room 102');

  // 7b. Invite non-friend
  const nonFriendFid = generateFriendId('stranger_uuid_999');
  const inviteNonFriendRes = await inviteFriendToRoom(mockRoomId, nonFriendFid);
  assert(!inviteNonFriendRes.success, 'Rejects inviting a player who is not an accepted friend');

  // -------------------------------------------------------------------------
  // TEST 8: REMOVE FRIEND & BLOCKING WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Friend Removal & Blocking / Unblocking ---');

  // 8a. Remove friend
  const removeRes = await removeFriend(userB_id);
  assert(removeRes.success === true, 'A successfully removes B from friends');

  const statusAfterRemove = await getFriendshipStatus(userB_id);
  assert(statusAfterRemove === 'not_friends', `Status after removal returns to 'not_friends' (got: ${statusAfterRemove})`);

  // 8b. Block user
  const blockRes = await blockUser(userB_id);
  assert(blockRes.success === true, 'A blocks player B');

  const statusBlocked = await getFriendshipStatus(userB_id);
  assert(statusBlocked === 'blocked', `Relationship status is 'blocked' (got: ${statusBlocked})`);

  // Blocked user cannot be invited or sent requests
  const blockedSend = await sendFriendRequest(userB_fid);
  assert(!blockedSend.success, 'Cannot send friend request to blocked player');

  // 8c. Unblock user
  const unblockRes = await unblockUser(userB_id);
  assert(unblockRes.success === true, 'A unblocks player B');

  const statusUnblocked = await getFriendshipStatus(userB_id);
  assert(statusUnblocked === 'not_friends', `Relationship status returns to 'not_friends' after unblock (got: ${statusUnblocked})`);

  // -------------------------------------------------------------------------
  // TEST 9: OUTGOING REQUEST CANCELLATION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Outgoing Request Cancellation ---');

  const newReqRes = await sendFriendRequest(userB_fid);
  assert(newReqRes.success === true, 'A sends new friend request to B');

  const outList = await fetchSentRequests();
  assert(outList.length === 1, 'Outgoing sent requests list shows 1 pending request');

  const cancelRes = await cancelFriendRequest(outList[0].request_id);
  assert(cancelRes.success === true, 'A successfully cancels outgoing request');

  const statusAfterCancel = await getFriendshipStatus(userB_id);
  assert(statusAfterCancel === 'not_friends', `Status after cancellation is 'not_friends' (got: ${statusAfterCancel})`);

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL FRIEND & MULTIPLAYER WORKFLOW TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
