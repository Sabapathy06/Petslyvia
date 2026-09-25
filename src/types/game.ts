import type { PetType, PetState } from './database';

export type PetStage = 'infant' | 'child' | 'teen' | 'adult';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type PlayerRole = 'non_coder' | 'coder';

export type BlockType =
  | 'move_forward'
  | 'move_back'
  | 'turn_left'
  | 'turn_right'
  | 'move_right'
  | 'move_left'
  | 'move_up'
  | 'move_down'
  | 'interact'
  | 'jump'
  | 'repeat'
  | 'if_clear'
  | 'if_crystal'
  | 'if_gate_closed'
  | 'wait';

export interface VisualBlock {
  id: string;
  type: BlockType;
  params?: {
    count?: number;
    condition?: string;
    target?: string;
  };
  nestedBlocks?: VisualBlock[];
}

export type MissionStageType =
  | 'play'
  | 'discover'
  | 'visual_logic'
  | 'break_fix'
  | 'alter'
  | 'create'
  | 'code';

// ────────────────────────────────────────────────────────────
// PROGRESSIVE CODING SYSTEM — additional types
// ────────────────────────────────────────────────────────────

/** The programming concept set this mission belongs to (Set 0 = Sequence … Set 9 = Scenarios) */
export type ConceptSet =
  | 'sequence'
  | 'variables'
  | 'conditions'
  | 'loops'
  | 'functions'
  | 'debugging'
  | 'pseudocode'
  | 'typed_code'
  | 'independent'
  | 'scenario';

/** How much scaffolding the player receives */
export type LearningMode =
  | 'guided'        // Level 1 – arrows + fully auto-generated solution shown
  | 'visual'        // Level 2 – drag-and-drop blocks, no arrows
  | 'pseudocode'    // Level 3 – player fills a pseudocode template
  | 'typed'         // Level 4 – player writes real code from scratch
  | 'debug'         // Level 5 – player must find and fix broken code
  | 'scenario';     // Level 6 – open-ended real-world challenge

/** A scenario-based coding challenge embedded in a mission */
export interface ScenarioChallenge {
  /** Short real-world framing of the problem */
  scenarioTitle: string;
  scenarioDescription: string;
  /** Starter code shown in the editor (may have TODOs) */
  starterCode: string;
  /** Expected output lines the player's code must produce */
  expectedOutput: string[];
  /** Hints revealed progressively */
  hints: string[];
  /** Concept tag for progress tracking */
  concept: ConceptSet;
}

/** Pseudocode template with blanks the player must fill in */
export interface PseudocodeTemplate {
  /** Template with ___ representing blank slots */
  template: string;
  /** Correct values for each blank in order */
  answers: string[];
  /** Explanation shown after completion */
  explanation: string;
}

export interface GridPos {
  x: number;
  y: number;
}

export interface GridObstacle {
  x: number;
  y: number;
  type: 'wall' | 'water' | 'gate' | 'trap';
  id?: string;
  isOpen?: boolean;
}

export interface GridCrystal {
  x: number;
  y: number;
  collected?: boolean;
}

export interface GridSwitch {
  x: number;
  y: number;
  targetGateId?: string;
  isActive?: boolean;
  color?: string;
}

export interface MissionDefinition {
  id: string;
  number: number;
  title: string;
  worldArea: 'pet_home' | 'logic_forest' | 'bug_dungeon' | 'smart_city' | 'coding_lab' | 'challenge_arena' | 'creator_world' | 'shop' | 'academy';
  stageType: MissionStageType;
  story: string;
  objective: string;
  gridSize: { width: number; height: number };
  startPos: GridPos;
  startDir: Direction;
  goalPos: GridPos;
  obstacles: GridObstacle[];
  crystals: GridCrystal[];
  switches?: GridSwitch[];
  allowedControls: ('up' | 'down' | 'left' | 'right' | 'interact' | 'jump')[];
  allowedBlocks: BlockType[];
  initialBlocks?: VisualBlock[]; // For debugging or alter stages
  brokenTargetBlockIndex?: number;
  requiredCodeSnippet?: string; // For reveal / code stage
  hints: string[];
  explanation: string;
  xpReward: number;
  coinReward: number;
  skillRewards: {
    logic?: number;
    debugging?: number;
    creativity?: number;
    coding?: number;
    collaboration?: number;
  };
  maxSteps?: number;

  // ── Progressive Coding System Fields ──────────────────────
  /** Which concept set this mission belongs to */
  conceptSet?: ConceptSet;
  /** Scaffolding level – determines which UI mode is shown */
  learningMode?: LearningMode;
  /** Human-readable progress badge shown in the Academy */
  progressLabel?: string;
  /** Pseudocode fill-in-the-blank exercise (for learningMode=pseudocode) */
  pseudocodeTemplate?: PseudocodeTemplate;
  /** Open-ended scenario coding challenge (for learningMode=scenario) */
  scenarioChallenge?: ScenarioChallenge;
  /** Whether this mission counts as a mastery checkpoint */
  isMasteryCheck?: boolean;
}

export interface AccessoryItem {
  id: string;
  name: string;
  category: 'head' | 'eyes' | 'body' | 'back' | 'feet' | 'special';
  price: number;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requiredLevel?: number;
  visualColor: string;
}

export interface EquippedAccessories {
  head?: string | null;
  eyes?: string | null;
  body?: string | null;
  back?: string | null;
  feet?: string | null;
  special?: string | null;
  headwear?: string | null;
  costume?: string | null;
  glasses?: string | null;
  backpack?: string | null;
  shoes?: string | null;
}

export interface PlayerSkills {
  logic: number;
  debugging: number;
  creativity: number;
  coding: number;
  collaboration: number;
}

export interface BugExchangeItem {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  intendedGoal: string;
  brokenBlocks: VisualBlock[];
  solutionBlocks?: VisualBlock[];
  grid: {
    width: number;
    height: number;
    start: GridPos;
    goal: GridPos;
    obstacles: GridObstacle[];
    crystals: GridCrystal[];
    switches?: GridSwitch[];
  };
  clue: string;
  solversCount: number;
  attemptsCount: number;
  avgSolveTimeSec: number;
  rewardXp: number;
  rewardCoins: number;
  createdAt: string;
}

export interface CommunityProblem {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  grid: {
    width: number;
    height: number;
    start: GridPos;
    goal: GridPos;
    obstacles: GridObstacle[];
    crystals: GridCrystal[];
    switches?: GridSwitch[];
  };
  availableBlocks: BlockType[];
  playsCount: number;
  solvesCount: number;
  likesCount: number;
  createdAt: string;
}

export interface SimulationStep {
  stepIndex: number;
  petPos: GridPos;
  petDir: Direction;
  petAction: string;
  crystalsCollected: GridPos[];
  openGates: string[];
  status: 'running' | 'success' | 'failed' | 'collision';
  message?: string;
}

export interface SimulationResult {
  success: boolean;
  message: string;
  steps: SimulationStep[];
  crystalsGathered: number;
  totalCrystals: number;
  reachedGoal: boolean;
  revealedCode?: string[];
  executionTimeMs: number;
}
