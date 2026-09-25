import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Play, RotateCcw, CheckCircle2, AlertCircle, Box,
  Sparkles, Zap, Map, ChevronDown, ChevronRight,
  Terminal, Code2, Bot, Layers, Check, HelpCircle,
  Volume2, VolumeX, Eye, Lightbulb, Trash2, Plus, ArrowRight,
  ArrowUp, ArrowDown, CornerDownLeft, Award, Lock, BookOpen, Send, Mic, KeyRound
} from 'lucide-react';
import {
  PROGRESSIVE_MISSIONS,
  CONCEPT_SET_ORDER,
  CONCEPT_SET_LABELS
} from '@/data/progressiveMissions';
import type {
  MissionDefinition,
  VisualBlock,
  SimulationResult,
  SimulationStep,
  BlockType
} from '@/types/game';
import { runDeterministicSimulation } from '@/services/gameEngine';
import { compilePython, compileJavaScript, compileC } from '@/services/academyCompiler';
import { useGameData } from '@/hooks/useGameData';
import { GameScene3D } from '@/components/game3d/GameScene3D';
import { PetSVG } from '@/components/PetSVG';
import { sound } from '@/utils/audio';
import type { PetState, PetType } from '@/types/database';
import { DarkIdeEditor } from '@/components/coding/DarkIdeEditor';
import { CodespaceHintModal } from '@/components/coding/CodespaceHintModal';
import { CodespaceSolutionModal } from '@/components/coding/CodespaceSolutionModal';
import { getProblemHints, getProblemSolution } from '@/services/codingSolutionService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers & Constants
// ─────────────────────────────────────────────────────────────────────────────

type WorkspaceTab = 'blocks' | 'python' | 'javascript' | 'c';

const BLOCK_DEFS: { type: BlockType; label: string; icon: string; desc: string }[] = [
  { type: 'move_forward', label: 'Forward', icon: '↑', desc: 'Walk 1 tile forward in facing direction' },
  { type: 'turn_left',    label: 'Turn Left', icon: '↺', desc: 'Rotate 90 degrees counter-clockwise' },
  { type: 'turn_right',   label: 'Turn Right', icon: '↻', desc: 'Rotate 90 degrees clockwise' },
  { type: 'move_back',    label: 'Back', icon: '↓', desc: 'Step 1 tile backward' },
  { type: 'move_right',   label: 'Right', icon: '→', desc: 'Slide 1 tile to the right' },
  { type: 'move_left',    label: 'Left', icon: '←', desc: 'Slide 1 tile to the left' },
  { type: 'repeat',       label: 'Repeat', icon: '🔄', desc: 'Loop enclosed actions N times' },
  { type: 'interact',     label: 'Collect', icon: '💎', desc: 'Pick up crystal or activate switch' },
];

function getStarterCode(mission: MissionDefinition, lang: 'python' | 'javascript' | 'c'): string {
  if (lang === 'c') {
    if (mission.conceptSet === 'loops' || mission.id.includes('loop')) {
      return `#include <stdio.h>\n#include "petslyvia.h"\n\nint main() {\n    // Set 3 · Loops — C17 Codespace\n    // Objective: ${mission.objective}\n    for (int step = 0; step < 8; step++) {\n        move_right();\n    }\n    return 0;\n}\n`;
    }
    if (mission.conceptSet === 'conditions' || mission.id.includes('cond')) {
      return `#include <stdio.h>\n#include "petslyvia.h"\n\nint main() {\n    // Set 2 · Conditions — C17 Codespace\n    move_forward();\n    turn_right();\n    for (int i = 0; i < 3; i++) {\n        move_forward();\n    }\n    return 0;\n}\n`;
    }
    if (mission.conceptSet === 'variables' || mission.id.includes('var')) {
      return `#include <stdio.h>\n#include "petslyvia.h"\n\nint main() {\n    int steps = 4;\n    for (int i = 0; i < steps; i++) {\n        move_right();\n    }\n    return 0;\n}\n`;
    }
    if (mission.conceptSet === 'functions') {
      return `#include <stdio.h>\n#include "petslyvia.h"\n\nvoid navigate_path() {\n    for (int i = 0; i < 4; i++) {\n        move_forward();\n    }\n    turn_right();\n}\n\nint main() {\n    navigate_path();\n    return 0;\n}\n`;
    }
    return `#include <stdio.h>\n#include "petslyvia.h"\n\nint main() {\n    // Objective: ${mission.objective}\n    move_right();\n    move_right();\n    move_right();\n    return 0;\n}\n`;
  }
  if (lang === 'python') {
    if (mission.conceptSet === 'loops' || mission.id.includes('loop')) {
      return `# Set 3 · Loops — Python 3.12 Codespace\n# Objective: ${mission.objective}\n\nfor step in range(8):\n    pet.move_right()\n`;
    }
    if (mission.conceptSet === 'conditions' || mission.id.includes('cond')) {
      return `# Set 2 · Conditions — Python 3.12 Codespace\n# Check state and make smart decisions\n\npet.move_forward()\npet.turn_right()\nfor step in range(3):\n    pet.move_forward()\n`;
    }
    if (mission.conceptSet === 'variables' || mission.id.includes('var')) {
      return `# Set 1 · Variables — Python 3.12 Codespace\nsteps = 4\nfor step in range(steps):\n    pet.move_right()\n`;
    }
    if (mission.conceptSet === 'functions') {
      return `# Set 4 · Functions — Python 3.12 Codespace\ndef navigate_path():\n    for i in range(4):\n        pet.move_forward()\n    pet.turn_right()\n\nnavigate_path()\n`;
    }
    return `# Petslyvia Academy — Python 3.12 Codespace\n# Objective: ${mission.objective}\n\npet.move_right()\npet.move_right()\npet.move_right()\n`;
  } else {
    if (mission.conceptSet === 'loops' || mission.id.includes('loop')) {
      return `// Set 3 · Loops — JavaScript Codespace\n// Objective: ${mission.objective}\n\nfor (let i = 0; i < 8; i++) {\n  pet.moveRight();\n}\n`;
    }
    if (mission.conceptSet === 'conditions' || mission.id.includes('cond')) {
      return `// Set 2 · Conditions — JavaScript Codespace\npet.moveForward();\npet.turnRight();\nfor (let i = 0; i < 3; i++) {\n  pet.moveForward();\n}\n`;
    }
    return `// Petslyvia Academy — JavaScript Codespace\n// Objective: ${mission.objective}\n\npet.moveRight();\npet.moveRight();\npet.moveRight();\n`;
  }
}

export function AcademyPage() {
  const { profile, pet, progress, completeMission, soundEnabled, toggleSound } = useGameData();

  // Completed mission set
  const completedIds = new Set(
    Object.keys(progress || {}).filter((k) => (progress as any)[k]?.completed)
  );

  // Mission selection state
  const [selectedIdx, setSelectedIdx] = useState(0);
  const mission = PROGRESSIVE_MISSIONS[selectedIdx] || PROGRESSIVE_MISSIONS[0];

  // Concept set filter
  const [activeConceptSet, setActiveConceptSet] = useState<string>(mission.conceptSet || 'sequence');

  // Workspace Mode (Blocks / Python / JavaScript / C)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('blocks');
  const [blocks, setBlocks] = useState<VisualBlock[]>([]);
  const [repeatCount, setRepeatCount] = useState(3);

  // Code editor states
  const [pythonCode, setPythonCode] = useState(() => getStarterCode(mission, 'python'));
  const [jsCode, setJsCode] = useState(() => getStarterCode(mission, 'javascript'));
  const [cCode, setCCode] = useState(() => getStarterCode(mission, 'c'));
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [compilerError, setCompilerError] = useState<string | null>(null);

  // 3D Viewport Controls
  const [viewMode3D, setViewMode3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<'iso' | 'perspective' | 'top' | 'follow'>('iso');
  const [showCameraDropdown, setShowCameraDropdown] = useState(false);

  // Simulation execution state
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [petState, setPetState] = useState<PetState>('focused');
  const [missionSuccessModal, setMissionSuccessModal] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [academyHintModalOpen, setAcademyHintModalOpen] = useState(false);
  const [academySolutionModalOpen, setAcademySolutionModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Safe pet attributes
  const petType = ((pet as any)?.pet_type || (pet as any)?.type || 'fox') as PetType;
  const petName = (pet as any)?.pet_name || (pet as any)?.name || 'Pebble';

  // Synchronize when mission changes
  useEffect(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    const initBlocks = mission.initialBlocks ? [...mission.initialBlocks] : [];
    setBlocks(initBlocks);
    setPythonCode(getStarterCode(mission, 'python'));
    setJsCode(getStarterCode(mission, 'javascript'));
    setCCode(getStarterCode(mission, 'c'));
    setSimResult(null);
    setStepIdx(0);
    setIsPlaying(false);
    setCompilerError(null);
    setMissionSuccessModal(false);
    setShowHint(false);
    setPetState('focused');
    setTerminalLogs([
      `📘 Mission Loaded: ${mission.title}`,
      `🎯 Goal: ${mission.objective}`,
      `Ready to write code or arrange blocks.`,
    ]);

    if (mission.learningMode === 'typed' || mission.learningMode === 'debug') {
      setActiveTab('python');
    }
  }, [mission.id]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, []);

  // Filtered missions in active concept set
  const missionsInSet = PROGRESSIVE_MISSIONS.filter(
    (m) => (m.conceptSet || 'sequence') === activeConceptSet
  );

  // Language & Solutions for Academy Modals
  const currentLang = (activeTab === 'blocks' ? 'c' : activeTab) as 'c' | 'python' | 'javascript';
  const academyHints = getProblemHints(mission, currentLang);
  const academySolutionC = getProblemSolution(mission, 'c');
  const academySolutionPython = getProblemSolution(mission, 'python');
  const academySolutionJs = getProblemSolution(mission, 'javascript');

  // Switch Mission handler
  const handleSelectMission = (m: MissionDefinition) => {
    sound.playClick();
    const idx = PROGRESSIVE_MISSIONS.findIndex((p) => p.id === m.id);
    if (idx !== -1) {
      setSelectedIdx(idx);
    }
  };

  // Switch Concept Set
  const handleSelectConceptSet = (cSet: string) => {
    sound.playClick();
    setActiveConceptSet(cSet);
    const firstM = PROGRESSIVE_MISSIONS.find((m) => (m.conceptSet || 'sequence') === cSet);
    if (firstM) {
      const idx = PROGRESSIVE_MISSIONS.findIndex((p) => p.id === firstM.id);
      if (idx !== -1) setSelectedIdx(idx);
    }
  };

  // Block builders
  const handleAddBlock = (type: BlockType) => {
    sound.playSnap();
    const newBlock: VisualBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      params: type === 'repeat' ? { count: repeatCount } : undefined,
    };
    const updated = [...blocks, newBlock];
    setBlocks(updated);

    // Auto-update terminal log
    setTerminalLogs((prev) => [...prev, `[BUILDER] Added block: ${type}`]);
  };

  const handleRemoveBlock = (idx: number) => {
    sound.playClick();
    const updated = blocks.filter((_, i) => i !== idx);
    setBlocks(updated);
  };

  const handleClearBlocks = () => {
    sound.playClick();
    setBlocks([]);
    setTerminalLogs((prev) => [...prev, `[BUILDER] Cleared all blocks.`]);
  };

  // Insert code snippet
  const handleInsertSnippet = (snippet: string) => {
    sound.playSnap();
    if (activeTab === 'python') {
      setPythonCode((prev) => `${prev.trimEnd()}\n${snippet}\n`);
    } else if (activeTab === 'javascript') {
      setJsCode((prev) => `${prev.trimEnd()}\n${snippet}\n`);
    } else {
      setCCode((prev) => `${prev.trimEnd()}\n        ${snippet}\n`);
    }
  };

  // Execute Simulation
  const handleRunProgram = () => {
    if (isPlaying) return;

    sound.playClick();
    setCompilerError(null);
    let blocksToExecute: VisualBlock[] = [];

    if (activeTab === 'blocks') {
      if (blocks.length === 0) {
        sound.playError();
        setCompilerError('Add at least one move block before running!');
        setPetState('tired');
        return;
      }
      blocksToExecute = blocks;
      setTerminalLogs((prev) => [
        ...prev,
        `▶ Running Block Sequence (${blocks.length} blocks)...`,
      ]);
    } else if (activeTab === 'python') {
      const compileRes = compilePython(pythonCode);
      setTerminalLogs(compileRes.logs);

      if (!compileRes.success || compileRes.blocks.length === 0) {
        sound.playError();
        setCompilerError(compileRes.error || 'Python compilation failed.');
        setPetState('tired');
        return;
      }
      blocksToExecute = compileRes.blocks;
    } else if (activeTab === 'javascript') {
      const compileRes = compileJavaScript(jsCode);
      setTerminalLogs(compileRes.logs);

      if (!compileRes.success || compileRes.blocks.length === 0) {
        sound.playError();
        setCompilerError(compileRes.error || 'JavaScript execution failed.');
        setPetState('tired');
        return;
      }
      blocksToExecute = compileRes.blocks;
    } else if (activeTab === 'c') {
      const compileRes = compileC(cCode);
      setTerminalLogs(compileRes.logs);

      if (!compileRes.success || compileRes.blocks.length === 0) {
        sound.playError();
        setCompilerError(compileRes.error || 'C compilation failed.');
        setPetState('tired');
        return;
      }
      blocksToExecute = compileRes.blocks;
    }

    // Run deterministic grid simulation
    const result = runDeterministicSimulation(
      mission.gridSize,
      mission.startPos,
      mission.startDir,
      mission.goalPos,
      mission.obstacles,
      mission.crystals,
      mission.switches,
      blocksToExecute
    );

    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    setSimResult(result);
    setIsPlaying(true);
    setStepIdx(0);
    setPetState('energetic');

    let current = 0;
    simIntervalRef.current = setInterval(() => {
      current++;
      if (current < result.steps.length) {
        setStepIdx(current);
        sound.playStep();
      } else {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        setIsPlaying(false);

        if (result.success) {
          sound.playVictory();
          setPetState('excited');
          setMissionSuccessModal(true);
          setTerminalLogs((prev) => [
            ...prev,
            `🎉 SUCCESS! Target reached safely.`,
            `+${mission.xpReward} XP earned! +${mission.coinReward} gems!`,
          ]);
          completeMission(
            mission.id,
            mission.xpReward,
            mission.coinReward,
            { logic: 20 } as any
          );
        } else {
          sound.playError();
          setPetState('tired');
          setCompilerError(result.message);
          setTerminalLogs((prev) => [
            ...prev,
            `⚠️ Run ended without reaching goal: ${result.message}`,
          ]);
        }
      }
    }, 450);
  };

  // Reset simulator
  const handleReset = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setSimResult(null);
    setStepIdx(0);
    setIsPlaying(false);
    setCompilerError(null);
    setPetState('focused');
  };

  // Next mission
  const handleNextMission = () => {
    setMissionSuccessModal(false);
    if (selectedIdx < PROGRESSIVE_MISSIONS.length - 1) {
      setSelectedIdx(selectedIdx + 1);
    }
  };

  // AI Game Master Prompt Submit
  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    sound.playClick();
    const query = aiPrompt.toLowerCase();
    setAiPrompt('');

    if (query.includes('hint') || query.includes('how') || query.includes('stuck')) {
      const hint = mission.hints?.[0] || 'Try breaking the movement into individual steps or loops!';
      setAiMessage(`🤖 Pet Tutor: ${hint}`);
    } else if (query.includes('python')) {
      setAiMessage(`🐍 Python Tip: Use \`for step in range(${mission.gridSize.width}): pet.move_right()\` to loop!`);
    } else {
      setAiMessage(`🐾 ${petName}: Let's do this together! Check your steps and run the simulation.`);
    }
  };

  // Current active step for 3D animation
  const activeStep: SimulationStep = simResult?.steps[stepIdx] ?? {
    stepIndex: 0,
    petPos: mission.startPos,
    petDir: mission.startDir,
    petAction: 'idle',
    crystalsCollected: [],
    openGates: [],
    status: 'running',
    message: 'Ready to explore',
  };

  const crystalsRemaining =
    mission.crystals.length - (activeStep.crystalsCollected?.length || 0);

  return (
    <div className="space-y-6 pb-14 font-sans text-[#1b382b]">
      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* TOP HEADER & STAGE BANNER (Matches Image 2 Aesthetic) */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Category Eyebrow */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#5b7566] tracking-[0.2em] uppercase mb-1">
            <span className="text-xs">🧭</span>
            <span>PETSLYVIA ACADEMY · PROGRESSIVE CODING SYSTEM</span>
          </div>

          {/* Main Title & Concept Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-[#1b382b] tracking-tight">
              {mission.title}
            </h1>
            <span className="px-3 py-0.5 rounded-full bg-[#e2ece5] text-[#2d6a4f] text-[11px] font-bold border border-[#d5e3da] flex items-center gap-1">
              <Sparkles size={11} className="text-[#2d6a4f]" />
              {mission.progressLabel || `Set ${mission.conceptSet?.toUpperCase()}`}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white text-[#5b7566] text-[11px] font-semibold border border-[#d8e5dc]">
              {(mission.learningMode || 'guided').toUpperCase()} MODE
            </span>
          </div>

          <p className="text-xs text-[#5b7566] font-medium mt-1.5 max-w-2xl leading-relaxed">
            {mission.story || mission.objective}
          </p>
        </div>

        {/* Top Actions: World Map & Audio */}
        <div className="flex items-center gap-2">
          <Link
            to="/app"
            className="px-4 py-2 bg-white border border-[#d8e5dc] rounded-2xl text-xs font-bold text-[#1b382b] hover:bg-[#eaf2ec] shadow-soft flex items-center gap-2 transition-all cursor-pointer group"
          >
            <Map size={14} className="text-[#5b7566] group-hover:text-[#1b382b]" />
            <span>World map</span>
          </Link>

          <button
            onClick={toggleSound}
            className="w-9 h-9 rounded-2xl bg-white border border-[#d8e5dc] flex items-center justify-center text-[#5b7566] hover:text-[#1b382b] shadow-soft transition-all"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* CONCEPT SETS & MISSION SELECTION BAR */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-3 border border-[#e2ece5] shadow-sm space-y-2.5">
        {/* Concept Set Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {CONCEPT_SET_ORDER.map((cSet) => {
            const count = PROGRESSIVE_MISSIONS.filter(
              (m) => (m.conceptSet || 'sequence') === cSet
            ).length;
            const completedCount = PROGRESSIVE_MISSIONS.filter(
              (m) => (m.conceptSet || 'sequence') === cSet && completedIds.has(m.id)
            ).length;
            const isSelected = activeConceptSet === cSet;
            const cMeta = CONCEPT_SET_LABELS[cSet];

            return (
              <button
                key={cSet}
                onClick={() => handleSelectConceptSet(cSet)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#2d6a4f] text-white shadow-soft'
                    : 'bg-[#f8faf8] hover:bg-[#eaf2ec] text-[#5b7566]'
                }`}
              >
                <span>{cMeta ? `${cMeta.icon} ${cMeta.label}` : cSet}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#e2ece5] text-[#2d6a4f]'
                  }`}
                >
                  {completedCount}/{count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mission Pills in Active Set */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-1 border-t border-[#f0f5f1]">
          <span className="text-[11px] font-bold text-[#7a9386] px-1 shrink-0">
            Missions:
          </span>
          {missionsInSet.map((m, idx) => {
            const isCurrent = m.id === mission.id;
            const isDone = completedIds.has(m.id);

            return (
              <button
                key={m.id}
                onClick={() => handleSelectMission(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-[#eaf2ec] text-[#1b382b] font-black border border-[#2d6a4f]/30 ring-1 ring-[#2d6a4f]'
                    : isDone
                    ? 'bg-[#f4f8f5] text-[#2d6a4f] border border-[#d8e5dc]'
                    : 'bg-white text-[#5b7566] border border-[#e2ece5] hover:bg-[#f8faf8]'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={13} className="text-[#2d6a4f]" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7a9386]" />
                )}
                <span>
                  {idx + 1}. {m.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MAIN GRID: 3D DIORAMA (LEFT) + WORKSPACE / CODESPACE (RIGHT) */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* CENTER / LEFT: 3D Animated Isometric Scene (Like Image 2)   */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card flex flex-col space-y-4 relative">
          {/* Diorama Header Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#1b382b]">
                Mission {mission.number || selectedIdx + 1}
              </span>
              <span className="text-xs text-[#7a9386]">|</span>
              <span className="text-xs text-[#5b7566] font-medium">
                {mission.objective || 'Guide your pet safely to the destination'}
              </span>
            </div>

            {/* Viewport Action Controls */}
            <div className="flex items-center gap-2">
              {/* 3D / 2D Segmented Switch */}
              <div className="flex items-center bg-[#f4f8f5] p-0.5 rounded-xl border border-[#d8e5dc]">
                <button
                  onClick={() => {
                    sound.playClick();
                    setViewMode3D(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewMode3D
                      ? 'bg-white text-[#1b382b] shadow-xs font-black'
                      : 'text-[#7a9386] hover:text-[#1b382b]'
                  }`}
                >
                  3D Engine
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    setViewMode3D(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    !viewMode3D
                      ? 'bg-[#2d6a4f] text-white shadow-xs font-black'
                      : 'text-[#7a9386] hover:text-[#1b382b]'
                  }`}
                >
                  2D Grid
                </button>
              </div>

              {/* Camera Preset Dropdown (Available in 3D Mode) */}
              {viewMode3D && (
                <div className="relative">
                  <button
                    onClick={() => setShowCameraDropdown(!showCameraDropdown)}
                    className="px-2.5 py-1 bg-[#f4f8f5] border border-[#d8e5dc] hover:bg-[#eaf2ec] rounded-xl text-xs font-bold text-[#1b382b] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Box size={13} className="text-[#5b7566]" />
                    <span>
                      {cameraMode === 'iso'
                        ? 'Iso 3D'
                        : cameraMode === 'perspective'
                        ? 'Perspective'
                        : 'Top View'}
                    </span>
                    <ChevronDown size={12} className="text-[#7a9386]" />
                  </button>

                  {showCameraDropdown && (
                    <div className="absolute right-0 top-full mt-1.5 bg-white border border-[#e2ece5] rounded-2xl p-1.5 shadow-lg z-30 min-w-[130px] space-y-1">
                      <button
                        onClick={() => {
                          setCameraMode('iso');
                          setViewMode3D(true);
                          setShowCameraDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                          cameraMode === 'iso'
                            ? 'bg-[#eaf2ec] text-[#1b382b] font-bold'
                            : 'text-[#5b7566] hover:bg-[#f4f8f5]'
                        }`}
                      >
                        Iso 3D
                      </button>
                      <button
                        onClick={() => {
                          setCameraMode('perspective');
                          setViewMode3D(true);
                          setShowCameraDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                          cameraMode === 'perspective'
                            ? 'bg-[#eaf2ec] text-[#1b382b] font-bold'
                            : 'text-[#5b7566] hover:bg-[#f4f8f5]'
                        }`}
                      >
                        Perspective
                      </button>
                      <button
                        onClick={() => {
                          setCameraMode('top');
                          setViewMode3D(true);
                          setShowCameraDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                          cameraMode === 'top'
                            ? 'bg-[#eaf2ec] text-[#1b382b] font-bold'
                            : 'text-[#5b7566] hover:bg-[#f4f8f5]'
                        }`}
                      >
                        Top View
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Reset simulation */}
              <button
                onClick={handleReset}
                className="w-7 h-7 rounded-xl bg-[#f4f8f5] border border-[#d8e5dc] hover:bg-[#eaf2ec] flex items-center justify-center text-[#5b7566] hover:text-[#1b382b] transition-all"
                title="Reset simulation step"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          {/* Canvas Viewport (3D or 2D) */}
          <div className="rounded-2xl overflow-hidden relative border border-[#d8e5dc] bg-[#dce8e0] min-h-[440px] flex items-center justify-center shadow-inner">
            {/* Top Left Floating Status Badge (Matches Image 2) */}
            <div className="absolute top-3.5 left-3.5 z-20 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#d8e5dc] shadow-sm flex items-center gap-2">
                {isPlaying ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-[11px] font-bold text-[#1b382b]">
                      Step {stepIdx + 1} of {simResult?.steps.length || 1}
                    </span>
                  </>
                ) : simResult?.success ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-emerald-800">
                      Goal Reached! 🎉
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#2d6a4f]" />
                    <span className="text-[11px] font-bold text-[#1b382b]">
                      Ready to explore
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Top Right Floating Crystal Counter (Matches Image 2) */}
            <div className="absolute top-3.5 right-3.5 z-20 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#d8e5dc] shadow-sm flex items-center gap-1.5 text-[11px] font-bold text-[#1b382b]">
                <span>💎</span>
                <span>
                  {activeStep.crystalsCollected?.length || 0} / {mission.crystals.length}
                </span>
              </div>
            </div>

            {/* 3D Diorama View or 2D Grid with Live Animated Pet */}
            {viewMode3D ? (
              <GameScene3D
                gridSize={mission.gridSize}
                startPos={mission.startPos}
                goalPos={mission.goalPos}
                obstacles={mission.obstacles}
                crystals={mission.crystals}
                switches={mission.switches}
                activeStep={activeStep}
                petType={petType}
                equipped={pet?.equipped_items}
                theme="forest"
                cameraPreset={cameraMode}
                onCameraPresetChange={setCameraMode}
                showControls={false}
                height="440px"
              />
            ) : (
              /* Rich 2D Interactive Board with Live Pet Companion */
              <div className="w-full h-full min-h-[440px] bg-[#0c1f15] p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden">
                {/* 2D Board Header Info */}
                <div className="mb-3 flex items-center gap-3 text-xs text-white/70">
                  <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-full border border-white/10">
                    <span className="text-amber-400 font-bold">{petName}</span>
                    <span className="text-white/40">·</span>
                    <span>Facing: <strong className="text-white uppercase">{activeStep.petDir}</strong></span>
                    <span className="text-white/40">·</span>
                    <span>Pos: <strong className="text-white">({activeStep.petPos.x}, {activeStep.petPos.y})</strong></span>
                  </div>
                </div>

                {/* 2D Grid Board */}
                <div
                  className="grid gap-2 p-3 sm:p-4 rounded-3xl bg-[#08150e]/90 border-2 border-[#1a422b] shadow-2xl backdrop-blur-md max-w-full overflow-x-auto custom-scrollbar"
                  style={{
                    gridTemplateColumns: `repeat(${mission.gridSize.width}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: mission.gridSize.height }).map((_, y) =>
                    Array.from({ length: mission.gridSize.width }).map((_, x) => {
                      const isPet = activeStep.petPos.x === x && activeStep.petPos.y === y;
                      const isGoal = mission.goalPos.x === x && mission.goalPos.y === y;
                      const isStart = mission.startPos.x === x && mission.startPos.y === y;
                      const hasObstacle = mission.obstacles.some((o) => o.x === x && o.y === y);
                      const crystalDef = mission.crystals.find((c) => c.x === x && c.y === y);
                      const isCollected = crystalDef && activeStep.crystalsCollected?.some((c) => c.x === x && c.y === y);

                      // Responsive cell sizing
                      const width = mission.gridSize.width;
                      const cellClass =
                        width >= 10
                          ? 'w-11 h-11 sm:w-12 sm:h-12'
                          : width >= 7
                          ? 'w-13 h-13 sm:w-14 sm:h-14'
                          : 'w-14 h-14 sm:w-16 sm:h-16';

                      const petIconSize = width >= 10 ? 34 : width >= 7 ? 42 : 48;

                      return (
                        <div
                          key={`${x}-${y}`}
                          className={`${cellClass} rounded-2xl relative flex items-center justify-center transition-all ${
                            isPet
                              ? 'bg-[#18482d] border-2 border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg'
                              : isGoal
                              ? 'bg-[#143e2b] border-2 border-teal-400/80 shadow-md'
                              : hasObstacle
                              ? 'bg-[#2b1814] border-2 border-rose-900/60 shadow-inner'
                              : 'bg-[#122b1e] border border-white/5 hover:border-white/20'
                          }`}
                        >
                          {/* Tile coordinates */}
                          <span className="absolute top-1 left-1.5 text-[8px] font-mono text-white/20 pointer-events-none">
                            {x},{y}
                          </span>

                          {/* 1. Pet on Tile with Live PetSVG */}
                          {isPet && (
                            <motion.div
                              layout
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                              className="relative flex flex-col items-center justify-center z-10"
                            >
                              <PetSVG
                                type={petType}
                                state={petState}
                                stage={(pet as any)?.stage || 'infant'}
                                size={petIconSize}
                                equipped={pet?.equipped_items}
                              />

                              {/* Direction Indicator Badge */}
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#08150e] text-emerald-400 border border-emerald-400/60 flex items-center justify-center text-[10px] font-black shadow-sm">
                                {activeStep.petDir === 'right'
                                  ? '→'
                                  : activeStep.petDir === 'left'
                                  ? '←'
                                  : activeStep.petDir === 'up'
                                  ? '↑'
                                  : '↓'}
                              </div>

                              {/* Pet Speech Bubble */}
                              {petState === 'excited' && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: -16 }}
                                  className="absolute whitespace-nowrap bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg pointer-events-none"
                                >
                                  Goal! 🎉
                                </motion.div>
                              )}
                            </motion.div>
                          )}

                          {/* 2. Goal Portal */}
                          {!isPet && isGoal && (
                            <div className="relative flex flex-col items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-teal-500/20 border-2 border-teal-400 flex items-center justify-center text-base animate-pulse shadow-soft">
                                🌀
                              </div>
                              <span className="text-[8px] font-black text-teal-300 uppercase tracking-widest mt-0.5">
                                Goal
                              </span>
                            </div>
                          )}

                          {/* 3. Crystal Gem */}
                          {!isPet && crystalDef && (
                            <div className="flex flex-col items-center justify-center">
                              {isCollected ? (
                                <span className="text-sm opacity-20 filter grayscale">💎</span>
                              ) : (
                                <span className="text-xl sm:text-2xl filter drop-shadow animate-bounce">
                                  💎
                                </span>
                              )}
                            </div>
                          )}

                          {/* 4. Obstacle */}
                          {!isPet && hasObstacle && (
                            <div className="text-lg opacity-80">
                              🧱
                            </div>
                          )}

                          {/* 5. Start Marker */}
                          {!isPet && !isGoal && isStart && (
                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                              START
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2D Board Legend */}
                <div className="mt-3 flex items-center gap-4 text-[10px] text-white/40">
                  <span className="flex items-center gap-1">🐾 Pet: {petName}</span>
                  <span className="flex items-center gap-1">🌀 Goal Portal</span>
                  <span className="flex items-center gap-1">💎 Crystal Gem</span>
                  <span className="flex items-center gap-1">🧱 Obstacle</span>
                </div>
              </div>
            )}

            {/* Bottom Floating "Do anything" AI Game Master Bar (Matches Image 2) */}
            <div className="absolute bottom-3 inset-x-4 z-20 flex justify-center">
              <form
                onSubmit={handleAskAI}
                className="w-full max-w-md bg-[#1b382b]/90 backdrop-blur-md text-white rounded-full px-4 py-2 border border-white/20 shadow-xl flex items-center gap-3"
              >
                <Bot size={15} className="text-[#a7f3d0] shrink-0" />
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask Pet AI tutor for hint or guidance..."
                  className="w-full bg-transparent text-xs text-white placeholder-white/50 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-white/60 hover:text-white transition-colors"
                  title="Voice input"
                >
                  <Mic size={14} />
                </button>
                <button
                  type="submit"
                  className="w-6 h-6 rounded-full bg-[#2d6a4f] hover:bg-[#3d8363] flex items-center justify-center text-white shrink-0 transition-colors"
                >
                  <Send size={11} />
                </button>
              </form>
            </div>
          </div>

          {/* Dynamic AI message feedback */}
          {aiMessage && (
            <div className="p-3 bg-[#eaf2ec] border border-[#d8e5dc] rounded-2xl text-xs text-[#1b382b] flex items-start justify-between gap-2">
              <p className="font-semibold">{aiMessage}</p>
              <button
                onClick={() => setAiMessage(null)}
                className="text-[#7a9386] hover:text-[#1b382b] text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Educational Concept, Problem Hints & Solution Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#f0f5f1]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAcademyHintModalOpen(true)}
                className="text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-900 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Lightbulb size={13} className="text-amber-600 animate-pulse" />
                <span>💡 Problem Hints (3)</span>
              </button>

              <button
                onClick={() => setAcademySolutionModalOpen(true)}
                className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-900 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <KeyRound size={13} className="text-emerald-600" />
                <span>🔓 View Solution</span>
              </button>
            </div>

            <span className="text-[11px] text-[#7a9386] font-mono">
              Reward: +{mission.xpReward} XP · +{mission.coinReward} gems
            </span>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* RIGHT COLUMN: WORKSPACE / CODESPACE (Python & JS Compilers!)  */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card flex flex-col justify-between space-y-4">
          <div>
            {/* Top Workspace Tab Selector (Blocks / Python / JavaScript) */}
            <div className="flex items-center justify-between mb-3 border-b border-[#f0f5f1] pb-3">
              <span className="text-xs font-black text-[#1b382b] uppercase tracking-wider">
                {activeTab === 'blocks'
                  ? 'MAKE YOUR MOVE'
                  : activeTab === 'python'
                  ? 'PYTHON CODESPACE'
                  : activeTab === 'javascript'
                  ? 'JAVASCRIPT SANDBOX'
                  : 'C LANGUAGE CODESPACE'}
              </span>

              {/* Mode switch pills */}
              <div className="flex items-center gap-1 bg-[#f4f8f5] p-1 rounded-xl border border-[#d8e5dc]">
                <button
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('blocks');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'blocks'
                      ? 'bg-white text-[#1b382b] shadow-sm font-black'
                      : 'text-[#5b7566] hover:text-[#1b382b]'
                  }`}
                >
                  🧩 Blocks
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('python');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'python'
                      ? 'bg-[#2d6a4f] text-white shadow-sm font-black'
                      : 'text-[#5b7566] hover:text-[#1b382b]'
                  }`}
                >
                  🐍 Python
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('javascript');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'javascript'
                      ? 'bg-amber-600 text-white shadow-sm font-black'
                      : 'text-[#5b7566] hover:text-[#1b382b]'
                  }`}
                >
                  ⚡ JS
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('c');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'c'
                      ? 'bg-sky-700 text-white shadow-sm font-black'
                      : 'text-[#5b7566] hover:text-[#1b382b]'
                  }`}
                >
                  ⚙️ C
                </button>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════ */}
            {/* TAB 1: INTERACTIVE BLOCKS BUILDER (Like Image 1 & 2)     */}
            {/* ═════════════════════════════════════════════════════════ */}
            {activeTab === 'blocks' && (
              <div className="space-y-4">
                <p className="text-xs text-[#5b7566] font-medium leading-relaxed">
                  Add moves in order, then watch {petName} go.
                </p>

                {/* Available Action Buttons Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_DEFS.slice(0, 4).map((def) => (
                    <button
                      key={def.type}
                      onClick={() => handleAddBlock(def.type)}
                      className="p-3 bg-[#f8faf8] hover:bg-[#eaf2ec] border border-[#d8e5dc] rounded-2xl text-left transition-all group cursor-pointer active:scale-95 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#1b382b] flex items-center gap-1.5">
                          <span className="text-base text-[#2d6a4f]">{def.icon}</span>
                          {def.label}
                        </span>
                        <Plus size={13} className="text-[#7a9386] group-hover:text-[#1b382b]" />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Repeat Loop Builder Pill */}
                <div className="p-3 bg-[#f0f7f3] border border-[#d3e5da] rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔄</span>
                    <div>
                      <span className="text-xs font-extrabold text-[#1b382b] block">
                        Repeat Loop
                      </span>
                      <span className="text-[10px] text-[#5b7566]">
                        Walks multiple steps automatically
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-[#5b7566]">Count:</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-white text-center font-bold text-xs py-1 rounded-xl border border-[#d8e5dc] outline-none"
                    />
                    <button
                      onClick={() => handleAddBlock('repeat')}
                      className="px-2.5 py-1 bg-[#2d6a4f] text-white rounded-xl text-xs font-bold shadow-soft hover:bg-[#23533e] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Next Moves Queue */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#1b382b]">
                      Your next moves ({blocks.length})
                    </span>
                    {blocks.length > 0 && (
                      <button
                        onClick={handleClearBlocks}
                        className="text-[11px] text-[#7a9386] hover:text-rose-600 transition-colors cursor-pointer font-semibold"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="bg-[#f8faf8] border border-[#d8e5dc] rounded-2xl p-2.5 min-h-[140px] max-h-[190px] overflow-y-auto custom-scrollbar space-y-1.5">
                    {blocks.length === 0 ? (
                      <div className="h-28 flex flex-col items-center justify-center text-center p-3 text-[#7a9386]">
                        <span className="text-xl mb-1">📋</span>
                        <p className="text-xs font-medium">A little plan goes a long way.</p>
                        <p className="text-[11px]">Choose your first move above.</p>
                      </div>
                    ) : (
                      blocks.map((b, idx) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-[#e2ece5] shadow-xs text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-[#eaf2ec] text-[#2d6a4f] text-[10px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-[#1b382b]">
                              {b.type === 'repeat'
                                ? `Repeat ${b.params?.count || 3} times (Right)`
                                : b.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveBlock(idx)}
                            className="text-[#7a9386] hover:text-rose-600 p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════ */}
            {/* TABS 2-4: DARK THEME CODESPACE (C, Python, JavaScript)    */}
            {/* ═════════════════════════════════════════════════════════ */}
            {activeTab !== 'blocks' && (
              <DarkIdeEditor
                mission={mission}
                language={activeTab}
                code={activeTab === 'python' ? pythonCode : activeTab === 'javascript' ? jsCode : cCode}
                onCodeChange={(newCode) => {
                  if (activeTab === 'python') setPythonCode(newCode);
                  else if (activeTab === 'javascript') setJsCode(newCode);
                  else setCCode(newCode);
                }}
                onLanguageChange={(newLang) => {
                  setActiveTab(newLang);
                }}
                onResetCode={() => {
                  if (activeTab === 'python') setPythonCode(getStarterCode(mission, 'python'));
                  else if (activeTab === 'javascript') setJsCode(getStarterCode(mission, 'javascript'));
                  else setCCode(getStarterCode(mission, 'c'));
                }}
                minHeight="h-64 sm:h-72"
                snippets={
                  activeTab === 'python'
                    ? [
                        { label: '+ pet.move_right()', code: 'pet.move_right()' },
                        { label: '+ pet.move_forward()', code: 'pet.move_forward()' },
                        { label: '+ pet.turn_right()', code: 'pet.turn_right()' },
                        { label: '+ for step in range(8):', code: 'for step in range(8):\n    pet.move_right()', color: 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300 font-bold' },
                      ]
                    : activeTab === 'javascript'
                    ? [
                        { label: '+ pet.moveRight();', code: 'pet.moveRight();' },
                        { label: '+ pet.moveForward();', code: 'pet.moveForward();' },
                        { label: '+ pet.turnRight();', code: 'pet.turnRight();' },
                        { label: '+ for loop (8)', code: 'for (let i = 0; i < 8; i++) {\n  pet.moveRight();\n}', color: 'bg-amber-950/60 border-amber-700/50 text-amber-300 font-bold' },
                      ]
                    : [
                        { label: '+ move_right();', code: 'move_right();' },
                        { label: '+ move_forward();', code: 'move_forward();' },
                        { label: '+ turn_right();', code: 'turn_right();' },
                        { label: '+ for loop (8)', code: 'for (int i = 0; i < 8; i++) {\n        move_right();\n    }', color: 'bg-cyan-950/60 border-cyan-700/50 text-cyan-300 font-bold' },
                        { label: '+ printf()', code: 'printf("Pet reached checkpoint!\\n");' },
                      ]
                }
                onInsertSnippet={handleInsertSnippet}
              />
            )}

            {/* Compiler Output / Diagnostics Console */}
            {compilerError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{compilerError}</span>
              </div>
            )}

            {/* Terminal Drawer Logs */}
            {terminalLogs.length > 0 && (
              <div className="mt-3 bg-[#0d1f14] p-3 rounded-2xl border border-white/10 text-[11px] font-mono text-[#a7f3d0] max-h-24 overflow-y-auto custom-scrollbar space-y-1">
                {terminalLogs.slice(-4).map((log, i) => (
                  <div key={i} className="truncate">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* BOTTOM PLAY / RUN BUTTON                                  */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleRunProgram}
              disabled={isPlaying}
              className="w-full py-4 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-sm rounded-2xl shadow-soft transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Play size={16} className="fill-white" />
              <span>
                {isPlaying
                  ? `EXECUTING STEP ${stepIdx + 1}...`
                  : activeTab === 'blocks'
                  ? 'PLAY'
                  : activeTab === 'python'
                  ? 'RUN PYTHON SCRIPT'
                  : activeTab === 'javascript'
                  ? 'RUN JAVASCRIPT'
                  : 'RUN C PROGRAM'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MISSION ACCOMPLISHED MODAL BANNER                               */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {missionSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-[#e2ece5] shadow-2xl text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-[#eaf2ec] border border-[#d5e5db] mx-auto flex items-center justify-center text-3xl shadow-soft">
                🎉
              </div>

              <div>
                <h3 className="text-xl font-black text-[#1b382b]">
                  Mission Accomplished!
                </h3>
                <p className="text-xs text-[#5b7566] mt-1">
                  {petName} reached the goal! You mastered{' '}
                  <span className="font-bold text-[#2d6a4f]">{mission.title}</span>.
                </p>
              </div>

              <div className="flex items-center justify-center gap-4 bg-[#f8faf8] p-3 rounded-2xl border border-[#d8e5dc]">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#1b382b]">
                  <Zap size={14} className="text-amber-500" />
                  <span>+{mission.xpReward} XP</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#1b382b]">
                  <span>💎</span>
                  <span>+{mission.coinReward} Gems</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setMissionSuccessModal(false)}
                  className="flex-1 py-3 bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#d8e5dc] text-[#1b382b] font-bold text-xs rounded-xl transition-all"
                >
                  Stay on Level
                </button>
                <button
                  onClick={handleNextMission}
                  className="flex-1 py-3 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-xs rounded-xl shadow-soft transition-all"
                >
                  Next Mission →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Academy Problem Hints Modal */}
      <CodespaceHintModal
        isOpen={academyHintModalOpen}
        onClose={() => setAcademyHintModalOpen(false)}
        hints={academyHints}
        missionTitle={mission.title}
        language={currentLang}
      />

      {/* Academy Problem Solution Modal */}
      <CodespaceSolutionModal
        isOpen={academySolutionModalOpen}
        onClose={() => setAcademySolutionModalOpen(false)}
        missionTitle={mission.title}
        solutionC={academySolutionC}
        solutionPython={academySolutionPython}
        solutionJs={academySolutionJs}
        initialLanguage={currentLang}
        onApplySolution={(appliedCode, appliedLang) => {
          setActiveTab(appliedLang);
          if (appliedLang === 'c') setCCode(appliedCode);
          else if (appliedLang === 'python') setPythonCode(appliedCode);
          else if (appliedLang === 'javascript') setJsCode(appliedCode);
        }}
      />
    </div>
  );
}
export default AcademyPage;
