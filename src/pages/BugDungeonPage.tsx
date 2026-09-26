import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Bug, Play, RotateCcw, Sparkles, CheckCircle2, AlertTriangle,
  ArrowRight, ShieldCheck, Zap, Coins, Bot, Trash2, Plus,
  ArrowUp, ArrowDown, ArrowLeft, HelpCircle, Box, Code2, Terminal, Copy, Check
} from 'lucide-react';
import { MISSIONS_LIST } from '@/data/missions';
import type { VisualBlock, SimulationResult, SimulationStep, MissionDefinition } from '@/types/game';
import { runDeterministicSimulation } from '@/services/gameEngine';
import { useGameData } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { GameScene3D } from '@/components/game3d/GameScene3D';
import { AIGameMaster } from '@/components/AIGameMaster';
import { sound } from '@/utils/audio';
import { REACTION_CONFIGS } from '@/data/reactions';
import { DarkIdeEditor } from '@/components/coding/DarkIdeEditor';

// Convert VisualBlock array to readable code string
const blocksToCode = (blockList: VisualBlock[], lang: 'python' | 'javascript' | 'c'): string => {
  if (lang === 'c') {
    const body = blockList
      .map((b) => {
        if (b.type === 'repeat') {
          return `    for (int i = 0; i < ${b.params?.count || 3}; i++) {\n        move_forward();\n    }`;
        }
        return `    ${b.type}();`;
      })
      .join('\n');
    return `#include <stdio.h>\n#include "petslyvia.h"\n\nint main() {\n${body}\n    return 0;\n}`;
  }
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

// Parse raw code string to VisualBlock array
const parseSingleLine = (line: string): VisualBlock | null => {
  const clean = line.replace(/;/g, '').replace(/\(\)/g, '').trim().toLowerCase();
  if (clean.includes('move_forward') || clean === 'forward' || clean === 'moveforward') {
    return { id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_forward' };
  }
  if (clean.includes('move_up') || clean === 'up' || clean === 'moveup') {
    return { id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_up' };
  }
  if (clean.includes('move_down') || clean === 'down' || clean === 'movedown') {
    return { id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_down' };
  }
  if (clean.includes('move_left') || clean === 'left' || clean === 'moveleft') {
    return { id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_left' };
  }
  if (clean.includes('move_right') || clean === 'right' || clean === 'moveright') {
    return { id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_right' };
  }
  if (clean.includes('turn_right') || clean === 'turnright' || clean === 'right_turn') {
    return { id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'turn_right' };
  }
  if (clean.includes('turn_left') || clean === 'turnleft' || clean === 'left_turn') {
    return { id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'turn_left' };
  }
  if (clean.includes('interact') || clean.includes('collect') || clean === 'use' || clean === 'press') {
    return { id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'interact' };
  }
  if (clean.includes('jump') || clean.includes('hop')) {
    return { id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'jump' };
  }
  return null;
};

const parseCodeToBlocks = (source: string): VisualBlock[] => {
  const result: VisualBlock[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (
      !trimmed ||
      trimmed.startsWith('#include') ||
      trimmed.startsWith('int main') ||
      trimmed.startsWith('return ') ||
      trimmed.startsWith('printf') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed === '}'
    ) {
      continue;
    }

    // Check for loop headers (Python, JS, C)
    const pyLoop = trimmed.match(/for\s+\w+\s+in\s+range\((\d+)\):/i);
    const cJsLoop = trimmed.match(/for\s*\(\s*(?:(?:let|var|int)\s+)?\w+\s*=\s*\d+\s*;\s*\w+\s*<\s*(\d+)\s*;\s*.*\)/i);
    const loopMatch = pyLoop || cJsLoop;
    if (loopMatch) {
      const count = parseInt(loopMatch[1], 10) || 3;
      let bodyFound = false;
      while (i + 1 < lines.length) {
        const nextRaw = lines[i + 1];
        const nextTrim = nextRaw.trim();
        if (nextRaw.startsWith('  ') || nextRaw.startsWith('\t') || (nextTrim && nextTrim !== '}' && !nextTrim.startsWith('for'))) {
          i++;
          const innerBlock = parseSingleLine(nextTrim);
          if (innerBlock) {
            for (let k = 0; k < count; k++) {
              result.push({ ...innerBlock, id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` });
            }
            bodyFound = true;
          }
        } else {
          break;
        }
      }
      if (!bodyFound) {
        for (let k = 0; k < count; k++) {
          result.push({ id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type: 'move_forward' });
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

export function BugDungeonPage() {
  const { pet, completeMission } = useGameData();

  const dungeonMissions = MISSIONS_LIST.filter((m) => m.worldArea === 'bug_dungeon');
  const [selectedMissionId, setSelectedMissionId] = useState<string>(dungeonMissions[0]?.id || 'mission_4');
  const breakFixMission = dungeonMissions.find((m) => m.id === selectedMissionId) || dungeonMissions[0];

  const [viewMode3D, setViewMode3D] = useState<boolean>(true);
  const [workspaceMode, setWorkspaceMode] = useState<'visual' | 'code'>('visual');
  const [language, setLanguage] = useState<'python' | 'javascript' | 'c'>('python');
  const [rawCode, setRawCode] = useState<string>('');

  const [blocks, setBlocks] = useState<VisualBlock[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Safely cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, []);

  const [showAiHelper, setShowAiHelper] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [lastErrorMsg, setLastErrorMsg] = useState<string | undefined>();

  // Reset to initial broken instructions when mission changes
  useEffect(() => {
    const initial = breakFixMission.initialBlocks
      ? JSON.parse(JSON.stringify(breakFixMission.initialBlocks))
      : [{ id: 'b1', type: 'move_forward' }];
    setBlocks(initial);
    setRawCode(blocksToCode(initial, language));
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setLastErrorMsg(undefined);
    setShowSuccessCard(false);
  }, [breakFixMission.id]);

  // Keep rawCode in sync when blocks change in visual mode
  const updateBlocksAndSyncCode = (newBlocks: VisualBlock[]) => {
    setBlocks(newBlocks);
    setRawCode(blocksToCode(newBlocks, language));
  };

  // Replace a block at index
  const handleReplaceBlock = (index: number, newType: VisualBlock['type']) => {
    sound.playSnap();
    const newBlocks = blocks.map((b, i) => (i === index ? { ...b, type: newType } : b));
    updateBlocksAndSyncCode(newBlocks);
  };

  // Add block to sequence
  const handleAddBlock = (type: VisualBlock['type']) => {
    sound.playSnap();
    const newBlocks = [
      ...blocks,
      { id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type } as VisualBlock,
    ];
    updateBlocksAndSyncCode(newBlocks);
  };

  // Remove block at index
  const handleRemoveBlock = (index: number) => {
    sound.playClick();
    const newBlocks = blocks.filter((_, i) => i !== index);
    updateBlocksAndSyncCode(newBlocks);
  };

  // Handle typing directly in the code editor
  const handleCodeChange = (text: string) => {
    setRawCode(text);
    const parsed = parseCodeToBlocks(text);
    setBlocks(parsed);
  };

  // Insert snippet in code mode
  const handleInsertSnippet = (snippet: string) => {
    sound.playSnap();
    const updated = `${rawCode.trimEnd()}\n${snippet}\n`;
    setRawCode(updated);
    const parsed = parseCodeToBlocks(updated);
    setBlocks(parsed);
  };

  // Switch programming language
  const handleSwitchLanguage = (newLang: 'python' | 'javascript' | 'c') => {
    sound.playClick();
    setLanguage(newLang);
    const effectiveBlocks = blocks.length > 0
      ? blocks
      : (breakFixMission.initialBlocks || [{ id: 'b1', type: 'move_forward' }]);
    setRawCode(blocksToCode(effectiveBlocks, newLang));
  };

  // Reset back to initial bug state
  const handleResetBug = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    sound.playClick();
    const initial = breakFixMission.initialBlocks
      ? JSON.parse(JSON.stringify(breakFixMission.initialBlocks))
      : [{ id: 'b1', type: 'move_forward' }];
    setBlocks(initial);
    setRawCode(blocksToCode(initial, language));
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setLastErrorMsg(undefined);
    setShowSuccessCard(false);
    setIsPlaying(false);
  };

  const handleTestDebug = () => {
    if (blocks.length === 0) {
      sound.playError();
      setLastErrorMsg('No instructions found! Add visual blocks or type code to guide the pet.');
      return;
    }

    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    sound.playClick();
    setLastErrorMsg(undefined);
    const result = runDeterministicSimulation(
      breakFixMission.gridSize,
      breakFixMission.startPos,
      breakFixMission.startDir,
      breakFixMission.goalPos,
      breakFixMission.obstacles,
      breakFixMission.crystals,
      breakFixMission.switches,
      blocks
    );

    setSimulationResult(result);
    setIsPlaying(true);
    setCurrentStepIndex(0);

    let step = 0;
    simIntervalRef.current = setInterval(() => {
      step++;
      if (step < result.steps.length) {
        setCurrentStepIndex(step);
        sound.playStep();
      } else {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        setIsPlaying(false);

        if (result.success) {
          sound.playVictory();
          completeMission(breakFixMission.id, breakFixMission.xpReward, breakFixMission.coinReward, {
            debugging: 35,
            logic: 20,
          });
          setShowSuccessCard(true);
        } else {
          sound.playError();
          setLastErrorMsg(result.message);
        }
      }
    }, 450);
  };

  const activeStep: SimulationStep =
    simulationResult && simulationResult.steps[currentStepIndex]
      ? simulationResult.steps[currentStepIndex]
      : {
          stepIndex: 0,
          petPos: breakFixMission.startPos,
          petDir: breakFixMission.startDir,
          petAction: 'idle',
          crystalsCollected: [],
          openGates: [],
          status: 'running',
          message: 'Ready to run diagnosis',
        };

  // Dynamic empathetic companion guidance quote
  const getCompanionDungeonQuote = () => {
    if (isPlaying) return "Running your debug sequence... let's see how our pet navigates! 🔍";
    if (showSuccessCard) return "Yahoo! That bug is officially squashed! Great job debugging together! 🎉";
    if (lastErrorMsg) return "Don't worry! Bugs are just puzzles waiting to be solved. Let's tweak our steps and test again! 💪";
    return "Check out the suspect commands! Swap the glitchy block or rewrite the code to clear the path! 🐾";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* Header */}
      <div className="p-6 bg-white rounded-3xl border border-[#e2ece5] shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ffe4e6] border border-[#fecdd3] rounded-full text-xs font-bold text-rose-700 mb-2">
            <Bug size={14} /> Stage 4: Break & Fix Dungeon
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1b382b]">
            {breakFixMission.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#5b7566] mt-1 font-medium">
            Observe the broken behavior, swap the faulty command or write the code directly to fix the world!
          </p>
        </div>

        {/* Level Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {dungeonMissions.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => {
                sound.playClick();
                setSelectedMissionId(m.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                m.id === selectedMissionId
                  ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                  : 'bg-[#f8faf8] text-[#5b7566] hover:text-[#1b382b] border border-[#e2ece5]'
              }`}
            >
              Stage {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Humanized Companion Coach Bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-3xl bg-white border border-[#e2ece5] shadow-card flex items-center gap-3.5"
      >
        <div className="w-11 h-11 rounded-2xl bg-[#eaf2ec] border border-[#d8e5dc] flex items-center justify-center shrink-0">
          {pet && (
            <PetSVG
              type={pet.pet_type}
              stage={pet.stage}
              state={showSuccessCard ? 'happy' : isPlaying ? 'focused' : lastErrorMsg ? 'tired' : 'happy'}
              equipped={pet.equipped_items}
              size={40}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#1b382b]">{pet?.pet_name || 'Your Pet'} Co-Pilot</span>
            <span className="text-[10px] bg-[#eaf2ec] text-[#2d6a4f] font-bold px-2 py-0.2 rounded-full">
              Bug Detective Mode
            </span>
          </div>
          <p className="text-xs text-[#5b7566] italic mt-0.5 font-medium">
            "{getCompanionDungeonQuote()}"
          </p>
        </div>
        <button
          onClick={() => {
            sound.playClick();
            setShowAiHelper(true);
          }}
          className="px-3.5 py-1.5 bg-[#f4f8f5] hover:bg-[#eaf2ec] text-[#1b382b] border border-[#d8e5dc] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Bot size={14} className="text-[#2d6a4f]" /> AI Hint
        </button>
      </motion.div>

      {/* Main Grid: Left Stage (3D/2D) & Right Interactive Stack / Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-start">
        {/* Left: 3D Engine & Board Viewer */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-[#5b7566]">
              🔍 <strong>The Problem:</strong> {breakFixMission.objective}
            </div>

            {/* 3D / 2D Mode Toggle */}
            <button
              onClick={() => {
                sound.playClick();
                setViewMode3D((prev) => !prev);
              }}
              className="px-3 py-1 bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#d8e5dc] rounded-xl text-xs font-bold text-[#1b382b] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Box size={13} className="text-[#5b7566]" />
              <span>{viewMode3D ? '3D View' : '2D View'}</span>
            </button>
          </div>

          {viewMode3D ? (
            <GameScene3D
              gridSize={breakFixMission.gridSize}
              startPos={breakFixMission.startPos}
              goalPos={breakFixMission.goalPos}
              obstacles={breakFixMission.obstacles}
              crystals={breakFixMission.crystals}
              switches={breakFixMission.switches}
              activeStep={activeStep}
              petType={pet?.pet_type || 'cat'}
              equipped={pet?.equipped_items}
              theme="dungeon"
              height="340px"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 min-h-[300px]">
              <div
                className="grid gap-2 p-3 bg-slate-900 rounded-2xl border border-slate-800 relative shadow-inner"
                style={{
                  gridTemplateColumns: `repeat(${breakFixMission.gridSize.width}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: breakFixMission.gridSize.height }).map((_, row) =>
                  Array.from({ length: breakFixMission.gridSize.width }).map((__, col) => {
                    const isPetHere = activeStep.petPos.x === col && activeStep.petPos.y === row;
                    const isGoal = breakFixMission.goalPos.x === col && breakFixMission.goalPos.y === row;
                    const obs = breakFixMission.obstacles.find((o) => o.x === col && o.y === row);
                    const isGateOpen =
                      obs?.type === 'gate' &&
                      activeStep.openGates.includes(obs.id || `${col},${row}`);
                    const sw = breakFixMission.switches?.find((s) => s.x === col && s.y === row);
                    const crystal = breakFixMission.crystals.find((c) => c.x === col && c.y === row);
                    const isCollected = activeStep.crystalsCollected.some((c) => c.x === col && c.y === row);

                    return (
                      <div
                        key={`dungeon_${col}_${row}`}
                        className={`w-14 h-14 rounded-xl flex items-center justify-center relative transition-all ${
                          isGoal
                            ? 'bg-emerald-950 border-2 border-emerald-400'
                            : obs?.type === 'gate'
                            ? isGateOpen
                              ? 'bg-indigo-950/60 border border-emerald-400'
                              : 'bg-rose-950/80 border-2 border-rose-500'
                            : obs?.type === 'wall'
                            ? 'bg-rose-950/60 border border-rose-600/50'
                            : obs?.type === 'water'
                            ? 'bg-sky-950/80 border border-sky-600'
                            : sw
                            ? 'bg-amber-950/60 border border-amber-400'
                            : 'bg-slate-900 border border-slate-800'
                        }`}
                      >
                        {obs?.type === 'wall' && <span className="text-xl">🧱</span>}
                        {obs?.type === 'water' && <span className="text-xl">🌊</span>}
                        {obs?.type === 'gate' && (
                          <span className="text-xl">{isGateOpen ? '🟢' : '🔒'}</span>
                        )}
                        {sw && !isPetHere && <span className="text-xl">🔘</span>}
                        {crystal && !isCollected && !isPetHere && (
                          <span className="text-xl animate-bounce">💎</span>
                        )}
                        {isGoal && !isPetHere && <span className="text-xl">🏡</span>}
                        {isPetHere && pet && (
                          <PetSVG
                            type={pet.pet_type}
                            stage={pet.stage}
                            state={activeStep.status === 'collision' ? 'tired' : activeStep.status === 'success' ? 'excited' : 'happy'}
                            equipped={pet.equipped_items}
                            size={46}
                            reaction={
                              activeStep.status === 'success'
                                ? { config: REACTION_CONFIGS.encourage, id: 1 }
                                : activeStep.status === 'collision' || activeStep.status === 'failed'
                                ? { config: REACTION_CONFIGS.rest, id: 2 }
                                : null
                            }
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              State:{' '}
              <strong
                className={
                  activeStep.status === 'success'
                    ? 'text-emerald-400'
                    : activeStep.status === 'collision'
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }
              >
                {activeStep.message || 'Ready to run diagnosis'}
              </strong>
            </span>
            <span className="text-amber-400">
              Steps: {currentStepIndex} / {blocks.length}
            </span>
          </div>
        </div>

        {/* Right: Interactive Instruction Inspector & Builder / Live Code Editor */}
        <div className="lg:col-span-6 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
          {/* Header with Visual / Show Code Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#1b382b] flex items-center gap-2">
                <Bug className="text-rose-600" size={18} /> Instruction Stack ({blocks.length} Steps)
              </h3>
            </div>

            {/* Mode Switcher: Visual Blocks vs Show Code */}
            <div className="flex items-center gap-2">
              <div className="flex bg-[#f4f8f5] rounded-2xl p-0.5 border border-[#d8e5dc]">
                <button
                  onClick={() => {
                    sound.playClick();
                    setWorkspaceMode('visual');
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    workspaceMode === 'visual'
                      ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                      : 'text-[#5b7566] hover:text-[#1b382b]'
                  }`}
                >
                  <Box size={13} /> Visual
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    setWorkspaceMode('code');
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    workspaceMode === 'code'
                      ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                      : 'text-[#5b7566] hover:text-[#1b382b]'
                  }`}
                >
                  <Code2 size={13} /> Show Code
                </button>
              </div>

              {workspaceMode === 'code' && (
                <div className="flex bg-[#121316] rounded-xl p-0.5 border border-[#2a2d36] gap-1">
                  {(['python', 'javascript', 'c'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => handleSwitchLanguage(l)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        language === l
                          ? 'bg-[#2d6a4f] text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>{l === 'python' ? '🐍 Python' : l === 'javascript' ? '⚡ JS' : '⚙️ C'}</span>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleResetBug}
                className="text-[11px] text-[#5b7566] hover:text-[#1b382b] flex items-center gap-1 font-bold cursor-pointer"
                title="Reset to default glitched code"
              >
                <RotateCcw size={12} /> Reset Flaw
              </button>
            </div>
          </div>

          {/* VISUAL WORKSPACE MODE */}
          {workspaceMode === 'visual' ? (
            <div className="space-y-3">
              {/* PALETTE: Add More Instructions */}
              <div className="space-y-1.5 bg-[#f8faf8] p-3 rounded-2xl border border-[#e2ece5]">
                <span className="text-[11px] font-bold text-[#1b382b] flex items-center gap-1">
                  <Plus size={13} className="text-[#2d6a4f]" /> Add Missing Instructions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleAddBlock('move_up')}
                    className="px-2.5 py-1 bg-white hover:bg-[#eaf2ec] border border-[#d8e5dc] text-[#1b382b] rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowUp size={12} /> Up
                  </button>
                  <button
                    onClick={() => handleAddBlock('move_down')}
                    className="px-2.5 py-1 bg-white hover:bg-[#eaf2ec] border border-[#d8e5dc] text-[#1b382b] rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowDown size={12} /> Down
                  </button>
                  <button
                    onClick={() => handleAddBlock('move_left')}
                    className="px-2.5 py-1 bg-white hover:bg-[#eaf2ec] border border-[#d8e5dc] text-[#1b382b] rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={12} /> Left
                  </button>
                  <button
                    onClick={() => handleAddBlock('move_right')}
                    className="px-2.5 py-1 bg-white hover:bg-[#eaf2ec] border border-[#d8e5dc] text-[#1b382b] rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRight size={12} /> Right
                  </button>
                  <button
                    onClick={() => handleAddBlock('move_forward')}
                    className="px-2.5 py-1 bg-[#eaf2ec] hover:bg-[#dde8df] border border-[#dce7df] text-[#1b382b] rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    + Forward
                  </button>
                  <button
                    onClick={() => handleAddBlock('turn_right')}
                    className="px-2.5 py-1 bg-[#eaf2ec] hover:bg-[#dde8df] border border-[#dce7df] text-[#1b382b] rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    ↪ Turn Right
                  </button>
                  <button
                    onClick={() => handleAddBlock('turn_left')}
                    className="px-2.5 py-1 bg-[#eaf2ec] hover:bg-[#dde8df] border border-[#dce7df] text-[#1b382b] rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    ↩ Turn Left
                  </button>
                  <button
                    onClick={() => handleAddBlock('interact')}
                    className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    🔘 Interact
                  </button>
                </div>
              </div>

              {/* Instruction Block List with Swap Dropdowns and Delete */}
              <div className="space-y-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 max-h-[220px] overflow-y-auto custom-scrollbar">
                {blocks.map((b, i) => {
                  const isGlitchedBlock = i === breakFixMission.brokenTargetBlockIndex;

                  return (
                    <div
                      key={b.id || i}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        isGlitchedBlock
                          ? 'bg-rose-950/40 border-rose-500/50'
                          : simulationResult && currentStepIndex === i + 1
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">#{i + 1}</span>
                        <select
                          value={b.type}
                          onChange={(e) => handleReplaceBlock(i, e.target.value as any)}
                          className="bg-slate-950 text-white font-extrabold px-2 py-1 rounded-lg border border-slate-700 outline-none text-xs"
                        >
                          <option value="move_forward">move_forward()</option>
                          <option value="move_up">move_up()</option>
                          <option value="move_down">move_down()</option>
                          <option value="move_left">move_left()</option>
                          <option value="move_right">move_right()</option>
                          <option value="turn_right">turn_right()</option>
                          <option value="turn_left">turn_left()</option>
                          <option value="interact">interact()</option>
                        </select>
                        {isGlitchedBlock && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold">
                            ⚠️ Suspect
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveBlock(i)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        title="Remove step"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CODE EDITOR WORKSPACE MODE with DarkIdeEditor */
            <div className="space-y-3">
              <DarkIdeEditor
                mission={breakFixMission}
                language={language}
                code={rawCode}
                onCodeChange={handleCodeChange}
                onLanguageChange={handleSwitchLanguage}
                onResetCode={handleResetBug}
                minHeight="h-56 sm:h-64"
                snippets={
                  language === 'python'
                    ? [
                        { label: '+ forward()', code: 'move_forward()' },
                        { label: '+ turn_right()', code: 'turn_right()' },
                        { label: '+ turn_left()', code: 'turn_left()' },
                        { label: '+ interact()', code: 'interact()' },
                        { label: '+ loop(3)', code: 'for step in range(3):\n    move_forward()', color: 'bg-amber-950/60 border-amber-700/50 text-amber-300 font-bold' },
                      ]
                    : language === 'javascript'
                    ? [
                        { label: '+ forward()', code: 'move_forward();' },
                        { label: '+ turn_right()', code: 'turn_right();' },
                        { label: '+ turn_left()', code: 'turn_left();' },
                        { label: '+ interact()', code: 'interact();' },
                        { label: '+ loop(3)', code: 'for (let i = 0; i < 3; i++) {\n  move_forward();\n}', color: 'bg-amber-950/60 border-amber-700/50 text-amber-300 font-bold' },
                      ]
                    : [
                        { label: '+ forward()', code: 'move_forward();' },
                        { label: '+ turn_right()', code: 'turn_right();' },
                        { label: '+ turn_left()', code: 'turn_left();' },
                        { label: '+ interact()', code: 'interact();' },
                        { label: '+ loop(3)', code: 'for (int i = 0; i < 3; i++) {\n    move_forward();\n}', color: 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300 font-bold' },
                        { label: '+ printf()', code: 'printf("Debug dungeon grid\\n");' },
                      ]
                }
                onInsertSnippet={handleInsertSnippet}
              />
            </div>
          )}

          {lastErrorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl text-center">
              {lastErrorMsg}
            </div>
          )}

          {/* Test Diagnosis Button */}
          <button
            onClick={handleTestDebug}
            disabled={isPlaying}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-rose-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play size={18} className="fill-slate-950" />
            {isPlaying ? 'TESTING LOGIC REPAIR...' : 'TEST REPAIRED LOGIC'}
          </button>

          {/* Success Banner */}
          {showSuccessCard && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-extrabold text-sm">
                <ShieldCheck size={18} /> Bug Purged Successfully!
              </div>
              <p className="text-xs text-slate-300">
                You diagnosed the flaw, repaired the logic code, and guided the pet safely to the exit!
              </p>
              <div className="flex justify-center gap-3 pt-1 text-xs font-bold text-emerald-300">
                <span>+{breakFixMission.xpReward} XP</span>
                <span>+{breakFixMission.coinReward} Coins</span>
                <span>+35 Debugging Skill</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AIGameMaster
        mission={breakFixMission}
        currentBlocks={blocks}
        lastError={lastErrorMsg}
        isOpen={showAiHelper}
        onClose={() => setShowAiHelper(false)}
      />
    </div>
  );
}
