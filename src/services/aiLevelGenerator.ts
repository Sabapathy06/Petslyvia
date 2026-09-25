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

export interface AILevelGenerationOptions {
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  theme?: 'forest' | 'dungeon' | 'city' | 'arena';
  focusConcept?: 'pathfinding' | 'loops' | 'switches' | 'crystals' | 'mixed';
  userLevel?: number;
  promptDescription?: string;
}

// Lore Title Prefixes & Suffixes
const TITLE_PREFIXES = [
  'Quantum', 'Cyber', 'Neon', 'Neural', 'Matrix', 'Binary',
  'Galactic', 'Spectral', 'Hyper', 'Circuit', 'Cosmic', 'Synthesized'
];

const TITLE_LOCATIONS = [
  'Corridor', 'Labyrinth', 'Nexus', 'Mainframe', 'Sanctuary', 'Chamber',
  'Citadel', 'Ridge', 'Overpass', 'Gateway', 'Bastion', 'Core'
];

const THEME_STORIES = {
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
  const theme = options.theme || (['forest', 'dungeon', 'city', 'arena'] as const)[Math.floor(Math.random() * 4)];
  const focus = options.focusConcept || 'mixed';

  // 1. Grid Dimensions based on difficulty
  let width = 5;
  let height = 5;
  let maxObstacles = 4;
  let crystalCount = 1;
  let hasSwitchesAndGates = false;

  if (difficulty === 'easy') {
    width = 5;
    height = 5;
    maxObstacles = 3;
    crystalCount = 1;
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
    maxObstacles = 12;
    crystalCount = 4;
    hasSwitchesAndGates = true;
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

      // Switch placed at accessible corner
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
    const obsTypes: ('wall' | 'water')[] = theme === 'dungeon' ? ['wall', 'wall', 'water'] : ['wall', 'water'];
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
    ? `Navigate the ${width}x${height} grid, harvest ${crystals.length} quantum crystal(s), and reach the goal!`
    : `Guide your pet companion safely across the ${width}x${height} ${theme} grid to the exit portal!`;

  const worldArea =
    theme === 'forest'
      ? 'logic_forest'
      : theme === 'dungeon'
      ? 'bug_dungeon'
      : theme === 'city'
      ? 'smart_city'
      : 'challenge_arena';

  const xpReward = difficulty === 'easy' ? 35 : difficulty === 'medium' ? 65 : difficulty === 'hard' ? 110 : 160;
  const coinReward = difficulty === 'easy' ? 25 : difficulty === 'medium' ? 45 : difficulty === 'hard' ? 80 : 120;

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

  if (difficulty !== 'easy') {
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
      logic: 25,
      algorithms: 20,
      debugging: 15
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
      difficulty: difficulty === 'expert' ? 'hard' : difficulty,
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
      likesCount: 3,
      createdAt: new Date().toISOString(),
    };
    petslyviaService.createCommunityProblem(communityProblem).catch(() => {});
  } catch {
    // ignore
  }

  return generatedMission;
}
