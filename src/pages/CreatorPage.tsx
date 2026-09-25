import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Sparkles, Play, Bug, Upload, CheckCircle2,
  Trash2, Plus, ArrowRight, ShieldCheck, ArrowUp, ArrowDown, ArrowLeft, RotateCcw, AlertTriangle, Box, Hand, Zap, Coins
} from 'lucide-react';
import type { GridPos, GridObstacle, GridCrystal, VisualBlock, SimulationResult, SimulationStep } from '@/types/game';
import { runDeterministicSimulation } from '@/services/gameEngine';
import { useGameData } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { GameScene3D } from '@/components/game3d/GameScene3D';
import { sound } from '@/utils/audio';

type ToolType = 'start' | 'goal' | 'wall' | 'water' | 'crystal' | 'eraser';

export function CreatorPage() {
  const { profile, pet, publishProblem, publishBug } = useGameData();

  const [mode, setMode] = useState<'problem' | 'bug'>('problem');
  const [viewMode3D, setViewMode3D] = useState<boolean>(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bugClue, setBugClue] = useState('');

  // Grid Builder State
  const gridSize = { width: 5, height: 5 };
  const [startPos, setStartPos] = useState<GridPos>({ x: 0, y: 0 });
  const [goalPos, setGoalPos] = useState<GridPos>({ x: 4, y: 4 });
  const [obstacles, setObstacles] = useState<GridObstacle[]>([
    { x: 2, y: 1, type: 'wall' },
    { x: 2, y: 2, type: 'wall' },
  ]);
  const [crystals, setCrystals] = useState<GridCrystal[]>([
    { x: 1, y: 2, collected: false },
    { x: 3, y: 2, collected: false },
  ]);
  const [activeTool, setActiveTool] = useState<ToolType>('wall');

  // Test sequence blocks
  const [testBlocks, setTestBlocks] = useState<VisualBlock[]>([
    { id: 't1', type: 'move_down' },
    { id: 't2', type: 'move_down' },
    { id: 't3', type: 'move_right' },
  ]);

  // Live simulation execution state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [publishedToast, setPublishedToast] = useState<string | null>(null);
  const [publishedModalData, setPublishedModalData] = useState<{
    type: 'problem' | 'bug';
    title: string;
    xp: number;
    coins: number;
  } | null>(null);

  // Handle clicking a tile with the selected tool
  const handleTileClick = (x: number, y: number) => {
    sound.playClick();
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setTestFeedback(null);

    if (activeTool === 'start') {
      setStartPos({ x, y });
      setObstacles((prev) => prev.filter((o) => !(o.x === x && o.y === y)));
      setCrystals((prev) => prev.filter((c) => !(c.x === x && c.y === y)));
    } else if (activeTool === 'goal') {
      setGoalPos({ x, y });
      setObstacles((prev) => prev.filter((o) => !(o.x === x && o.y === y)));
      setCrystals((prev) => prev.filter((c) => !(c.x === x && c.y === y)));
    } else if (activeTool === 'wall' || activeTool === 'water') {
      if ((startPos.x === x && startPos.y === y) || (goalPos.x === x && goalPos.y === y)) return;
      setObstacles((prev) => [
        ...prev.filter((o) => !(o.x === x && o.y === y)),
        { x, y, type: activeTool },
      ]);
      setCrystals((prev) => prev.filter((c) => !(c.x === x && c.y === y)));
    } else if (activeTool === 'crystal') {
      if ((startPos.x === x && startPos.y === y) || (goalPos.x === x && goalPos.y === y)) return;
      setCrystals((prev) => [
        ...prev.filter((c) => !(c.x === x && c.y === y)),
        { x, y, collected: false },
      ]);
      setObstacles((prev) => prev.filter((o) => !(o.x === x && o.y === y)));
    } else if (activeTool === 'eraser') {
      setObstacles((prev) => prev.filter((o) => !(o.x === x && o.y === y)));
      setCrystals((prev) => prev.filter((c) => !(c.x === x && c.y === y)));
    }
  };

  // Add block to test sequence
  const handleAddTestBlock = (type: VisualBlock['type']) => {
    sound.playSnap();
    setTestBlocks((prev) => [
      ...prev,
      { id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type },
    ]);
  };

  const handleRemoveTestBlock = (index: number) => {
    sound.playClick();
    setTestBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearTestBlocks = () => {
    sound.playClick();
    setTestBlocks([]);
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setTestFeedback(null);
  };

  // Run live step-by-step animated simulation
  const handleTestPlay = () => {
    if (testBlocks.length === 0) {
      sound.playError();
      setTestFeedback({ success: false, message: 'Test instruction sequence is empty!' });
      return;
    }

    sound.playClick();
    setTestFeedback(null);

    const result = runDeterministicSimulation(
      gridSize,
      startPos,
      'right',
      goalPos,
      obstacles,
      crystals,
      [],
      testBlocks
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
          setTestFeedback({
            success: true,
            message: 'Simulation Passed! All objectives reached cleanly.',
          });
        } else {
          if (mode === 'bug') {
            sound.playStep();
            setTestFeedback({
              success: true,
              message: `Bug Verified! Intentional flaw reproduced: "${result.message}"`,
            });
          } else {
            sound.playError();
            setTestFeedback({
              success: false,
              message: `Simulation Failed: ${result.message}`,
            });
          }
        }
      }
    }, 450);
  };

  const handlePublish = async () => {
    const effectiveTitle =
      title.trim() ||
      (mode === 'bug'
        ? `Bug Puzzle #${Math.floor(Math.random() * 899 + 100)}`
        : `Custom Level #${Math.floor(Math.random() * 899 + 100)}`);

    const effectiveBlocks =
      testBlocks.length > 0
        ? testBlocks
        : [
            { id: 'b1', type: 'move_down' },
            { id: 'b2', type: 'move_right' },
          ];

    sound.playVictory();

    if (mode === 'problem') {
      await publishProblem({
        title: effectiveTitle,
        description: description || 'Can you navigate through obstacles and reach the goal?',
        creatorId: profile?.id || 'player_user',
        creatorName: profile?.display_name || 'Creator',
        difficulty: 'medium',
        grid: {
          width: gridSize.width,
          height: gridSize.height,
          start: startPos,
          goal: goalPos,
          obstacles,
          crystals,
        },
        availableBlocks: ['move_forward', 'turn_left', 'turn_right', 'move_up', 'move_down', 'move_left', 'move_right', 'interact', 'repeat'],
      });
      setPublishedModalData({
        type: 'problem',
        title: effectiveTitle,
        xp: 100,
        coins: 80,
      });
    } else {
      await publishBug({
        title: effectiveTitle,
        creatorId: profile?.id || 'player_user',
        creatorName: profile?.display_name || 'BugCrafter',
        intendedGoal: description || 'Reach the portal collecting all crystals.',
        brokenBlocks: effectiveBlocks,
        clue: bugClue || 'Look closely at step orientations and obstacles.',
        grid: {
          width: gridSize.width,
          height: gridSize.height,
          start: startPos,
          goal: goalPos,
          obstacles,
          crystals,
        },
        rewardXp: 80,
        rewardCoins: 65,
      });
      setPublishedModalData({
        type: 'bug',
        title: effectiveTitle,
        xp: 80,
        coins: 65,
      });
    }

    setTitle('');
    setDescription('');
    setBugClue('');
  };

  // Active step rendering
  const activeStep: SimulationStep =
    simulationResult && simulationResult.steps[currentStepIndex]
      ? simulationResult.steps[currentStepIndex]
      : {
          stepIndex: 0,
          petPos: startPos,
          petDir: 'right',
          petAction: 'idle',
          crystalsCollected: [],
          openGates: [],
          status: 'running',
          message: 'Ready to simulate',
        };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-violet-950/90 via-slate-900 to-indigo-950 rounded-3xl border border-violet-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/20 border border-violet-500/40 rounded-full text-xs font-bold text-violet-300 mb-2">
            <Sparkles size={14} /> Stage 6: Creator World & Level Designer
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Design, Simulate & Publish Systems
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Build playable grid challenges, test live pet simulations, or craft intentional bugs for the community!
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 gap-2 shrink-0">
          <button
            onClick={() => {
              setMode('problem');
              sound.playClick();
              setTestFeedback(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'problem'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Level
          </button>
          <button
            onClick={() => {
              setMode('bug');
              sound.playClick();
              setTestFeedback(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'bug'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Craft Bug 🐛
          </button>
        </div>
      </div>

      {publishedToast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-emerald-300 font-bold text-xs text-center flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} /> {publishedToast}
        </motion.div>
      )}

      {/* Main Designer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Grid Canvas with Live Simulation */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4 flex flex-col justify-between">
          {/* Tool Palette & 3D Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-2">
                Select Placement Brush:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'start', label: 'Start Pos 🐾' },
                  { id: 'goal', label: 'Goal Exit 🏡' },
                  { id: 'wall', label: 'Wall 🧱' },
                  { id: 'water', label: 'Water 🌊' },
                  { id: 'crystal', label: 'Crystal 💎' },
                  { id: 'eraser', label: 'Eraser 🧹' },
                ].map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveTool(tool.id as ToolType);
                      sound.playClick();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      activeTool === tool.id
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3D / 2D Switch */}
            <button
              onClick={() => {
                sound.playClick();
                setViewMode3D((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                viewMode3D
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white border-violet-400 shadow-md shadow-violet-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Box size={14} />
              {viewMode3D ? '3D Sandbox' : '2D Grid'}
            </button>
          </div>

          {/* 3D Interactive WebGL Sandbox or 2D Grid Canvas */}
          {viewMode3D ? (
            <GameScene3D
              gridSize={gridSize}
              startPos={startPos}
              goalPos={goalPos}
              obstacles={obstacles}
              crystals={crystals}
              activeStep={activeStep}
              petType={pet?.pet_type || 'cat'}
              equipped={pet?.equipped_items}
              theme="forest"
              interactive={true}
              onTileClick={({ x, y }) => handleTileClick(x, y)}
              height="360px"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 min-h-[300px]">
              <div
                className="grid gap-2 p-3 bg-slate-900 rounded-2xl border border-slate-800"
                style={{
                  gridTemplateColumns: `repeat(${gridSize.width}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: gridSize.height }).map((_, row) =>
                  Array.from({ length: gridSize.width }).map((__, col) => {
                    const isPetHere = activeStep.petPos.x === col && activeStep.petPos.y === row;
                    const isGoal = goalPos.x === col && goalPos.y === row;
                    const obs = obstacles.find((o) => o.x === col && o.y === row);
                    const crystal = crystals.find((c) => c.x === col && c.y === row);
                    const isCollected = activeStep.crystalsCollected.some((c) => c.x === col && c.y === row);

                    return (
                      <button
                        key={`canvas_${col}_${row}`}
                        onClick={() => handleTileClick(col, row)}
                        className={`w-14 h-14 rounded-xl flex items-center justify-center relative transition-all border cursor-pointer ${
                          isGoal
                            ? 'bg-emerald-950/60 border-emerald-400'
                            : obs?.type === 'wall'
                            ? 'bg-slate-800 border-slate-700'
                            : obs?.type === 'water'
                            ? 'bg-sky-950/80 border-sky-600'
                            : crystal && !isCollected
                            ? 'bg-cyan-950/60 border-cyan-400'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {obs?.type === 'wall' && <span className="text-xl">🧱</span>}
                        {obs?.type === 'water' && <span className="text-xl">🌊</span>}
                        {crystal && !isCollected && !isPetHere && <span className="text-xl animate-bounce">💎</span>}
                        {isGoal && !isPetHere && <span className="text-xl">🏡</span>}

                        {/* Active moving companion */}
                        {isPetHere && pet && (
                          <PetSVG
                            type={pet.pet_type}
                            stage={pet.stage}
                            state={activeStep.status === 'collision' ? 'tired' : 'happy'}
                            size={44}
                          />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Simulation Telemetry Bar */}
          <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Simulation Status:{' '}
              <strong
                className={
                  activeStep.status === 'collision'
                    ? 'text-rose-400'
                    : activeStep.status === 'success'
                    ? 'text-emerald-400'
                    : 'text-amber-300'
                }
              >
                {activeStep.message || 'Ready'}
              </strong>
            </span>
            <span className="text-amber-400">
              Crystals: {activeStep.crystalsCollected.length} / {crystals.length}
            </span>
          </div>
        </div>

        {/* Right: Test Instructions Builder & Publish Form */}
        <div className="lg:col-span-5 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Play className="text-amber-400" size={16} /> Test Sequence ({testBlocks.length} Steps)
            </h3>
            <button
              onClick={handleClearTestBlocks}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>

          {/* Action Chips to build test instructions */}
          <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-bold block">Add Test Commands:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleAddTestBlock('move_up')}
                className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowUp size={12} /> Up
              </button>
              <button
                onClick={() => handleAddTestBlock('move_down')}
                className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowDown size={12} /> Down
              </button>
              <button
                onClick={() => handleAddTestBlock('move_left')}
                className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={12} /> Left
              </button>
              <button
                onClick={() => handleAddTestBlock('move_right')}
                className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowRight size={12} /> Right
              </button>
              <button
                onClick={() => handleAddTestBlock('move_forward')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                + Forward
              </button>
              <button
                onClick={() => handleAddTestBlock('turn_right')}
                className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                ↪ Turn Right
              </button>
              <button
                onClick={() => handleAddTestBlock('turn_left')}
                className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                ↩ Turn Left
              </button>
              <button
                onClick={() => handleAddTestBlock('interact')}
                className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                🔘 Interact
              </button>
            </div>
          </div>

          {/* Test Sequence Steps List */}
          <div className="min-h-[110px] max-h-[160px] overflow-y-auto bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1 custom-scrollbar">
            {testBlocks.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-xs">
                Add movement commands above to test-drive your level!
              </div>
            ) : (
              testBlocks.map((b, i) => (
                <div
                  key={b.id || i}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                    simulationResult && currentStepIndex === i + 1
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <span>#{i + 1} {b.type.replace('_', ' ')}</span>
                  <button
                    onClick={() => handleRemoveTestBlock(i)}
                    className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {testFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-bold text-center ${
                testFeedback.success
                  ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/70 border border-rose-500/40 text-rose-300'
              }`}
            >
              {testFeedback.message}
            </div>
          )}

          {/* Metadata Form */}
          <div className="space-y-3 pt-1 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={mode === 'problem' ? 'e.g. Crystal Labyrinth' : 'e.g. The Reversed Gear'}
                className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800 text-xs focus:border-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {mode === 'problem' ? 'Objective Story' : 'Intended Goal'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what the solver must achieve..."
                className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800 text-xs focus:border-amber-400 outline-none resize-none"
              />
            </div>

            {mode === 'bug' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subtle Bug Clue
                </label>
                <input
                  type="text"
                  value={bugClue}
                  onChange={(e) => setBugClue(e.target.value)}
                  placeholder="e.g. Look closely at turn block #3"
                  className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800 text-xs focus:border-amber-400 outline-none"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={handleTestPlay}
              disabled={isPlaying}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-amber-300 font-black text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play size={14} className="fill-amber-300" />
              {isPlaying ? 'SIMULATING...' : 'TEST SIMULATION'}
            </button>
            <button
              onClick={handlePublish}
              disabled={isPlaying}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 font-black text-slate-950 text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload size={14} /> PUBLISH GLOBALLY
            </button>
          </div>
        </div>
      </div>

      {/* Published Celebration Modal */}
      <AnimatePresence>
        {publishedModalData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              className="bg-slate-900 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-5"
            >
              <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/40 rounded-2xl mx-auto flex items-center justify-center">
                {publishedModalData.type === 'bug' ? (
                  <Bug size={32} className="text-amber-400 animate-bounce" />
                ) : (
                  <CheckCircle2 size={32} className="text-emerald-400 animate-bounce" />
                )}
              </div>

              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                  {publishedModalData.type === 'bug' ? 'Bug Challenge Deployed!' : 'Level Published Live!'}
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  {publishedModalData.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2">
                  {publishedModalData.type === 'bug'
                    ? 'Your bug puzzle has been uploaded to the Bug Exchange. Other coders can now debug it in multiplayer arena!'
                    : 'Your custom puzzle is now live for adventurers to explore across the world.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 justify-center">
                  <Sparkles size={16} className="text-purple-400" />
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500 font-bold">REWARD</p>
                    <p className="text-sm font-black text-purple-300">+{publishedModalData.xp} XP</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Coins size={16} className="text-amber-400" />
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500 font-bold">BOUNTY</p>
                    <p className="text-sm font-black text-amber-300">+{publishedModalData.coins} Coins</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/multiplayer"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  View in Bug Exchange <ArrowRight size={14} />
                </Link>
                <button
                  onClick={() => setPublishedModalData(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Create Another Level
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
