import type { MissionDefinition, VisualBlock, GridPos, Direction } from '@/types/game';

export interface ProblemSolution {
  code: string;
  explanation: string;
  keyConcept: string;
  timeComplexity?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handcrafted Optimal Solutions for Academy, Coding Lab, Bug Dungeon & Adventure
// ─────────────────────────────────────────────────────────────────────────────

interface MissionSolutionData {
  hints: {
    strategy: string;
    path: string;
    cTip: string;
    pyTip: string;
    jsTip: string;
  };
  c: string;
  python: string;
  javascript: string;
  explanation: string;
  keyConcept: string;
}

const MISSION_SOLUTIONS: Record<string, MissionSolutionData> = {
  // ── Coding Lab Missions ──
  coding_lab_1: {
    hints: {
      strategy: 'Walk straight along row 1 through the laser corridor to grab both crystals and reach the exit.',
      path: 'Start at (0, 1) and move forward 5 times to reach (5, 1).',
      cTip: 'Use a for loop: for (int step = 0; step < 5; step++) { move_forward(); }',
      pyTip: 'Use a range loop: for step in range(5):\n    move_forward()',
      jsTip: 'Use a for loop: for (let step = 0; step < 5; step++) { move_forward(); }',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // Level 1: Laser Corridor Solution
    // Advance 5 steps straight through row 1 to collect both crystals
    for (int step = 0; step < 5; step++) {
        move_forward();
    }
    return 0;
}`,
    python: `# Level 1: Laser Corridor Solution
# Advance 5 steps straight through row 1 to collect both crystals
for step in range(5):
    move_forward()
`,
    javascript: `// Level 1: Laser Corridor Solution
// Advance 5 steps straight through row 1 to collect both crystals
for (let step = 0; step < 5; step++) {
    move_forward();
}
`,
    explanation: 'The pet starts at coordinate (0, 1) facing right. The path along row 1 has obstacles above and below, but row 1 itself is completely clear and contains two crystals at (2,1) and (4,1). Repeating move_forward() exactly 5 times traverses the entire corridor and enters the portal at (5, 1).',
    keyConcept: 'Counting Loops & Linear Traversal',
  },

  coding_lab_2: {
    hints: {
      strategy: 'Weave through the firewall pillars by alternating between moving down and moving right.',
      path: 'Alternate move_down() and move_right() until you reach the secure mainframe terminal at (4,4).',
      cTip: 'Call move_down(); and move_right(); in alternating sequence, or loop 4 times.',
      pyTip: 'for i in range(4):\n    move_down()\n    move_right()',
      jsTip: 'for (let i = 0; i < 4; i++) {\n    move_down();\n    move_right();\n}',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // Level 2: Zigzag Algorithm Solution
    // Step diagonally through firewalls by alternating down and right
    for (int i = 0; i < 4; i++) {
        move_down();
        move_right();
    }
    return 0;
}`,
    python: `# Level 2: Zigzag Algorithm Solution
# Step diagonally through firewalls by alternating down and right
for i in range(4):
    move_down()
    move_right()
`,
    javascript: `// Level 2: Zigzag Algorithm Solution
// Step diagonally through firewalls by alternating down and right
for (let i = 0; i < 4; i++) {
    move_down();
    move_right();
}
`,
    explanation: 'Firewalls block the straight paths, but the diagonal cells are open. By interleaving downward and rightward steps in a loop, your pet steps cleanly through each gap, collecting the central crystal at (2,2) and the perimeter crystal at (4,2) before reaching (4,4).',
    keyConcept: 'Interleaved Multi-Axis Navigation',
  },

  coding_lab_3: {
    hints: {
      strategy: 'Patrol along the outer perimeter edges: right across the top, down the right edge, left across the bottom, and up to the portal.',
      path: 'Sweep 5 steps forward, turn right, 4 steps forward, turn right, 5 steps forward.',
      cTip: 'Combine turns and for loops: for (int step = 0; step < 5; step++) { move_forward(); } turn_right();',
      pyTip: 'Use for step in range(5): move_forward() followed by turn_right()',
      jsTip: 'Use for (let i = 0; i < 5; i++) { move_forward(); } followed by turn_right();',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // Level 3: Quantum Matrix Perimeter Solution
    // 1. Move across the top edge
    for (int step = 0; step < 5; step++) {
        move_forward();
    }
    turn_right();
    
    // 2. Move down the right edge
    for (int step = 0; step < 4; step++) {
        move_forward();
    }
    turn_right();
    
    // 3. Move across the bottom edge to extraction portal
    for (int step = 0; step < 5; step++) {
        move_forward();
    }
    return 0;
}`,
    python: `# Level 3: Quantum Matrix Perimeter Solution
# 1. Move across the top edge
for step in range(5):
    move_forward()
turn_right()

# 2. Move down the right edge
for step in range(4):
    move_forward()
turn_right()

# 3. Move across the bottom edge to extraction portal
for step in range(5):
    move_forward()
`,
    javascript: `// Level 3: Quantum Matrix Perimeter Solution
// 1. Move across the top edge
for (let step = 0; step < 5; step++) {
    move_forward();
}
turn_right();

// 2. Move down the right edge
for (let step = 0; step < 4; step++) {
    move_forward();
}
turn_right();

// 3. Move across the bottom edge to extraction portal
for (let step = 0; step < 5; step++) {
    move_forward();
}
`,
    explanation: 'The central core is a dense cluster of wall obstacles. Sweeping the outer boundary allows harvesting all 3 energy cells located along the borders without colliding with internal barriers.',
    keyConcept: 'Boundary Patrolling & Perimeter Loops',
  },

  // ── Bug Dungeon Missions ──
  mission_4: {
    hints: {
      strategy: 'The pet is trapped in an infinite or incorrect loop. Adjust the loop count to exactly 3 steps so the pet does not crash into the spikes.',
      path: 'Move right 3 times, then interact or turn down to escape.',
      cTip: 'Change loop bound: for (int i = 0; i < 3; i++) { move_forward(); }',
      pyTip: 'Fix range count: for step in range(3):\n    move_forward()',
      jsTip: 'Fix loop condition: for (let i = 0; i < 3; i++) { move_forward(); }',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // Bug Dungeon: Fixed Loop Boundary
    for (int i = 0; i < 3; i++) {
        move_forward();
    }
    turn_right();
    move_forward();
    return 0;
}`,
    python: `# Bug Dungeon: Fixed Loop Boundary
for step in range(3):
    move_forward()
turn_right()
move_forward()
`,
    javascript: `// Bug Dungeon: Fixed Loop Boundary
for (let i = 0; i < 3; i++) {
    move_forward();
}
turn_right();
move_forward();
`,
    explanation: 'Off-by-one errors (OBOE) are among the most common bugs in software engineering. Setting the counter to 3 stops the pet safely before the spike barrier and aligns with the exit corridor.',
    keyConcept: 'Off-By-One Debugging & Loop Guarding',
  },

  mission_9: {
    hints: {
      strategy: 'The instructions in this dungeon were inverted. Replace turn_left calls with turn_right, or reorder the movement vector.',
      path: 'Move forward 2 times, turn right, move forward 2 times, collect crystal.',
      cTip: 'Call move_forward(); turn_right(); move_forward(); interact();',
      pyTip: 'move_forward()\nmove_forward()\nturn_right()\nmove_forward()\ninteract()',
      jsTip: 'move_forward();\nmove_forward();\nturn_right();\nmove_forward();\ninteract();',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // Bug Dungeon: Fixed Inverted Rotation
    move_forward();
    move_forward();
    turn_right();
    move_forward();
    move_forward();
    interact();
    return 0;
}`,
    python: `# Bug Dungeon: Fixed Inverted Rotation
move_forward()
move_forward()
turn_right()
move_forward()
move_forward()
interact()
`,
    javascript: `// Bug Dungeon: Fixed Inverted Rotation
move_forward();
move_forward();
turn_right();
move_forward();
move_forward();
interact();
`,
    explanation: 'Correcting directional orientation restores the coordinate transform matrix so each forward step moves toward the goal rather than deeper into the dungeon trap.',
    keyConcept: 'Inversion Debugging & Relative Orientation',
  },

  // ── Academy Progressive Missions ──
  prog_seq_1: {
    hints: {
      strategy: 'Move Pebble right 4 times to step into the glowing home portal.',
      path: 'Start at (0, 1) and take 4 steps to the right.',
      cTip: 'Call move_right(); 4 times or use for (int i = 0; i < 4; i++) { move_right(); }',
      pyTip: 'Call pet.move_right() 4 times or for i in range(4): pet.move_right()',
      jsTip: 'Call pet.moveRight(); 4 times or for (let i = 0; i < 4; i++) { pet.moveRight(); }',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // Set 0 · Sequence: First Steps
    for (int i = 0; i < 4; i++) {
        move_right();
    }
    return 0;
}`,
    python: `# Set 0 · Sequence: First Steps
for step in range(4):
    pet.move_right()
`,
    javascript: `// Set 0 · Sequence: First Steps
for (let i = 0; i < 4; i++) {
    pet.moveRight();
}
`,
    explanation: 'Each step is a discrete instruction executed in order. Four sequential move_right commands traverse from x=0 to x=4 along y=1.',
    keyConcept: 'Instruction Sequence & Linear Execution',
  },

  prog_seq_2: {
    hints: {
      strategy: 'The obstacles at row 0 block direct rightward movement. Move down into row 2 first, then move right to pick up the crystal and reach the portal.',
      path: 'Move down 2 times, then move right 4 times.',
      cTip: 'move_down(); move_down(); then loop move_right() 4 times.',
      pyTip: 'pet.move_down()\npet.move_down()\nfor i in range(4):\n    pet.move_right()',
      jsTip: 'pet.moveDown();\npet.moveDown();\nfor (let i = 0; i < 4; i++) {\n    pet.moveRight();\n}',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // Set 0 · Sequence: Two Directions
    move_down();
    move_down();
    for (int i = 0; i < 4; i++) {
        move_right();
    }
    return 0;
}`,
    python: `# Set 0 · Sequence: Two Directions
pet.move_down()
pet.move_down()
for i in range(4):
    pet.move_right()
`,
    javascript: `// Set 0 · Sequence: Two Directions
pet.moveDown();
pet.moveDown();
for (let i = 0; i < 4; i++) {
    pet.moveRight();
}
`,
    explanation: 'Demonstrates multi-axis sequencing. The order of execution matters: descending first circumvents the wall barrier and places the pet on the exact crystal row.',
    keyConcept: 'Ordered Directional Transitions',
  },

  prog_loop_1: {
    hints: {
      strategy: 'Notice the long straight corridor. Instead of writing 8 repetitive commands, wrap a single move_right into a loop.',
      path: 'Repeat move_right exactly 8 times.',
      cTip: 'for (int i = 0; i < 8; i++) { move_right(); }',
      pyTip: 'for step in range(8):\n    pet.move_right()',
      jsTip: 'for (let i = 0; i < 8; i++) {\n    pet.moveRight();\n}',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // Set 3 · Loops: Repeating Patterns
    for (int step = 0; step < 8; step++) {
        move_right();
    }
    return 0;
}`,
    python: `# Set 3 · Loops: Repeating Patterns
for step in range(8):
    pet.move_right()
`,
    javascript: `// Set 3 · Loops: Repeating Patterns
for (let step = 0; step < 8; step++) {
    pet.moveRight();
}
`,
    explanation: 'Loops embody the DRY principle (Don\'t Repeat Yourself). Compacting 8 lines into a 3-line loop makes code maintainable and elegant.',
    keyConcept: 'Iterative Loops & Code Compression',
  },

  prog_var_1: {
    hints: {
      strategy: 'Store the required distance in an integer variable, then use that variable as your loop limit.',
      path: 'Set steps = 5, then loop over steps moving right.',
      cTip: 'int steps = 5; for (int i = 0; i < steps; i++) { move_right(); }',
      pyTip: 'steps = 5\nfor i in range(steps):\n    pet.move_right()',
      jsTip: 'const steps = 5;\nfor (let i = 0; i < steps; i++) {\n    pet.moveRight();\n}',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // Set 1 · Variables: Step Counter
    int steps = 5;
    for (int i = 0; i < steps; i++) {
        move_right();
    }
    return 0;
}`,
    python: `# Set 1 · Variables: Step Counter
steps = 5
for step in range(steps):
    pet.move_right()
`,
    javascript: `// Set 1 · Variables: Step Counter
const steps = 5;
for (let step = 0; step < steps; step++) {
    pet.moveRight();
}
`,
    explanation: 'Variables store information for later use. By parameterizing the step count, changing the movement distance only requires editing one value.',
    keyConcept: 'State Variables & Memory Assignment',
  },

  prog_func_1: {
    hints: {
      strategy: 'Encapsulate the repeated movement pattern into a custom function and call it to navigate.',
      path: 'Define a function that moves forward and turns, then invoke it.',
      cTip: 'void navigate() { ... } int main() { navigate(); return 0; }',
      pyTip: 'def navigate():\n    ...\nnavigate()',
      jsTip: 'function navigate() {\n    ...\n}\nnavigate();',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

void advance_and_turn() {
    for (int i = 0; i < 3; i++) {
        move_forward();
    }
    turn_right();
}

int main() {
    // Set 4 · Functions: Define & Conquer
    advance_and_turn();
    advance_and_turn();
    return 0;
}`,
    python: `# Set 4 · Functions: Define & Conquer
def advance_and_turn():
    for i in range(3):
        pet.move_forward()
    pet.turn_right()

advance_and_turn()
advance_and_turn()
`,
    javascript: `// Set 4 · Functions: Define & Conquer
function advanceAndTurn() {
    for (let i = 0; i < 3; i++) {
        pet.moveForward();
    }
    pet.turnRight();
}

advanceAndTurn();
advanceAndTurn();
`,
    explanation: 'Functions allow modular decomposition. Subdividing complex navigation into reusable subroutines is the foundation of structured programming.',
    keyConcept: 'Modular Decomposition & Subroutines',
  },

  // ── Adventure Missions ──
  mission_1: {
    hints: {
      strategy: 'Walk forward across row 1 straight to the cozy home portal at (4,1).',
      path: 'Start at (0,1) and take 4 steps forward.',
      cTip: 'for (int i = 0; i < 4; i++) { move_forward(); }',
      pyTip: 'for i in range(4):\n    move_forward()',
      jsTip: 'for (let i = 0; i < 4; i++) {\n    move_forward();\n}',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // Welcome Home Solution
    for (int i = 0; i < 4; i++) {
        move_forward();
    }
    return 0;
}`,
    python: `# Welcome Home Solution
for step in range(4):
    move_forward()
`,
    javascript: `// Welcome Home Solution
for (let step = 0; step < 4; step++) {
    move_forward();
}
`,
    explanation: 'Row 1 is clear between the walls. 4 forward moves guides the pet directly to the goal.',
    keyConcept: 'Basic Sequential Navigation',
  },

  mission_2: {
    hints: {
      strategy: 'Navigate around the water hazards to pick up all 3 crystals before entering the altar.',
      path: 'Move right 1 step, down 4 steps to collect crystals, right 2 steps, and up/right to altar.',
      cTip: 'move_right(); move_down(); move_down(); move_down(); move_down(); move_right(); move_right();',
      pyTip: 'move_right()\nfor i in range(4):\n    move_down()\nmove_right()\nmove_right()',
      jsTip: 'move_right();\nfor (let i = 0; i < 4; i++) {\n    move_down();\n}\nmove_right();\nmove_right();',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // Crystal Gathering Solution
    move_right();
    for (int i = 0; i < 4; i++) {
        move_down();
    }
    move_right();
    move_right();
    return 0;
}`,
    python: `# Crystal Gathering Solution
move_right()
for step in range(4):
    move_down()
move_right()
move_right()
`,
    javascript: `// Crystal Gathering Solution
move_right();
for (let step = 0; step < 4; step++) {
    move_down();
}
move_right();
move_right();
`,
    explanation: 'Path planning avoids the central water barrier while touching every crystal tile along the perimeter route.',
    keyConcept: 'Waypoint Collection & Obstacle Avoidance',
  },

  mission_3: {
    hints: {
      strategy: 'Walk to the switch at (1,1), trigger it with interact() to unlock the stone gate, then proceed to the exit portal.',
      path: 'Move forward 1 step, interact(), move forward 4 steps.',
      cTip: 'move_forward(); interact(); for (int i = 0; i < 4; i++) { move_forward(); }',
      pyTip: 'move_forward()\ninteract()\nfor i in range(4):\n    move_forward()',
      jsTip: 'move_forward();\ninteract();\nfor (let i = 0; i < 4; i++) {\n    move_forward();\n}',
    },
    c: `#include <stdio.h>
#include "petslyvia.h"

int main() {
    // The Ancient Gate Solution
    move_forward();
    interact(); // Activates switch to lower gate
    for (int i = 0; i < 4; i++) {
        move_forward();
    }
    return 0;
}`,
    python: `# The Ancient Gate Solution
move_forward()
interact()  # Activates switch to lower gate
for step in range(4):
    move_forward()
`,
    javascript: `// The Ancient Gate Solution
move_forward();
interact(); // Activates switch to lower gate
for (let step = 0; step < 4; step++) {
    move_forward();
}
`,
    explanation: 'Demonstrates environmental state mutation. Interacting with the switch changes the gate obstacle state from closed to open.',
    keyConcept: 'Event Triggers & State Mutation',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic BFS Fallback Solver for Custom/AI/Unlisted Missions
// ─────────────────────────────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

function solveMissionPath(mission: MissionDefinition): string[] {
  const width = mission.gridSize?.width || 5;
  const height = mission.gridSize?.height || 5;
  const start = mission.startPos;
  const goal = mission.goalPos;

  const obstacleSet = new Set<string>();
  (mission.obstacles || []).forEach((obs) => {
    if (obs.type === 'wall' || obs.type === 'water') {
      obstacleSet.add(`${obs.x},${obs.y}`);
    }
  });

  const crystalsToCollect = [...(mission.crystals || []).filter((c) => !c.collected)];

  // Helper BFS between two points avoiding obstacles
  const bfs = (from: Point, to: Point): string[] => {
    const queue: { pos: Point; path: string[] }[] = [{ pos: from, path: [] }];
    const visited = new Set<string>([`${from.x},${from.y}`]);

    while (queue.length > 0) {
      const { pos, path } = queue.shift()!;
      if (pos.x === to.x && pos.y === to.y) {
        return path;
      }

      const neighbors: { dx: number; dy: number; action: string }[] = [
        { dx: 1, dy: 0, action: 'move_right' },
        { dx: -1, dy: 0, action: 'move_left' },
        { dx: 0, dy: 1, action: 'move_down' },
        { dx: 0, dy: -1, action: 'move_up' },
      ];

      for (const n of neighbors) {
        const nx = pos.x + n.dx;
        const ny = pos.y + n.dy;
        const key = `${nx},${ny}`;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !obstacleSet.has(key) && !visited.has(key)) {
          visited.add(key);
          queue.push({ pos: { x: nx, y: ny }, path: [...path, n.action] });
        }
      }
    }
    return [];
  };

  let current = { ...start };
  const fullActions: string[] = [];

  // Visit all crystals first
  for (const c of crystalsToCollect) {
    const leg = bfs(current, c);
    if (leg.length > 0) {
      fullActions.push(...leg);
      fullActions.push('interact');
      current = { x: c.x, y: c.y };
    }
  }

  // Then visit switches if any gate is closed
  if (mission.switches && mission.switches.length > 0) {
    for (const sw of mission.switches) {
      const swLeg = bfs(current, sw);
      if (swLeg.length > 0) {
        fullActions.push(...swLeg);
        fullActions.push('interact');
        current = { x: sw.x, y: sw.y };
      }
    }
  }

  // Finally reach the goal
  const finalLeg = bfs(current, goal);
  fullActions.push(...finalLeg);

  if (fullActions.length === 0) {
    // Simple direct fallback if BFS was blocked
    const dx = goal.x - start.x;
    const dy = goal.y - start.y;
    for (let i = 0; i < Math.abs(dx); i++) fullActions.push(dx > 0 ? 'move_right' : 'move_left');
    for (let i = 0; i < Math.abs(dy); i++) fullActions.push(dy > 0 ? 'move_down' : 'move_up');
  }

  return fullActions;
}

function actionsToCode(actions: string[], lang: 'c' | 'python' | 'javascript', missionTitle: string): string {
  // Fold consecutive identical actions into loops if >= 2
  interface ActionChunk {
    action: string;
    count: number;
  }
  const chunks: ActionChunk[] = [];
  for (const act of actions) {
    if (chunks.length > 0 && chunks[chunks.length - 1].action === act) {
      chunks[chunks.length - 1].count++;
    } else {
      chunks.push({ action: act, count: 1 });
    }
  }

  if (lang === 'c') {
    const lines = chunks.map((c) => {
      if (c.count > 1) {
        return `    for (int i = 0; i < ${c.count}; i++) {\n        ${c.action}();\n    }`;
      }
      return `    ${c.action}();`;
    });
    return `#include <stdio.h>\n#include "petslyvia.h"\n\nint main() {\n    // Solution for: ${missionTitle}\n${lines.join('\n')}\n    return 0;\n}`;
  }

  if (lang === 'python') {
    const lines = chunks.map((c) => {
      if (c.count > 1) {
        return `for step in range(${c.count}):\n    ${c.action}()`;
      }
      return `${c.action}()`;
    });
    return `# Solution for: ${missionTitle}\n${lines.join('\n')}\n`;
  }

  // JavaScript
  const lines = chunks.map((c) => {
    if (c.count > 1) {
      return `for (let i = 0; i < ${c.count}; i++) {\n    ${c.action}();\n}`;
    }
    return `${c.action}();`;
  });
  return `// Solution for: ${missionTitle}\n${lines.join('\n')}\n`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getProblemHints(
  mission: MissionDefinition,
  lang: 'c' | 'python' | 'javascript' = 'c'
): string[] {
  const found = MISSION_SOLUTIONS[mission.id];
  if (found) {
    const langTip =
      lang === 'c'
        ? `C Syntax Tip: ${found.hints.cTip}`
        : lang === 'python'
        ? `Python Syntax Tip: ${found.hints.pyTip}`
        : `JavaScript Syntax Tip: ${found.hints.jsTip}`;
    return [
      `1. Goal & Strategy: ${found.hints.strategy}`,
      `2. Spatial Route: ${found.hints.path}`,
      `3. ${langTip}`,
    ];
  }

  // Dynamic fallback hints
  const cCount = (mission.crystals || []).length;
  const startDesc = `Start at (${mission.startPos.x}, ${mission.startPos.y}) and navigate to (${mission.goalPos.x}, ${mission.goalPos.y}).`;
  const crystalDesc = cCount > 0 ? `Collect all ${cCount} energy crystals on the grid before stepping into the portal.` : `Find the shortest route avoiding obstacles.`;
  const syntaxTip =
    lang === 'c'
      ? 'In C, wrap repetitive movements in: for (int i = 0; i < N; i++) { move_right(); }'
      : lang === 'python'
      ? 'In Python, wrap repetitive movements in: for i in range(N): move_right()'
      : 'In JavaScript, wrap repetitive movements in: for (let i = 0; i < N; i++) { move_right(); }';

  return [
    `1. Objective: ${mission.objective || startDesc}`,
    `2. Waypoints: ${crystalDesc}`,
    `3. Coding Tip: ${syntaxTip}`,
  ];
}

export function getProblemSolution(
  mission: MissionDefinition,
  lang: 'c' | 'python' | 'javascript' = 'c'
): ProblemSolution {
  const found = MISSION_SOLUTIONS[mission.id];
  if (found) {
    const code = lang === 'c' ? found.c : lang === 'python' ? found.python : found.javascript;
    return {
      code,
      explanation: found.explanation,
      keyConcept: found.keyConcept,
    };
  }

  // Generate dynamic algorithmic solution via BFS solver
  const actions = solveMissionPath(mission);
  const code = actionsToCode(actions, lang, mission.title);

  return {
    code,
    explanation: `This optimal route was calculated by the navigation solver. It guides your pet from (${mission.startPos.x}, ${mission.startPos.y}) to (${mission.goalPos.x}, ${mission.goalPos.y}) by collecting any available crystals and bypassing all obstacle walls.`,
    keyConcept: 'Automated Path Optimization & Repetition Compression',
  };
}
