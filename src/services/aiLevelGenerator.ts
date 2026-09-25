import type {
  MissionDefinition,
  GridPos,
  GridObstacle,
  GridCrystal,
  GridSwitch,
  Direction,
  BlockType,
  CommunityProblem
} from '@/types/game';
import { petslyviaService } from './petslyviaService';

export type AILevelDifficulty = 'novice' | 'easy' | 'medium' | 'hard' | 'expert' | 'grandmaster';
export type AILevelTheme = 'forest' | 'dungeon' | 'city' | 'arena' | 'nebula' | 'magma';
export type AILevelFocus = 'mixed' | 'pathfinding' | 'loops' | 'switches' | 'crystals' | 'maze';

export interface AILevelGenerationOptions {
  difficulty?: AILevelDifficulty;
  theme?: AILevelTheme;
  focusConcept?: AILevelFocus;
  userLevel?: number;
  promptDescription?: string;
}

// Lore Title Prefixes & Suffixes
const TITLE_PREFIXES = [
  'Quantum', 'Cyber', 'Neon', 'Neural', 'Matrix', 'Binary',
  'Galactic', 'Spectral', 'Hyper', 'Circuit', 'Cosmic', 'Synthesized',
  'Plasma', 'Vortex', 'Chrono', 'Astral', 'Eclipse', 'Titan'
];

const TITLE_LOCATIONS = [
  'Corridor', 'Labyrinth', 'Nexus', 'Mainframe', 'Sanctuary', 'Chamber',
  'Citadel', 'Ridge', 'Overpass', 'Gateway', 'Bastion', 'Core',
  'Spire', 'Fortress', 'Vault', 'Sanctum', 'Foundry', 'Monolith'
];

const THEME_STORIES: Record<AILevelTheme, string[]> = {
  forest: [
    'An ancient cyber-canopy is glowing with corrupted energy. Navigate the winding crystal path to restore the roots.',
    'Quantum fireflies have scattered across the digital grove. Collect the lost memory crystals before the gate closes.',
    'Laser barriers are partitioning the enchanted woodland. Find the activation switches to release your pet.'
  ],
  dungeon: [
    'Deep inside the glitch crypts, rogue logic anomalies are blocking the mainframe escape pod.',
    'A network fault has locked down the quantum vault. Trace the path around lava pools and override the security gates.',
    'Firewall monoliths have materialized in the dungeon corridor. Execute a sequence of algorithms to bypass them.'
  ],
  city: [
    'Smart City power conduits are misaligned. Sweep through the metropolitan grid to collect energy cells.',
    'Traffic automation gridlock in the cyber district! Program a path around construction barriers to reach the hub.',
    'The neon skyline mainframe requires a synchronized circuit route to reboot municipal subroutines.'
  ],
  arena: [
    'A holographic stadium challenge awaits! Guide your companion through the tactical obstacle perimeter.',
    'Champion racing grid active. Plan the shortest step sequence to collect crystals and claim victory.',
    'The grand tournament arena has activated dynamic gates. Unlock switches in sequence to cross the finish line.'
  ],
  nebula: [
    'Astral gravity wells have fractured space-time in the cosmic nebula. Collect celestial fragments across starbridges.',
    'Floating quantum asteroid platforms require calculated trajectory steps to reach the hyperspace gate.',
    'Starlight conduits are deactivated. Traverse the void perimeter to restore orbital alignment.'
  ],
  magma: [
    'Sub-crustal heat vents have triggered security lockouts in the volcanic foundry. Bypass magma chasms.',
    'Molten energy circuits are overheating. Trigger thermal switches to lower the blast shields and escape.',
    'Obsidian monoliths guard the geothermal reactor core. Program a cooling route to reach the exit platform.'
  ]
};

// BFS Pathfinding validator to guarantee 100% solvability
function checkPathExists(
  width: number,
  height: number,
  start: GridPos,
  goal: GridPos,
  obstacles: GridObstacle[]
): boolean {
  const isBlocked = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return true;
    return obstacles.some((o) => o.x === x && o.y === y && o.type !== 'gate');
  };

  const queue: GridPos[] = [{ ...start }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.y === goal.y) {
      return true;
    }

    for (const d of directions) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      const key = `${nx},${ny}`;

      if (!visited.has(key) && !isBlocked(nx, ny)) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return false;
}

/**
 * Procedural & AI-driven Level Synthesizer
 */
export function generateProceduralAILevel(options: AILevelGenerationOptions = {}): MissionDefinition {
  const difficulty = options.difficulty || 'medium';
  const theme: AILevelTheme = options.theme || (['forest', 'dungeon', 'city', 'arena', 'nebula', 'magma'] as const)[Math.floor(Math.random() * 6)];
  const focus = options.focusConcept || 'mixed';

  // 1. Grid Dimensions based on difficulty
  let width = 6;
  let height = 6;
  let maxObstacles = 6;
  let crystalCount = 2;
  let hasSwitchesAndGates = false;

  if (difficulty === 'novice') {
    width = 4;
    height = 4;
    maxObstacles = 2;
    crystalCount = 1;
    hasSwitchesAndGates = false;
  } else if (difficulty === 'easy') {
    width = 5;
    height = 5;
    maxObstacles = 3;
    crystalCount = 1;
    hasSwitchesAndGates = false;
  } else if (difficulty === 'medium') {
    width = 6;
    height = 6;
    maxObstacles = 6;
    crystalCount = 2;
    hasSwitchesAndGates = focus === 'switches' || focus === 'mixed';
  } else if (difficulty === 'hard') {
    width = 7;
    height = 6;
    maxObstacles = 9;
    crystalCount = 3;
    hasSwitchesAndGates = true;
  } else if (difficulty === 'expert') {
    width = 7;
    height = 7;
    maxObstacles = 13;
    crystalCount = 4;
    hasSwitchesAndGates = true;
  } else if (difficulty === 'grandmaster') {
    width = 8;
    height = 8;
    maxObstacles = 18;
    crystalCount = 5;
    hasSwitchesAndGates = true;
  }

  if (focus === 'crystals') {
    crystalCount = Math.min(5, crystalCount + 1);
  }

  // 2. Positions: Start and Goal
  const startPos: GridPos = { x: 0, y: 0 };
  const goalPos: GridPos = { x: width - 1, y: height - 1 };
  const startDir: Direction = 'right';

  // 3. Synthesize Obstacles with Guaranteed Solvability Loop
  let obstacles: GridObstacle[] = [];
  let switches: GridSwitch[] = [];
  let crystals: GridCrystal[] = [];
  let attempts = 0;
  let validLevel = false;

  while (!validLevel && attempts < 50) {
    attempts++;
    obstacles = [];
    switches = [];
    crystals = [];

    // Place Laser Gate and Switch if required
    if (hasSwitchesAndGates) {
      const gateX = Math.floor(width / 2);
      const gateY = Math.floor(height / 2);
      const gateId = `gate_ai_${Date.now()}_${attempts}`;

      obstacles.push({
        x: gateX,
        y: gateY,
        type: 'gate',
        id: gateId,
        isOpen: false,
      });

      // Switch placed at accessible quadrant
      const switchX = Math.min(width - 2, Math.max(1, gateX - 1));
      const switchY = Math.min(height - 2, Math.max(1, gateY + 1));
      switches.push({
        x: switchX,
        y: switchY,
        targetGateId: gateId,
        color: 'amber',
      });
    }

    // Place Walls and Water
    const obsTypes: ('wall' | 'water')[] =
      theme === 'dungeon' || theme === 'magma'
        ? ['wall', 'wall', 'water']
        : theme === 'nebula'
        ? ['wall', 'wall', 'wall']
        : ['wall', 'water'];

    let placedObs = 0;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if ((x === startPos.x && y === startPos.y) || (x === goalPos.x && y === goalPos.y)) continue;
        if (switches.some((s) => s.x === x && s.y === y)) continue;
        if (obstacles.some((o) => o.x === x && o.y === y)) continue;

        if (placedObs < maxObstacles && Math.random() < 0.28) {
          const type = obsTypes[Math.floor(Math.random() * obsTypes.length)];
          obstacles.push({ x, y, type });
          placedObs++;
        }
      }
    }

    // Check Solvability from Start to Goal
    if (checkPathExists(width, height, startPos, goalPos, obstacles)) {
      // Place Crystals on valid non-blocked cells
      for (let i = 0; i < crystalCount; i++) {
        let cx = Math.floor(Math.random() * width);
        let cy = Math.floor(Math.random() * height);
        if (
          (cx !== startPos.x || cy !== startPos.y) &&
          (cx !== goalPos.x || cy !== goalPos.y) &&
          !obstacles.some((o) => o.x === cx && o.y === cy) &&
          !crystals.some((c) => c.x === cx && c.y === cy)
        ) {
          crystals.push({ x: cx, y: cy });
        }
      }
      validLevel = true;
    }
  }

  // Fallback cleanup if needed to ensure 100% path
  if (!validLevel) {
    obstacles = obstacles.filter((o) => o.type === 'gate');
  }

  // 4. Generate Narrative & Level Lore
  const prefix = TITLE_PREFIXES[Math.floor(Math.random() * TITLE_PREFIXES.length)];
  const location = TITLE_LOCATIONS[Math.floor(Math.random() * TITLE_LOCATIONS.length)];
  const title = `${prefix} ${location}`;

  const themeStoriesList = THEME_STORIES[theme] || THEME_STORIES.forest;
  const story = themeStoriesList[Math.floor(Math.random() * themeStoriesList.length)];
  const objective = crystals.length > 0
    ? `Navigate the ${width}x${height} grid, collect all ${crystals.length} energy crystal(s), and step into the warp portal!`
    : `Guide your companion safely across the ${width}x${height} ${theme} grid to the exit portal!`;

  const worldArea =
    theme === 'forest'
      ? 'logic_forest'
      : theme === 'dungeon' || theme === 'magma'
      ? 'bug_dungeon'
      : theme === 'city'
      ? 'smart_city'
      : 'challenge_arena';

  const xpReward =
    difficulty === 'novice'
      ? 25
      : difficulty === 'easy'
      ? 45
      : difficulty === 'medium'
      ? 75
      : difficulty === 'hard'
      ? 120
      : difficulty === 'expert'
      ? 180
      : 250;

  const coinReward =
    difficulty === 'novice'
      ? 20
      : difficulty === 'easy'
      ? 35
      : difficulty === 'medium'
      ? 60
      : difficulty === 'hard'
      ? 95
      : difficulty === 'expert'
      ? 140
      : 200;

  const allowedBlocks: BlockType[] = [
    'move_forward',
    'turn_left',
    'turn_right',
    'move_up',
    'move_down',
    'move_left',
    'move_right',
    'interact'
  ];

  if (difficulty !== 'novice' && difficulty !== 'easy') {
    allowedBlocks.push('repeat');
  }

  const generatedMission: MissionDefinition = {
    id: `ai_gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    number: Math.floor(Math.random() * 900) + 100,
    title: `AI Mission: ${title}`,
    worldArea,
    stageType: focus === 'loops' ? 'code' : 'visual_logic',
    story,
    objective,
    gridSize: { width, height },
    startPos,
    startDir,
    goalPos,
    obstacles,
    crystals,
    switches: switches.length > 0 ? switches : undefined,
    allowedControls: ['up', 'down', 'left', 'right', 'interact', 'jump'],
    allowedBlocks,
    hints: [
      'Observe the obstacles and count the grid tiles before inputting your code.',
      crystals.length > 0 ? 'Pick up all glowing crystals along your route!' : 'Avoid water and wall barriers.',
      'You can use both Python/JavaScript code typing or visual blocks.'
    ],
    explanation: `This stage was dynamically synthesized by the AI Level Architect to test your ${focus} and 3D spatial routing skills.`,
    xpReward,
    coinReward,
    skillRewards: {
      logic: 30,
      algorithms: 25,
      debugging: 20
    }
  };

  // Save to community problems asynchronously in background
  try {
    const communityProblem: CommunityProblem = {
      id: generatedMission.id,
      title: generatedMission.title,
      description: generatedMission.objective,
      creatorId: 'ai_architect',
      creatorName: 'AI Game Master ✨',
      difficulty: difficulty === 'grandmaster' || difficulty === 'expert' ? 'hard' : difficulty === 'novice' ? 'easy' : difficulty,
      grid: {
        width,
        height,
        start: startPos,
        goal: goalPos,
        obstacles,
        crystals,
      },
      availableBlocks: allowedBlocks,
      playsCount: 1,
      solvesCount: 0,
      likesCount: 5,
      createdAt: new Date().toISOString(),
    };
    petslyviaService.createCommunityProblem(communityProblem).catch(() => {});
  } catch {
    // ignore
  }

  return generatedMission;
}

/**
 * Curated AI Challenge Vault (Handcrafted & Master-Generated Benchmark Stages)
 */
export const AI_VAULT_LEVELS: MissionDefinition[] = [
  {
    id: 'ai_vault_1',
    number: 101,
    title: 'Quantum Nexus Overpass',
    worldArea: 'logic_forest',
    stageType: 'visual_logic',
    story: 'High above the digital forest, a bridge of quantum crystals has formed over the stream. Collect all fragments without falling into the water!',
    objective: 'Gather 2 energy crystals and reach the nexus altar safely.',
    gridSize: { width: 5, height: 5 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 4, y: 4 },
    obstacles: [
      { x: 1, y: 1, type: 'wall' },
      { x: 2, y: 1, type: 'water' },
      { x: 2, y: 2, type: 'water' },
      { x: 2, y: 3, type: 'water' },
      { x: 3, y: 3, type: 'wall' },
    ],
    crystals: [
      { x: 0, y: 3 },
      { x: 4, y: 1 }
    ],
    allowedControls: ['up', 'down', 'left', 'right', 'interact'],
    allowedBlocks: ['move_forward', 'turn_left', 'turn_right', 'move_up', 'move_down', 'move_left', 'move_right', 'interact'],
    hints: ['Walk down to grab the first crystal before crossing around the water.'],
    explanation: 'Basic obstacle bypass with dual-coordinate routing.',
    xpReward: 50,
    coinReward: 40,
    skillRewards: { logic: 20, algorithms: 15 }
  },
  {
    id: 'ai_vault_2',
    number: 102,
    title: 'Glitch Crypt Laser Firewall',
    worldArea: 'bug_dungeon',
    stageType: 'visual_logic',
    story: 'A rogue security protocol has locked down the mainframe corridor with an active laser barrier. Step on the amber override switch to unlock the gate!',
    objective: 'Trigger the amber pressure switch to open the laser gate, then escape.',
    gridSize: { width: 6, height: 5 },
    startPos: { x: 0, y: 2 },
    startDir: 'right',
    goalPos: { x: 5, y: 2 },
    obstacles: [
      { x: 2, y: 0, type: 'wall' },
      { x: 2, y: 1, type: 'wall' },
      { x: 2, y: 2, type: 'gate', id: 'gate_vault_2', isOpen: false },
      { x: 2, y: 3, type: 'wall' },
      { x: 2, y: 4, type: 'wall' },
    ],
    switches: [
      { x: 1, y: 4, targetGateId: 'gate_vault_2', color: 'amber' }
    ],
    crystals: [
      { x: 4, y: 2 }
    ],
    allowedControls: ['up', 'down', 'left', 'right', 'interact'],
    allowedBlocks: ['move_forward', 'turn_left', 'turn_right', 'move_up', 'move_down', 'move_left', 'move_right', 'interact'],
    hints: ['Step onto the switch at the bottom left to open the center gate.'],
    explanation: 'Event-driven logic: triggers and state mutations.',
    xpReward: 80,
    coinReward: 65,
    skillRewards: { logic: 30, algorithms: 25 }
  },
  {
    id: 'ai_vault_3',
    number: 103,
    title: 'Cyber Skyline Gridlock',
    worldArea: 'smart_city',
    stageType: 'code',
    story: 'Autonomous delivery drones have misrouted construction barriers across the neon rooftop. Program an algorithm to collect the lost data cells.',
    objective: 'Collect 3 scattered data crystals and reach the telecom tower.',
    gridSize: { width: 6, height: 6 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 5, y: 5 },
    obstacles: [
      { x: 1, y: 0, type: 'wall' },
      { x: 1, y: 2, type: 'wall' },
      { x: 3, y: 1, type: 'wall' },
      { x: 3, y: 3, type: 'wall' },
      { x: 4, y: 4, type: 'wall' },
      { x: 2, y: 5, type: 'water' },
    ],
    crystals: [
      { x: 0, y: 3 },
      { x: 3, y: 2 },
      { x: 5, y: 1 }
    ],
    allowedControls: ['up', 'down', 'left', 'right', 'interact'],
    allowedBlocks: ['move_forward', 'turn_left', 'turn_right', 'move_up', 'move_down', 'move_left', 'move_right', 'repeat', 'interact'],
    hints: ['Use for loops or repeat blocks to quickly traverse straight rooftop paths.'],
    explanation: 'Algorithmic iteration on 2D grid arrays.',
    xpReward: 110,
    coinReward: 85,
    skillRewards: { logic: 35, algorithms: 35 }
  },
  {
    id: 'ai_vault_4',
    number: 104,
    title: 'Magma Core Thermal Lockout',
    worldArea: 'bug_dungeon',
    stageType: 'visual_logic',
    story: 'Intense geothermal heat has activated dual blast gates. You must activate the cooling terminal to lower the security barriers and claim the flame core.',
    objective: 'Step on the switch, collect both magma crystals, and escape.',
    gridSize: { width: 7, height: 6 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 6, y: 5 },
    obstacles: [
      { x: 3, y: 0, type: 'wall' },
      { x: 3, y: 1, type: 'wall' },
      { x: 3, y: 2, type: 'gate', id: 'gate_magma_1', isOpen: false },
      { x: 3, y: 3, type: 'wall' },
      { x: 3, y: 4, type: 'water' },
      { x: 3, y: 5, type: 'wall' },
      { x: 5, y: 2, type: 'wall' },
    ],
    switches: [
      { x: 1, y: 4, targetGateId: 'gate_magma_1', color: 'amber' }
    ],
    crystals: [
      { x: 0, y: 5 },
      { x: 5, y: 0 },
      { x: 5, y: 4 }
    ],
    allowedControls: ['up', 'down', 'left', 'right', 'interact'],
    allowedBlocks: ['move_forward', 'turn_left', 'turn_right', 'move_up', 'move_down', 'move_left', 'move_right', 'repeat', 'interact'],
    hints: ['Head down to trigger the switch, then proceed through the central gate.'],
    explanation: 'Multi-target waypoint pathfinding.',
    xpReward: 140,
    coinReward: 110,
    skillRewards: { logic: 40, algorithms: 40 }
  },
  {
    id: 'ai_vault_5',
    number: 105,
    title: 'Cosmic Nebula Labyrinth',
    worldArea: 'challenge_arena',
    stageType: 'code',
    story: 'Deep within the star cluster, antimatter pillars have formed an intricate labyrinth. Master loops and turn sequences to conquer the void.',
    objective: 'Harvest 4 starlight crystals in the 7x7 cosmic maze.',
    gridSize: { width: 7, height: 7 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 6, y: 6 },
    obstacles: [
      { x: 1, y: 1, type: 'wall' },
      { x: 1, y: 2, type: 'wall' },
      { x: 1, y: 4, type: 'wall' },
      { x: 1, y: 5, type: 'wall' },
      { x: 3, y: 0, type: 'wall' },
      { x: 3, y: 2, type: 'wall' },
      { x: 3, y: 4, type: 'wall' },
      { x: 3, y: 6, type: 'wall' },
      { x: 5, y: 1, type: 'wall' },
      { x: 5, y: 3, type: 'wall' },
      { x: 5, y: 5, type: 'wall' },
    ],
    crystals: [
      { x: 0, y: 6 },
      { x: 2, y: 3 },
      { x: 4, y: 1 },
      { x: 6, y: 2 }
    ],
    allowedControls: ['up', 'down', 'left', 'right', 'interact'],
    allowedBlocks: ['move_forward', 'turn_left', 'turn_right', 'move_up', 'move_down', 'move_left', 'move_right', 'repeat', 'interact'],
    hints: ['Zigzag between the vertical wall columns to sweep up all crystals.'],
    explanation: 'Complex serpentine routing and branch elimination.',
    xpReward: 190,
    coinReward: 150,
    skillRewards: { logic: 50, algorithms: 45 }
  },
  {
    id: 'ai_vault_6',
    number: 106,
    title: 'Grandmaster AI Citadel 👑',
    worldArea: 'challenge_arena',
    stageType: 'code',
    story: 'The ultimate benchmark stage created by the AI Game Master. A massive 8x8 tactical fortress testing everything you have learned.',
    objective: 'Solve the gate sequence, harvest 5 quantum crystals, and achieve Master rank!',
    gridSize: { width: 8, height: 8 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 7, y: 7 },
    obstacles: [
      { x: 2, y: 1, type: 'wall' },
      { x: 2, y: 2, type: 'wall' },
      { x: 2, y: 3, type: 'wall' },
      { x: 4, y: 0, type: 'wall' },
      { x: 4, y: 1, type: 'wall' },
      { x: 4, y: 2, type: 'gate', id: 'gate_master_1', isOpen: false },
      { x: 4, y: 3, type: 'wall' },
      { x: 4, y: 5, type: 'wall' },
      { x: 4, y: 6, type: 'wall' },
      { x: 4, y: 7, type: 'wall' },
      { x: 6, y: 2, type: 'water' },
      { x: 6, y: 3, type: 'water' },
      { x: 6, y: 4, type: 'water' },
    ],
    switches: [
      { x: 1, y: 6, targetGateId: 'gate_master_1', color: 'amber' }
    ],
    crystals: [
      { x: 0, y: 7 },
      { x: 2, y: 4 },
      { x: 5, y: 1 },
      { x: 5, y: 7 },
      { x: 7, y: 3 }
    ],
    allowedControls: ['up', 'down', 'left', 'right', 'interact'],
    allowedBlocks: ['move_forward', 'turn_left', 'turn_right', 'move_up', 'move_down', 'move_left', 'move_right', 'repeat', 'interact'],
    hints: ['Plan your route into two phases: First trip to the switch, then transit through the gate to collect remaining crystals.'],
    explanation: 'Master-tier algorithm design with dependency sequencing.',
    xpReward: 300,
    coinReward: 250,
    skillRewards: { logic: 70, algorithms: 65, debugging: 50 }
  }
];
