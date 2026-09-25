import { runDeterministicSimulation } from './src/services/gameEngine.ts';

console.log('========================================================');
console.log('🧪 TESTING NEW PETSLYVIA ENHANCEMENTS');
console.log('========================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

// 1. Test 2D Directional Absolute Movement
const sim2D = runDeterministicSimulation(
  { width: 5, height: 5 },
  { x: 0, y: 0 },
  'right',
  { x: 2, y: 2 },
  [],
  [],
  [],
  [
    { id: '1', type: 'move_right' },
    { id: '2', type: 'move_right' },
    { id: '3', type: 'move_down' },
    { id: '4', type: 'move_down' },
  ]
);

assert(sim2D.success === true, '2D Direct Directional Navigation reaches target (2, 2)');
assert(sim2D.steps[1].petPos.x === 1 && sim2D.steps[1].petPos.y === 0, 'move_right increments X');
assert(sim2D.steps[3].petPos.x === 2 && sim2D.steps[3].petPos.y === 1, 'move_down increments Y');

// 2. Test Up / Left Movement
const simUpLeft = runDeterministicSimulation(
  { width: 5, height: 5 },
  { x: 3, y: 3 },
  'right',
  { x: 1, y: 1 },
  [],
  [],
  [],
  [
    { id: '1', type: 'move_left' },
    { id: '2', type: 'move_left' },
    { id: '3', type: 'move_up' },
    { id: '4', type: 'move_up' },
  ]
);

assert(simUpLeft.success === true, 'move_left and move_up reach target (1, 1)');

// 3. Test Coding Sandbox Grid with Repeat Loop
const simRepeat = runDeterministicSimulation(
  { width: 7, height: 5 },
  { x: 0, y: 1 },
  'right',
  { x: 5, y: 1 },
  [],
  [{ x: 1, y: 1 }, { x: 3, y: 1 }],
  [],
  [
    {
      id: 'loop1',
      type: 'repeat',
      params: { count: 5 },
      nestedBlocks: [{ id: 'sub1', type: 'move_forward' }]
    }
  ]
);

assert(simRepeat.success === true, 'Repeat loop simulation completes correctly');
assert(simRepeat.crystalsGathered === 2, 'Collected all crystals in corridor');

// 4. Test Mission Data List for Multi-Levels
import { MISSIONS_LIST } from './src/data/missions.ts';

const smartCityMissions = MISSIONS_LIST.filter(m => m.worldArea === 'smart_city');
assert(smartCityMissions.length === 3, 'Smart City has 3 levels');
assert(smartCityMissions[0].hints && smartCityMissions[0].hints.length > 0, 'Smart City Level 1 has hints');

const bugDungeonMissions = MISSIONS_LIST.filter(m => m.worldArea === 'bug_dungeon');
assert(bugDungeonMissions.length === 3, 'Bug Dungeon has 3 levels');

const codingMissions = MISSIONS_LIST.filter(m => m.worldArea === 'coding_lab');
assert(codingMissions.length === 3, 'Coding Lab has 3 levels');
assert(codingMissions[1].title === 'Zigzag Algorithm', 'Coding Lab Level 2 is Zigzag Algorithm');
assert(codingMissions[2].title === 'Quantum Matrix Perimeter', 'Coding Lab Level 3 is Quantum Matrix Perimeter');
assert(codingMissions[2].goalPos.x === 0 && codingMissions[2].goalPos.y === 4, 'Coding Lab Level 3 has distinct perimeter goal');

// 5. Test Bug Dungeon Level 1 Solution with appended instructions
const bugSim = runDeterministicSimulation(
  bugDungeonMissions[0].gridSize,
  bugDungeonMissions[0].startPos,
  bugDungeonMissions[0].startDir,
  bugDungeonMissions[0].goalPos,
  bugDungeonMissions[0].obstacles,
  bugDungeonMissions[0].crystals,
  bugDungeonMissions[0].switches,
  [
    { id: '1', type: 'move_forward' }, // (1, 0)
    { id: '2', type: 'move_down' },    // (1, 1) grabs crystal
    { id: '3', type: 'move_down' },    // (1, 2)
    { id: '4', type: 'move_right' },   // (2, 2)
    { id: '5', type: 'move_right' },   // (3, 2)
    { id: '6', type: 'move_right' },   // (4, 2)
    { id: '7', type: 'move_down' },    // (4, 3) reaches goal
  ]
);
assert(bugSim.success === true, 'Bug Dungeon Level 1 completes with appended instructions');

// 6. Test Coding Lab Level 3 Multi-Stage Loop Algorithm
const level3Sim = runDeterministicSimulation(
  codingMissions[2].gridSize,
  codingMissions[2].startPos,
  codingMissions[2].startDir,
  codingMissions[2].goalPos,
  codingMissions[2].obstacles,
  codingMissions[2].crystals,
  codingMissions[2].switches,
  [
    {
      id: 'loop1',
      type: 'repeat',
      params: { count: 5 },
      nestedBlocks: [{ id: 's1', type: 'move_forward' }],
    },
    { id: 'turn1', type: 'turn_right' },
    {
      id: 'loop2',
      type: 'repeat',
      params: { count: 4 },
      nestedBlocks: [{ id: 's2', type: 'move_forward' }],
    },
    { id: 'turn2', type: 'turn_right' },
    {
      id: 'loop3',
      type: 'repeat',
      params: { count: 5 },
      nestedBlocks: [{ id: 's3', type: 'move_forward' }],
    },
  ]
);
assert(level3Sim.success === true, 'Coding Lab Level 3 multi-stage loop algorithm succeeds');
assert(level3Sim.crystalsGathered === 3, 'Level 3 perimeter sweeps all 3 quantum crystals');

// 7. Test Distinct Arenas for Challenge Contacts
import { getArenaForContact } from './src/data/arenas.ts';

const arenaNova = getArenaForContact({ friend_name: 'Nova_Dev' });
const arenaPixel = getArenaForContact({ friend_name: 'PixelFox' });
const arenaCyber = getArenaForContact({ friend_name: 'CyberCoder' });

assert(arenaNova.arenaName !== arenaPixel.arenaName, 'Nova and Pixel have different arena names');
assert(arenaNova.startPos.x !== arenaPixel.startPos.x || arenaNova.startPos.y !== arenaPixel.startPos.y, 'Nova and Pixel have different start positions');
assert(arenaCyber.gridSize.width === 6, 'CyberCoder has distinct 6x5 matrix layout');

console.log('\n========================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('========================================================');

if (failed > 0) process.exit(1);
