import type { MissionDefinition, VisualBlock, BugExchangeItem } from '@/types/game';

export interface AIHintResponse {
  hintLevel: number;
  title: string;
  hintText: string;
  suggestedAction?: string;
}

export interface AdaptiveProfile {
  consecutiveFails: number;
  totalAttempts: number;
  totalHintsUsed: number;
  averageSolveTime: number;
  difficultyPreference: 'gentle' | 'normal' | 'challenging';
}

class AIGameMasterService {
  /**
   * Generates progressive, 3-tier hints without giving away the full answer immediately
   */
  public getProgressiveHint(
    mission: MissionDefinition,
    currentBlocks: VisualBlock[],
    currentLevel: number,
    lastError?: string
  ): AIHintResponse {
    const level = Math.min(Math.max(currentLevel, 1), 3);

    if (mission.stageType === 'break_fix') {
      if (level === 1) {
        return {
          hintLevel: 1,
          title: 'Observe Step by Step 🔍',
          hintText: lastError
            ? `Notice what happened right before: "${lastError}". Look at the step sequence.`
            : 'Run the program once and watch where the pet deviates from the open path.',
          suggestedAction: 'Trace the first 2 blocks carefully.',
        };
      }
      if (level === 2) {
        return {
          hintLevel: 2,
          title: 'Inspect the Flawed Block 🛠️',
          hintText:
            mission.brokenTargetBlockIndex !== undefined
              ? `Block #${mission.brokenTargetBlockIndex + 1} is telling the pet to take an impossible step.`
              : 'One of the direction blocks needs to be switched with a turn command.',
          suggestedAction: 'Swap the faulty block for a turn block.',
        };
      }
      return {
        hintLevel: 3,
        title: 'Precise Logic Fix 💡',
        hintText: mission.hints[2] || 'Replace the colliding action with a Turn Right, then Move Forward.',
        suggestedAction: 'Apply the suggested replacement and press Run.',
      };
    }

    // Default mission hints
    const defaultHints = mission.hints || [
      'Take a look at your destination and count the tiles.',
      'Check if you need to turn or interact with a switch.',
      'Ensure every crystal is collected before stepping onto the altar.',
    ];

    const hintIndex = Math.min(level - 1, defaultHints.length - 1);
    return {
      hintLevel: level,
      title: level === 1 ? 'Gentle Clue 🌱' : level === 2 ? 'Strategic Insight 🧭' : 'Master Blueprint ⚡',
      hintText: defaultHints[hintIndex],
    };
  }

  /**
   * Generates a warm, beginner-friendly diagnostic explanation of a collision or logic mistake
   */
  public explainFailure(errorMessage: string, petStage: string): string {
    if (errorMessage.includes('boundary') || errorMessage.includes('Boundary')) {
      return `Your pet trotted right off the edge of the board! In logic, computers follow instructions literally — so we need a turn command before reaching the border.`;
    }
    if (errorMessage.includes('wall') || errorMessage.includes('stone')) {
      return `Bonk! Your pet bumped into a solid obstacle. The path is blocked ahead, so inspect which step led here and steer around it.`;
    }
    if (errorMessage.includes('water') || errorMessage.includes('deep')) {
      return `Splash! Water tiles block standard walking. You can either path around or use a Jump block if unlocked.`;
    }
    if (errorMessage.includes('gate') || errorMessage.includes('locked')) {
      return `The ancient gate is firmly locked! Look around for a glowing floor switch and trigger it with the Interact action.`;
    }
    if (errorMessage.includes('crystal')) {
      return `Almost there! Your pet reached the goal, but the portal won't activate until all energy crystals are gathered.`;
    }
    return `Every great programmer learns by testing and refining. Let's adjust our instructions and try once more!`;
  }

  /**
   * Procedurally generates a unique adaptive mission narrative
   */
  public generateProceduralMission(topic: 'forest' | 'city' | 'dungeon' | 'cyber'): Partial<MissionDefinition> {
    const titles = {
      forest: 'Whispering Canopy Trail',
      city: 'Solar Transit Automation',
      dungeon: 'Glitched Rune Vault',
      cyber: 'Quantum Core Relay',
    };

    const stories = {
      forest: 'A hidden grove has blossomed with energy crystals. Guide your pet through the leafy corridors.',
      city: 'The evening commuter pods are gridlocked. Optimize the transit signal sequences to restore traffic flow.',
      dungeon: 'An ancient logic trap has inverted the directions of the corridor. Discover the pattern to unlock the vault.',
      cyber: 'Data packets are scattering across the matrix. Chain sequential logic commands to stabilize the core.',
    };

    return {
      title: titles[topic],
      story: stories[topic],
      xpReward: 90,
      coinReward: 75,
    };
  }

  /**
   * Generates dynamic bug challenge clue
   */
  public generateBugChallengeClue(bug: BugExchangeItem): string {
    return `Game Master Analysis: "${bug.creatorName}" crafted this puzzle. ${bug.clue}`;
  }
}

export const aiGameMaster = new AIGameMasterService();
