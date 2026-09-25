import type { GridPos, CommunityProblem, GridObstacle, GridSwitch } from '@/types/game';
import type { Contact } from '@/types/database';

export interface OpponentArenaConfig {
  arenaName: string;
  themeTag: string;
  gridSize: { width: number; height: number };
  startPos: GridPos;
  startDir: 'right' | 'down' | 'left' | 'up';
  goalPos: GridPos;
  obstacles: Array<{ x: number; y: number; type: 'wall' | 'water' | 'gate'; id?: string; isOpen?: boolean }>;
  crystals: Array<{ x: number; y: number }>;
  switches?: Array<{ x: number; y: number; targetGateId?: string }>;
  botPath: GridPos[];
}

function generateBotPath(start: GridPos, goal: GridPos, width: number, height: number): GridPos[] {
  const path: GridPos[] = [{ ...start }];
  let currX = start.x;
  let currY = start.y;

  while (currX !== goal.x || currY !== goal.y) {
    if (currX < goal.x) currX++;
    else if (currX > goal.x) currX--;
    else if (currY < goal.y) currY++;
    else if (currY > goal.y) currY--;

    path.push({ x: currX, y: currY });
  }

  return path;
}

export function getArenaForContact(
  contact: Contact | { friend_name: string; id?: string },
  communityProblems?: CommunityProblem[]
): OpponentArenaConfig {
  const contactId = (contact as any)?.id || '';

  // Check if this contact represents a community level
  if (communityProblems && communityProblems.length > 0) {
    const matchedProblem = communityProblems.find(
      (p) => p.id === contactId || `comm_${p.id}` === contactId
    );

    if (matchedProblem) {
      const g = matchedProblem.grid;
      return {
        arenaName: `${matchedProblem.title}`,
        themeTag: `🌐 Community (${matchedProblem.difficulty.toUpperCase()}) · By ${matchedProblem.creatorName}`,
        gridSize: { width: g.width, height: g.height },
        startPos: { ...g.start },
        startDir: 'right',
        goalPos: { ...g.goal },
        obstacles: g.obstacles || [],
        crystals: (g.crystals || []).map((c) => ({ x: c.x, y: c.y })),
        switches: g.switches || [],
        botPath: generateBotPath(g.start, g.goal, g.width, g.height),
      };
    }
  }

  const name = (contact.friend_name || '').toLowerCase();
  if (name.includes('nova')) {
    return {
      arenaName: 'Cyber Matrix Circuit',
      themeTag: '⚡ High-Speed Sprint',
      gridSize: { width: 5, height: 5 },
      startPos: { x: 0, y: 0 },
      startDir: 'right',
      goalPos: { x: 4, y: 4 },
      obstacles: [
        { x: 2, y: 1, type: 'wall' },
        { x: 2, y: 2, type: 'wall' },
        { x: 2, y: 3, type: 'wall' },
      ],
      crystals: [
        { x: 1, y: 3 },
        { x: 3, y: 1 },
      ],
      botPath: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
        { x: 1, y: 4 },
        { x: 2, y: 4 },
        { x: 3, y: 4 },
        { x: 4, y: 4 },
      ],
    };
  }
  if (name.includes('pixel')) {
    return {
      arenaName: 'Bunny Burrow Sprint',
      themeTag: '🐰 Diagonal Agility',
      gridSize: { width: 5, height: 5 },
      startPos: { x: 0, y: 4 },
      startDir: 'right',
      goalPos: { x: 4, y: 0 },
      obstacles: [
        { x: 1, y: 3, type: 'water' },
        { x: 2, y: 2, type: 'wall' },
        { x: 3, y: 1, type: 'water' },
      ],
      crystals: [
        { x: 0, y: 1 },
        { x: 4, y: 3 },
      ],
      botPath: [
        { x: 0, y: 4 },
        { x: 1, y: 4 },
        { x: 2, y: 4 },
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 4, y: 3 },
        { x: 4, y: 2 },
        { x: 4, y: 1 },
        { x: 4, y: 0 },
      ],
    };
  }
  if (name.includes('cyber')) {
    return {
      arenaName: 'Firewall Slalom Arena',
      themeTag: '🛡️ Barrier Navigation',
      gridSize: { width: 6, height: 5 },
      startPos: { x: 0, y: 2 },
      startDir: 'right',
      goalPos: { x: 5, y: 2 },
      obstacles: [
        { x: 2, y: 0, type: 'wall' },
        { x: 2, y: 1, type: 'wall' },
        { x: 2, y: 2, type: 'wall' },
        { x: 4, y: 2, type: 'wall' },
        { x: 4, y: 3, type: 'wall' },
        { x: 4, y: 4, type: 'wall' },
      ],
      crystals: [
        { x: 2, y: 4 },
        { x: 4, y: 0 },
      ],
      botPath: [
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
        { x: 5, y: 2 },
      ],
    };
  }

  // Generative arena for any custom contact added by user
  const code = (contact.friend_name || 'bot').charCodeAt(0);
  const isAlt = code % 2 === 1;
  return {
    arenaName: `${contact.friend_name}'s Logic Colosseum`,
    themeTag: '⚔️ Custom Logic Duel',
    gridSize: { width: 5, height: 5 },
    startPos: isAlt ? { x: 0, y: 0 } : { x: 0, y: 4 },
    startDir: 'right',
    goalPos: isAlt ? { x: 4, y: 4 } : { x: 4, y: 0 },
    obstacles: isAlt
      ? [{ x: 1, y: 2, type: 'wall' }, { x: 3, y: 2, type: 'wall' }]
      : [{ x: 2, y: 1, type: 'wall' }, { x: 2, y: 3, type: 'wall' }],
    crystals: isAlt
      ? [{ x: 2, y: 0 }, { x: 2, y: 4 }]
      : [{ x: 0, y: 2 }, { x: 4, y: 2 }],
    botPath: [
      isAlt ? { x: 0, y: 0 } : { x: 0, y: 4 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      isAlt ? { x: 4, y: 4 } : { x: 4, y: 0 },
    ],
  };
}
