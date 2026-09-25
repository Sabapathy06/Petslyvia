import { getArenaForContact } from './src/data/arenas.ts';
import { INITIAL_COMMUNITY_PROBLEMS } from './src/data/communitySeed.ts';
import { runDeterministicSimulation } from './src/services/gameEngine.ts';

console.log('========================================================');
console.log('🧪 VERIFYING 3D STADIUM & COMMUNITY LEVELS DISPLAY');
console.log('========================================================\n');

let passed = 0;

// Test 1: Community level 1 (Emerald Zig-Zag Odyssey - 6x6)
const comm1 = INITIAL_COMMUNITY_PROBLEMS[0];
const arena1 = getArenaForContact({ id: `comm_${comm1.id}`, friend_name: comm1.creatorName }, INITIAL_COMMUNITY_PROBLEMS);

if (
  arena1.gridSize.width === 6 &&
  arena1.gridSize.height === 6 &&
  arena1.startPos.x === 0 &&
  arena1.startPos.y === 0 &&
  arena1.goalPos.x === 3 &&
  arena1.goalPos.y === 3 &&
  arena1.crystals.length === 4 &&
  arena1.obstacles.length === 10
) {
  console.log('✅ PASS: Community Level 1 (6x6) accurately translates to custom 3D Arena');
  passed++;
} else {
  console.error('❌ FAIL: Community Level 1 arena mismatch', arena1);
}

// Test 2: Community level 2 (The Great Gate Relay - 7x4 with dual gates & switches)
const comm2 = INITIAL_COMMUNITY_PROBLEMS[1];
const arena2 = getArenaForContact({ id: `comm_${comm2.id}`, friend_name: comm2.creatorName }, INITIAL_COMMUNITY_PROBLEMS);

if (
  arena2.gridSize.width === 7 &&
  arena2.gridSize.height === 4 &&
  arena2.obstacles.some(o => o.type === 'gate') &&
  arena2.switches && arena2.switches.length === 2
) {
  console.log('✅ PASS: Community Level 2 (7x4) gates and dual switches correctly loaded for 3D Stadium');
  passed++;
} else {
  console.error('❌ FAIL: Community Level 2 arena mismatch', arena2);
}

// Test 3: Simulation on Community Arena 1
const simResult = runDeterministicSimulation(
  arena1.gridSize,
  arena1.startPos,
  arena1.startDir,
  arena1.goalPos,
  arena1.obstacles,
  arena1.crystals,
  arena1.switches || [],
  [
    { id: '1', type: 'move_down' },
    { id: '2', type: 'move_down' },
  ]
);

if (simResult.steps.length === 3 && simResult.steps[2].petPos.y === 2) {
  console.log('✅ PASS: Deterministic simulation runs correctly on 6x6 Community Arena grid');
  passed++;
} else {
  console.error('❌ FAIL: Simulation on Community Arena failed', simResult);
}

// Test 4: Contact friends arenas remain unique
const novaArena = getArenaForContact({ friend_name: 'Nova_Dev' });
const pixelArena = getArenaForContact({ friend_name: 'PixelBunny' });

if (novaArena.startPos.y === 0 && pixelArena.startPos.y === 4 && novaArena.arenaName !== pixelArena.arenaName) {
  console.log('✅ PASS: Contact duel stadiums (Nova vs Pixel) retain custom starting gates and theme attributes');
  passed++;
} else {
  console.error('❌ FAIL: Friend arenas mismatch', { novaArena, pixelArena });
}

console.log('\n========================================================');
console.log(`TOTAL TESTS: 4 | PASSED: ${passed} | FAILED: ${4 - passed}`);
console.log('========================================================');
