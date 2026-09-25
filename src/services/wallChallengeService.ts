import type { SupportedLanguage } from '@/components/coding/CodespaceIdeHeader';
import type { MissionDefinition } from '@/types/game';

export interface WallChallenge {
  wallKey: string; // "x,y"
  x: number;
  y: number;
  missionNumber: number;
  missionId: string;
  title: string;
  guardianName: string;
  difficulty: 'Novice' | 'Easy' | 'Medium' | 'Challenging' | 'Expert';
  concept: string;
  story: string;
  prompt: string;
  expectedGoal: string;
  starterCodes: Record<SupportedLanguage, string>;
  solutions: Record<SupportedLanguage, string>;
  hints: string[];
  solutionExplanation: string;
  validate: (code: string, lang: SupportedLanguage) => { passed: boolean; message: string };
}

/**
 * Curated challenge catalog for specific mission walls
 */
const SPECIFIC_WALL_CHALLENGES: Record<string, Partial<WallChallenge>> = {
  // Mission 120 (prog_cond_1): The Locked Door
  'prog_cond_1_3_0': {
    title: 'Runic Threshold Sentinel',
    guardianName: 'Aegis the Threshold Guard',
    difficulty: 'Easy',
    concept: 'Conditionals (if statement)',
    story: 'This northern granite wall is bound by a threshold spell. To shatter it, write a condition that tests if magic power is at least 10!',
    prompt: 'Check if variable `energy >= 10`. If true, print `"UNLOCKED"`.',
    expectedGoal: 'Output "UNLOCKED" when energy is greater than or equal to 10.',
    starterCodes: {
      c: `#include <stdio.h>

int main() {
    int energy = 15;
    // TODO: Write an if statement: if energy >= 10, print "UNLOCKED"
    if (energy >= 10) {
        printf("UNLOCKED\\n");
    }
    return 0;
}
`,
      python: `# Guardian Wall Challenge: Energy Threshold
energy = 15

# TODO: Check if energy is at least 10, then print UNLOCKED
if energy >= 10:
    print("UNLOCKED")
`,
      javascript: `// Guardian Wall Challenge: Energy Threshold
const energy = 15;

// TODO: Check if energy is at least 10, then print UNLOCKED
if (energy >= 10) {
    console.log("UNLOCKED");
}
`,
    },
    solutions: {
      c: `#include <stdio.h>

int main() {
    int energy = 15;
    if (energy >= 10) {
        printf("UNLOCKED\\n");
    }
    return 0;
}
`,
      python: `energy = 15
if energy >= 10:
    print("UNLOCKED")
`,
      javascript: `const energy = 15;
if (energy >= 10) {
    console.log("UNLOCKED");
}
`,
    },
    hints: [
      'In C and JavaScript, conditions use `if (condition) { ... }`. In Python, use `if condition:`.',
      'The comparison operator for "greater than or equal to" is `>=`.',
      'Verify you are printing the exact string "UNLOCKED".',
    ],
    solutionExplanation: 'Using `if (energy >= 10)` tests the condition. Since energy is 15 (which is >= 10), the condition evaluates to true, emitting "UNLOCKED" and breaking the runic seal.',
  },

  // Mission 120 gate at (3, 1)
  'prog_cond_1_3_1': {
    title: 'The Great Gatekeeper Lock',
    guardianName: 'Gate of Verdant Runes',
    difficulty: 'Easy',
    concept: 'Condition & Boolean Evaluation',
    story: 'This central fortified gate blocks the corridor to the goal portal. Write the conditional logic that verifies switch activation!',
    prompt: 'Given `switch_active = 1` (or `true`), check if `switch_active == 1`. If so, print `"GATE_OPEN"`.',
    expectedGoal: 'Evaluate the switch state and output "GATE_OPEN" to trigger the shatter spell.',
    starterCodes: {
      c: `#include <stdio.h>

int main() {
    int switch_active = 1;
    // TODO: If switch_active is 1, print "GATE_OPEN"
    if (switch_active == 1) {
        printf("GATE_OPEN\\n");
    }
    return 0;
}
`,
      python: `# Gatekeeper Lock: Switch Condition
switch_active = True

# TODO: Check if switch_active is True, then print GATE_OPEN
if switch_active:
    print("GATE_OPEN")
`,
      javascript: `// Gatekeeper Lock: Switch Condition
const switch_active = true;

// TODO: Check if switch_active is true, then print GATE_OPEN
if (switch_active) {
    console.log("GATE_OPEN");
}
`,
    },
    solutions: {
      c: `#include <stdio.h>

int main() {
    int switch_active = 1;
    if (switch_active == 1) {
        printf("GATE_OPEN\\n");
    }
    return 0;
}
`,
      python: `switch_active = True
if switch_active:
    print("GATE_OPEN")
`,
      javascript: `const switch_active = true;
if (switch_active) {
    console.log("GATE_OPEN");
}
`,
    },
    hints: [
      'Use the equality operator `==` in C or simply `if (switch_active)` in Python/JS.',
      'Inside the block, print "GATE_OPEN" to send the unlock signal.',
      'Make sure spelling matches "GATE_OPEN" in all caps.',
    ],
    solutionExplanation: 'A conditional branch checks whether the switch is pressed. When true, executing the print instruction breaks the barrier lock.',
  },

  // Mission 120 wall at (3, 2)
  'prog_cond_1_3_2': {
    title: 'The Parity Keystone',
    guardianName: 'Golem of Even Resonance',
    difficulty: 'Easy',
    concept: 'Modulo Operator & If-Else',
    story: 'The southern obsidian pillar hums with energy. It only shatters if you verify that the magic key number 8 is an even number!',
    prompt: 'Check if `key % 2 == 0`. If true, print `"EVEN_PASS"`.',
    expectedGoal: 'Use the modulo operator `%` to confirm key parity and print "EVEN_PASS".',
    starterCodes: {
      c: `#include <stdio.h>

int main() {
    int key = 8;
    // TODO: If key is divisible by 2 (key % 2 == 0), print "EVEN_PASS"
    if (key % 2 == 0) {
        printf("EVEN_PASS\\n");
    }
    return 0;
}
`,
      python: `# Parity Keystone Challenge
key = 8

# TODO: Check if key % 2 == 0, then print EVEN_PASS
if key % 2 == 0:
    print("EVEN_PASS")
`,
      javascript: `// Parity Keystone Challenge
const key = 8;

// TODO: Check if key % 2 === 0, then print EVEN_PASS
if (key % 2 === 0) {
    console.log("EVEN_PASS");
}
`,
    },
    solutions: {
      c: `#include <stdio.h>

int main() {
    int key = 8;
    if (key % 2 == 0) {
        printf("EVEN_PASS\\n");
    }
    return 0;
}
`,
      python: `key = 8
if key % 2 == 0:
    print("EVEN_PASS")
`,
      javascript: `const key = 8;
if (key % 2 === 0) {
    console.log("EVEN_PASS");
}
`,
    },
    hints: [
      'The modulo operator `%` gives the remainder of division.',
      'If a number divided by 2 has a remainder of 0, it is even: `number % 2 == 0`.',
      'Print "EVEN_PASS" when the condition succeeds.',
    ],
    solutionExplanation: 'Modulo arithmetic `%` computes remainders. `8 % 2` yields `0`, confirming parity and collapsing the obsidian pillar.',
  },
};

/**
 * Deterministically generates or retrieves a Wall Challenge for any obstacle coordinate
 */
export function getWallChallenge(
  mission: MissionDefinition,
  x: number,
  y: number
): WallChallenge {
  const wallKey = `${x},${y}`;
  const customId = `${mission.id}_${x}_${y}`;

  // Check for curated challenge
  if (SPECIFIC_WALL_CHALLENGES[customId]) {
    const base = SPECIFIC_WALL_CHALLENGES[customId];
    return {
      wallKey,
      x,
      y,
      missionNumber: mission.number,
      missionId: mission.id,
      title: base.title || `Guardian Wall (${x}, ${y})`,
      guardianName: base.guardianName || 'Ancient Sentinel',
      difficulty: base.difficulty || 'Easy',
      concept: base.concept || 'Conditionals',
      story: base.story || 'A sturdy wall defends the corridor. Solve its coding riddle to shatter it!',
      prompt: base.prompt || 'Write code to solve the barrier riddle and print the magic key.',
      expectedGoal: base.expectedGoal || 'Print the expected key string to break the barrier.',
      starterCodes: base.starterCodes!,
      solutions: base.solutions!,
      hints: base.hints || ['Check the syntax.', 'Ensure you output the required keyword.'],
      solutionExplanation: base.solutionExplanation || 'Solving this challenge destroys the obstacle.',
      validate: (code: string, lang: SupportedLanguage) => validateWallSolution(code, lang, base),
    };
  }

  // Procedural generator scaled by mission level and coordinate
  const levelNum = mission.number || 100;
  const hash = Math.abs((x * 31 + y * 17 + levelNum * 13) % 4);

  if (levelNum < 120) {
    // Level < 120: Basic Variables & Output
    const targetWord = ['OPEN_SESAME', 'BREAK_STONE', 'PET_POWER', 'MAGIC_RUNE'][hash];
    return {
      wallKey,
      x,
      y,
      missionNumber: levelNum,
      missionId: mission.id,
      title: `Guardian Stone (${x}, ${y})`,
      guardianName: `Sentinel of Origin #${x}${y}`,
      difficulty: 'Novice',
      concept: 'Standard Output & Strings',
      story: `An ancient stone pillar blocks (${x}, ${y}). The carving reads: "Speak the word '${targetWord}' to break this seal!"`,
      prompt: `Print the exact string "${targetWord}" to break the stone barrier.`,
      expectedGoal: `Emit "${targetWord}" to the output stream.`,
      starterCodes: {
        c: `#include <stdio.h>\n\nint main() {\n    // Print "${targetWord}" to shatter the wall\n    printf("${targetWord}\\n");\n    return 0;\n}\n`,
        python: `# Guardian Stone Challenge\n# Print the secret password: ${targetWord}\nprint("${targetWord}")\n`,
        javascript: `// Guardian Stone Challenge\n// Print the secret password: ${targetWord}\nconsole.log("${targetWord}");\n`,
      },
      solutions: {
        c: `#include <stdio.h>\n\nint main() {\n    printf("${targetWord}\\n");\n    return 0;\n}\n`,
        python: `print("${targetWord}")\n`,
        javascript: `console.log("${targetWord}");\n`,
      },
      hints: [
        `In C use printf("${targetWord}\\n");, in Python print("${targetWord}"), in JS console.log("${targetWord}");`,
        'Watch uppercase spelling and quotation marks.',
      ],
      solutionExplanation: `Printing "${targetWord}" resonates with the stone seal frequency, shattering it to dust.`,
      validate: (code: string) => {
        const clean = code.toUpperCase();
        if (clean.includes(targetWord)) {
          return { passed: true, message: `💥 BOOM! The Guardian Stone at (${x}, ${y}) shattered into dust!` };
        }
        return { passed: false, message: `The stone didn't budge. Expected output: "${targetWord}".` };
      },
    };
  } else if (levelNum < 130) {
    // Level 120-129: Conditions & Logic
    const targetKey = ['PASS_CLEAR', 'ALLOW_ACCESS', 'BARRIER_DOWN', 'RUNE_SOLVED'][hash];
    const threshold = 10 + hash * 5;
    return {
      wallKey,
      x,
      y,
      missionNumber: levelNum,
      missionId: mission.id,
      title: `Barrier of Conditions (${x}, ${y})`,
      guardianName: `Runic Guardian #${x}${y}`,
      difficulty: 'Easy',
      concept: 'If Statement & Logic',
      story: `This barrier tests your mastery of decision making. If test power reaches ${threshold}, output '${targetKey}'!`,
      prompt: `Write an if statement: if \`power >= ${threshold}\`, print "${targetKey}".`,
      expectedGoal: `Evaluate the condition and print "${targetKey}".`,
      starterCodes: {
        c: `#include <stdio.h>\n\nint main() {\n    int power = ${threshold + 5};\n    // Check if power >= ${threshold}\n    if (power >= ${threshold}) {\n        printf("${targetKey}\\n");\n    }\n    return 0;\n}\n`,
        python: `power = ${threshold + 5}\nif power >= ${threshold}:\n    print("${targetKey}")\n`,
        javascript: `const power = ${threshold + 5};\nif (power >= ${threshold}) {\n    console.log("${targetKey}");\n}\n`,
      },
      solutions: {
        c: `#include <stdio.h>\n\nint main() {\n    int power = ${threshold + 5};\n    if (power >= ${threshold}) {\n        printf("${targetKey}\\n");\n    }\n    return 0;\n}\n`,
        python: `power = ${threshold + 5}\nif power >= ${threshold}:\n    print("${targetKey}")\n`,
        javascript: `const power = ${threshold + 5};\nif (power >= ${threshold}) {\n    console.log("${targetKey}");\n}\n`,
      },
      hints: [
        `Check if power >= ${threshold}`,
        `Print the magic string "${targetKey}" inside the if branch.`,
      ],
      solutionExplanation: `The condition power >= ${threshold} evaluates to true, releasing the pulse that shatters the barrier.`,
      validate: (code: string) => {
        const clean = code.toUpperCase();
        if (clean.includes(targetKey)) {
          return { passed: true, message: `💥 CRASH! Barrier at (${x}, ${y}) collapsed completely!` };
        }
        return { passed: false, message: `Missing keyword "${targetKey}" or incorrect if condition.` };
      },
    };
  } else if (levelNum < 150) {
    // Level 130-149: Loops & Iterations
    const repeatCount = 3 + hash;
    return {
      wallKey,
      x,
      y,
      missionNumber: levelNum,
      missionId: mission.id,
      title: `Loop Resonance Wall (${x}, ${y})`,
      guardianName: `Keeper of Cycles #${x}${y}`,
      difficulty: 'Medium',
      concept: 'For Loop & Iteration',
      story: `This wall requires ${repeatCount} repeated harmonic pulses to crack its crystal structure!`,
      prompt: `Write a for loop that repeats ${repeatCount} times and prints "PULSE".`,
      expectedGoal: `Print "PULSE" ${repeatCount} times using a loop.`,
      starterCodes: {
        c: `#include <stdio.h>\n\nint main() {\n    // Loop ${repeatCount} times\n    for (int i = 0; i < ${repeatCount}; i++) {\n        printf("PULSE\\n");\n    }\n    return 0;\n}\n`,
        python: `# Repeat ${repeatCount} times\nfor i in range(${repeatCount}):\n    print("PULSE")\n`,
        javascript: `// Repeat ${repeatCount} times\nfor (let i = 0; i < ${repeatCount}; i++) {\n    console.log("PULSE");\n}\n`,
      },
      solutions: {
        c: `#include <stdio.h>\n\nint main() {\n    for (int i = 0; i < ${repeatCount}; i++) {\n        printf("PULSE\\n");\n    }\n    return 0;\n}\n`,
        python: `for i in range(${repeatCount}):\n    print("PULSE")\n`,
        javascript: `for (let i = 0; i < ${repeatCount}; i++) {\n    console.log("PULSE");\n}\n`,
      },
      hints: [
        `In C/JS: for (int i = 0; i < ${repeatCount}; i++), In Python: for i in range(${repeatCount}):`,
        'Print "PULSE" inside the body of the loop.',
      ],
      solutionExplanation: `${repeatCount} sequential harmonic pulses shatter the crystal resonance, opening the corridor.`,
      validate: (code: string) => {
        const hasPulse = code.toUpperCase().includes('PULSE');
        const hasLoop = code.includes('for') || code.includes('while') || code.includes('repeat');
        if (hasPulse && hasLoop) {
          return { passed: true, message: `💥 The harmonic pulses shattered the wall at (${x}, ${y})!` };
        }
        return { passed: false, message: `Ensure you use a loop repeating ${repeatCount} times with "PULSE".` };
      },
    };
  } else {
    // Level 150+: Functions & Algorithms
    return {
      wallKey,
      x,
      y,
      missionNumber: levelNum,
      missionId: mission.id,
      title: `Apex Algorithm Citadel (${x}, ${y})`,
      guardianName: `Cyber Matrix Guard #${x}${y}`,
      difficulty: 'Challenging',
      concept: 'Functions & Math',
      story: `A high-security cipher firewall guards (${x}, ${y}). Define a function to compute power squared and unlock the corridor.`,
      prompt: `Define a function \`shatter(int power)\` that returns \`power * power\`. Call \`shatter(5)\` to print 25.`,
      expectedGoal: 'Return and print 25 from the helper function.',
      starterCodes: {
        c: `#include <stdio.h>\n\nint shatter(int power) {\n    return power * power;\n}\n\nint main() {\n    printf("%d\\n", shatter(5));\n    return 0;\n}\n`,
        python: `def shatter(power):\n    return power * power\n\nprint(shatter(5))\n`,
        javascript: `function shatter(power) {\n    return power * power;\n}\n\nconsole.log(shatter(5));\n`,
      },
      solutions: {
        c: `#include <stdio.h>\n\nint shatter(int power) {\n    return power * power;\n}\n\nint main() {\n    printf("%d\\n", shatter(5));\n    return 0;\n}\n`,
        python: `def shatter(power):\n    return power * power\n\nprint(shatter(5))\n`,
        javascript: `function shatter(power) {\n    return power * power;\n}\n\nconsole.log(shatter(5));\n`,
      },
      hints: [
        'A function accepts a parameter, multiplies it by itself, and returns the result.',
        'Call shatter(5) and print the output.',
      ],
      solutionExplanation: 'Calculating the square of 5 produces 25, which satisfies the firewall cipher and disables the barrier.',
      validate: (code: string) => {
        if (code.includes('shatter') && (code.includes('25') || code.includes('*'))) {
          return { passed: true, message: `💥 Matrix deciphered! Firewall at (${x}, ${y}) collapsed!` };
        }
        return { passed: false, message: 'Define the shatter function and compute power * power.' };
      },
    };
  }
}

function validateWallSolution(
  code: string,
  _lang: SupportedLanguage,
  base: Partial<WallChallenge>
): { passed: boolean; message: string } {
  const clean = code.toUpperCase();
  if (base.prompt?.includes('UNLOCKED') && clean.includes('UNLOCKED')) {
    return { passed: true, message: '💥 Threshold reached! The Runic Wall shattered into pieces!' };
  }
  if (base.prompt?.includes('GATE_OPEN') && clean.includes('GATE_OPEN')) {
    return { passed: true, message: '💥 Switch verified! The Gatekeeper barrier shattered open!' };
  }
  if (base.prompt?.includes('EVEN_PASS') && clean.includes('EVEN_PASS')) {
    return { passed: true, message: '💥 Parity confirmed! The Parity Keystone collapsed!' };
  }

  // Fallback: check if starter was changed or contains main keywords
  if (clean.includes('IF') || clean.includes('PRINT') || clean.includes('RETURN')) {
    return { passed: true, message: '💥 Spell executed! The wall shattered into rubble!' };
  }

  return {
    passed: false,
    message: 'Code output did not satisfy the wall guardian. Check your if statement and print statements.',
  };
}
