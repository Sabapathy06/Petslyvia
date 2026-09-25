import type { MissionDefinition } from '@/types/game';

/**
 * PROGRESSIVE CODING & SCENARIO MISSION SYSTEM
 * ==============================================
 * Set 0  – Sequence      (GUIDED: arrows + auto-solution)
 * Set 1  – Variables     (VISUAL: blocks only)
 * Set 2  – Conditions    (VISUAL: if-blocks)
 * Set 3  – Loops         (VISUAL: repeat blocks)
 * Set 4  – Functions     (PSEUDOCODE: named routines)
 * Set 5  – Debugging     (DEBUG: find + fix broken code)
 * Set 6  – Pseudocode    (PSEUDOCODE: fill in the blanks)
 * Set 7  – Typed Code    (TYPED: write real code from scratch)
 * Set 8  – Independent   (TYPED: zero scaffolding)
 * Set 9  – Scenarios     (SCENARIO: real-world open challenges)
 */

export const PROGRESSIVE_MISSIONS: MissionDefinition[] = [

  // ══════════════════════════════════════════════════════════════
  //  SET 0 — SEQUENCE (GUIDED)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'prog_seq_1',
    number: 100,
    title: 'First Steps',
    worldArea: 'academy',
    stageType: 'play',
    conceptSet: 'sequence',
    learningMode: 'guided',
    progressLabel: 'Set 0 · Sequence · Mission 1',
    story: 'Pebble the pet just woke up. Guide Pebble to the warm home portal — one step at a time!',
    objective: 'Tap the arrow buttons in order to guide Pebble to the goal. Each button adds one step.',
    gridSize: { width: 5, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 4, y: 1 },
    obstacles: [],
    crystals: [],
    allowedControls: ['right'],
    allowedBlocks: ['move_right'],
    hints: [
      'Tap ➡ four times to move Pebble right.',
      'Watch the sequence of blue blocks grow in the workspace.',
      'Press ▶ Run to execute all your moves at once!',
    ],
    explanation: 'Each action you added is one INSTRUCTION. A sequence is a list of instructions executed in order — the most basic concept in all of programming.',
    xpReward: 20,
    coinReward: 15,
    skillRewards: { logic: 10 },
    maxSteps: 10,
  },

  {
    id: 'prog_seq_2',
    number: 101,
    title: 'Two Directions',
    worldArea: 'academy',
    stageType: 'play',
    conceptSet: 'sequence',
    learningMode: 'guided',
    progressLabel: 'Set 0 · Sequence · Mission 2',
    story: 'Pebble must reach the crystal AND the home portal. The path requires two different directions!',
    objective: 'Use RIGHT and DOWN arrows in sequence to collect the crystal and reach the portal.',
    gridSize: { width: 5, height: 4 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 4, y: 2 },
    obstacles: [
      { x: 2, y: 0, type: 'wall' },
      { x: 3, y: 0, type: 'wall' },
    ],
    crystals: [{ x: 1, y: 2, collected: false }],
    allowedControls: ['right', 'down'],
    allowedBlocks: ['move_right', 'move_down'],
    hints: [
      'Move down first to row 2, then move right to collect the crystal.',
      'The ORDER matters — wrong order means you miss the crystal!',
      'Think of it as: Step 1: Down, Down. Step 2: Right, Right, Right, Right.',
    ],
    explanation: 'You used a SEQUENCE of two kinds of actions. In coding, sequence means the computer does EXACTLY what you write — in the EXACT order.',
    xpReward: 30,
    coinReward: 20,
    skillRewards: { logic: 15 },
    maxSteps: 14,
  },

  {
    id: 'prog_seq_3',
    number: 102,
    title: 'Sequence Mastery Check',
    worldArea: 'academy',
    stageType: 'play',
    conceptSet: 'sequence',
    learningMode: 'guided',
    progressLabel: 'Set 0 · Sequence · Mastery Check',
    isMasteryCheck: true,
    story: 'Final sequence test! Pebble must collect 2 crystals and escape. Plan your full sequence before running!',
    objective: 'Plan and execute the complete sequence to collect both crystals and reach the portal.',
    gridSize: { width: 6, height: 5 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 5, y: 4 },
    obstacles: [
      { x: 3, y: 0, type: 'wall' },
      { x: 0, y: 3, type: 'wall' },
      { x: 4, y: 1, type: 'wall' },
    ],
    crystals: [
      { x: 2, y: 0, collected: false },
      { x: 5, y: 2, collected: false },
    ],
    allowedControls: ['up', 'down', 'left', 'right'],
    allowedBlocks: ['move_up', 'move_down', 'move_left', 'move_right'],
    hints: [
      'Plan the full route on paper first: crystal 1 then crystal 2 then goal.',
      'There is only ONE correct order for the crystals.',
      'If you get stuck, reset and try a different path first.',
    ],
    explanation: 'MASTERY: You planned a multi-step sequence before running it. A programmer always plans their algorithm before writing code!',
    xpReward: 60,
    coinReward: 45,
    skillRewards: { logic: 25, coding: 10 },
    maxSteps: 24,
  },

  // ══════════════════════════════════════════════════════════════
  //  SET 1 — VARIABLES (VISUAL)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'prog_var_1',
    number: 110,
    title: 'What is a Variable?',
    worldArea: 'academy',
    stageType: 'discover',
    conceptSet: 'variables',
    learningMode: 'visual',
    progressLabel: 'Set 1 · Variables · Mission 1',
    story: 'The crystal counter keeps track of how many gems Pebble collects. This is a VARIABLE — a named box that stores a changing value.',
    objective: 'Collect all 3 crystals while watching the "collected" counter change at each step.',
    gridSize: { width: 5, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 4, y: 1 },
    obstacles: [],
    crystals: [
      { x: 1, y: 1, collected: false },
      { x: 2, y: 1, collected: false },
      { x: 3, y: 1, collected: false },
    ],
    allowedControls: ['right'],
    allowedBlocks: ['move_right'],
    hints: [
      'Watch the crystal counter — it starts at 0 and INCREASES each time.',
      'That counter is a variable: collected = 0, then 1, then 2, then 3.',
      'Variables are the memory of a program!',
    ],
    explanation: 'A VARIABLE is a named storage location. Here, "collected" stored the number of crystals. In code: collected = 0; collected = collected + 1;',
    xpReward: 40,
    coinReward: 30,
    skillRewards: { logic: 15, coding: 10 },
    maxSteps: 10,
  },

  {
    id: 'prog_var_2',
    number: 111,
    title: 'The Step Counter',
    worldArea: 'academy',
    stageType: 'visual_logic',
    conceptSet: 'variables',
    learningMode: 'visual',
    progressLabel: 'Set 1 · Variables · Mission 2',
    story: 'The step counter variable tracks how many moves Pebble has made. Reach the goal in EXACTLY 6 steps!',
    objective: 'Build a block sequence of EXACTLY 6 move actions to reach the goal.',
    gridSize: { width: 4, height: 4 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 3, y: 3 },
    obstacles: [],
    crystals: [],
    allowedControls: ['right', 'down'],
    allowedBlocks: ['move_right', 'move_down'],
    hints: [
      'The step counter variable starts at 0 and must equal exactly 6.',
      'Right 3 times + Down 3 times = 6 steps.',
      'Think: steps_taken = 0; for each move: steps_taken = steps_taken + 1',
    ],
    explanation: 'You controlled a variable (steps_taken) by choosing exactly how many actions to add. Variables let programs track, count, and respond to changing quantities.',
    xpReward: 45,
    coinReward: 35,
    skillRewards: { logic: 15, coding: 15 },
    maxSteps: 8,
  },

  // ══════════════════════════════════════════════════════════════
  //  SET 2 — CONDITIONS (VISUAL)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'prog_cond_1',
    number: 120,
    title: 'The Locked Door',
    worldArea: 'academy',
    stageType: 'play',
    conceptSet: 'conditions',
    learningMode: 'visual',
    progressLabel: 'Set 2 · Conditions · Mission 1',
    story: 'Pebble reaches a locked gate. IF the switch is pressed, THEN the gate opens. This is a CONDITION — code that checks if something is true before acting.',
    objective: 'Press the switch to satisfy the condition and open the gate, then reach the goal.',
    gridSize: { width: 6, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 5, y: 1 },
    obstacles: [
      { x: 3, y: 1, type: 'gate', id: 'cond_gate', isOpen: false },
      { x: 3, y: 0, type: 'wall' },
      { x: 3, y: 2, type: 'wall' },
    ],
    crystals: [],
    switches: [{ x: 1, y: 1, targetGateId: 'cond_gate', isActive: false, color: '#8b5cf6' }],
    allowedControls: ['right', 'interact'],
    allowedBlocks: ['move_right', 'interact'],
    hints: [
      'Move to the purple switch at (1,1) and press Interact.',
      'The gate checks: IF switch is active THEN open gate.',
      'Without pressing the switch, the condition is FALSE and gate stays CLOSED.',
    ],
    explanation: 'IF switch.active == true: gate.open()\nThis is the CONDITIONAL (if-statement) — the most fundamental decision structure in programming.',
    xpReward: 50,
    coinReward: 40,
    skillRewards: { logic: 20, coding: 10 },
    maxSteps: 16,
  },

  {
    id: 'prog_cond_2',
    number: 121,
    title: 'Two Choices',
    worldArea: 'academy',
    stageType: 'visual_logic',
    conceptSet: 'conditions',
    learningMode: 'visual',
    progressLabel: 'Set 2 · Conditions · Mission 2',
    story: 'The path forks. Pebble must take the route that leads through the crystal. IF there is a crystal ahead, follow that path.',
    objective: 'Use the if_crystal block to detect and follow the correct route to the goal.',
    gridSize: { width: 5, height: 5 },
    startPos: { x: 0, y: 2 },
    startDir: 'right',
    goalPos: { x: 4, y: 0 },
    obstacles: [
      { x: 2, y: 2, type: 'wall' },
      { x: 2, y: 3, type: 'wall' },
      { x: 2, y: 4, type: 'wall' },
    ],
    crystals: [{ x: 2, y: 0, collected: false }],
    allowedControls: ['up', 'right'],
    allowedBlocks: ['move_right', 'move_up', 'if_crystal'],
    hints: [
      'The if_crystal block checks: IF there is a crystal here, act on it.',
      'Think: if path_is_clear: move_forward() else: turn()',
      'Conditions let Pebble make DECISIONS based on what it detects.',
    ],
    explanation: 'Conditions (if/else) allow programs to react differently to different situations. Without them, programs could only do one fixed sequence forever.',
    xpReward: 60,
    coinReward: 45,
    skillRewards: { logic: 25, coding: 15 },
    maxSteps: 18,
  },

  // ══════════════════════════════════════════════════════════════
  //  SET 3 — LOOPS (VISUAL)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'prog_loop_1',
    number: 130,
    title: 'The Long Corridor',
    worldArea: 'academy',
    stageType: 'visual_logic',
    conceptSet: 'loops',
    learningMode: 'visual',
    progressLabel: 'Set 3 · Loops · Mission 1',
    story: 'Pebble must walk 8 steps right. Instead of adding 8 separate blocks, use a REPEAT block — the same as a loop in real code!',
    objective: 'Use a Repeat block set to 8 to walk Pebble to the goal.',
    gridSize: { width: 9, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 8, y: 1 },
    obstacles: [],
    crystals: [],
    allowedControls: ['right'],
    allowedBlocks: ['move_right', 'repeat'],
    hints: [
      'Add a REPEAT block and set the count to 8.',
      'Equivalent to: for i in range(8): move_right()',
      'Without loops, you would need to write move_right() 8 separate times!',
    ],
    explanation: 'A LOOP is a block of code that repeats a set number of times. Loops make programs shorter and more powerful — the foundation of automation.',
    xpReward: 55,
    coinReward: 40,
    skillRewards: { logic: 20, coding: 20 },
    maxSteps: 12,
  },

  {
    id: 'prog_loop_2',
    number: 131,
    title: 'Spiral Harvest',
    worldArea: 'academy',
    stageType: 'visual_logic',
    conceptSet: 'loops',
    learningMode: 'visual',
    progressLabel: 'Set 3 · Loops · Mission 2',
    story: 'The crystals are arranged in a zigzag pattern. Spot the repeating unit and wrap it in a loop!',
    objective: 'Use Repeat blocks to collect all crystals efficiently.',
    gridSize: { width: 6, height: 5 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 5, y: 4 },
    obstacles: [
      { x: 2, y: 0, type: 'wall' },
      { x: 4, y: 0, type: 'wall' },
      { x: 1, y: 2, type: 'wall' },
      { x: 3, y: 2, type: 'wall' },
      { x: 5, y: 2, type: 'wall' },
    ],
    crystals: [
      { x: 1, y: 0, collected: false },
      { x: 1, y: 1, collected: false },
      { x: 3, y: 1, collected: false },
      { x: 3, y: 3, collected: false },
      { x: 5, y: 3, collected: false },
    ],
    allowedControls: ['up', 'down', 'left', 'right'],
    allowedBlocks: ['move_right', 'move_down', 'move_left', 'move_up', 'repeat'],
    hints: [
      'Find the repeating unit: right, down, right.',
      'Wrap that pattern inside a REPEAT block.',
      'Loops are powerful when you see a PATTERN that repeats!',
    ],
    explanation: 'Loops are most useful when you spot a PATTERN. Pattern recognition is one of the most important skills a programmer develops.',
    xpReward: 75,
    coinReward: 55,
    skillRewards: { logic: 30, coding: 25 },
    maxSteps: 22,
  },

  // ══════════════════════════════════════════════════════════════
  //  SET 4 — FUNCTIONS (PSEUDOCODE)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'prog_func_1',
    number: 140,
    title: 'The Routine',
    worldArea: 'academy',
    stageType: 'visual_logic',
    conceptSet: 'functions',
    learningMode: 'pseudocode',
    progressLabel: 'Set 4 · Functions · Mission 1',
    story: 'Pebble uses the same three moves (right, right, down) three times. This repeated routine can be wrapped in a FUNCTION — a named block you can call any time.',
    objective: 'Define the "step_routine" function in pseudocode and call it 3 times.',
    gridSize: { width: 6, height: 5 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 5, y: 3 },
    obstacles: [
      { x: 2, y: 0, type: 'wall' },
      { x: 4, y: 1, type: 'wall' },
      { x: 2, y: 2, type: 'wall' },
      { x: 4, y: 3, type: 'wall' },
    ],
    crystals: [
      { x: 1, y: 1, collected: false },
      { x: 3, y: 2, collected: false },
      { x: 5, y: 3, collected: false },
    ],
    allowedControls: ['up', 'down', 'right'],
    allowedBlocks: ['move_right', 'move_down', 'repeat'],
    pseudocodeTemplate: {
      template:
        'DEFINE FUNCTION step_routine():\n    move_right()\n    ___\n    move_down()\n\nBEGIN:\n    ___()\n    ___()\n    step_routine()',
      answers: ['move_right', 'step_routine', 'step_routine'],
      explanation: 'A FUNCTION bundles repeated code under a name. Instead of copying the same 3 lines, you call the name. In Python: def step_routine(): ...',
    },
    hints: [
      'Fill in the blanks to complete the function definition.',
      'A function is defined once with DEFINE FUNCTION, then called by name.',
      'You call step_routine() three times to execute it three times.',
    ],
    explanation: 'FUNCTIONS (also called procedures or methods) are reusable blocks of instructions. They are a cornerstone of ALL programming languages.',
    xpReward: 85,
    coinReward: 65,
    skillRewards: { logic: 25, coding: 30 },
    maxSteps: 20,
  },

  // ══════════════════════════════════════════════════════════════
  //  SET 5 — DEBUGGING (DEBUG MODE)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'prog_debug_1',
    number: 150,
    title: 'The Wrong Turn',
    worldArea: 'academy',
    stageType: 'break_fix',
    conceptSet: 'debugging',
    learningMode: 'debug',
    progressLabel: 'Set 5 · Debugging · Mission 1',
    story: 'Someone wrote a path for Pebble but made a mistake — Pebble crashes into a wall! You must FIND the bug and FIX it.',
    objective: 'Identify the incorrect block in the sequence and replace it with the correct one.',
    gridSize: { width: 5, height: 4 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 4, y: 3 },
    obstacles: [
      { x: 2, y: 0, type: 'wall' },
      { x: 2, y: 1, type: 'wall' },
    ],
    crystals: [{ x: 1, y: 1, collected: false }],
    allowedControls: ['up', 'down', 'left', 'right'],
    allowedBlocks: ['move_right', 'move_down', 'move_left', 'move_up', 'turn_left', 'turn_right'],
    initialBlocks: [
      { id: 'dbg1_1', type: 'move_right' },
      { id: 'dbg1_2', type: 'move_right' },
      { id: 'dbg1_3', type: 'move_right' },
      { id: 'dbg1_4', type: 'move_down' },
      { id: 'dbg1_5', type: 'move_right' },
      { id: 'dbg1_6', type: 'move_right' },
      { id: 'dbg1_7', type: 'move_right' },
    ],
    brokenTargetBlockIndex: 1,
    hints: [
      'Run the program to see where Pebble crashes.',
      'The crash happens at step 2 — moving right into a wall at (2,0).',
      'Fix: Replace step 2 with move_down() to go around the wall.',
    ],
    explanation: 'DEBUGGING is the process of finding and fixing errors in code. Professional programmers spend up to 50% of their time debugging!',
    xpReward: 70,
    coinReward: 55,
    skillRewards: { debugging: 35, logic: 20 },
    maxSteps: 18,
  },

  {
    id: 'prog_debug_2',
    number: 151,
    title: 'Off-by-One Error',
    worldArea: 'academy',
    stageType: 'break_fix',
    conceptSet: 'debugging',
    learningMode: 'debug',
    progressLabel: 'Set 5 · Debugging · Mission 2',
    story: 'A classic bug: the loop runs 4 times when it should run 6. Pebble stops two cells short of the goal!',
    objective: 'Fix the off-by-one error in the repeat count so Pebble reaches the portal exactly.',
    gridSize: { width: 7, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 6, y: 1 },
    obstacles: [],
    crystals: [{ x: 3, y: 1, collected: false }],
    allowedControls: ['right'],
    allowedBlocks: ['move_right', 'repeat'],
    initialBlocks: [
      {
        id: 'dbg2_1',
        type: 'repeat',
        params: { count: 4 },
      },
    ],
    brokenTargetBlockIndex: 0,
    hints: [
      'Run the code — Pebble stops at (4,1) instead of (6,1).',
      'The loop repeats only 4 times but the goal is 6 cells away.',
      'Fix: Change the repeat count from 4 to 6.',
    ],
    explanation: "The OFF-BY-ONE ERROR is one of the most common bugs in programming. Always count carefully: range(4) runs 0,1,2,3 — that's only 4 iterations!",
    xpReward: 75,
    coinReward: 55,
    skillRewards: { debugging: 40, logic: 20 },
    maxSteps: 12,
  },

  {
    id: 'prog_debug_3',
    number: 152,
    title: 'The Missing Interact',
    worldArea: 'academy',
    stageType: 'break_fix',
    conceptSet: 'debugging',
    learningMode: 'debug',
    progressLabel: 'Set 5 · Debugging · Mastery Check',
    isMasteryCheck: true,
    story: 'The code walks Pebble straight into a locked gate without pressing the switch! Find the missing step.',
    objective: 'Insert the missing interact() command at the correct position in the sequence.',
    gridSize: { width: 6, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 5, y: 1 },
    obstacles: [
      { x: 3, y: 1, type: 'gate', id: 'dbg_gate', isOpen: false },
      { x: 3, y: 0, type: 'wall' },
      { x: 3, y: 2, type: 'wall' },
    ],
    crystals: [],
    switches: [{ x: 1, y: 1, targetGateId: 'dbg_gate', isActive: false, color: '#f43f5e' }],
    allowedControls: ['right', 'interact'],
    allowedBlocks: ['move_right', 'interact'],
    initialBlocks: [
      { id: 'dbg3_1', type: 'move_right' },
      { id: 'dbg3_2', type: 'move_right' },
      { id: 'dbg3_3', type: 'move_right' },
    ],
    brokenTargetBlockIndex: 1,
    hints: [
      'Pebble reaches (1,1) but skips the switch and crashes into the gate.',
      'After the first move_right(), add an interact() command.',
      'Interact tells Pebble to activate whatever is at its current tile.',
    ],
    explanation: 'MASTERY: You diagnosed a sequencing bug (missing step) and inserted a fix. Real debugging requires reading code carefully to find what is absent, not just what is wrong.',
    xpReward: 90,
    coinReward: 70,
    skillRewards: { debugging: 45, logic: 25, coding: 15 },
    maxSteps: 14,
  },

  // ══════════════════════════════════════════════════════════════
  //  SET 6 — PSEUDOCODE (FILL-IN-THE-BLANK)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'prog_pseudo_1',
    number: 160,
    title: 'Reading the Recipe',
    worldArea: 'academy',
    stageType: 'discover',
    conceptSet: 'pseudocode',
    learningMode: 'pseudocode',
    progressLabel: 'Set 6 · Pseudocode · Mission 1',
    story: 'Before writing real code, programmers write PSEUDOCODE — plain-language steps that look like code but anyone can read. Complete the pseudocode for Pebble\'s journey!',
    objective: 'Fill in the blanks in the pseudocode to describe the path.',
    gridSize: { width: 5, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 4, y: 1 },
    obstacles: [],
    crystals: [{ x: 2, y: 1, collected: false }],
    allowedControls: ['right'],
    allowedBlocks: ['move_right'],
    pseudocodeTemplate: {
      template:
        'BEGIN journey\n    REPEAT ___ times:\n        move_right()\n    IF crystal_found:\n        ___\n    MOVE to ___\nEND journey',
      answers: ['4', 'collect()', 'goal'],
      explanation: 'Pseudocode is a planning tool. It has the STRUCTURE of code: BEGIN/END, REPEAT, IF, and actions. Once you have pseudocode, translating to Python or JavaScript is much easier.',
    },
    hints: [
      'Count how many times Pebble needs to move right.',
      'When Pebble is on a crystal tile, what should it do?',
      'The final destination is called the goal.',
    ],
    explanation: 'PSEUDOCODE is language-neutral. The same pseudocode can be translated to Python, JavaScript, Java, or any other language!',
    xpReward: 65,
    coinReward: 50,
    skillRewards: { coding: 25, logic: 20 },
    maxSteps: 10,
  },

  {
    id: 'prog_pseudo_2',
    number: 161,
    title: 'Loop Pseudocode',
    worldArea: 'academy',
    stageType: 'visual_logic',
    conceptSet: 'pseudocode',
    learningMode: 'pseudocode',
    progressLabel: 'Set 6 · Pseudocode · Mission 2',
    story: 'Write pseudocode for a perimeter sweep that collects crystals along the edges of the grid.',
    objective: 'Complete the pseudocode template describing the perimeter collection route.',
    gridSize: { width: 6, height: 5 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 0, y: 4 },
    obstacles: [
      { x: 1, y: 1, type: 'wall' }, { x: 2, y: 1, type: 'wall' }, { x: 3, y: 1, type: 'wall' }, { x: 4, y: 1, type: 'wall' },
      { x: 1, y: 2, type: 'wall' }, { x: 2, y: 2, type: 'wall' }, { x: 3, y: 2, type: 'wall' }, { x: 4, y: 2, type: 'wall' },
      { x: 1, y: 3, type: 'wall' }, { x: 2, y: 3, type: 'wall' }, { x: 3, y: 3, type: 'wall' }, { x: 4, y: 3, type: 'wall' },
    ],
    crystals: [
      { x: 3, y: 0, collected: false },
      { x: 5, y: 2, collected: false },
      { x: 2, y: 4, collected: false },
    ],
    allowedControls: ['up', 'down', 'left', 'right'],
    allowedBlocks: ['move_right', 'move_down', 'move_left', 'move_up', 'repeat', 'turn_right'],
    pseudocodeTemplate: {
      template:
        'BEGIN perimeter_sweep\n    REPEAT ___ times: move_right()\n    ___\n    REPEAT 4 times: move_down()\n    REPEAT 5 times: ___\n    ARRIVE at goal\nEND perimeter_sweep',
      answers: ['5', 'turn_right()', 'move_left()'],
      explanation: 'Well-structured pseudocode mirrors real code exactly. This maps directly to: for i in range(5): move_right()  then turn_right() ...',
    },
    hints: [
      'Count each leg of the perimeter route carefully.',
      'Phase 1 = top edge (5 moves right).',
      'Phase 2 = right edge (turn_right, then 4 moves down).',
    ],
    explanation: 'Structured pseudocode with phases and loops directly translates to real code. Pseudocode skills make you faster at writing ANY programming language.',
    xpReward: 85,
    coinReward: 65,
    skillRewards: { coding: 30, logic: 25 },
    maxSteps: 22,
  },

  // ══════════════════════════════════════════════════════════════
  //  SET 7 — TYPED CODE (PLAYER WRITES REAL CODE)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'prog_typed_1',
    number: 170,
    title: 'Write Your First Line',
    worldArea: 'academy',
    stageType: 'code',
    conceptSet: 'typed_code',
    learningMode: 'typed',
    progressLabel: 'Set 7 · Typed Code · Mission 1',
    story: 'No more blocks. No more templates. Type real code yourself! Available functions: move_right(), move_left(), move_up(), move_down().',
    objective: 'Type move_right() four times in the code editor and press Run.',
    gridSize: { width: 5, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 4, y: 1 },
    obstacles: [],
    crystals: [],
    allowedControls: ['right'],
    allowedBlocks: ['move_right'],
    requiredCodeSnippet: 'move_right()',
    hints: [
      'Type exactly: move_right()',
      'Add it four times, one per line.',
      'Each function call ends with () — this tells the computer to EXECUTE the function.',
    ],
    explanation: 'You just wrote REAL CODE. The parentheses () after a function name mean "execute this function now." This is true in Python, JavaScript, Java, and virtually every modern language.',
    xpReward: 80,
    coinReward: 60,
    skillRewards: { coding: 35, logic: 15 },
    maxSteps: 10,
  },

  {
    id: 'prog_typed_2',
    number: 171,
    title: 'Write a Loop',
    worldArea: 'academy',
    stageType: 'code',
    conceptSet: 'typed_code',
    learningMode: 'typed',
    progressLabel: 'Set 7 · Typed Code · Mission 2',
    story: 'The corridor is 8 cells long. Type a Python for-loop to walk Pebble across. No blocks, no arrows — type it yourself!',
    objective: 'Write a Python for loop that calls move_right() 8 times.',
    gridSize: { width: 9, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 8, y: 1 },
    obstacles: [],
    crystals: [
      { x: 3, y: 1, collected: false },
      { x: 6, y: 1, collected: false },
    ],
    allowedControls: ['right'],
    allowedBlocks: ['move_right', 'repeat'],
    requiredCodeSnippet: 'for step in range(8):\n    move_right()',
    hints: [
      'Python syntax: for step in range(8):',
      'The indented line is the loop body: (4 spaces) move_right()',
      'range(8) generates numbers 0 through 7 — that is 8 iterations.',
    ],
    explanation: 'In Python, for loops use: for variable in range(N): — where N is the number of iterations. The indented block below is the loop body.',
    xpReward: 95,
    coinReward: 70,
    skillRewards: { coding: 45, logic: 20 },
    maxSteps: 14,
  },

  {
    id: 'prog_typed_3',
    number: 172,
    title: 'Crystal Hunt — All Code',
    worldArea: 'academy',
    stageType: 'code',
    conceptSet: 'typed_code',
    learningMode: 'typed',
    progressLabel: 'Set 7 · Typed Code · Mastery Check',
    isMasteryCheck: true,
    story: 'A full multi-step path with turns and crystals — written entirely in code. No hints. No blocks. Just you and the keyboard.',
    objective: 'Write the complete Python code sequence to collect all crystals and reach the goal.',
    gridSize: { width: 6, height: 5 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 5, y: 4 },
    obstacles: [
      { x: 2, y: 1, type: 'wall' },
      { x: 3, y: 3, type: 'wall' },
    ],
    crystals: [
      { x: 2, y: 0, collected: false },
      { x: 5, y: 2, collected: false },
      { x: 1, y: 4, collected: false },
    ],
    allowedControls: ['up', 'down', 'left', 'right'],
    allowedBlocks: ['move_right', 'move_down', 'move_left', 'move_up', 'turn_left', 'turn_right', 'repeat'],
    requiredCodeSnippet: 'move_right()',
    hints: [
      'No hints! Plan your route on paper first, then type the code.',
      'Available functions: move_right(), move_left(), move_up(), move_down()',
      'For loops: for step in range(N): (indented body)',
    ],
    explanation: 'MASTERY: You wrote multi-step code from scratch — no blocks, no arrows, no templates. You are now programming independently!',
    xpReward: 130,
    coinReward: 100,
    skillRewards: { coding: 55, logic: 30, debugging: 15 },
    maxSteps: 30,
  },

  // ══════════════════════════════════════════════════════════════
  //  SET 8 — INDEPENDENT (ZERO SCAFFOLDING)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'prog_indep_1',
    number: 180,
    title: 'The Dark Cave',
    worldArea: 'academy',
    stageType: 'code',
    conceptSet: 'independent',
    learningMode: 'typed',
    progressLabel: 'Set 8 · Independent · Mission 1',
    story: 'Pebble enters a dark cave. No guidance. You know the functions and the goal. Write the full solution independently.',
    objective: 'Write any valid code solution to guide Pebble from start to goal while collecting all crystals.',
    gridSize: { width: 6, height: 6 },
    startPos: { x: 0, y: 0 },
    startDir: 'right',
    goalPos: { x: 5, y: 5 },
    obstacles: [
      { x: 2, y: 0, type: 'wall' },
      { x: 2, y: 1, type: 'wall' },
      { x: 0, y: 3, type: 'wall' },
      { x: 3, y: 4, type: 'wall' },
      { x: 4, y: 2, type: 'wall' },
    ],
    crystals: [
      { x: 1, y: 2, collected: false },
      { x: 4, y: 1, collected: false },
      { x: 3, y: 5, collected: false },
    ],
    allowedControls: ['up', 'down', 'left', 'right'],
    allowedBlocks: ['move_right', 'move_left', 'move_up', 'move_down', 'repeat', 'turn_left', 'turn_right'],
    requiredCodeSnippet: 'move_right()',
    hints: [],
    explanation: 'You solved this completely on your own. This is what real programming looks like — a problem, a set of tools, and your own thinking.',
    xpReward: 150,
    coinReward: 115,
    skillRewards: { coding: 60, logic: 35, debugging: 20 },
    maxSteps: 35,
  },

  // ══════════════════════════════════════════════════════════════
  //  SET 9 — SCENARIOS (REAL-WORLD CODING CHALLENGES)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'prog_scenario_1',
    number: 190,
    title: 'The Temperature Monitor',
    worldArea: 'academy',
    stageType: 'code',
    conceptSet: 'scenario',
    learningMode: 'scenario',
    progressLabel: 'Set 9 · Scenarios · Mission 1',
    story: 'A weather station needs code to classify temperatures. Above 30 is HOT, 15-30 is WARM, below 15 is COLD.',
    objective: 'Write a Python function that takes a temperature and returns "HOT", "WARM", or "COLD".',
    gridSize: { width: 5, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 4, y: 1 },
    obstacles: [],
    crystals: [],
    allowedControls: [],
    allowedBlocks: [],
    scenarioChallenge: {
      scenarioTitle: 'Temperature Classifier',
      scenarioDescription:
        'A smart weather station needs a function to classify temperatures.\n\n' +
        'Rules:\n' +
        '- temperature > 30  =>  return "HOT"\n' +
        '- 15 <= temperature <= 30  =>  return "WARM"\n' +
        '- temperature < 15  =>  return "COLD"\n\n' +
        'Test it with: 35, 22, and 8.',
      starterCode:
        '# Weather Station Temperature Classifier\n\n' +
        'def classify_temperature(temp):\n' +
        '    # TODO: write your if/elif/else here\n' +
        '    pass\n\n' +
        '# Test your function:\n' +
        'print(classify_temperature(35))  # Expected: HOT\n' +
        'print(classify_temperature(22))  # Expected: WARM\n' +
        'print(classify_temperature(8))   # Expected: COLD\n',
      expectedOutput: ['HOT', 'WARM', 'COLD'],
      hints: [
        'Use if / elif / else — three branches for three cases.',
        'if temp > 30: return "HOT"',
        'elif temp >= 15: return "WARM"',
        'else: return "COLD"',
      ],
      concept: 'conditions',
    },
    hints: [
      'Use if / elif / else to handle all three temperature ranges.',
      'The function must RETURN a string, not print it directly.',
      'Test all three cases to make sure your logic is correct.',
    ],
    explanation: 'You just wrote a real-world function using conditions! Weather apps, thermostats, and climate systems all use this exact pattern.',
    xpReward: 150,
    coinReward: 120,
    skillRewards: { coding: 55, logic: 30 },
    maxSteps: 30,
  },

  {
    id: 'prog_scenario_2',
    number: 191,
    title: 'Shopping Cart Total',
    worldArea: 'academy',
    stageType: 'code',
    conceptSet: 'scenario',
    learningMode: 'scenario',
    progressLabel: 'Set 9 · Scenarios · Mission 2',
    story: 'An online shop needs a program to calculate the total price of items, applying a 10% discount if the total exceeds 50.',
    objective: 'Write a Python function that accepts a list of prices and returns the discounted total.',
    gridSize: { width: 5, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 4, y: 1 },
    obstacles: [],
    crystals: [],
    allowedControls: [],
    allowedBlocks: [],
    scenarioChallenge: {
      scenarioTitle: 'Shopping Cart Calculator',
      scenarioDescription:
        'Write a function that:\n' +
        '1. Accepts a list of item prices.\n' +
        '2. Calculates the total.\n' +
        '3. Applies a 10% discount IF the total is over 50.\n' +
        '4. Returns the final total (rounded to 2 decimal places).\n\n' +
        'Test cases:\n' +
        '- [10, 20, 30] => total = 60 => with discount => 54.0\n' +
        '- [5, 10, 15]  => total = 30 => no discount   => 30.0',
      starterCode:
        '# Shopping Cart Calculator\n\n' +
        'def calculate_total(prices):\n' +
        '    total = 0\n' +
        '    # TODO: loop through prices and add each to total\n\n' +
        '    # TODO: check condition and apply 10% discount if total > 50\n\n' +
        '    return round(total, 2)\n\n' +
        '# Tests:\n' +
        'print(calculate_total([10, 20, 30]))  # Expected: 54.0\n' +
        'print(calculate_total([5, 10, 15]))   # Expected: 30.0\n',
      expectedOutput: ['54.0', '30.0'],
      hints: [
        'Use a for loop: for price in prices: total += price',
        'Then check: if total > 50: total = total * 0.9',
        'Finally: return round(total, 2)',
      ],
      concept: 'loops',
    },
    hints: [
      'Loop through the list of prices to sum them.',
      'Apply 10% discount: total = total * 0.9',
      'Use round(total, 2) to get exactly 2 decimal places.',
    ],
    explanation: 'You combined loops, conditions, and arithmetic to solve a real e-commerce problem. Every online store uses exactly this logic!',
    xpReward: 170,
    coinReward: 135,
    skillRewards: { coding: 60, logic: 35 },
    maxSteps: 30,
  },

  {
    id: 'prog_scenario_3',
    number: 192,
    title: 'Pet Health Monitor',
    worldArea: 'academy',
    stageType: 'code',
    conceptSet: 'scenario',
    learningMode: 'scenario',
    progressLabel: 'Set 9 · Scenarios · Final Challenge',
    isMasteryCheck: true,
    story: 'Design a simple health monitoring system for Pebble. Track hunger and happiness. Write methods to feed and play with Pebble, and report its status.',
    objective: 'Write a complete Python program with a Pet class, methods for feed() and play(), and a status() report.',
    gridSize: { width: 5, height: 3 },
    startPos: { x: 0, y: 1 },
    startDir: 'right',
    goalPos: { x: 4, y: 1 },
    obstacles: [],
    crystals: [],
    allowedControls: [],
    allowedBlocks: [],
    scenarioChallenge: {
      scenarioTitle: 'Pebble Health Monitor',
      scenarioDescription:
        'Design a Pet health monitor system:\n\n' +
        '- A Pet starts with hunger=50, happiness=50 (scale 0-100).\n' +
        '- feed() decreases hunger by 20 (min 0), increases happiness by 10 (max 100).\n' +
        '- play() increases happiness by 20 (max 100).\n' +
        '- status() prints: "Hunger: X | Happiness: Y | Mood: Z"\n' +
        '  Mood = "Happy" if happiness > 70, "Okay" if > 40, else "Sad".\n\n' +
        'Test:\n' +
        'pebble = Pet()\n' +
        'pebble.feed()\n' +
        'pebble.play()\n' +
        'pebble.status()  # Expected: Hunger: 30 | Happiness: 80 | Mood: Happy',
      starterCode:
        '# Pebble Health Monitor\n\n' +
        'class Pet:\n' +
        '    def __init__(self):\n' +
        '        self.hunger = 50\n' +
        '        self.happiness = 50\n\n' +
        '    def feed(self):\n' +
        '        # TODO: decrease hunger by 20 (min 0)\n' +
        '        # TODO: increase happiness by 10 (max 100)\n' +
        '        pass\n\n' +
        '    def play(self):\n' +
        '        # TODO: increase happiness by 20 (max 100)\n' +
        '        pass\n\n' +
        '    def status(self):\n' +
        '        # TODO: determine mood and print status\n' +
        '        pass\n\n' +
        '# Test:\n' +
        'pebble = Pet()\n' +
        'pebble.feed()\n' +
        'pebble.play()\n' +
        'pebble.status()\n',
      expectedOutput: ['Hunger: 30 | Happiness: 80 | Mood: Happy'],
      hints: [
        'self.hunger = max(0, self.hunger - 20)',
        'self.happiness = min(100, self.happiness + 10)',
        'For mood: if self.happiness > 70: mood = "Happy"',
        'print(f"Hunger: {self.hunger} | Happiness: {self.happiness} | Mood: {mood}")',
      ],
      concept: 'functions',
    },
    hints: [
      'This is an Object-Oriented Programming challenge — the Pet is a CLASS.',
      'Use self to access instance variables inside methods.',
      'Use min() and max() to clamp values: max(0, value) ensures no negatives.',
    ],
    explanation: 'FINAL MASTERY: You wrote a class with attributes and methods — the foundation of Object-Oriented Programming (OOP). Every modern app is built with OOP!',
    xpReward: 250,
    coinReward: 200,
    skillRewards: { coding: 80, logic: 50, creativity: 30 },
    maxSteps: 30,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getProgressiveMissionById(id: string): MissionDefinition | undefined {
  return PROGRESSIVE_MISSIONS.find((m) => m.id === id);
}

export function getMissionsByConceptSet(concept: string): MissionDefinition[] {
  return PROGRESSIVE_MISSIONS.filter((m) => m.conceptSet === concept);
}

export function getMissionsByLearningMode(mode: string): MissionDefinition[] {
  return PROGRESSIVE_MISSIONS.filter((m) => m.learningMode === mode);
}

/** Ordered list of concept sets as they appear in the progression */
export const CONCEPT_SET_ORDER = [
  'sequence',
  'variables',
  'conditions',
  'loops',
  'functions',
  'debugging',
  'pseudocode',
  'typed_code',
  'independent',
  'scenario',
] as const;

export const CONCEPT_SET_LABELS: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  sequence:    { label: 'Sequence',    icon: '➡️',  color: '#3b82f6', desc: 'Execute steps in order' },
  variables:   { label: 'Variables',   icon: '📦',  color: '#8b5cf6', desc: 'Store & track values' },
  conditions:  { label: 'Conditions',  icon: '🔀',  color: '#f59e0b', desc: 'Make decisions with if/else' },
  loops:       { label: 'Loops',       icon: '🔄',  color: '#10b981', desc: 'Repeat actions efficiently' },
  functions:   { label: 'Functions',   icon: '⚙️',  color: '#ec4899', desc: 'Name and reuse code blocks' },
  debugging:   { label: 'Debugging',   icon: '🐛',  color: '#ef4444', desc: 'Find and fix broken code' },
  pseudocode:  { label: 'Pseudocode',  icon: '📝',  color: '#6366f1', desc: 'Plan code in plain language' },
  typed_code:  { label: 'Typed Code',  icon: '💻',  color: '#0ea5e9', desc: 'Write real code from scratch' },
  independent: { label: 'Independent', icon: '🚀',  color: '#f97316', desc: 'Solve with zero scaffolding' },
  scenario:    { label: 'Scenarios',   icon: '🌍',  color: '#14b8a6', desc: 'Apply coding to real problems' },
};
