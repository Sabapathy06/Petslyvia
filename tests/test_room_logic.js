// Standalone unit test for room leave, rejoin, and player count management
const LOCAL_ROOMS_KEY = 'petslyvia:arena:rooms';
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};

function getLocalRooms() {
  try {
    const raw = localStorage.getItem(LOCAL_ROOMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRooms(rooms) {
  try {
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
  } catch {}
}

function listOpenRooms() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  return getLocalRooms().filter(
    (r) => new Date(r.created_at).getTime() > cutoff && (r.player_count ?? 1) > 0
  );
}

function createRoom(name, maxPlayers = 8, missionId, level = 1, creatorUserId) {
  const roomId = `room_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const creatorId = creatorUserId || 'creator';
  const newRoom = {
    room_id: roomId,
    name: name.trim() || 'Arena Room',
    status: 'waiting',
    max_players: maxPlayers,
    mission_id: missionId ?? null,
    level: level,
    created_at: new Date().toISOString(),
    player_count: 1,
    player_ids: [creatorId],
  };

  const currentRooms = getLocalRooms();
  const filtered = currentRooms.filter((r) => r.name !== newRoom.name && (r.player_count ?? 0) > 0);
  saveLocalRooms([newRoom, ...filtered]);
  return { roomId };
}

function joinRoom(roomId, userId) {
  const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const rooms = getLocalRooms();
  const room = rooms.find((r) => r.room_id === roomId);
  if (room) {
    if (!room.player_ids) {
      room.player_ids = [];
    }
    const uid = userId || sessionId;
    if (!room.player_ids.includes(uid)) {
      room.player_ids.push(uid);
    }
    room.player_count = Math.min(room.player_ids.length, room.max_players);
    saveLocalRooms(rooms);
  }
  return { sessionId };
}

function leaveRoom(roomId, userId) {
  const rooms = getLocalRooms();
  const roomIndex = rooms.findIndex((r) => r.room_id === roomId);
  if (roomIndex !== -1) {
    const room = rooms[roomIndex];
    if (room.player_ids && userId) {
      room.player_ids = room.player_ids.filter((id) => id !== userId);
      room.player_count = room.player_ids.length;
    } else {
      room.player_count = Math.max(0, (room.player_count || 1) - 1);
    }

    if (room.player_count <= 0) {
      rooms.splice(roomIndex, 1);
    }
    saveLocalRooms(rooms);
  }
}

// RUN CHECKS
let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log('✅ PASS:', msg);
    passed++;
  } else {
    console.error('❌ FAIL:', msg);
    failed++;
  }
}

console.log('--- 1. Create Room "pavan" ---');
const userA = 'sabapathysiva2006';
const { roomId } = createRoom('pavan', 8, undefined, 1, userA);
let open = listOpenRooms();
assert(open.length === 1, '1 open room exists');
assert(open[0].player_count === 1, 'Room "pavan" player_count is 1');
assert(open[0].player_ids.includes(userA), 'User sabapathysiva2006 is in player_ids');

console.log('\n--- 2. User sabapathysiva2006 leaves room ---');
leaveRoom(roomId, userA);
open = listOpenRooms();
assert(open.length === 0, 'Room automatically removed when player_count drops to 0 (no lingering ghost room)');

console.log('\n--- 3. Re-create room "pavan" and add User B ---');
const { roomId: r2 } = createRoom('pavan', 8, undefined, 1, userA);
const userB = 'player_bob';
joinRoom(r2, userB);
open = listOpenRooms();
assert(open[0].player_count === 2, 'Player count is 2 with User A and User B');

console.log('\n--- 4. Leave and Rejoin 5 Times by User A ---');
for (let i = 1; i <= 5; i++) {
  leaveRoom(r2, userA);
  let r = listOpenRooms().find((x) => x.room_id === r2);
  assert(r.player_count === 1, `Iteration ${i}: on leave, player_count drops to 1`);

  joinRoom(r2, userA);
  r = listOpenRooms().find((x) => x.room_id === r2);
  assert(r.player_count === 2, `Iteration ${i}: on rejoin, player_count stays at 2 (never 3, 4, 5/8!)`);
}

console.log('\n--- 5. Duplicate Join by same user without leave ---');
joinRoom(r2, userA);
joinRoom(r2, userA);
let finalRoom = listOpenRooms().find((x) => x.room_id === r2);
assert(finalRoom.player_count === 2, 'Duplicate join calls by same user do NOT increment count');

console.log(`\nALL TESTS: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
