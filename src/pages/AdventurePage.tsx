import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Hand, Sparkles, CheckCircle2, AlertCircle, Bot, HelpCircle,
  Code2, Plus, Trash2, ChevronRight, Zap, Coins, Terminal, Layout, Box,
  Volume2, VolumeX, Mic, Send, CornerUpLeft, CornerUpRight, Map, ChevronDown
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

    // Check for loop header (Python, JS, C)
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
  const { profile, pet, progress, completeMission, setPlayerRole, soundEnabled, toggleSound } = useGameData();
  const navigate = useNavigate();

  const [customAiMission, setCustomAiMission] = useState<MissionDefinition | null>(null);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('mission_1');
  const mission = customAiMission || MISSIONS_LIST.find((m) => m.id === selectedMissionId) || MISSIONS_LIST[0];

  // 3D vs 2D Display mode & Camera Preset
  const [cameraMode, setCameraMode] = useState<'iso' | 'perspective' | 'top'>('iso');
  const [showCameraDropdown, setShowCameraDropdown] = useState<boolean>(false);

  // Logic Blocks / Sequence in workspace
  const [blocks, setBlocks] = useState<VisualBlock[]>([]);
  const [repeatCount, setRepeatCount] = useState<number>(3);

  // Active view in workspace: 'visual' or 'code'
  const isCoderMode = profile?.role === 'coder';
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'visual' | 'code'>('visual');
  const [coderLanguage, setCoderLanguage] = useState<'python' | 'javascript' | 'c'>('python');
  const [rawCodeInput, setRawCodeInput] = useState<string>('');

  // AI Prompt bar state ("Do anything")
  const [aiPromptInput, setAiPromptInput] = useState<string>('');
  const [aiPromptResponse, setAiPromptResponse] = useState<string | null>(null);

  // Simulation execution state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Safely cleanup running simulation intervals on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
    };
  }, []);

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

  // Directional Controls
  const handleDirectMove = (type: 'forward' | 'turn_left' | 'turn_right' | 'back' | 'jump' | 'interact') => {
    sound.playStep();
    if (type === 'forward') handleAddBlock('move_forward');
    else if (type === 'turn_left') handleAddBlock('turn_left');
    else if (type === 'turn_right') handleAddBlock('turn_right');
    else if (type === 'back') handleAddBlock('move_down');
    else if (type === 'jump') handleAddBlock('jump');
    else if (type === 'interact') handleAddBlock('interact');
  };

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleDirectMove('forward');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleDirectMove('back');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleDirectMove('turn_left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleDirectMove('turn_right');
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleDirectMove('interact');
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
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    sound.playClick();
    setBlocks([]);
    setRawCodeInput('');
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setLastErrorMsg(undefined);
    setIsPlaying(false);
  };

  // Handle Natural Language / AI Prompt Bar Submission
  const handleAiPromptSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = aiPromptInput.trim().toLowerCase();
    if (!prompt) return;

    sound.playSparkle();

    // Check if it's a movement command
    if (prompt.includes('forward') || prompt.includes('walk') || prompt.includes('step') || prompt.includes('ahead')) {
      const matchNum = prompt.match(/\d+/);
      const count = matchNum ? parseInt(matchNum[0], 10) : 1;
      for (let i = 0; i < Math.min(count, 5); i++) {
        handleAddBlock('move_forward');
      }
      setAiPromptResponse(`Added ${count} forward step${count > 1 ? 's' : ''}! 🐾`);
      setAiPromptInput('');
      setTimeout(() => setAiPromptResponse(null), 3500);
      return;
    }

    if (prompt.includes('left') || prompt.includes('turn left')) {
      handleAddBlock('turn_left');
      setAiPromptResponse('Turned left! ↩');
      setAiPromptInput('');
      setTimeout(() => setAiPromptResponse(null), 3000);
      return;
    }

    if (prompt.includes('right') || prompt.includes('turn right')) {
      handleAddBlock('turn_right');
      setAiPromptResponse('Turned right! ↪');
      setAiPromptInput('');
      setTimeout(() => setAiPromptResponse(null), 3000);
      return;
    }

    if (prompt.includes('back') || prompt.includes('reverse')) {
      handleAddBlock('move_down');
      setAiPromptResponse('Added backward step! ⬇');
      setAiPromptInput('');
      setTimeout(() => setAiPromptResponse(null), 3000);
      return;
    }

    if (prompt.includes('collect') || prompt.includes('gem') || prompt.includes('crystal') || prompt.includes('interact')) {
      handleAddBlock('interact');
      setAiPromptResponse('Added interact command! 💎');
      setAiPromptInput('');
      setTimeout(() => setAiPromptResponse(null), 3000);
      return;
    }

    if (prompt.includes('play') || prompt.includes('run') || prompt.includes('go')) {
      setAiPromptInput('');
      handleRunSimulation();
      return;
    }

    if (prompt.includes('clear') || prompt.includes('reset')) {
      handleClearWorkspace();
      setAiPromptResponse('Cleared logic workspace!');
      setAiPromptInput('');
      setTimeout(() => setAiPromptResponse(null), 3000);
      return;
    }

    // Otherwise, open AI Game Master with query
    setShowAiHelper(true);
    setAiPromptInput('');
  };

  // Run Simulation
  const handleRunSimulation = () => {
    if (blocks.length === 0) {
      sound.playError();
      setLastErrorMsg('Your logic sequence is empty! Add moves in order above.');
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

    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }

    setSimulationResult(result);
    setIsPlaying(true);
    setCurrentStepIndex(0);

    let step = 0;
    simulationIntervalRef.current = setInterval(() => {
      step++;
      if (step < result.steps.length) {
        setCurrentStepIndex(step);
        sound.playStep();
      } else {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
        setIsPlaying(false);

        if (result.success) {
          sound.playVictory();
          completeMission(mission.id, mission.xpReward, mission.coinReward, {
            algorithms: 25,
            logic: 30,
          });

          if (profile?.role === 'non_coder' || profile?.role === 'explorer') {
            setTimeout(() => {
              setShowRevealModal(true);
            }, 500);
          }
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
          petPos: mission.startPos,
          petDir: mission.startDir,
          petAction: 'idle',
          crystalsCollected: [],
          openGates: [],
          status: 'idle',
          message: 'Ready to explore',
        };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Stage Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Category Eyebrow */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#5b7566] tracking-[0.2em] uppercase mb-1">
            <span className="text-xs">🧭</span>
            <span>THE WHISPERING WOODS</span>
          </div>

          {/* Main Title & Stage Badge */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-[#1b382b] tracking-tight">
              Forest of Logic
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#e2ece5] text-[#2d6a4f] text-[11px] font-bold border border-[#d5e3da]">
              Stage 1: Whispering Woods
            </span>
          </div>

          <p className="text-xs text-[#5b7566] font-medium mt-1">
            Guide your pet through crystal glades, discover secret code, and master Repeat loops.
          </p>
        </div>

        {/* World Map & Level Architect Actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/app"
            className="px-4 py-2 bg-white border border-[#d8e5dc] rounded-2xl text-xs font-bold text-[#1b382b] hover:bg-[#eaf2ec] shadow-soft flex items-center gap-2 transition-all cursor-pointer group"
          >
            <Map size={14} className="text-[#5b7566] group-hover:text-[#1b382b]" />
            <span>World map</span>
          </Link>

          <button
            onClick={() => {
              sound.playClick();
              setShowAiLevelModal(true);
            }}
            className="px-3.5 py-2 bg-[#eaf2ec] hover:bg-[#dde8df] border border-[#d8e5dc] text-[#1b382b] text-xs font-bold rounded-2xl shadow-soft flex items-center gap-1.5 transition-all cursor-pointer"
            title="Create or generate custom logic puzzles"
          >
            <Sparkles size={13} className="text-[#2d6a4f]" />
            <span>AI Architect</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Center 3D Diorama (Left) + Right Action Panel ("Make your move") */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CENTER / LEFT: 3D Mission Diorama Card */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card flex flex-col space-y-4 relative">
          {/* Card Top Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#1b382b]">
                Mission 01
              </span>
              <span className="text-xs text-[#7a9386]">|</span>
              <span className="text-xs text-[#5b7566] font-medium">
                {mission.objective || 'A little way home'}
              </span>
            </div>

            {/* Viewport Action Controls */}
            <div className="flex items-center gap-2">
              {/* Camera Preset Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCameraDropdown(!showCameraDropdown)}
                  className="px-3 py-1 bg-[#f4f8f5] border border-[#d8e5dc] hover:bg-[#eaf2ec] rounded-xl text-xs font-bold text-[#1b382b] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Box size={13} className="text-[#5b7566]" />
                  <span>{cameraMode === 'iso' ? 'Iso 3D' : cameraMode === 'perspective' ? 'Perspective' : 'Top View'}</span>
                  <ChevronDown size={12} className="text-[#7a9386]" />
                </button>

                {showCameraDropdown && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-[#e2ece5] rounded-2xl p-1.5 shadow-lg z-30 min-w-[130px] space-y-1">
                    <button
                      onClick={() => {
                        setCameraMode('iso');
                        setShowCameraDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                        cameraMode === 'iso' ? 'bg-[#eaf2ec] text-[#1b382b] font-bold' : 'text-[#5b7566] hover:bg-[#f4f8f5]'
                      }`}
                    >
                      Iso 3D
                    </button>
                    <button
                      onClick={() => {
                        setCameraMode('perspective');
                        setShowCameraDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                        cameraMode === 'perspective' ? 'bg-[#eaf2ec] text-[#1b382b] font-bold' : 'text-[#5b7566] hover:bg-[#f4f8f5]'
                      }`}
                    >
                      Perspective
                    </button>
                    <button
                      onClick={() => {
                        setCameraMode('top');
                        setShowCameraDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                        cameraMode === 'top' ? 'bg-[#eaf2ec] text-[#1b382b] font-bold' : 'text-[#5b7566] hover:bg-[#f4f8f5]'
                      }`}
                    >
                      Top View
                    </button>
                  </div>
                )}
              </div>

              {/* Audio Toggle */}
              <button
                onClick={() => {
                  toggleSound();
                  sound.playClick();
                }}
                className="p-1.5 bg-[#f4f8f5] border border-[#d8e5dc] hover:bg-[#eaf2ec] text-[#5b7566] hover:text-[#1b382b] rounded-xl transition-all cursor-pointer"
                title={soundEnabled ? 'Mute sound' : 'Enable sound'}
              >
                {soundEnabled ? <Volume2 size={14} className="text-[#2d6a4f]" /> : <VolumeX size={14} />}
              </button>

              {/* Reset / Restart Workspace */}
              <button
                onClick={handleClearWorkspace}
                className="p-1.5 bg-[#f4f8f5] border border-[#d8e5dc] hover:bg-[#eaf2ec] text-[#5b7566] hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                title="Restart & clear moves"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* 3D Diorama Canvas Container */}
          <div className="rounded-2xl overflow-hidden relative border border-[#d8e5dc] bg-[#dce8e0] min-h-[410px] flex items-center justify-center">
            {/* Top-Left Status Pill Badge */}
            <div className="absolute top-3 left-3 z-20">
              <div className="px-3 py-1 bg-white/90 backdrop-blur-md border border-[#c8dad0] rounded-full text-xs font-bold text-[#1b382b] flex items-center gap-2 shadow-soft">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPlaying
                      ? 'bg-amber-500 animate-pulse'
                      : activeStep.status === 'success'
                      ? 'bg-[#10b981]'
                      : activeStep.status === 'collision'
                      ? 'bg-rose-500'
                      : 'bg-[#2d6a4f]'
                  }`}
                />
                <span>
                  {isPlaying
                    ? `Running move ${currentStepIndex + 1} of ${blocks.length}...`
                    : activeStep.status === 'success'
                    ? 'Mission accomplished! 🌟'
                    : activeStep.status === 'collision'
                    ? 'Obstacle hit!'
                    : 'Ready to explore'}
                </span>
              </div>
            </div>

            {/* Top-Right Gem Progress Pill Badge */}
            <div className="absolute top-3 right-3 z-20">
              <div className="px-3 py-1 bg-white/90 backdrop-blur-md border border-[#c8dad0] rounded-full text-xs font-bold text-[#1b382b] flex items-center gap-1.5 shadow-soft">
                <span className="text-xs">💎</span>
                <span>
                  {activeStep.crystalsCollected.length} / {mission.crystals.length}
                </span>
              </div>
            </div>

            {/* 3D WebGL Diorama Canvas */}
            <GameScene3D
              gridSize={mission.gridSize}
              startPos={mission.startPos}
              goalPos={mission.goalPos}
              obstacles={mission.obstacles}
              crystals={mission.crystals}
              switches={mission.switches}
              activeStep={activeStep}
              petType={pet?.pet_type || 'fox'}
              equipped={pet?.equipped_items}
              theme="forest"
              cameraPreset={cameraMode}
              showControls={false}
              height="410px"
            />

            {/* Bottom Floating AI Command Bar ("Do anything") */}
            <div className="absolute bottom-4 inset-x-0 mx-auto w-11/12 max-w-md z-20">
              <form
                onSubmit={handleAiPromptSubmit}
                className="bg-[#1c2821] text-white px-4 py-2.5 rounded-full shadow-float border border-[#2f4236] flex items-center justify-between gap-3 transition-all focus-within:ring-2 focus-within:ring-[#2d6a4f]"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-[#2d6a4f]/40 flex items-center justify-center shrink-0">
                    <Sparkles size={13} className="text-[#a7f3d0]" />
                  </div>
                  <input
                    type="text"
                    value={aiPromptInput}
                    onChange={(e) => setAiPromptInput(e.target.value)}
                    placeholder="Do anything"
                    className="bg-transparent text-xs text-white placeholder:text-[#7a9386] outline-none flex-1 font-medium"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playSparkle();
                      setShowAiHelper(true);
                    }}
                    className="p-1 text-[#7a9386] hover:text-white transition-colors cursor-pointer"
                    title="Speak or trigger AI Hint"
                  >
                    <Mic size={14} />
                  </button>

                  <button
                    type="submit"
                    className="p-1.5 bg-[#2d6a4f] hover:bg-[#387a5b] text-white rounded-full transition-all cursor-pointer active:scale-95"
                    title="Execute instruction"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </form>

              {/* Instant feedback notification from AI Prompt */}
              {aiPromptResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-center text-[11px] font-bold text-[#1b382b] bg-white/95 px-3 py-1 rounded-full border border-[#c8dad0] shadow-soft max-w-xs mx-auto"
                >
                  {aiPromptResponse}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: "Make your move" Action Panel */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card flex flex-col justify-between space-y-5">
          {/* Card Header */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-[#1b382b]">
                Make your move
              </h2>
              <button
                onClick={handleRunSimulation}
                disabled={isPlaying || blocks.length === 0}
                className="px-3.5 py-1 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-lg text-xs font-black tracking-wider uppercase shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
              >
                <Play size={11} className="fill-white" />
                <span>{isPlaying ? 'RUNNING' : 'PLAY'}</span>
              </button>
            </div>
            <p className="text-xs text-[#5b7566] font-medium">
              Add moves in order, then watch your pet go.
            </p>
          </div>

          {/* Directional Move Buttons Grid (2x2) matching screenshot */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Forward Button */}
            <button
              onClick={() => handleDirectMove('forward')}
              className="p-3 bg-[#eaf2ec] hover:bg-[#dde8df] border border-[#dce7df] text-[#1b382b] rounded-xl flex items-center justify-between font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-2">
                <ArrowUp size={15} className="text-[#2d6a4f] group-hover:-translate-y-0.5 transition-transform" />
                <span>Forward</span>
              </div>
              <span className="text-[10px] font-mono text-[#7a9386]">↑</span>
            </button>

            {/* Turn Left Button */}
            <button
              onClick={() => handleDirectMove('turn_left')}
              className="p-3 bg-[#eaf2ec] hover:bg-[#dde8df] border border-[#dce7df] text-[#1b382b] rounded-xl flex items-center justify-between font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-2">
                <CornerUpLeft size={15} className="text-[#2d6a4f] group-hover:-translate-x-0.5 transition-transform" />
                <span>Turn left</span>
              </div>
              <span className="text-[10px] font-mono text-[#7a9386]">←</span>
            </button>

            {/* Turn Right Button */}
            <button
              onClick={() => handleDirectMove('turn_right')}
              className="p-3 bg-[#eaf2ec] hover:bg-[#dde8df] border border-[#dce7df] text-[#1b382b] rounded-xl flex items-center justify-between font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-2">
                <CornerUpRight size={15} className="text-[#2d6a4f] group-hover:translate-x-0.5 transition-transform" />
                <span>Turn right</span>
              </div>
              <span className="text-[10px] font-mono text-[#7a9386]">→</span>
            </button>

            {/* Back Button */}
            <button
              onClick={() => handleDirectMove('back')}
              className="p-3 bg-[#eaf2ec] hover:bg-[#dde8df] border border-[#dce7df] text-[#1b382b] rounded-xl flex items-center justify-between font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-2">
                <ArrowDown size={15} className="text-[#2d6a4f] group-hover:translate-y-0.5 transition-transform" />
                <span>Back</span>
              </div>
              <span className="text-[10px] font-mono text-[#7a9386]">↓</span>
            </button>
          </div>

          {/* Secondary Action Toolbar: Jump / Collect / Repeat / Code Mode Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-[#f0f5f1] text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleDirectMove('interact')}
                className="px-2.5 py-1 bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#d8e5dc] text-[#1b382b] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Interact or Collect Gem"
              >
                <Hand size={12} className="text-[#2d6a4f]" />
                <span>Collect</span>
              </button>

              <button
                onClick={() => handleDirectMove('jump')}
                className="px-2.5 py-1 bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#d8e5dc] text-[#1b382b] rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                title="Jump forward"
              >
                🦘 Jump
              </button>

              <button
                onClick={() => handleAddBlock('repeat')}
                className="px-2.5 py-1 bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#d8e5dc] text-[#1b382b] rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                title="Repeat Loop x3"
              >
                🔁 Loop(3)
              </button>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setActiveWorkspaceTab(activeWorkspaceTab === 'code' ? 'visual' : 'code');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeWorkspaceTab === 'code'
                  ? 'bg-[#1b382b] text-white'
                  : 'text-[#5b7566] hover:text-[#1b382b]'
              }`}
            >
              <Code2 size={12} />
              <span>Code</span>
            </button>
          </div>

          {/* Coder Mode Textarea OR Next Moves Visual Queue */}
          {activeWorkspaceTab === 'code' ? (
            <div className="space-y-2">
              <DarkIdeEditor
                mission={mission}
                language={coderLanguage}
                code={rawCodeInput}
                onCodeChange={handleCodeChange}
                onLanguageChange={(newLang) => {
                  setCoderLanguage(newLang);
                  setRawCodeInput(blocksToCode(blocks, newLang));
                }}
                onResetCode={() => {
                  const initial =
                    mission.initialBlocks && mission.initialBlocks.length > 0
                      ? [...mission.initialBlocks]
                      : [];
                  setBlocks(initial);
                  setRawCodeInput(blocksToCode(initial, coderLanguage));
                }}
                minHeight="h-44 sm:h-52"
              />
            </div>
          ) : (
            /* "Your next moves" Queue Section */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-[#1b382b]">
                    Your next moves
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[#eaf2ec] text-[10px] font-bold text-[#2d6a4f]">
                    {blocks.length}
                  </span>
                </div>

                {blocks.length > 0 && (
                  <button
                    onClick={handleClearWorkspace}
                    className="text-[11px] font-semibold text-[#7a9386] hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Empty state container matching screenshot */}
              {blocks.length === 0 ? (
                <div className="border border-dashed border-[#c8dad0] bg-[#f8faf8] rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 min-h-[140px]">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#d8e5dc] flex items-center justify-center text-[#7a9386] shadow-sm">
                    <Plus size={16} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-[#5b7566]">
                      A little plan goes a long way.
                    </p>
                    <p className="text-[11px] text-[#7a9386]">
                      Choose your first move above.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-h-[190px] overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5">
                  {blocks.map((b, i) => {
                    const isCurrentStep = simulationResult && currentStepIndex === i + 1;
                    return (
                      <div
                        key={b.id || i}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          isCurrentStep
                            ? 'bg-[#2d6a4f] text-white border-[#2d6a4f] shadow-md scale-102'
                            : 'bg-[#f8faf8] border-[#e2ece5] text-[#1b382b]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              isCurrentStep ? 'bg-white text-[#2d6a4f]' : 'bg-[#eaf2ec] text-[#5b7566]'
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="capitalize">
                            {b.type.replace('_', ' ')}
                          </span>
                          {b.params?.count && (
                            <span className="text-[10px] bg-[#eaf2ec] text-[#2d6a4f] px-1.5 py-0.2 rounded font-mono">
                              x{b.params.count}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleRemoveBlock(i)}
                          className="text-[#7a9386] hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                          title="Remove step"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Collision or Execution Error Notification */}
          {lastErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl text-center">
              {lastErrorMsg}
            </div>
          )}

          {/* Victory Cleared Toast */}
          {simulationResult?.success && !isPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 bg-[#eaf2ec] border border-[#c8dad0] rounded-2xl flex items-center justify-between gap-3 shadow-soft"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🏆</span>
                <div>
                  <div className="text-xs font-black text-[#1b382b]">
                    Mission Cleared!
                  </div>
                  <div className="text-[10px] text-[#5b7566] font-medium">
                    +{mission.xpReward} XP earned
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setShowAiLevelModal(true);
                }}
                className="px-3 py-1.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-bold text-xs rounded-xl shadow-soft flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Sparkles size={12} className="text-[#a7f3d0]" /> Next level
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* STAGE 2 "DISCOVER" CODE REVEAL CELEBRATION MODAL */}
      <AnimatePresence>
        {showRevealModal && (
          <div className="fixed inset-0 z-50 bg-[#163324]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-white border border-[#e2ece5] rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl relative overflow-hidden"
            >
              <div className="flex flex-col items-center justify-center">
                {pet && (
                  <div className="relative mb-2">
                    <PetSVG
                      type={pet.pet_type}
                      stage={pet.stage}
                      state="excited"
                      equipped={pet.equipped_items}
                      size={90}
                    />
                  </div>
                )}
                <div className="w-12 h-12 rounded-2xl bg-[#eaf2ec] border border-[#d8e5dc] flex items-center justify-center mx-auto shadow-soft">
                  <Sparkles size={24} className="text-[#2d6a4f]" />
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-black text-[#2d6a4f] tracking-wider">
                  Stage 2: Discovery Unlocked
                </span>
                <h3 className="text-2xl font-black text-[#1b382b] mt-1">
                  You Just Wrote Code!
                </h3>
                <p className="text-xs text-[#5b7566] mt-2 leading-relaxed">
                  Your actions were automatically translated into real code behind the scenes:
                </p>
              </div>

              {/* Code Reveal Box */}
              <div className="bg-[#f4f8f5] p-4 rounded-2xl border border-[#d8e5dc] font-mono text-left text-xs text-[#1b382b] space-y-1 shadow-inner max-h-[140px] overflow-y-auto custom-scrollbar">
                {simulationResult?.revealedCode?.map((line, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[#7a9386] select-none text-[10px] w-4">{i + 1}</span>
                    <span className="text-[#2d6a4f] font-semibold">{line}</span>
                  </div>
                ))}
              </div>

              {/* Rewards */}
              <div className="grid grid-cols-2 gap-3 py-1">
                <div className="p-3 bg-[#eaf2ec] border border-[#d8e5dc] rounded-2xl text-[#1b382b] font-bold text-xs flex items-center justify-center gap-1.5">
                  <Zap size={14} className="text-amber-600" /> +{mission.xpReward} XP
                </div>
                <div className="p-3 bg-[#eaf2ec] border border-[#d8e5dc] rounded-2xl text-[#1b382b] font-bold text-xs flex items-center justify-center gap-1.5">
                  <span className="text-xs">💎</span> +{mission.coinReward} Gems
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={() => setShowRevealModal(false)}
                  className="flex-1 py-3 bg-[#2d6a4f] hover:bg-[#245740] font-black text-white rounded-2xl text-xs transition-all cursor-pointer active:scale-95 shadow-soft"
                >
                  CONTINUE →
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
