import { runDeterministicSimulation } from './src/services/gameEngine.ts';
import { sound } from './src/utils/audio.ts';

console.log('========================================================');
console.log('🧪 VERIFYING INTERACT BLOCKS, BUG CREATION & EMOTION AUDIO');
console.log('========================================================\n');

let passed = 0;

// Test 1: Deterministic simulation with 'interact' block toggling gates/switches
const startPos = { x: 0, y: 0 };
const goalPos = { x: 2, y: 0 };
const obstacles = [{ x: 2, y: 0, type: 'gate', id: 'gate_1' }];
const switches = [{ x: 1, y: 0, targetGateId: 'gate_1' }];
const crystals = [];

const blocks = [
  { id: '1', type: 'move_right' },  // moves to (1,0) where switch is
  { id: '2', type: 'interact' },    // triggers switch -> opens gate_1
  { id: '3', type: 'move_right' },  // steps onto (2,0) goal through opened gate
];

const result = runDeterministicSimulation(
  { width: 3, height: 3 },
  startPos,
  'right',
  goalPos,
  obstacles,
  crystals,
  switches,
  blocks
);

const lastStep = result.steps[result.steps.length - 1];
if (result.success && lastStep && lastStep.openGates.includes('gate_1')) {
  console.log('✅ PASS: Deterministic simulation successfully executes `interact` to open gates');
  passed++;
} else {
  console.error('❌ FAIL: Interact block simulation failed', result);
}

// Test 2: Audio Engine sound methods
const soundMethods = ['playPet', 'playEat', 'playSleep', 'playHurt', 'playSparkle', 'playVictory', 'playError', 'playLove', 'playHappy', 'playZzz', 'playChomp', 'playEvolve'];
let allMethodsExist = true;
for (const method of soundMethods) {
  if (typeof sound[method] !== 'function') {
    console.error(`❌ FAIL: Missing sound method: ${method}`);
    allMethodsExist = false;
  }
}
if (allMethodsExist) {
  console.log('✅ PASS: All 12 emotion & action sound synthesis methods exist on sound engine');
  passed++;
}

// Test 3: Audio methods execute safely in Node environment without throwing
try {
  sound.playPet();
  sound.playEat();
  sound.playSleep();
  sound.playHurt();
  sound.playSparkle();
  sound.playVictory();
  sound.playError();
  console.log('✅ PASS: Sound synthesis methods execute safely with fallback context handling');
  passed++;
} catch (e) {
  console.error('❌ FAIL: Sound execution error:', e);
}

console.log('\n========================================================');
console.log(`TOTAL TESTS: 3 | PASSED: ${passed} | FAILED: ${3 - passed}`);
console.log('========================================================');
