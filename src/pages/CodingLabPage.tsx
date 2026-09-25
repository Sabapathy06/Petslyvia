import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Code2, Play, RotateCcw, Sparkles, CheckCircle2,
  Terminal, ShieldCheck, Zap, Coins, Bot, ArrowRight, CornerDownLeft, Box
} from 'lucide-react';
import { MISSIONS_LIST } from '@/data/missions';
import type { VisualBlock, SimulationResult, SimulationStep } from '@/types/game';
import { runDeterministicSimulation } from '@/services/gameEngine';
import { useGameData } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { GameScene3D } from '@/components/game3d/GameScene3D';
import { sound } from '@/utils/audio';
import { DarkIdeEditor } from '@/components/coding/DarkIdeEditor';
import type { SupportedLanguage } from '@/components/coding/CodespaceIdeHeader';

const getCodeTemplate = (missionId: string, lang: 'python' | 'javascript' | 'c') => {
  if (missionId === 'coding_lab_2') {
    if (lang === 'c') {
      return `#include <stdio.h>\n#include "petslyvia.h"\n\nint main() {\n    // Level 2: Zigzag Algorithm (C17)\n    // Navigate around firewalls to reach (4,4)\n    move_down();\n    move_right();\n    return 0;\n}\n`;
    }
    return lang === 'python'
      ? `# Level 2: Zigzag Algorithm\n# Navigate around firewalls to reach (4,4)\nmove_down()\nmove_right()\n`
      : `// Level 2: Zigzag Algorithm\n// Navigate around firewalls to reach (4,4)\nmove_down();\nmove_right();\n`;
  }
  if (missionId === 'coding_lab_3') {
    if (lang === 'c') {
      return `#include <stdio.h>\n#include "petslyvia.h"\n\nint main() {\n    // Level 3: Quantum Matrix Perimeter (C17)\n    // Sweep perimeter around central mainframe\n    for (int step = 0; step < 5; step++) {\n        move_forward();\n    }\n    turn_right();\n    for (int step = 0; step < 4; step++) {\n        move_forward();\n    }\n    turn_right();\n    for (int step = 0; step < 5; step++) {\n        move_forward();\n    }\n    return 0;\n}\n`;
    }
    return lang === 'python'
      ? `# Level 3: Quantum Matrix Perimeter\n# Sweep perimeter around central mainframe\nfor step in range(5):\n    move_forward()\nturn_right()\nfor step in range(4):\n    move_forward()\nturn_right()\nfor step in range(5):\n    move_forward()\n`
      : `// Level 3: Quantum Matrix Perimeter\n// Sweep perimeter around central mainframe\nfor (let step = 0; step < 5; step++) {\n    move_forward();\n}\nturn_right();\nfor (let step = 0; step < 4; step++) {\n    move_forward();\n}\nturn_right();\nfor (let step = 0; step < 5; step++) {\n    move_forward();\n}\n`;
  }
  if (lang === 'c') {
    return `#include <stdio.h>\n#include "petslyvia.h"\n\nint main() {\n    // Level 1: Laser Corridor (C17)\n    // Guide your pet across the corridor\n    for (int step = 0; step < 5; step++) {\n        move_forward();\n    }\n    return 0;\n}\n`;
  }
  return lang === 'python'
    ? `# Level 1: Laser Corridor\n# Guide your pet across the corridor\nfor step in range(5):\n    move_forward()\n`
    : `// Level 1: Laser Corridor\n// Guide your pet across the corridor\nfor (let step = 0; step < 5; step++) {\n    move_forward();\n}\n`;
};

export function CodingLabPage() {
  const { pet, completeMission } = useGameData();

  const codingMissions = MISSIONS_LIST.filter((m) => m.worldArea === 'coding_lab');
  const [selectedLevelIdx, setSelectedLevelIdx] = useState(0);
  const codeMission = codingMissions[selectedLevelIdx] || codingMissions[0];

  const [viewMode3D, setViewMode3D] = useState<boolean>(true);
  const [language, setLanguage] = useState<'python' | 'javascript' | 'c'>('python');
  const [code, setCode] = useState<string>(() => getCodeTemplate(codingMissions[0]?.id || 'coding_lab_1', 'python'));

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, []);

  const [successBanner, setSuccessBanner] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Switch level
  const handleSelectLevel = (idx: number) => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    sound.playClick();
    setSelectedLevelIdx(idx);
    const nextMission = codingMissions[idx] || codingMissions[0];
    setCode(getCodeTemplate(nextMission.id, language));
    setErrorMessage(null);
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setSuccessBanner(false);
    setShowHint(false);
    setIsPlaying(false);
  };

  // Switch programming language and update editor template
  const handleSelectLanguage = (newLang: 'python' | 'javascript' | 'c') => {
    sound.playClick();
    setLanguage(newLang);
    setCode(getCodeTemplate(codeMission.id, newLang));
    setErrorMessage(null);
    setSimulationResult(null);
  };

  // Helper to append code snippets
  const handleInsertSnippet = (snippet: string) => {
    sound.playSnap();
    setCode((prev) => `${prev.trimEnd()}\n${snippet}\n`);
  };

  // Robust real code parser for Python, JavaScript, and C
  const parseCodeToBlocks = (sourceCode: string, lang: 'python' | 'javascript' | 'c'): VisualBlock[] => {
    const blocks: VisualBlock[] = [];
    const lines = sourceCode.split('\n');

    let inLoop = false;
    let loopCount = 1;
    let loopBlocks: VisualBlock[] = [];

    const parseStatement = (stmt: string): VisualBlock | null => {
      const clean = stmt.replace(/;/g, '').trim();
      if (clean.includes('move_forward()')) return { id: `c_${Date.now()}_${Math.random()}`, type: 'move_forward' };
      if (clean.includes('move_back()')) return { id: `c_${Date.now()}_${Math.random()}`, type: 'move_back' };
      if (clean.includes('move_right()')) return { id: `c_${Date.now()}_${Math.random()}`, type: 'move_right' };
      if (clean.includes('move_left()')) return { id: `c_${Date.now()}_${Math.random()}`, type: 'move_left' };
      if (clean.includes('move_up()')) return { id: `c_${Date.now()}_${Math.random()}`, type: 'move_up' };
      if (clean.includes('move_down()')) return { id: `c_${Date.now()}_${Math.random()}`, type: 'move_down' };
      if (clean.includes('turn_right()')) return { id: `c_${Date.now()}_${Math.random()}`, type: 'turn_right' };
      if (clean.includes('turn_left()')) return { id: `c_${Date.now()}_${Math.random()}`, type: 'turn_left' };
      if (clean.includes('interact()') || clean.includes('collect()')) return { id: `c_${Date.now()}_${Math.random()}`, type: 'interact' };
      if (clean.includes('jump()')) return { id: `c_${Date.now()}_${Math.random()}`, type: 'jump' };
      return null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (
        !trimmed ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('#include') ||
        trimmed.startsWith('int main') ||
        trimmed.startsWith('return ')
      ) {
        continue;
      }

      // Detect Python loops: for step in range(N):
      const pyLoopMatch = trimmed.match(/for\s+\w+\s+in\s+range\((\d+)\):/);
      if (pyLoopMatch && lang === 'python') {
        if (inLoop && loopBlocks.length > 0) {
          blocks.push({
            id: `loop_${Date.now()}_${blocks.length}`,
            type: 'repeat',
            params: { count: loopCount },
            nestedBlocks: [...loopBlocks],
          });
        }
        loopCount = parseInt(pyLoopMatch[1], 10);
        inLoop = true;
        loopBlocks = [];
        continue;
      }

      // Detect JS/C loops: for (let i = 0; i < N; i++) { or for (int i = 0; i < N; i++) {
      const loopMatch = trimmed.match(/for\s*\(\s*(?:(?:let|var|int)\s+)?\w+\s*=\s*\d+\s*;\s*\w+\s*<\s*(\d+)\s*;\s*.*\)\s*\{?/);
      if (loopMatch && (lang === 'javascript' || lang === 'c')) {
        if (inLoop && loopBlocks.length > 0) {
          blocks.push({
            id: `loop_${Date.now()}_${blocks.length}`,
            type: 'repeat',
            params: { count: loopCount },
            nestedBlocks: [...loopBlocks],
          });
        }
        loopCount = parseInt(loopMatch[1], 10);
        inLoop = true;
        loopBlocks = [];
        continue;
      }

      // Check closing bracket for JS/C loop
      if (inLoop && trimmed === '}') {
        blocks.push({
          id: `loop_${Date.now()}_${blocks.length}`,
          type: 'repeat',
          params: { count: loopCount },
          nestedBlocks: [...loopBlocks],
        });
        inLoop = false;
        loopBlocks = [];
        continue;
      }

      // If in C and outer function closing bracket, skip
      if (!inLoop && trimmed === '}' && lang === 'c') {
        continue;
      }

      // Detect indentation for Python loop body
      const isIndented = line.startsWith('  ') || line.startsWith('\t');
      const action = parseStatement(trimmed);

      if (action) {
        if (inLoop && (lang === 'javascript' || lang === 'c' || isIndented)) {
          loopBlocks.push(action);
        } else {
          if (inLoop && !isIndented && lang === 'python') {
            blocks.push({
              id: `loop_${Date.now()}_${blocks.length}`,
              type: 'repeat',
              params: { count: loopCount },
              nestedBlocks: [...loopBlocks],
            });
            inLoop = false;
            loopBlocks = [];
          }
          blocks.push(action);
        }
      }
    }

    if (inLoop && loopBlocks.length > 0) {
      blocks.push({
        id: `loop_${Date.now()}_${blocks.length}`,
        type: 'repeat',
        params: { count: loopCount },
        nestedBlocks: [...loopBlocks],
      });
    }

    return blocks;
  };

  const handleRunCode = () => {
    sound.playClick();
    setErrorMessage(null);

    const parsedBlocks = parseCodeToBlocks(code, language);
    if (parsedBlocks.length === 0) {
      sound.playError();
      setErrorMessage(
        language === 'c'
          ? 'No executable C commands found! Try: move_forward(); or for (int i = 0; i < 5; i++) { move_forward(); }'
          : language === 'javascript'
          ? 'No executable JavaScript commands found! Try: move_forward(); or move_right();'
          : 'No executable Python commands found! Try: move_forward() or move_right()'
      );
      return;
    }

    const result = runDeterministicSimulation(
      codeMission.gridSize,
      codeMission.startPos,
      codeMission.startDir,
      codeMission.goalPos,
      codeMission.obstacles,
      codeMission.crystals,
      codeMission.switches,
      parsedBlocks
    );

    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

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
          completeMission(codeMission.id, codeMission.xpReward, codeMission.coinReward, {
            coding: 40,
            logic: 25,
          });
          setSuccessBanner(true);
        } else {
          sound.playError();
          setErrorMessage(result.message);
        }
      }
    }, 450);
  };

  const handleReset = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    sound.playClick();
    setCode(getCodeTemplate(codeMission.id, language));
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setErrorMessage(null);
    setSuccessBanner(false);
    setIsPlaying(false);
  };

  const activeStep: SimulationStep =
    simulationResult && simulationResult.steps[currentStepIndex]
      ? simulationResult.steps[currentStepIndex]
      : {
          stepIndex: 0,
          petPos: codeMission.startPos,
          petDir: codeMission.startDir,
          petAction: 'idle',
          crystalsCollected: [],
          openGates: [],
          status: 'running',
          message: 'Code sandbox standing by',
        };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* Header Banner */}
      <div className="p-6 bg-white rounded-3xl border border-[#e2ece5] shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eaf2ec] border border-[#d8e5dc] rounded-full text-xs font-bold text-[#2d6a4f] mb-2">
            <Code2 size={14} /> Stage 6: Quantum Coding Lab & Runtime
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1b382b]">
            {codeMission.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#5b7566] mt-1 font-medium">
            Write real Python, JavaScript, and C syntax to guide your companion through code execution!
          </p>
        </div>

        {/* Language Mode Selector & Hint Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setShowHint(!showHint);
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              showHint
                ? 'bg-[#eaf2ec] border-[#2d6a4f] text-[#2d6a4f]'
                : 'bg-white hover:bg-[#f4f8f5] border-[#d8e5dc] text-[#5b7566]'
            }`}
          >
            💡 {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>

          <div className="flex bg-[#f4f8f5] p-1 rounded-2xl border border-[#d8e5dc] gap-1 shrink-0">
            <button
              onClick={() => handleSelectLanguage('python')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                language === 'python'
                  ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                  : 'text-[#5b7566] hover:text-[#1b382b]'
              }`}
            >
              Python 🐍
            </button>
            <button
              onClick={() => handleSelectLanguage('javascript')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                language === 'javascript'
                  ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                  : 'text-[#5b7566] hover:text-[#1b382b]'
              }`}
            >
              JavaScript ⚡
            </button>
            <button
              onClick={() => handleSelectLanguage('c')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                language === 'c'
                  ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                  : 'text-[#5b7566] hover:text-[#1b382b]'
              }`}
            >
              C ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* Level Selection Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-2xl border border-[#e2ece5] shadow-sm">
        <span className="text-xs font-bold text-[#5b7566] px-2 flex items-center gap-1">
          <Sparkles size={14} className="text-[#2d6a4f]" /> Select Mission:
        </span>
        {codingMissions.map((mission, idx) => (
          <button
            key={mission.id}
            onClick={() => handleSelectLevel(idx)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedLevelIdx === idx
                ? 'bg-[#2d6a4f] text-white font-black shadow-soft'
                : 'bg-[#f8faf8] hover:bg-[#eaf2ec] text-[#5b7566]'
            }`}
          >
            Level {idx + 1}: {mission.title}
          </button>
        ))}
      </div>

      {/* Main Grid: Code Editor (Left) + 3D/2D Sandbox Simulation (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Code Editor Console (Dark Theme IDE matching reference screenshot) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card flex flex-col justify-between space-y-4">
          <DarkIdeEditor
            mission={codeMission}
            language={language}
            code={code}
            onCodeChange={setCode}
            onLanguageChange={(newLang) => handleSelectLanguage(newLang)}
            onResetCode={handleReset}
            minHeight="h-72 sm:h-96"
            snippets={
              language === 'python'
                ? [
                    { label: '+ move_forward()', code: 'move_forward()' },
                    { label: '+ turn_right()', code: 'turn_right()' },
                    { label: '+ turn_left()', code: 'turn_left()' },
                    { label: '+ for step in range(3):', code: 'for step in range(3):\n    move_forward()', color: 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300 font-bold' },
                  ]
                : language === 'javascript'
                ? [
                    { label: '+ move_forward();', code: 'move_forward();' },
                    { label: '+ turn_right();', code: 'turn_right();' },
                    { label: '+ for loop(3)', code: 'for (let i = 0; i < 3; i++) {\n  move_forward();\n}', color: 'bg-amber-950/60 border-amber-700/50 text-amber-300 font-bold' },
                  ]
                : [
                    { label: '+ move_forward();', code: 'move_forward();' },
                    { label: '+ turn_right();', code: 'turn_right();' },
                    { label: '+ for (int i = 0; i < 3; i++)', code: 'for (int i = 0; i < 3; i++) {\n        move_forward();\n    }', color: 'bg-cyan-950/60 border-cyan-700/50 text-cyan-300 font-bold' },
                    { label: '+ printf()', code: 'printf("Pet navigating stage\\n");' },
                  ]
            }
            onInsertSnippet={handleInsertSnippet}
          />

          <button
            onClick={handleRunCode}
            disabled={isPlaying}
            className="w-full py-3.5 bg-gradient-to-r from-[#2d6a4f] to-[#1b4d3e] hover:from-[#245841] hover:to-[#163e32] text-white font-black text-sm rounded-2xl shadow-soft transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Play size={16} className="fill-white" />
            <span>{isPlaying ? 'EXECUTING SCRIPT...' : `RUN ${language.toUpperCase()} PROGRAM`}</span>
          </button>
        </div>

        {/* Right: 3D / 2D Simulation Stage */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1b382b]">
              🎯 Goal: {codeMission.objective}
            </span>
            <button
              onClick={() => {
                sound.playClick();
                setViewMode3D(!viewMode3D);
              }}
              className="px-3 py-1 bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#d8e5dc] rounded-xl text-xs font-bold text-[#1b382b] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Box size={13} className="text-[#5b7566]" />
              <span>{viewMode3D ? '3D Engine' : '2D View'}</span>
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden relative border border-[#d8e5dc] bg-[#dce8e0] min-h-[380px] flex items-center justify-center">
            {viewMode3D ? (
              <GameScene3D
                gridSize={codeMission.gridSize}
                startPos={codeMission.startPos}
                goalPos={codeMission.goalPos}
                obstacles={codeMission.obstacles}
                crystals={codeMission.crystals}
                switches={codeMission.switches}
                activeStep={activeStep}
                petType={pet?.pet_type || 'fox'}
                equipped={pet?.equipped_items}
                theme="forest"
                height="380px"
              />
            ) : (
              <div className="p-8 text-center text-[#5b7566] text-xs font-medium">
                2D Grid View Ready
              </div>
            )}
          </div>

          {/* Status Bar */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl text-center">
              {errorMessage}
            </div>
          )}

          {successBanner && (
            <div className="p-3.5 bg-[#eaf2ec] border border-[#c8dad0] text-[#1b382b] text-xs font-bold rounded-2xl flex items-center justify-between shadow-soft">
              <span>🏆 Algorithm Cleared! +{codeMission.xpReward} XP</span>
              <button
                onClick={() => {
                  if (selectedLevelIdx < codingMissions.length - 1) {
                    handleSelectLevel(selectedLevelIdx + 1);
                  }
                }}
                className="px-3 py-1 bg-[#2d6a4f] text-white rounded-xl text-xs font-bold"
              >
                Next Level →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
