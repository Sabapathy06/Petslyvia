// Automated Verification Suite for PETSLYVIA Core Logic & Specifications
import { runDeterministicSimulation } from './src/services/gameEngine.ts';
import { MISSIONS_LIST } from './src/data/missions.ts';

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
console.log('🐾 PETSLYVIA SYSTEM VERIFICATION SUITE');
console.log('========================================================\n');

// ----------------------------------------------------
// 1. MISSION 1: STAGE 1 (PLAY - DIRECTIONAL NAVIGATION)
// ----------------------------------------------------
console.log('--- 1. Testing Mission 1: Welcome Home (Direct Movement) ---');
const m1 = MISSIONS_LIST[0];
const m1Blocks = [
  { id: 'b1', type: 'move_forward' },
  { id: 'b2', type: 'move_forward' },
  { id: 'b3', type: 'move_forward' },
  { id: 'b4', type: 'move_forward' },
];

const m1Res = runDeterministicSimulation(
  m1.gridSize,
  m1.startPos,
  m1.startDir,
  m1.goalPos,
  m1.obstacles,
  m1.crystals,
  m1.switches,
  m1Blocks
);

assert(m1Res.success === true, 'Mission 1 completes successfully with 4 forward steps');
assert(m1Res.reachedGoal === true, 'Mission 1 pet reaches home goal tile (4, 1)');
assert(m1Res.steps.length === 5, 'Mission 1 has 5 recording steps (step 0 to 4)');
assert(m1Res.revealedCode && m1Res.revealedCode.length === 4, 'Mission 1 generates 4 lines of revealed code');

// ----------------------------------------------------
// 2. MISSION 2: STAGE 2 (DISCOVER - MULTIPLE CRYSTALS)
// ----------------------------------------------------
console.log('\n--- 2. Testing Mission 2: Crystal Gathering ---');
const m2 = MISSIONS_LIST[1];
const m2Blocks = [
  { id: 'b1', type: 'move_forward' }, // Collects crystal at (1, 0)
  { id: 'b2', type: 'turn_right' },
  { id: 'b3', type: 'move_forward' },
  { id: 'b4', type: 'move_forward' },
  { id: 'b5', type: 'move_forward' },
  { id: 'b6', type: 'move_forward' }, // Collects crystal at (1, 4)
  { id: 'b7', type: 'turn_left' },
  { id: 'b8', type: 'move_forward' },
  { id: 'b9', type: 'move_forward' }, // Collects crystal at (3, 4)
  { id: 'b10', type: 'move_forward' }, // Reaches goal at (4, 4)
];

const m2Res = runDeterministicSimulation(
  m2.gridSize,
  m2.startPos,
  m2.startDir,
  m2.goalPos,
  m2.obstacles,
  m2.crystals,
  m2.switches,
  m2Blocks
);

assert(m2Res.success === true, 'Mission 2 completes successfully');
assert(m2Res.crystalsGathered === 3, 'Mission 2 gathered all 3 required crystals');

// ----------------------------------------------------
// 3. MISSION 3: STAGE 1 (INTERACTION & GATES)
// ----------------------------------------------------
console.log('\n--- 3. Testing Mission 3: The Ancient Gate ---');
const m3 = MISSIONS_LIST[2];
const m3Blocks = [
  { id: 'b1', type: 'move_forward' }, // lands on switch at (1, 1)
  { id: 'b2', type: 'interact' },     // triggers switch -> opens gate at (3, 1)
  { id: 'b3', type: 'move_forward' },
  { id: 'b4', type: 'move_forward' },
  { id: 'b5', type: 'move_forward' },
  { id: 'b6', type: 'move_forward' }, // Reaches goal at (5, 1)
];

const m3Res = runDeterministicSimulation(
  m3.gridSize,
  m3.startPos,
  m3.startDir,
  m3.goalPos,
  m3.obstacles,
  m3.crystals,
  m3.switches,
  m3Blocks
);

assert(m3Res.success === true, 'Mission 3 successfully opens gate and reaches destination');

// ----------------------------------------------------
// 4. MISSION 4: STAGE 4 (BREAK & FIX DEBUGGING)
// ----------------------------------------------------
console.log('\n--- 4. Testing Mission 4: The Glitched Path (Break & Fix) ---');
const m4 = MISSIONS_LIST[3];

// Initial broken blocks: hits wall at step 2
const brokenBlocks = [...m4.initialBlocks];
const brokenRes = runDeterministicSimulation(
  m4.gridSize,
  m4.startPos,
  m4.startDir,
  m4.goalPos,
  m4.obstacles,
  m4.crystals,
  m4.switches,
  brokenBlocks
);

assert(brokenRes.success === false, 'Initial broken instructions fail deterministically');
assert(brokenRes.steps.some(s => s.status === 'collision'), 'Initial broken blocks trigger collision detection on wall');

// Repaired blocks: replace block 2 with turn_right
const repairedBlocks = [
  { id: 'b1', type: 'move_forward' },
  { id: 'b2', type: 'turn_right' },   // FIXED
  { id: 'b3', type: 'move_forward' },
  { id: 'b4', type: 'move_forward' },
  { id: 'b5', type: 'turn_left' },
  { id: 'b6', type: 'move_forward' },
  { id: 'b7', type: 'move_forward' },
  { id: 'b8', type: 'move_forward' },
  { id: 'b9', type: 'turn_right' },
  { id: 'b10', type: 'move_forward' },
];

const repairedRes = runDeterministicSimulation(
  m4.gridSize,
  m4.startPos,
  m4.startDir,
  m4.goalPos,
  m4.obstacles,
  m4.crystals,
  m4.switches,
  repairedBlocks
);

assert(repairedRes.success === true, 'Repaired logic successfully bypasses obstacle to achieve victory');

// ----------------------------------------------------
// 5. MISSION 5: STAGE 3 & 5 (REPEAT LOOPS)
// ----------------------------------------------------
console.log('\n--- 5. Testing Mission 5: Repeat Loops ---');
const m5 = MISSIONS_LIST.find((m) => m.id === 'mission_5') || MISSIONS_LIST[4];
const m5Blocks = [
  {
    id: 'loop1',
    type: 'repeat',
    params: { count: 5 },
    nestedBlocks: [
      { id: 'sub1', type: 'move_forward' },
      { id: 'sub2', type: 'turn_right' },
      { id: 'sub3', type: 'move_forward' },
      { id: 'sub4', type: 'turn_left' },
    ],
  },
];

const m5Res = runDeterministicSimulation(
  m5.gridSize,
  m5.startPos,
  m5.startDir,
  m5.goalPos,
  m5.obstacles,
  m5.crystals,
  m5.switches,
  m5Blocks
);

assert(m5Res.success === true, 'Repeat loop successfully executes nested pattern to reach destination');
assert(m5Res.crystalsGathered === 2, 'Collected all crystals along staircase');

// ----------------------------------------------------
// FINAL SCORE
// ----------------------------------------------------
console.log('\n========================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('========================================================');

if (failed > 0) process.exit(1);
