// tests/test_room_leave_rejoin_fix.mjs
// Verifies that leaving and re-joining a room:
// 1. Does not count the same user as an additional player
// 2. Decrements player count properly on leave
// 3. Removes empty rooms when the last player leaves
// 4. Correctly shows the true player count without accumulating duplicates

import {
  createRoom,
  joinRoom,
  leaveRoom,
  listOpenRooms,
} from '../src/services/multiplayerRoomService.ts';

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

// Mock localStorage store for node test environment
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};

async function testLeaveRejoinFlow() {
  console.log('========================================================================');
  console.log('🧪 TESTING ROOM LEAVE & RE-JOIN PLAYER COUNT FIX');
  console.log('========================================================================\n');

  const userId = 'user_pavan_123';
  const otherUserId = 'user_aero_456';

  // 1. Create a room
  console.log('--- 1. Creating room "pavan" ---');
  const { roomId } = await createRoom('pavan', 8, undefined, 1, userId);
  assert(Boolean(roomId), `Room created successfully with ID: ${roomId}`);

  let rooms = await listOpenRooms();
  let room = rooms.find((r) => r.room_id === roomId);
  assert(room !== undefined, 'Room "pavan" is present in open rooms list');
  assert(room.player_count === 1, `Initial player count is 1 (actual: ${room.player_count})`);

  // 2. Another player joins
  console.log('\n--- 2. Another player (Aero) joins room ---');
  await joinRoom(roomId, otherUserId);
  rooms = await listOpenRooms();
  room = rooms.find((r) => r.room_id === roomId);
  assert(room.player_count === 2, `Player count is now 2 after Aero joined (actual: ${room.player_count})`);

  // 3. Re-joining by the SAME player must NOT increment count
  console.log('\n--- 3. Pavan joins room again (duplicate check) ---');
  await joinRoom(roomId, userId);
  rooms = await listOpenRooms();
  room = rooms.find((r) => r.room_id === roomId);
  assert(room.player_count === 2, `Player count remains 2 (duplicate join by same user ignored) (actual: ${room.player_count})`);

  // 4. Pavan leaves the room
  console.log('\n--- 4. Pavan leaves the room ---');
  await leaveRoom(roomId, userId);
  rooms = await listOpenRooms();
  room = rooms.find((r) => r.room_id === roomId);
  assert(room !== undefined, 'Room still exists because Aero is still in it');
  assert(room.player_count === 1, `Player count decremented to 1 after Pavan left (actual: ${room.player_count})`);

  // 5. Pavan re-joins the room (simulate Leave -> Join cycle multiple times)
  console.log('\n--- 5. Simulating Leave -> Join cycle 4 times ---');
  for (let cycle = 1; cycle <= 4; cycle++) {
    await joinRoom(roomId, userId);
    rooms = await listOpenRooms();
    room = rooms.find((r) => r.room_id === roomId);
    assert(room.player_count === 2, `Cycle ${cycle}: After re-joining, player count is 2 (never 3, 4, 5...) (actual: ${room.player_count})`);

    await leaveRoom(roomId, userId);
    rooms = await listOpenRooms();
    room = rooms.find((r) => r.room_id === roomId);
    assert(room.player_count === 1, `Cycle ${cycle}: After leaving, player count is 1 (actual: ${room.player_count})`);
  }

  // 6. When the last player (Aero) leaves, room is cleaned up
  console.log('\n--- 6. Last player leaves room ---');
  await leaveRoom(roomId, otherUserId);
  rooms = await listOpenRooms();
  room = rooms.find((r) => r.room_id === roomId);
  assert(room === undefined, 'Room is automatically cleaned up when 0 players remain');

  console.log('\n========================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

testLeaveRejoinFlow().catch((err) => {
  console.error('Error in test:', err);
  process.exit(1);
});
