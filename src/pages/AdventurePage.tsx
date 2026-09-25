import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Hand, Sparkles, CheckCircle2, AlertCircle, Bot, HelpCircle,
  Code2, Plus, Trash2, ChevronRight, Zap, Coins, Terminal, Layout, Box
} from 'lucide-react';
import { MISSIONS_LIST } from '@/data/missions';
import type { MissionDefinition, VisualBlock, SimulationResult, SimulationStep, Direction } from '@/types/game';
import { runDeterministicSimulation } from '@/services/gameEngine';
import { useGameData } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { GameScene3D } from '@/components/game3d/GameScene3D';
import { AIGameMaster } from '@/components/AIGameMaster';
import { AILevelGeneratorModal } from '@/components/AILevelGeneratorModal';
import { sound } from '@/utils/audio';

// Convert VisualBlock array to readable code string
const blocksToCode = (blockList: VisualBlock[], lang: 'python' | 'javascript'): string => {
  if (lang === 'javascript') {
    return blockList
      .map((b) => {
        if (b.type === 'repeat') {
          return `for (let i = 0; i < ${b.params?.count || 3}; i++) {\n  move_forward();\n}`;
        }
        return `${b.type}();`;
      })
      .join('\n');
  }
  return blockList
    .map((b) => {
      if (b.type === 'repeat') {
        return `for step in range(${b.params?.count || 3}):\n    move_forward()`;
      }
      return `${b.type}()`;
    })
    .join('\n');
};

// Parse single line to VisualBlock
const parseSingleLine = (line: string): VisualBlock | null => {
  const clean = line.replace(/;/g, '').replace(/\(\)/g, '').trim().toLowerCase();
  if (clean.includes('move_forward') || clean === 'forward' || clean === 'moveforward') {
    return { id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_forward' };
  }
  if (clean.includes('move_up') || clean === 'up' || clean === 'moveup') {
    return { id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_up' };
  }
  if (clean.includes('move_down') || clean === 'down' || clean === 'movedown') {
    return { id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_down' };
  }
  if (clean.includes('move_left') || clean === 'left' || clean === 'moveleft') {
    return { id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_left' };
  }
  if (clean.includes('move_right') || clean === 'right' || clean === 'moveright') {
    return { id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_right' };
  }
  if (clean.includes('turn_right') || clean === 'turnright' || clean === 'right_turn') {
    return { id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'turn_right' };
  }
  if (clean.includes('turn_left') || clean === 'turnleft' || clean === 'left_turn') {
    return { id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'turn_left' };
  }
  if (clean.includes('interact') || clean.includes('collect') || clean === 'use' || clean === 'press') {
    return { id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'interact' };
  }
  if (clean.includes('jump') || clean.includes('hop')) {
    return { id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'jump' };
  }
  return null;
};

// Parse full code text into array of VisualBlocks
const parseCodeToBlocks = (source: string): VisualBlock[] => {
  const result: VisualBlock[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    // Check for loop header
    const pyLoop = trimmed.match(/for\s+\w+\s+in\s+range\((\d+)\):/i);
    const jsLoop = trimmed.match(/for\s*\(.*;\s*\w+\s*<\s*(\d+);\s*.*\)/i);
    if (pyLoop || jsLoop) {
      const count = parseInt((pyLoop || jsLoop)![1], 10) || 3;
      let bodyFound = false;
      while (i + 1 < lines.length) {
        const nextRaw = lines[i + 1];
        const nextTrim = nextRaw.trim();
        if (nextRaw.startsWith('  ') || nextRaw.startsWith('\t') || (nextTrim && nextTrim !== '}' && !nextTrim.startsWith('for'))) {
          i++;
          const innerBlock = parseSingleLine(nextTrim);
          if (innerBlock) {
            for (let k = 0; k < count; k++) {
              result.push({ ...innerBlock, id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` });
            }
            bodyFound = true;
          }
        } else {
          break;
        }
      }
      if (!bodyFound) {
        for (let k = 0; k < count; k++) {
          result.push({ id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_forward' });
        }
      }
      continue;
    }

    const block = parseSingleLine(trimmed);
    if (block) {
      result.push(block);
    }
  }
  return result;
};

export function AdventurePage() {
  const { profile, pet, progress, completeMission, setPlayerRole } = useGameData();

  const [customAiMission, setCustomAiMission] = useState<MissionDefinition | null>(null);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('mission_1');
  const mission = customAiMission || MISSIONS_LIST.find((m) => m.id === selectedMissionId) || MISSIONS_LIST[0];

  // 3D vs 2D Display mode (Default 3D!)
  const [viewMode3D, setViewMode3D] = useState<boolean>(true);

  // Logic Blocks / Sequence in workspace
  const [blocks, setBlocks] = useState<VisualBlock[]>([]);
  const [repeatCount, setRepeatCount] = useState<number>(3);

  // Active view in workspace: 'visual' or 'code'
  const isCoderMode = profile?.role === 'coder';
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'visual' | 'code'>('visual');
  const [coderLanguage, setCoderLanguage] = useState<'python' | 'javascript'>('python');
  const [rawCodeInput, setRawCodeInput] = useState<string>('');

  // Simulation execution state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Modals
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [showAiLevelModal, setShowAiLevelModal] = useState(false);
  const [lastErrorMsg, setLastErrorMsg] = useState<string | undefined>();

  // Load from sessionStorage if an AI level was created from WorldMap or other pages
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('petslyvia_active_ai_mission');
      if (stored) {
        const parsed = JSON.parse(stored) as MissionDefinition;
        if (parsed && parsed.id) {
          setCustomAiMission(parsed);
          setSelectedMissionId(parsed.id);
          sessionStorage.removeItem('petslyvia_active_ai_mission');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Launch new AI Level
  const handleLaunchAiLevel = (lvl: MissionDefinition) => {
    setCustomAiMission(lvl);
    setSelectedMissionId(lvl.id);
    const initial = lvl.initialBlocks ? [...lvl.initialBlocks] : [];
    setBlocks(initial);
    setRawCodeInput(blocksToCode(initial, coderLanguage));
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setLastErrorMsg(undefined);
  };

  // Reset workspace when mission changes
  useEffect(() => {
    const initial = (mission.initialBlocks && mission.initialBlocks.length > 0)
      ? [...mission.initialBlocks]
      : [];
    setBlocks(initial);
    setRawCodeInput(blocksToCode(initial, coderLanguage));
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setLastErrorMsg(undefined);
  }, [mission.id]);

  // Handle typing directly in the code editor
  const handleCodeChange = (text: string) => {
    setRawCodeInput(text);
    const parsed = parseCodeToBlocks(text);
    setBlocks(parsed);
  };

  // Helper to insert snippet in code editor
  const handleInsertSnippet = (snippet: string) => {
    sound.playSnap();
    const updated = `${rawCodeInput.trimEnd()}\n${snippet}\n`;
    setRawCodeInput(updated);
    const parsed = parseCodeToBlocks(updated);
    setBlocks(parsed);
  };

  // Switch programming language
  const handleSwitchLanguage = (newLang: 'python' | 'javascript') => {
    sound.playClick();
    setCoderLanguage(newLang);
    setRawCodeInput(blocksToCode(blocks, newLang));
  };

  // Handle Add Block from UI Buttons / D-Pad
  const handleAddBlock = (type: VisualBlock['type']) => {
    sound.playSnap();
    const newBlock: VisualBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      params: type === 'repeat' ? { count: repeatCount } : undefined,
    };
    const nextBlocks = [...blocks, newBlock];
    setBlocks(nextBlocks);
    setRawCodeInput(blocksToCode(nextBlocks, coderLanguage));
  };

  // Direct 2D Directional Controls (Up -> move_up, Down -> move_down, Left -> move_left, Right -> move_right)
  const handleDirectControl = (controlType: 'up' | 'down' | 'left' | 'right' | 'interact') => {
    sound.playStep();
    if (controlType === 'up') handleAddBlock('move_up');
    else if (controlType === 'down') handleAddBlock('move_down');
    else if (controlType === 'left') handleAddBlock('move_left');
    else if (controlType === 'right') handleAddBlock('move_right');
    else if (controlType === 'interact') handleAddBlock('interact');
  };

  // Keyboard navigation listener (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in text fields or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleDirectControl('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleDirectControl('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleDirectControl('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleDirectControl('right');
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleDirectControl('interact');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blocks, coderLanguage]);

  // Remove block
  const handleRemoveBlock = (index: number) => {
    sound.playClick();
    const nextBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(nextBlocks);
    setRawCodeInput(blocksToCode(nextBlocks, coderLanguage));
  };

  // Clear workspace
  const handleClearWorkspace = () => {
    sound.playClick();
    setBlocks([]);
    setRawCodeInput('');
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setLastErrorMsg(undefined);
  };

  // Run Simulation
  const handleRunSimulation = () => {
    if (blocks.length === 0) {
      sound.playError();
      setLastErrorMsg('Your logic workspace is empty! Use the directional controls, palette, or code editor to write instructions.');
      return;
    }

    sound.playClick();
    setLastErrorMsg(undefined);
    const result = runDeterministicSimulation(
      mission.gridSize,
      mission.startPos,
      mission.startDir,
      mission.goalPos,
      mission.obstacles,
      mission.crystals,
      mission.switches,
      blocks
    );

    setSimulationResult(result);
    setIsPlaying(true);
    setCurrentStepIndex(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < result.steps.length) {
        setCurrentStepIndex(step);
        sound.playStep();
      } else {
        clearInterval(interval);
        setIsPlaying(false);

        if (result.success) {
          sound.playVictory();
          completeMission(mission.id, mission.xpReward, mission.coinReward, {
            algorithms: 25,
            logic: 30,
          });

          // If Explorer, show Stage 2 Code Reveal modal
          if (profile?.role === 'explorer') {
            setTimeout(() => {
              setShowRevealModal(true);
            }, 500);
          }
        } else {
          sound.playError();
          setLastErrorMsg(result.message);
        }
      }
    }, 400);
  };

  const activeStep: SimulationStep =
    simulationResult && simulationResult.steps[currentStepIndex]
      ? simulationResult.steps[currentStepIndex]
      : {
          stepIndex: 0,
          petPos: mission.startPos,
          petDir: mission.startDir,
          petAction: 'idle',
          crystalsCollected: [],
          openGates: [],
          status: 'running',
          message: 'Ready for simulation',
        };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 rounded-3xl border border-indigo-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-full text-xs font-bold text-indigo-300 mb-2">
            <Sparkles size={14} /> Mission Arena
            {customAiMission && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-[10px] font-black uppercase">
                AI Custom Stage
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{mission.title}</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">{mission.story || (mission as any).description}</p>
        </div>

        {/* Mission Switcher Pills & AI Generator Button */}
        <div className="flex flex-wrap items-center gap-2">
          {customAiMission && (
            <button
              onClick={() => {
                sound.playClick();
                setSelectedMissionId(customAiMission.id);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 border border-purple-400 flex items-center gap-1.5 cursor-pointer"
            >
              <Bot size={13} className="text-amber-300 animate-pulse" />
              AI Active Stage
            </button>
          )}

          {MISSIONS_LIST.filter((m) => m.worldArea === 'logic_forest').map((m, idx) => (
            <button
              key={m.id}
              onClick={() => {
                sound.playClick();
                setCustomAiMission(null);
                setSelectedMissionId(m.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                m.id === selectedMissionId && !customAiMission
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Mission {idx + 1}
            </button>
          ))}

          {/* AI Level Architect Trigger Button */}
          <button
            onClick={() => {
              sound.playClick();
              setShowAiLevelModal(true);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-500/25 border border-indigo-400/50 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Sparkles size={14} className="text-amber-300 animate-bounce" />
            AI Level Architect
          </button>
        </div>
      </div>

      {/* Main Game Grid: 3D Scene (Left) + Direct Controls / Logic Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D WebGL Canvas or 2D Interactive Grid */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-300 font-medium">
              🎯 <strong>Mission Goal:</strong> {mission.objective}
            </div>

            <div className="flex items-center gap-2">
              {/* AI Helper Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowAiHelper(true);
                }}
                className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Bot size={14} /> AI Hint
              </button>

              {/* 3D / 2D Mode Switcher */}
              <button
                onClick={() => {
                  sound.playClick();
                  setViewMode3D((prev) => !prev);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode3D
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <Box size={14} />
                {viewMode3D ? '3D Engine' : '2D View'}
              </button>
            </div>
          </div>

          {/* Humanized Companion Speech Bubble */}
          {pet && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-400/30 flex items-center gap-3 shadow-inner"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-950 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-sm">
                <PetSVG
                  type={pet.pet_type}
                  stage={pet.stage}
                  state={isPlaying ? 'excited' : simulationResult?.success ? 'celebrating' : lastErrorMsg ? 'thinking' : 'happy'}
                  equipped={pet.equipped_items}
                  size={38}
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                  🐾 {pet.pet_name} whispers:
                </span>
                <p className="text-xs text-slate-100 font-medium italic mt-0.5">
                  {isPlaying
                    ? `Running our code step by step... cheering you on! ⚡`
                    : simulationResult?.success
                    ? `Woohoo! We did it, ${profile?.display_name || 'friend'}! That was brilliant! 🌟`
                    : lastErrorMsg
                    ? `Don't worry! Mistakes help us learn. Let's tweak our path and try again! 💪`
                    : `Ready when you are! Tap arrow buttons or write code to guide me! 🚀`}
                </p>
              </div>
            </motion.div>
          )}

          {/* 3D vs 2D Engine Rendering */}
          {viewMode3D ? (
            <GameScene3D
              gridSize={mission.gridSize}
              startPos={mission.startPos}
              goalPos={mission.goalPos}
              obstacles={mission.obstacles}
              crystals={mission.crystals}
              switches={mission.switches}
              activeStep={activeStep}
              petType={pet?.pet_type || 'cat'}
              equipped={pet?.equipped_items}
              theme={mission.worldArea === 'logic_forest' ? 'forest' : 'arena'}
              height="380px"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 min-h-[340px]">
              <div
                className="grid gap-2 p-3 bg-slate-900 rounded-2xl border border-slate-800 relative shadow-inner"
                style={{
                  gridTemplateColumns: `repeat(${mission.gridSize.width}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: mission.gridSize.height }).map((_, row) =>
                  Array.from({ length: mission.gridSize.width }).map((__, col) => {
                    const isPetHere = activeStep.petPos.x === col && activeStep.petPos.y === row;
                    const isGoal = mission.goalPos.x === col && mission.goalPos.y === row;
                    const obstacle = mission.obstacles.find((o) => o.x === col && o.y === row);
                    const isGateOpen =
                      obstacle?.type === 'gate' &&
                      activeStep.openGates.includes(obstacle.id || `${col},${row}`);
                    const crystal = mission.crystals.find((c) => c.x === col && c.y === row);
                    const isCrystalCollected = activeStep.crystalsCollected.some(
                      (c) => c.x === col && c.y === row
                    );
                    const sw = mission.switches?.find((s) => s.x === col && s.y === row);

                    return (
                      <div
                        key={`cell_${col}_${row}`}
                        className={`w-14 h-14 rounded-xl flex items-center justify-center relative transition-all duration-200 ${
                          isGoal
                            ? 'bg-emerald-950/80 border-2 border-emerald-400 shadow-md shadow-emerald-500/20'
                            : obstacle?.type === 'gate'
                            ? isGateOpen
                              ? 'bg-indigo-950/60 border border-emerald-400'
                              : 'bg-rose-950/80 border-2 border-rose-500'
                            : obstacle?.type === 'wall'
                            ? 'bg-slate-800 border border-slate-700'
                            : obstacle?.type === 'water'
                            ? 'bg-sky-950/80 border border-sky-600'
                            : sw
                            ? 'bg-amber-950/60 border border-amber-400'
                            : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Obstacles */}
                        {obstacle?.type === 'wall' && (
                          <span className="text-xl select-none">🧱</span>
                        )}
                        {obstacle?.type === 'water' && (
                          <span className="text-xl select-none">🌊</span>
                        )}
                        {obstacle?.type === 'gate' && (
                          <span className="text-lg">{isGateOpen ? '🟢' : '🔒'}</span>
                        )}

                        {/* Switch */}
                        {sw && (
                          <span className="text-sm font-mono text-amber-300">🔘</span>
                        )}

                        {/* Crystal */}
                        {crystal && !isCrystalCollected && !isPetHere && (
                          <span className="text-lg animate-bounce drop-shadow-md">💎</span>
                        )}

                        {/* Goal Tile */}
                        {isGoal && !isPetHere && (
                          <span className="text-lg">🌟</span>
                        )}

                        {/* Active Pet Companion */}
                        {isPetHere && pet && (
                          <div className="absolute inset-0 flex items-center justify-center z-10">
                            <PetSVG
                              type={pet.pet_type}
                              stage={pet.stage}
                              state={activeStep.status === 'collision' ? 'tired' : activeStep.status === 'success' ? 'excited' : 'happy'}
                              equipped={pet.equipped_items}
                              size={44}
                              reaction={
                                activeStep.status === 'success'
                                  ? { config: { expression: 'victory', label: 'Victory', icon: '🌟', sound: 'victory', duration: 2 }, id: 1 }
                                  : activeStep.status === 'collision' || activeStep.status === 'failed'
                                  ? { config: { expression: 'hurt', label: 'Ouch!', icon: '💥', sound: 'hurt', duration: 2 }, id: 2 }
                                  : null
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Status & Telemetry Bar */}
          <div className="mt-4 p-3 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Status:{' '}
              <strong
                className={
                  activeStep.status === 'collision'
                    ? 'text-rose-400'
                    : activeStep.status === 'success'
                    ? 'text-emerald-400'
                    : 'text-indigo-400'
                }
              >
                {activeStep.message || 'Ready for simulation'}
              </strong>
            </span>
            <span className="text-amber-400">
              Crystals: {activeStep.crystalsCollected.length} / {mission.crystals.length}
            </span>
          </div>
        </div>

        {/* Right: Direct Controls & Logic Workspace */}
        <div className="lg:col-span-5 space-y-4">
          {/* SECTION A: DIRECT DIRECTIONAL D-PAD (STAGE 1: UP / DOWN / LEFT / RIGHT) */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wide flex items-center gap-1.5">
                <Sparkles size={14} /> Stage 1: Directional Controls
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Arrow keys or click</span>
            </div>

            {/* D-Pad Layout */}
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <button
                onClick={() => handleDirectControl('up')}
                className="w-12 h-12 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-700 hover:from-amber-500 hover:to-amber-400 hover:text-slate-950 text-white font-black shadow-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Move Up ⬆️ (ArrowUp)"
              >
                <ArrowUp size={22} />
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDirectControl('left')}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-700 hover:from-amber-500 hover:to-amber-400 hover:text-slate-950 text-white font-black shadow-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Move Left ⬅️ (ArrowLeft)"
                >
                  <ArrowLeft size={22} />
                </button>
                <button
                  onClick={() => handleDirectControl('interact')}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black shadow-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Interact / Switch ✋ (Space)"
                >
                  <Hand size={20} />
                </button>
                <button
                  onClick={() => handleDirectControl('right')}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-700 hover:from-amber-500 hover:to-amber-400 hover:text-slate-950 text-white font-black shadow-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Move Right ➡️ (ArrowRight)"
                >
                  <ArrowRight size={22} />
                </button>
              </div>
              <button
                onClick={() => handleDirectControl('down')}
                className="w-12 h-12 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-700 hover:from-amber-500 hover:to-amber-400 hover:text-slate-950 text-white font-black shadow-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Move Down ⬇️ (ArrowDown)"
              >
                <ArrowDown size={22} />
              </button>
            </div>
          </div>

          {/* SECTION B: LOGIC BLOCKS WORKSPACE (STAGE 3: VISUAL LOGIC / CODER MODE) */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-indigo-400 tracking-wide flex items-center gap-1.5">
                  <Code2 size={14} /> Logic Workspace ({blocks.length} Blocks)
                </span>
                <div className="flex bg-slate-950 rounded-xl p-0.5 border border-slate-800">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setActiveWorkspaceTab('visual');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      activeWorkspaceTab === 'visual'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Visual
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setActiveWorkspaceTab('code');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      activeWorkspaceTab === 'code'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Show Code
                  </button>
                </div>
              </div>
              <button
                onClick={handleClearWorkspace}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>

            {/* Block Palette Chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleAddBlock('move_up')}
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <ArrowUp size={13} /> Up
              </button>
              <button
                onClick={() => handleAddBlock('move_down')}
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <ArrowDown size={13} /> Down
              </button>
              <button
                onClick={() => handleAddBlock('move_left')}
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft size={13} /> Left
              </button>
              <button
                onClick={() => handleAddBlock('move_right')}
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <ArrowRight size={13} /> Right
              </button>
              <button
                onClick={() => handleAddBlock('move_forward')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                + Forward
              </button>
              <button
                onClick={() => handleAddBlock('turn_left')}
                className="px-2.5 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ↩ Left
              </button>
              <button
                onClick={() => handleAddBlock('turn_right')}
                className="px-2.5 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ↪ Right
              </button>
              <button
                onClick={() => handleAddBlock('interact')}
                className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <Hand size={13} /> Interact
              </button>
              {mission.allowedBlocks.includes('repeat') && (
                <button
                  onClick={() => handleAddBlock('repeat')}
                  className="px-2.5 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  + Repeat (x{repeatCount})
                </button>
              )}
            </div>

            {/* Active Sequence Cards List OR Interactive Code Editor */}
            {activeWorkspaceTab === 'code' ? (
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                {/* Header with Language Selector & Count */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-300">Language:</span>
                    <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                      <button
                        onClick={() => handleSwitchLanguage('python')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          coderLanguage === 'python'
                            ? 'bg-indigo-600 text-white font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Python
                      </button>
                      <button
                        onClick={() => handleSwitchLanguage('javascript')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          coderLanguage === 'javascript'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        JavaScript
                      </button>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    ✓ {blocks.length} commands parsed
                  </span>
                </div>

                {/* Quick Code Snippet Palette */}
                <div className="flex flex-wrap gap-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                  <button
                    onClick={() => handleInsertSnippet(coderLanguage === 'python' ? 'move_up()' : 'move_up();')}
                    className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded text-[10px] font-mono cursor-pointer"
                  >
                    + move_up()
                  </button>
                  <button
                    onClick={() => handleInsertSnippet(coderLanguage === 'python' ? 'move_down()' : 'move_down();')}
                    className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded text-[10px] font-mono cursor-pointer"
                  >
                    + move_down()
                  </button>
                  <button
                    onClick={() => handleInsertSnippet(coderLanguage === 'python' ? 'move_left()' : 'move_left();')}
                    className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded text-[10px] font-mono cursor-pointer"
                  >
                    + move_left()
                  </button>
                  <button
                    onClick={() => handleInsertSnippet(coderLanguage === 'python' ? 'move_right()' : 'move_right();')}
                    className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded text-[10px] font-mono cursor-pointer"
                  >
                    + move_right()
                  </button>
                  <button
                    onClick={() => handleInsertSnippet(coderLanguage === 'python' ? 'move_forward()' : 'move_forward();')}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-[10px] font-mono cursor-pointer"
                  >
                    + forward()
                  </button>
                  <button
                    onClick={() => handleInsertSnippet(coderLanguage === 'python' ? 'turn_right()' : 'turn_right();')}
                    className="px-2 py-0.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 rounded text-[10px] font-mono cursor-pointer"
                  >
                    + turn_right()
                  </button>
                  <button
                    onClick={() => handleInsertSnippet(coderLanguage === 'python' ? 'turn_left()' : 'turn_left();')}
                    className="px-2 py-0.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 rounded text-[10px] font-mono cursor-pointer"
                  >
                    + turn_left()
                  </button>
                  <button
                    onClick={() => handleInsertSnippet(coderLanguage === 'python' ? 'interact()' : 'interact();')}
                    className="px-2 py-0.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded text-[10px] font-mono cursor-pointer"
                  >
                    + interact()
                  </button>
                  <button
                    onClick={() =>
                      handleInsertSnippet(
                        coderLanguage === 'python'
                          ? 'for step in range(3):\n    move_forward()'
                          : 'for (let i = 0; i < 3; i++) {\n  move_forward();\n}'
                      )
                    }
                    className="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-300 rounded text-[10px] font-mono cursor-pointer"
                  >
                    + loop(3)
                  </button>
                </div>

                {/* Editable Textarea */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                  <textarea
                    value={rawCodeInput}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder={
                      coderLanguage === 'python'
                        ? '# Type commands here (e.g., move_up(), move_right(), interact()):\nmove_up()\nmove_right()\ninteract()\n'
                        : '// Type commands here (e.g., move_up(); move_right(); interact();):\nmove_up();\nmove_right();\ninteract();\n'
                    }
                    className="w-full h-44 bg-slate-950 text-emerald-400 font-mono text-xs p-3.5 outline-none resize-none focus:ring-1 focus:ring-indigo-500 leading-relaxed custom-scrollbar"
                    spellCheck={false}
                  />
                </div>
              </div>
            ) : (
              <div className="min-h-[160px] max-h-[220px] overflow-y-auto bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-1.5 custom-scrollbar">
                {blocks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                    No instructions yet. Tap directional controls or logic cards above to build the sequence!
                  </div>
                ) : (
                  blocks.map((b, i) => (
                    <div
                      key={b.id || i}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        simulationResult && currentStepIndex === i + 1
                          ? 'bg-amber-500 text-slate-950 scale-102 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500">#{i + 1}</span>
                        <span className="capitalize">{b.type.replace('_', ' ')}</span>
                        {b.params?.count && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                            x{b.params.count}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveBlock(i)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {lastErrorMsg && (
              <div className="p-3 bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl text-center">
                {lastErrorMsg}
              </div>
            )}

            {/* Victory Success Card */}
            {simulationResult?.success && !isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 border border-emerald-500/50 rounded-2xl flex items-center justify-between gap-3 shadow-lg shadow-emerald-500/10"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🏆</span>
                  <div>
                    <div className="text-xs font-black text-emerald-400">Mission Cleared!</div>
                    <div className="text-[10px] text-slate-300 font-medium">+{mission.xpReward} XP earned</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    sound.playClick();
                    setShowAiLevelModal(true);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Sparkles size={13} className="text-amber-300" /> Next AI Level
                </button>
              </motion.div>
            )}

            {/* Run Execution Button */}
            <button
              onClick={handleRunSimulation}
              disabled={isPlaying || blocks.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play size={18} className="fill-slate-950" />
              {isPlaying ? 'EXECUTING LOGIC...' : 'RUN PROGRAM'}
            </button>
          </div>
        </div>
      </div>

      {/* STAGE 2 "DISCOVER" CODE REVEAL CELEBRATION MODAL */}
      <AnimatePresence>
        {showRevealModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl relative overflow-hidden"
            >
              <div className="flex flex-col items-center justify-center">
                {pet && (
                  <div className="relative mb-2">
                    <PetSVG
                      type={pet.pet_type}
                      stage={pet.stage}
                      state="excited"
                      equipped={pet.equipped_items}
                      size={100}
                      reaction={{ config: { expression: 'victory', label: 'Winner!', icon: '🏆', sound: 'victory', duration: 3 }, id: Date.now() }}
                    />
                  </div>
                )}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30">
                  <Sparkles size={28} className="text-slate-950" />
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase font-black text-amber-400 tracking-wider">
                  Stage 2: Discovery Unlocked
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  You Just Wrote Code!
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Your actions were translated directly into code behind the scenes. Here is the actual program you designed:
                </p>
              </div>

              {/* Code Reveal Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-left text-xs text-emerald-400 space-y-1 shadow-inner max-h-[160px] overflow-y-auto custom-scrollbar">
                {simulationResult?.revealedCode?.map((line, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-slate-600 select-none text-[10px] w-4">{i + 1}</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              {/* Rewards */}
              <div className="grid grid-cols-2 gap-3 py-1">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5">
                  <Zap size={15} /> +{mission.xpReward} Adventure XP
                </div>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-300 font-bold text-xs flex items-center justify-center gap-1.5">
                  <Coins size={15} /> +{mission.coinReward} Gold Coins
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={() => setShowRevealModal(false)}
                  className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 font-black text-slate-950 rounded-2xl text-sm transition-all cursor-pointer hover:opacity-95"
                >
                  CONTINUE →
                </button>

                <button
                  onClick={() => {
                    setShowRevealModal(false);
                    setShowAiLevelModal(true);
                  }}
                  className="py-3.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 font-black text-white rounded-2xl text-sm transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-500/25"
                >
                  <Sparkles size={15} className="text-amber-300" />
                  Next AI Level ✨
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Game Master Assistant Modal */}
      <AIGameMaster
        mission={mission}
        currentBlocks={blocks}
        lastError={lastErrorMsg}
        isOpen={showAiHelper}
        onClose={() => setShowAiHelper(false)}
      />

      {/* AI Level Architect Modal */}
      <AILevelGeneratorModal
        isOpen={showAiLevelModal}
        onClose={() => setShowAiLevelModal(false)}
        onLaunchLevel={handleLaunchAiLevel}
      />
    </div>
  );
}
