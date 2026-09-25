import type {
  Direction,
  GridPos,
  GridObstacle,
  GridCrystal,
  GridSwitch,
  VisualBlock,
  SimulationStep,
  SimulationResult,
} from '@/types/game';

interface GameState {
  petPos: GridPos;
  petDir: Direction;
  crystalsCollected: GridPos[];
  openGates: string[];
  switchesActive: string[];
  status: 'running' | 'success' | 'failed' | 'collision';
  message: string;
}

const DIR_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const LEFT_TURNS: Record<Direction, Direction> = {
  up: 'left',
  left: 'down',
  down: 'right',
  right: 'up',
};

const RIGHT_TURNS: Record<Direction, Direction> = {
  up: 'right',
  right: 'down',
  down: 'left',
  left: 'up',
};

export function runDeterministicSimulation(
  gridSize: { width: number; height: number },
  startPos: GridPos,
  startDir: Direction,
  goalPos: GridPos,
  initialObstacles: GridObstacle[],
  initialCrystals: GridCrystal[],
  initialSwitches: GridSwitch[] = [],
  blocks: VisualBlock[],
  maxAllowedSteps = 40
): SimulationResult {
  const startTime = performance.now();

  const state: GameState = {
    petPos: { ...startPos },
    petDir: startDir,
    crystalsCollected: [],
    openGates: initialObstacles.filter((o) => o.type === 'gate' && o.isOpen).map((o) => o.id || `${o.x},${o.y}`),
    switchesActive: initialSwitches.filter((s) => s.isActive).map((s) => s.targetGateId || `${s.x},${s.y}`),
    status: 'running',
    message: 'Simulation started',
  };

  const steps: SimulationStep[] = [];
  const revealedCode: string[] = [];

  // Record initial step 0
  steps.push({
    stepIndex: 0,
    petPos: { ...state.petPos },
    petDir: state.petDir,
    petAction: 'start',
    crystalsCollected: [...state.crystalsCollected],
    openGates: [...state.openGates],
    switchesActive: [...state.switchesActive],
    status: 'running',
    message: 'Start position',
  });

  // Flatten / expand blocks
  const flatActions: { type: string; blockId: string; params?: any }[] = [];

  function expandBlocks(blockList: VisualBlock[]) {
    for (const b of blockList) {
      if (flatActions.length >= maxAllowedSteps) break;

      if (b.type === 'repeat') {
        const count = Math.min(b.params?.count ?? 2, 10);
        const inner = b.nestedBlocks ?? [
          { id: `${b.id}_sub1`, type: 'move_forward' as const },
          { id: `${b.id}_sub2`, type: 'turn_right' as const },
        ];
        revealedCode.push(`for _ in range(${count}):`);
        for (let i = 0; i < count; i++) {
          expandBlocks(inner);
        }
      } else if (b.type === 'if_clear') {
        revealedCode.push(`if is_path_clear():`);
        if (b.nestedBlocks && b.nestedBlocks.length > 0) {
          expandBlocks(b.nestedBlocks);
        } else {
          flatActions.push({ type: 'move_forward', blockId: b.id });
        }
      } else {
        flatActions.push({ type: b.type, blockId: b.id, params: b.params });
        revealedCode.push(formatBlockToCode(b));
      }
    }
  }

  expandBlocks(blocks);

  // Execute flattened actions step by step
  for (let i = 0; i < flatActions.length; i++) {
    if (state.status !== 'running') break;

    const action = flatActions[i];
    executeAction(action.type, state, gridSize, initialObstacles, initialCrystals, initialSwitches);

    // Record step
    steps.push({
      stepIndex: steps.length,
      petPos: { ...state.petPos },
      petDir: state.petDir,
      petAction: action.type,
      crystalsCollected: [...state.crystalsCollected],
      openGates: [...state.openGates],
      switchesActive: [...state.switchesActive],
      status: state.status,
      message: state.message,
    });
  }

  // Check goal and completion
  const reachedGoal = state.petPos.x === goalPos.x && state.petPos.y === goalPos.y;
  const collectedAllCrystals = state.crystalsCollected.length >= initialCrystals.length;

  let success = false;
  let finalMessage = '';

  if (state.status === 'collision') {
    success = false;
    finalMessage = state.message;
  } else if (reachedGoal && collectedAllCrystals) {
    success = true;
    state.status = 'success';
    finalMessage = 'Mission Accomplished! Target reached safely.';
  } else if (reachedGoal && !collectedAllCrystals) {
    success = false;
    state.status = 'failed';
    finalMessage = `Reached goal, but missed ${initialCrystals.length - state.crystalsCollected.length} crystal(s)!`;
  } else {
    success = false;
    state.status = 'failed';
    finalMessage = 'Completed all instructions, but did not reach the destination.';
  }

  // Update last step if needed
  if (steps.length > 0) {
    steps[steps.length - 1].status = state.status;
    steps[steps.length - 1].message = finalMessage;
  }

  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    success,
    message: finalMessage,
    steps,
    crystalsGathered: state.crystalsCollected.length,
    totalCrystals: initialCrystals.length,
    reachedGoal,
    revealedCode,
    executionTimeMs,
  };
}

function executeAction(
  actionType: string,
  state: GameState,
  gridSize: { width: number; height: number },
  obstacles: GridObstacle[],
  crystals: GridCrystal[],
  switches: GridSwitch[]
) {
  if (actionType === 'turn_left') {
    state.petDir = LEFT_TURNS[state.petDir];
    state.message = `Turned left, now facing ${state.petDir}`;
    return;
  }

  if (actionType === 'turn_right') {
    state.petDir = RIGHT_TURNS[state.petDir];
    state.message = `Turned right, now facing ${state.petDir}`;
    return;
  }

  if (actionType === 'move_forward') {
    const delta = DIR_DELTAS[state.petDir];
    const newX = state.petPos.x + delta.dx;
    const newY = state.petPos.y + delta.dy;

    // Check bounds
    if (newX < 0 || newX >= gridSize.width || newY < 0 || newY >= gridSize.height) {
      state.status = 'collision';
      state.message = `Collision: Pet hit the boundary at (${newX}, ${newY})!`;
      return;
    }

    // Check obstacles
    const obs = obstacles.find((o) => o.x === newX && o.y === newY);
    if (obs) {
      if (obs.type === 'wall') {
        state.status = 'collision';
        state.message = `Collision: Pet bumped into a stone wall at (${newX}, ${newY})!`;
        return;
      }
      if (obs.type === 'water') {
        state.status = 'collision';
        state.message = `Collision: Pet fell into deep water at (${newX}, ${newY})!`;
        return;
      }
      if (obs.type === 'gate') {
        const gateKey = obs.id || `${obs.x},${obs.y}`;
        if (!state.openGates.includes(gateKey)) {
          state.status = 'collision';
          state.message = `Blocked: The gate at (${newX}, ${newY}) is locked shut!`;
          return;
        }
      }
    }

    // Valid move
    state.petPos = { x: newX, y: newY };
    state.message = `Moved forward to (${newX}, ${newY})`;

    // Check crystal pickup
    const crystal = crystals.find((c) => c.x === newX && c.y === newY);
    if (crystal && !state.crystalsCollected.some((c) => c.x === newX && c.y === newY)) {
      state.crystalsCollected.push({ x: newX, y: newY });
      state.message = `Collected crystal at (${newX}, ${newY})!`;
    }

    // Auto-activate switch pressure plate if stepped on
    const steppedSwitch = switches.find((s) => s.x === newX && s.y === newY);
    if (steppedSwitch && steppedSwitch.targetGateId && !state.openGates.includes(steppedSwitch.targetGateId)) {
      state.openGates.push(steppedSwitch.targetGateId);
      state.switchesActive.push(steppedSwitch.targetGateId);
      state.message = `Stepped on switch at (${newX}, ${newY})! Gate [${steppedSwitch.targetGateId}] unlocked and opened.`;
    }
    return;
  }

  if (actionType === 'move_back') {
    const delta = DIR_DELTAS[state.petDir];
    const newX = state.petPos.x - delta.dx;
    const newY = state.petPos.y - delta.dy;

    if (newX < 0 || newX >= gridSize.width || newY < 0 || newY >= gridSize.height) {
      state.status = 'collision';
      state.message = 'Collision: Boundary reached moving backwards!';
      return;
    }
    state.petPos = { x: newX, y: newY };
    state.message = `Moved back to (${newX}, ${newY})`;
    return;
  }

  if (actionType === 'jump') {
    // Jump 2 tiles forward
    const delta = DIR_DELTAS[state.petDir];
    const landX = state.petPos.x + delta.dx * 2;
    const landY = state.petPos.y + delta.dy * 2;

    if (landX < 0 || landX >= gridSize.width || landY < 0 || landY >= gridSize.height) {
      state.status = 'collision';
      state.message = 'Collision: Jump landed out of bounds!';
      return;
    }

    const obs = obstacles.find((o) => o.x === landX && o.y === landY);
    if (obs && obs.type === 'wall') {
      state.status = 'collision';
      state.message = 'Collision: Jump landed on a stone wall!';
      return;
    }

    state.petPos = { x: landX, y: landY };
    state.message = `Jumped over obstacle to (${landX}, ${landY})!`;

    const crystal = crystals.find((c) => c.x === landX && c.y === landY);
    if (crystal && !state.crystalsCollected.some((c) => c.x === landX && c.y === landY)) {
      state.crystalsCollected.push({ x: landX, y: landY });
    }
    return;
  }

  if (actionType === 'move_right' || actionType === 'move_left' || actionType === 'move_up' || actionType === 'move_down') {
    const targetDir: Direction =
      actionType === 'move_right' ? 'right' : actionType === 'move_left' ? 'left' : actionType === 'move_up' ? 'up' : 'down';
    state.petDir = targetDir;
    const delta = DIR_DELTAS[targetDir];
    const newX = state.petPos.x + delta.dx;
    const newY = state.petPos.y + delta.dy;

    if (newX < 0 || newX >= gridSize.width || newY < 0 || newY >= gridSize.height) {
      state.status = 'collision';
      state.message = `Collision: Pet hit the boundary moving ${targetDir} at (${newX}, ${newY})!`;
      return;
    }

    const obs = obstacles.find((o) => o.x === newX && o.y === newY);
    if (obs) {
      if (obs.type === 'wall') {
        state.status = 'collision';
        state.message = `Collision: Pet bumped into a stone wall at (${newX}, ${newY})!`;
        return;
      }
      if (obs.type === 'water') {
        state.status = 'collision';
        state.message = `Collision: Pet fell into deep water at (${newX}, ${newY})!`;
        return;
      }
      if (obs.type === 'gate') {
        const gateKey = obs.id || `${obs.x},${obs.y}`;
        if (!state.openGates.includes(gateKey)) {
          state.status = 'collision';
          state.message = `Blocked: The gate at (${newX}, ${newY}) is locked shut!`;
          return;
        }
      }
    }

    state.petPos = { x: newX, y: newY };
    state.message = `Moved ${targetDir} to (${newX}, ${newY})`;

    const crystal = crystals.find((c) => c.x === newX && c.y === newY);
    if (crystal && !state.crystalsCollected.some((c) => c.x === newX && c.y === newY)) {
      state.crystalsCollected.push({ x: newX, y: newY });
      state.message = `Collected crystal at (${newX}, ${newY})!`;
    }

    // Auto-activate switch pressure plate if stepped on
    const steppedSwitch = switches.find((s) => s.x === newX && s.y === newY);
    if (steppedSwitch && steppedSwitch.targetGateId && !state.openGates.includes(steppedSwitch.targetGateId)) {
      state.openGates.push(steppedSwitch.targetGateId);
      state.switchesActive.push(steppedSwitch.targetGateId);
      state.message = `Stepped on switch at (${newX}, ${newY})! Gate [${steppedSwitch.targetGateId}] unlocked and opened.`;
    }
    return;
  }

  if (actionType === 'interact') {
    // Check if on or adjacent to switch
    const sw = switches.find(
      (s) => Math.abs(s.x - state.petPos.x) <= 1 && Math.abs(s.y - state.petPos.y) <= 1
    );

    if (sw && sw.targetGateId) {
      if (!state.openGates.includes(sw.targetGateId)) {
        state.openGates.push(sw.targetGateId);
        state.switchesActive.push(sw.targetGateId);
        state.message = `Switched activated! Gate [${sw.targetGateId}] unlocked and opened.`;
      } else {
        state.message = `Switch already activated.`;
      }
    } else {
      state.message = `Interacted with the environment. Nothing to trigger here.`;
    }
  }
}

function formatBlockToCode(b: VisualBlock): string {
  switch (b.type) {
    case 'move_forward':
      return 'move_forward()';
    case 'move_back':
      return 'move_back()';
    case 'move_right':
      return 'move_right()';
    case 'move_left':
      return 'move_left()';
    case 'move_up':
      return 'move_up()';
    case 'move_down':
      return 'move_down()';
    case 'turn_left':
      return 'turn_left()';
    case 'turn_right':
      return 'turn_right()';
    case 'interact':
      return 'interact()';
    case 'jump':
      return 'jump()';
    case 'wait':
      return 'wait()';
    default:
      return `${b.type}()`;
  }
}
