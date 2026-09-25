import { useState } from 'react';
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

const getCodeTemplate = (missionId: string, lang: 'python' | 'javascript') => {
  if (missionId === 'coding_lab_2') {
    return lang === 'python'
      ? `# Level 2: Zigzag Algorithm\n# Navigate around firewalls to reach (4,4)\nmove_down()\nmove_right()\n`
      : `// Level 2: Zigzag Algorithm\n// Navigate around firewalls to reach (4,4)\nmove_down();\nmove_right();\n`;
  }
  if (missionId === 'coding_lab_3') {
    return lang === 'python'
      ? `# Level 3: Quantum Matrix Perimeter\n# Sweep perimeter around central mainframe\nfor step in range(5):\n    move_forward()\nturn_right()\nfor step in range(4):\n    move_forward()\nturn_right()\nfor step in range(5):\n    move_forward()\n`
      : `// Level 3: Quantum Matrix Perimeter\n// Sweep perimeter around central mainframe\nfor (let step = 0; step < 5; step++) {\n    move_forward();\n}\nturn_right();\nfor (let step = 0; step < 4; step++) {\n    move_forward();\n}\nturn_right();\nfor (let step = 0; step < 5; step++) {\n    move_forward();\n}\n`;
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
  const [language, setLanguage] = useState<'python' | 'javascript'>('python');
  const [code, setCode] = useState<string>(() => getCodeTemplate(codingMissions[0]?.id || 'coding_lab_1', 'python'));

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [successBanner, setSuccessBanner] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Switch level
  const handleSelectLevel = (idx: number) => {
    sound.playClick();
    setSelectedLevelIdx(idx);
    const nextMission = codingMissions[idx] || codingMissions[0];
    setCode(getCodeTemplate(nextMission.id, language));
    setErrorMessage(null);
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setSuccessBanner(false);
    setShowHint(false);
  };

  // Switch programming language and update editor template
  const handleSelectLanguage = (newLang: 'python' | 'javascript') => {
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

  // Robust real code parser for Python and JavaScript
  const parseCodeToBlocks = (sourceCode: string, lang: 'python' | 'javascript'): VisualBlock[] => {
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
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        continue;
      }

      // Check Python loop: for x in range(N):
      const pyLoopMatch = trimmed.match(/for\s+\w+\s+in\s+range\s*\(\s*(\d+)\s*\)\s*:/);
      // Check JS loop: for (let i = 0; i < N; i++) { ... }
      const jsLoopMatch = trimmed.match(/for\s*\(\s*(?:let|var)?\s*\w+\s*=\s*\d+\s*;\s*\w+\s*<\s*(\d+)\s*;\s*[^)]+\)/);

      if (pyLoopMatch || jsLoopMatch) {
        if (inLoop && loopBlocks.length > 0) {
          blocks.push({
            id: `loop_${Date.now()}_${blocks.length}`,
            type: 'repeat',
            params: { count: loopCount },
            nestedBlocks: [...loopBlocks],
          });
          loopBlocks = [];
        }

        const countStr = pyLoopMatch ? pyLoopMatch[1] : jsLoopMatch ? jsLoopMatch[1] : '3';
        loopCount = parseInt(countStr, 10) || 3;
        inLoop = true;
        continue;
      }

      // Check closing bracket for JS loop
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

      // Detect indentation for Python loop body
      const isIndented = line.startsWith('  ') || line.startsWith('\t');
      const action = parseStatement(trimmed);

      if (action) {
        if (inLoop && (lang === 'javascript' || isIndented)) {
          loopBlocks.push(action);
        } else {
          if (inLoop && !isIndented && lang === 'python') {
            // Python loop ended by unindent
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

    // Flush any pending loop
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
        language === 'javascript'
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
    sound.playClick();
    setCode(getCodeTemplate(codeMission.id, language));
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setErrorMessage(null);
    setSuccessBanner(false);
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
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-purple-950 rounded-3xl border border-indigo-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-full text-xs font-bold text-indigo-300 mb-2">
            <Code2 size={14} /> Stage 7: Real Code Runtime & Sandbox
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {codeMission.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Write real Python and JavaScript syntax to guide your companion through code execution!
          </p>
        </div>

        {/* Language Mode Selector & Hint Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setShowHint(!showHint);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              showHint
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
            }`}
          >
            💡 {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>

          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 gap-2 shrink-0">
            <button
              onClick={() => handleSelectLanguage('python')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                language === 'python'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Python 🐍
            </button>
            <button
              onClick={() => handleSelectLanguage('javascript')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                language === 'javascript'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-105'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              JavaScript ⚡
            </button>
          </div>
        </div>
      </div>

      {/* Level Selection Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
        <span className="text-xs font-bold text-slate-400 px-2 flex items-center gap-1">
          <Sparkles size={14} className="text-indigo-400" /> Select Level:
        </span>
        {codingMissions.map((mission, idx) => (
          <button
            key={mission.id}
            onClick={() => handleSelectLevel(idx)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              selectedLevelIdx === idx
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Level {idx + 1}: {mission.title}
          </button>
        ))}
      </div>

      {/* Hint Banner if toggled */}
      {showHint && codeMission.hints && codeMission.hints.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl space-y-1.5"
        >
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
            <span>💡 Developer Hints for {codeMission.title}:</span>
          </div>
          <ul className="list-disc list-inside text-xs text-amber-200/90 space-y-1">
            {codeMission.hints.map((hint, i) => (
              <li key={i}>{hint}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Main Grid: Code Editor (Left) + 2D Sandbox Simulation (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Code Editor Console */}
        <div className="lg:col-span-6 bg-slate-900/95 rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Terminal size={14} className={language === 'python' ? 'text-indigo-400' : 'text-amber-400'} />
                main.{language === 'python' ? 'py' : 'js'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} /> Reset Code
                </button>
                <span className="text-[10px] text-slate-500 font-mono">Sandboxed Safe Runtime</span>
              </div>
            </div>

            <textarea
              rows={13}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-slate-950 text-emerald-400 font-mono text-xs sm:text-sm p-4 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none leading-relaxed resize-none shadow-inner"
              spellCheck={false}
            />

            {/* Quick Action Snippets Palette */}
            <div className="mt-3 space-y-1.5">
              <span className="text-[11px] text-slate-400 font-bold block">
                Insert Syntax Commands:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {language === 'python' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('move_forward()')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-amber-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + move_forward()
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('move_right()')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-amber-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + move_right()
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('turn_right()')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-indigo-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + turn_right()
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('turn_left()')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-indigo-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + turn_left()
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('interact()')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-rose-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + interact()
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('for step in range(3):\n    move_forward()')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-emerald-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + for step in range(3):
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('move_forward();')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-amber-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + move_forward();
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('move_right();')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-amber-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + move_right();
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('turn_right();')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-indigo-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + turn_right();
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('turn_left();')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-indigo-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + turn_left();
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('interact();')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-rose-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + interact();
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('for (let step = 0; step < 3; step++) {\n    move_forward();\n}')}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-emerald-300 font-mono text-[11px] border border-slate-800 transition-colors"
                    >
                      + for (let step = 0; step &lt; 3; step++)
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleRunCode}
            disabled={isPlaying}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play size={18} className="fill-white" />
            {isPlaying ? 'EXECUTING CODE SANDBOX...' : 'RUN CODE SCRIPT'}
          </button>

          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl text-center">
              {errorMessage}
            </div>
          )}

          {successBanner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-extrabold text-sm">
                <ShieldCheck size={18} /> Code Execution Mastered!
              </div>
              <p className="text-xs text-slate-300">
                You progressed all the way from simple arrows to executing real production syntax!
              </p>
              <div className="flex justify-center gap-3 pt-1 text-xs font-bold text-emerald-300">
                <span>+{codeMission.xpReward} XP</span>
                <span>+{codeMission.coinReward} Coins</span>
                <span>+40 Coding Skill</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: 3D / 2D World Board */}
        <div className="lg:col-span-6 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 flex flex-col justify-between shadow-2xl">
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs text-slate-300 font-medium mb-4 flex items-center justify-between gap-2">
            <div className="space-y-1">
              <div>
                ⚡ <strong>{codeMission.title}:</strong> {codeMission.story}
              </div>
              <div className="text-indigo-300 text-[11px]">
                🎯 <strong>Objective:</strong> {codeMission.objective}
              </div>
            </div>

            {/* 3D / 2D Mode Switch */}
            <button
              onClick={() => {
                sound.playClick();
                setViewMode3D((prev) => !prev);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                viewMode3D
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Box size={14} />
              {viewMode3D ? '3D Matrix' : '2D View'}
            </button>
          </div>

          {viewMode3D ? (
            <GameScene3D
              gridSize={codeMission.gridSize}
              startPos={codeMission.startPos}
              goalPos={codeMission.goalPos}
              obstacles={codeMission.obstacles}
              crystals={codeMission.crystals}
              switches={codeMission.switches}
              activeStep={activeStep}
              petType={pet?.pet_type || 'cat'}
              equipped={pet?.equipped_items}
              theme="cyber"
              height="350px"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 min-h-[300px]">
              <div
                className="grid gap-2 p-3 bg-slate-900 rounded-2xl border border-slate-800"
                style={{
                  gridTemplateColumns: `repeat(${codeMission.gridSize.width}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: codeMission.gridSize.height }).map((_, row) =>
                  Array.from({ length: codeMission.gridSize.width }).map((__, col) => {
                    const isPetHere = activeStep.petPos.x === col && activeStep.petPos.y === row;
                    const isGoal = codeMission.goalPos.x === col && codeMission.goalPos.y === row;
                    const obs = codeMission.obstacles.find((o) => o.x === col && o.y === row);
                    const crystal = codeMission.crystals.find((c) => c.x === col && c.y === row);
                    const isCollected = activeStep.crystalsCollected.some((c) => c.x === col && c.y === row);

                    return (
                      <div
                        key={`lab_${col}_${row}`}
                        className={`w-14 h-14 rounded-xl flex items-center justify-center relative transition-all ${
                          isGoal
                            ? 'bg-emerald-950 border-2 border-emerald-400'
                            : obs?.type === 'wall'
                            ? 'bg-indigo-950/80 border border-indigo-500/40'
                            : 'bg-slate-900 border border-slate-800'
                        }`}
                      >
                        {obs?.type === 'wall' && <span className="text-xl">⚡</span>}
                        {crystal && !isCollected && !isPetHere && (
                          <span className="text-xl animate-bounce">💎</span>
                        )}
                        {isGoal && !isPetHere && <span className="text-xl">🚀</span>}

                        {isPetHere && pet && (
                          <PetSVG
                            type={pet.pet_type}
                            stage={pet.stage}
                            state={activeStep.status === 'collision' ? 'tired' : activeStep.status === 'success' ? 'excited' : 'focused'}
                            equipped={pet.equipped_items}
                            size={46}
                            reaction={
                              activeStep.status === 'success'
                                ? { config: { expression: 'victory', label: 'Compiled!', icon: '🚀', sound: 'victory', duration: 2 }, id: 1 }
                                : activeStep.status === 'collision' || activeStep.status === 'failed'
                                ? { config: { expression: 'hurt', label: 'Syntax Error!', icon: '💥', sound: 'hurt', duration: 2 }, id: 2 }
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

          {/* Status Bar */}
          <div className="mt-4 p-3 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Terminal Status:{' '}
              <strong
                className={
                  activeStep.status === 'collision'
                    ? 'text-rose-400'
                    : activeStep.status === 'success'
                    ? 'text-emerald-400'
                    : 'text-indigo-400'
                }
              >
                {activeStep.message || 'Executing runtime...'}
              </strong>
            </span>
            <span className="text-amber-400">
              Crystals: {activeStep.crystalsCollected.length} / {codeMission.crystals.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
