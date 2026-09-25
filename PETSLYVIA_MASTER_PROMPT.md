# PETSLYVIA MASTER SYSTEM SPECIFICATION & PROMPT

---

## 119. PROGRESSIVE CODING & SCENARIO MISSION SYSTEM

Add a structured mission system that takes a player from complete beginner with zero coding knowledge to writing basic real code independently.

This system is extremely important because early arrow-based gameplay or automatically generated code must not be the final learning method.

The player must gradually move from:

GAME ACTIONS
↓
LOGIC
↓
VISUAL BLOCKS
↓
PROGRAMMING CONCEPTS
↓
DEBUGGING
↓
PSEUDOCODE
↓
PLAYER-TYPED CODE
↓
SCENARIO-BASED CODING

The player must eventually solve problems without automatically generated solutions.

---

## 120. IMPORTANT EDUCATIONAL RULE

Arrows, guided actions, and automatically generated code are only beginner scaffolding.

They are NOT the complete learning system.

The player must progressively become responsible for creating the solution.

Use this progression:

LEVEL 1 — GUIDED

The player follows simple game actions.

Example:

MOVE
TURN
MOVE

Goal:

Understand that actions happen in an order.

---

LEVEL 2 — VISUAL LOGIC

The player arranges logic blocks themselves.

Example:

MOVE
↓
TURN RIGHT
↓
MOVE

The system should no longer automatically create the complete solution.

---

LEVEL 3 — PROGRAMMING CONCEPTS

Introduce concepts one at a time:

SEQUENCE
↓
VARIABLES
↓
CONDITIONS
↓
LOOPS
↓
FUNCTIONS
↓
DEBUGGING

---

LEVEL 4 — PSEUDOCODE

Ask the player to describe the solution using simple programming-like instructions.

Example:

IF light is green
    MOVE
ELSE
    STOP

---

LEVEL 5 — PLAYER-TYPED CODE

The player must write their own code.

Do NOT automatically generate the final answer.

Provide only:

- Problem
- Scenario
- Available actions/functions
- Input information
- Expected behavior
- Optional progressive hints

The player writes the solution.

---

LEVEL 6 — INDEPENDENT SCENARIO

Give the player a new scenario using previously learned concepts.

The player must determine:

- What information to store
- What condition is needed
- Whether repetition is needed
- Whether a function is useful
- How to debug the solution

The challenge should test understanding rather than memorization.

---

## 121. MISSION STRUCTURE

Create multiple mission sets.

Do NOT limit coding learning to only Missions 1–10.

Use the following progression.

---

### SET 0 — COMMANDS & SEQUENCE

Purpose:

Teach that computers follow instructions in order.

Mission 1 — Pet Home

Difficulty: EASY

Help the pet reach home.

Concept:
Sequence

Mission 2 — Crystal Hunt

Difficulty: EASY

Collect crystals and return.

Concept:
Ordered actions

Mission 3 — Gate Keeper

Difficulty: MEDIUM

Activate a switch and open a gate.

Concept:
Action → Result

Mission 4 — Robot Delivery

Difficulty: MEDIUM

Guide the robot to the correct destination.

Concept:
Planning + sequence

Mission 5 — Bridge Crossing

Difficulty: HARD

Navigate several obstacles.

Concept:
Multi-step planning

Mission 6 — Treasure Route

Difficulty: COMPLEX

Plan a longer route with multiple decisions.

Concept:
Complex sequence

---

### SET 1 — VARIABLES

Teach:

«“A variable is information the program remembers.”»

Mission 1 — Crystal Counter

EASY

Count collected crystals.

Example:

crystals = 0

Mission 2 — Food Counter

EASY

Count food items collected for the pet.

Mission 3 — Key Status

MEDIUM

Track whether the player has a key.

has_key = False

Mission 4 — Coin Wallet

MEDIUM

Track coins after purchases.

Mission 5 — Robot Energy

HARD

Track robot energy while moving.

Mission 6 — Inventory System

COMPLEX

Track multiple values:

- crystals
- coins
- keys
- energy

The player should understand how changing data affects the game.

---

### SET 2 — CONDITIONS

Teach:

«“The program can make a decision.”»

Mission 1 — Red Light

EASY

If red → stop.

Mission 2 — Green Light

EASY

If green → move.

Mission 3 — Locked Door

MEDIUM

If player has key → open.

Otherwise → find key.

Mission 4 — Hungry Pet

MEDIUM

If hungry → feed.

Otherwise → play.

Mission 5 — Weather Robot

HARD

Different behavior for:

- sunny
- rain
- storm

Mission 6 — Emergency Vehicle

COMPLEX

Give priority to emergency vehicles.

Concepts:

- IF
- ELSE
- Boolean decisions
- Multiple conditions

---

### SET 3 — LOOPS

Teach:

«“Instead of writing the same instruction repeatedly, we can repeat it.”»

Mission 1 — Collect 3 Crystals

EASY

Mission 2 — Water 5 Plants

EASY

Mission 3 — Robot Checkpoints

MEDIUM

Visit multiple checkpoints.

Mission 4 — Factory Conveyor

MEDIUM

Process multiple packages.

Mission 5 — Reach the Goal

HARD

Repeat movement until the destination is reached.

Mission 6 — Smart Farm

COMPLEX

Repeat actions while responding to changing conditions.

Teach:

- for
- while
- repetition
- stopping conditions
- break where appropriate

---

### SET 4 — FUNCTIONS

Teach:

«“A function is a reusable group of instructions.”»

Mission 1 — Open Gate

EASY

Create:

open_gate()

Mission 2 — Feed Pet

EASY

Create:

feed_pet()

Mission 3 — Deliver Package

MEDIUM

Create:

deliver_package()

Mission 4 — Rescue

MEDIUM

Create a reusable rescue routine.

Mission 5 — Smart Traffic

HARD

Create reusable traffic-control behavior.

Mission 6 — City Controller

COMPLEX

Use multiple functions together.

Later introduce:

- parameters
- return values

---

### SET 5 — DEBUGGING

The player must stop being only a builder and become a debugger.

Flow:

OBSERVE
↓
FIND
↓
CHANGE
↓
RUN
↓
VERIFY

Mission 1 — Wrong Direction

EASY

Expected RIGHT.

Actual LEFT.

Mission 2 — Wrong Variable

EASY

Find incorrect stored value.

Mission 3 — Broken Condition

MEDIUM

Incorrect IF/ELSE behavior.

Mission 4 — Broken Loop

MEDIUM

Loop repeats too many/few times.

Mission 5 — Broken Function

HARD

Function performs the wrong action.

Mission 6 — Smart City Bug

COMPLEX

Multiple connected rules contain errors.

The player must identify the actual cause rather than receive the answer immediately.

---

### SET 6 — COMBINED LOGIC

Now combine learned concepts.

Mission 1 — Pet Rescue

MEDIUM

Variables + conditions.

Mission 2 — Crystal Collector

HARD

Variables + loops.

Mission 3 — Robot Delivery

HARD

Sequence + functions + conditions.

Mission 4 — Smart Farm

HARD

Variables + loops + conditions.

Mission 5 — Emergency City

COMPLEX

Variables + conditions + loops + functions.

Mission 6 — Complete City Controller

COMPLEX

Combine all previously learned concepts.

The system should measure which concepts the player actually uses.

---

### SET 7 — FIRST PLAYER-TYPED CODE

This is a critical stage.

Remove most visual assistance.

The player must write their own basic code.

Do NOT automatically generate the final solution.

---

Mission 1 — Robot Movement

Task:

«“Write a program that moves the robot to the charging station.”»

The player types the solution.

---

Mission 2 — Crystal Collector

Task:

«“Collect exactly five crystals.”»

Expected concept:

Loop

---

Mission 3 — Locked Door

Task:

«“Open the door only when the player has the key.”»

Expected concept:

Condition

---

Mission 4 — Hungry Pet

Task:

«“Feed the pet when it is hungry.”»

Expected concept:

IF / ELSE

---

Mission 5 — Package Delivery

Task:

«“Create a reusable function that delivers a package.”»

Expected concept:

Function

---

Mission 6 — Smart Traffic

Task:

«“Control the car based on the traffic signal.”»

Expected concepts:

Condition + function

---

### SET 8 — SCENARIO CODING

Now stop giving isolated programming questions.

Every challenge should happen inside a meaningful scenario.

Examples:

Smart City

Control traffic.

Rescue

Find a safe route.

Factory

Control machines.

Security

Respond to suspicious activity.

Smart Home

Control devices.

Pet Care

Manage feeding/rest/play.

Emergency Response

Prioritize urgent vehicles.

Robot Delivery

Route packages correctly.

The player must understand the scenario before deciding what code to write.

---

### SET 9 — INDEPENDENT CODING CHALLENGES

At this stage:

Do not tell the player which programming concept to use.

Do not say:

«“Use a loop.”»

Instead say:

«“The robot must inspect every checkpoint until it reaches the station.”»

The player must decide that a loop is appropriate.

Similarly, instead of:

«“Use IF.”»

Say:

«“The door should open only when the key is present.”»

The player must determine the logic.

This tests actual programming understanding.

---

### SET 10 — FINAL BOSS CODING MISSIONS

Create larger beginner-friendly scenarios.

BOSS 1 — Emergency Traffic

The player controls vehicles and traffic signals.

Requires:

- variables
- conditions
- loops
- functions
- debugging

---

BOSS 2 — Robot Rescue

Robot must:

- find route
- avoid obstacles
- collect equipment
- reach target
- return safely

---

BOSS 3 — Smart Factory

Manage:

- machines
- package counts
- machine states
- repeated operations
- failures

---

BOSS 4 — Smart City

Control:

- multiple intersections
- vehicles
- traffic states
- emergency vehicles

---

BOSS 5 — CREATE + CODE

The player creates a small challenge and then writes the logic/code required to solve it.

---

## 122. DIFFICULTY SYSTEM

Every mission should have:

EASY 🟢

One main concept.

Example:

«Count three crystals.»

MEDIUM 🔵

Two concepts.

Example:

«Use a variable and condition.»

HARD 🔴

Several concepts.

Example:

«Variable + loop + condition.»

COMPLEX 🟣

Multiple concepts inside a realistic scenario.

Example:

«Control a traffic system using variables, loops, conditions, and functions.»

Allow multiple difficulty versions of the same scenario.

---

## 123. HINT SYSTEM FOR CODE

When the player gets stuck, do not immediately generate the solution.

Use progressive hints.

Hint 1

Ask what needs to happen.

Hint 2

Point toward the relevant game state.

Hint 3

Suggest the programming concept.

Hint 4

Show a small syntax example.

Final explanation

Explain the solution after the player's attempts/hints.

The system should track hint usage.

---

## 124. CODE EVALUATION

When the player writes code:

PLAYER CODE
↓
SECURE SANDBOX
↓
TEST CASES
↓
DETERMINISTIC RESULT
↓
PASS / FAIL

Show beginner-friendly feedback.

Example:

❌ Not yet.

The robot reached checkpoint 3,
but it never returned to the station.

Think about what should repeat.

Do not simply say:

«ERROR.»

---

## 125. CODE CHALLENGE VARIATIONS

Avoid memorization.

Generate or provide variations of the same concept.

For example:

Sequence:

- Robot
- Pet
- Factory

Loop:

- Crystals
- Plants
- Packages

Condition:

- Traffic
- Door
- Weather

Function:

- Gate
- Rescue
- Delivery

This helps test whether the player understands the concept instead of remembering one answer.

---

## 126. PLAYER PROGRESSION TRACKING

Track:

- concepts discovered
- concepts practiced
- concepts mastered
- coding attempts
- debugging attempts
- hints used
- errors
- completion time
- difficulty
- repeated mistakes
- improvement
- challenge completion

Use this for adaptive learning.

---

## 127. LEARNING ANALYTICS

The Learning System & Analytics module should track how the player progresses from:

GUIDED
↓
VISUAL
↓
CONCEPT
↓
DEBUGGING
↓
PSEUDOCODE
↓
TYPED CODE
↓
INDEPENDENT CODING

Analytics should allow the system to determine:

- Which concepts the player understands
- Which concepts they struggle with
- Whether they can apply concepts in new scenarios
- Whether they can debug independently
- Whether they can write code without visual guidance

Do not claim mastery simply because a player completed a lesson.

---

## 128. ANTI-AUTOMATION LEARNING RULE

Do NOT automatically solve everything for the player.

The system may provide:

- guidance
- visual examples
- hints
- partial scaffolding

But progressively remove assistance.

Example:

BEGINNER
100% guidance

INTERMEDIATE
partial guidance

ADVANCED
minimal guidance

CODING CHALLENGE
player creates the solution

---

## 129. THE FINAL LEARNING CHECK

Before unlocking more advanced coding stages, require the player to demonstrate understanding through actual tasks.

For example:

To unlock a loop challenge:

- Solve several repetition problems.

To unlock conditions:

- Demonstrate decision-making.

To unlock functions:

- Successfully reuse logic.

To unlock typed coding:

- Complete visual logic and debugging challenges.

To unlock advanced coding:

- Successfully write and debug beginner programs.

The exact thresholds should be configurable.

---

## 130. CORE EDUCATIONAL JOURNEY

PETSLYVIA must ultimately provide:

PLAY
↓
UNDERSTAND ACTIONS
↓
SEQUENCE
↓
VARIABLES
↓
CONDITIONS
↓
LOOPS
↓
FUNCTIONS
↓
DEBUGGING
↓
COMBINED LOGIC
↓
PSEUDOCODE
↓
TYPE CODE
↓
DEBUG CODE
↓
SOLVE NEW SCENARIOS
↓
CREATE
↓
BUILD REAL PROJECTS

This progression must ensure that PETSLYVIA teaches both computational thinking and actual programming/coding skills.

---

## 131. FINAL JURY-PROOF REQUIREMENT

The system must directly answer the question:

«“If the player only uses arrows or automatically generated code, how will they learn programming?”»

PETSLYVIA must demonstrate:

ARROWS
→ beginner scaffolding

VISUAL BLOCKS
→ player builds logic

PSEUDOCODE
→ player expresses the solution

TYPED CODE
→ player writes the program

DEBUGGING
→ player fixes their own program

SCENARIOS
→ player applies coding to new problems

The player must eventually think, write, run, debug, and complete the code themselves.

Never claim that simply moving a pet left or right teaches complete programming.

The early gameplay exists to create the bridge into programming.

---
