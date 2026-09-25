import { useState, useEffect, useRef } from 'react';
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
      <div className="p-6 bg-white rounded-3xl border border-[#e2ece5] shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eaf2ec] border border-[#d3e2d8] rounded-full text-xs font-bold text-[#2d6a4f] mb-2">
            <Sparkles size={14} /> Stage 6: Creator World & Level Designer
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1b382b] tracking-tight">
            Design, Simulate & Publish Systems
          </h1>
          <p className="text-xs sm:text-sm text-[#5b7566] mt-1 font-medium">
            Build playable grid challenges, test live pet simulations, or craft intentional bugs for the community!
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-[#f4f8f5] p-1.5 rounded-2xl border border-[#e2ece5] gap-2 shrink-0">
          <button
            onClick={() => {
              setMode('problem');
              sound.playClick();
              setTestFeedback(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'problem'
                ? 'bg-[#2d6a4f] text-white shadow-sm scale-105'
                : 'text-[#5b7566] hover:text-[#1b382b]'
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
                ? 'bg-rose-600 text-white shadow-sm scale-105'
                : 'text-[#5b7566] hover:text-[#1b382b]'
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
          className="p-4 bg-[#eaf2ec] border border-[#d3e2d8] rounded-2xl text-[#2d6a4f] font-bold text-xs text-center flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} /> {publishedToast}
        </motion.div>
      )}

      {/* Main Designer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Grid Canvas with Live Simulation */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card space-y-4 flex flex-col justify-between">
          {/* Tool Palette & 3D Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] uppercase font-bold text-[#5b7566] block mb-2">
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
                        ? 'bg-[#2d6a4f] border-[#2d6a4f] text-white shadow-sm'
                        : 'bg-[#f4f8f5] border-[#e2ece5] text-[#1b382b] hover:bg-[#eaf2ec]'
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
                  ? 'bg-[#2d6a4f] text-white border-[#2d6a4f] shadow-sm'
                  : 'bg-[#f4f8f5] text-[#5b7566] border-[#e2ece5] hover:text-[#1b382b]'
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
            <div className="flex-1 flex items-center justify-center p-4 bg-[#f4f8f5] rounded-2xl border border-[#e2ece5] min-h-[300px]">
              <div
                className="grid gap-2 p-3 bg-white rounded-2xl border border-[#e2ece5] shadow-soft"
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
                            ? 'bg-[#eaf2ec] border-[#2d6a4f]'
                            : obs?.type === 'wall'
                            ? 'bg-[#e2ece5] border-[#d3e2d8]'
                            : obs?.type === 'water'
                            ? 'bg-sky-50 border-sky-300'
                            : crystal && !isCollected
                            ? 'bg-[#eaf2ec] border-[#2d6a4f]'
                            : 'bg-[#f4f8f5] border-[#e2ece5] hover:border-[#2d6a4f]'
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
          <div className="p-3 bg-[#f4f8f5] rounded-2xl border border-[#e2ece5] flex items-center justify-between text-xs font-mono">
            <span className="text-[#5b7566]">
              Simulation Status:{' '}
              <strong
                className={
                  activeStep.status === 'collision'
                    ? 'text-rose-600'
                    : activeStep.status === 'success'
                    ? 'text-[#2d6a4f]'
                    : 'text-[#2d6a4f]'
                }
              >
                {activeStep.message || 'Ready'}
              </strong>
            </span>
            <span className="text-[#2d6a4f] font-bold">
              Crystals: {activeStep.crystalsCollected.length} / {crystals.length}
            </span>
          </div>
        </div>

        {/* Right: Test Instructions Builder & Publish Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1b382b] flex items-center gap-2">
              <Play className="text-[#2d6a4f]" size={16} /> Test Sequence ({testBlocks.length} Steps)
            </h3>
            <button
              onClick={handleClearTestBlocks}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>

          {/* Action Chips to build test instructions */}
          <div className="space-y-1.5 bg-[#f4f8f5] p-3 rounded-2xl border border-[#e2ece5]">
            <span className="text-[11px] text-[#5b7566] font-bold block">Add Test Commands:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleAddTestBlock('move_up')}
                className="px-2 py-1 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowUp size={12} /> Up
              </button>
              <button
                onClick={() => handleAddTestBlock('move_down')}
                className="px-2 py-1 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowDown size={12} /> Down
              </button>
              <button
                onClick={() => handleAddTestBlock('move_left')}
                className="px-2 py-1 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={12} /> Left
              </button>
              <button
                onClick={() => handleAddTestBlock('move_right')}
                className="px-2 py-1 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowRight size={12} /> Right
              </button>
              <button
                onClick={() => handleAddTestBlock('move_forward')}
                className="px-2.5 py-1 bg-white hover:bg-[#eaf2ec] border border-[#e2ece5] text-[#1b382b] rounded-lg text-[11px] font-bold cursor-pointer"
              >
                + Forward
              </button>
              <button
                onClick={() => handleAddTestBlock('turn_right')}
                className="px-2.5 py-1 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-lg text-[11px] font-bold cursor-pointer"
              >
                ↪ Turn Right
              </button>
              <button
                onClick={() => handleAddTestBlock('turn_left')}
                className="px-2.5 py-1 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-lg text-[11px] font-bold cursor-pointer"
              >
                ↩ Turn Left
              </button>
              <button
                onClick={() => handleAddTestBlock('interact')}
                className="px-2.5 py-1 bg-[#2d6a4f] hover:bg-[#245840] border border-[#2d6a4f] text-white rounded-lg text-[11px] font-bold cursor-pointer"
              >
                🔘 Interact
              </button>
            </div>
          </div>

          {/* Test Sequence Steps List */}
          <div className="min-h-[110px] max-h-[160px] overflow-y-auto bg-[#f4f8f5] p-2.5 rounded-xl border border-[#e2ece5] space-y-1 custom-scrollbar">
            {testBlocks.length === 0 ? (
              <div className="text-center py-4 text-[#7a9386] text-xs">
                Add movement commands above to test-drive your level!
              </div>
            ) : (
              testBlocks.map((b, i) => (
                <div
                  key={b.id || i}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                    simulationResult && currentStepIndex === i + 1
                      ? 'bg-[#eaf2ec] border-[#2d6a4f] text-[#2d6a4f] font-black shadow-sm'
                      : 'bg-white border-[#e2ece5] text-[#1b382b]'
                  }`}
                >
                  <span>#{i + 1} {b.type.replace('_', ' ')}</span>
                  <button
                    onClick={() => handleRemoveTestBlock(i)}
                    className="text-[#7a9386] hover:text-rose-600 p-0.5 cursor-pointer"
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
                  ? 'bg-[#eaf2ec] border border-[#d3e2d8] text-[#2d6a4f]'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {testFeedback.message}
            </div>
          )}

          {/* Metadata Form */}
          <div className="space-y-3 pt-1 border-t border-[#e2ece5]">
            <div>
              <label className="block text-xs font-semibold text-[#1b382b] mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={mode === 'problem' ? 'e.g. Crystal Labyrinth' : 'e.g. The Reversed Gear'}
                className="w-full px-3 py-2 bg-[#f4f8f5] text-[#1b382b] rounded-xl border border-[#e2ece5] text-xs focus:border-[#2d6a4f] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1b382b] mb-1">
                {mode === 'problem' ? 'Objective Story' : 'Intended Goal'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what the solver must achieve..."
                className="w-full px-3 py-2 bg-[#f4f8f5] text-[#1b382b] rounded-xl border border-[#e2ece5] text-xs focus:border-[#2d6a4f] outline-none resize-none"
              />
            </div>

            {mode === 'bug' && (
              <div>
                <label className="block text-xs font-semibold text-[#1b382b] mb-1">
                  Subtle Bug Clue
                </label>
                <input
                  type="text"
                  value={bugClue}
                  onChange={(e) => setBugClue(e.target.value)}
                  placeholder="e.g. Look closely at turn block #3"
                  className="w-full px-3 py-2 bg-[#f4f8f5] text-[#1b382b] rounded-xl border border-[#e2ece5] text-xs focus:border-[#2d6a4f] outline-none"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={handleTestPlay}
              disabled={isPlaying}
              className="flex-1 py-3 bg-[#f4f8f5] hover:bg-[#eaf2ec] text-[#2d6a4f] font-black text-xs rounded-xl border border-[#e2ece5] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play size={14} className="fill-[#2d6a4f]" />
              {isPlaying ? 'SIMULATING...' : 'TEST SIMULATION'}
            </button>
            <button
              onClick={handlePublish}
              disabled={isPlaying}
              className="flex-1 py-3 bg-[#2d6a4f] hover:bg-[#245840] font-black text-white text-xs rounded-xl shadow-card flex items-center justify-center gap-1.5 cursor-pointer"
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
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              className="bg-white border border-[#e2ece5] rounded-3xl p-8 max-w-md w-full text-center shadow-card space-y-5"
            >
              <div className="w-16 h-16 bg-[#eaf2ec] border border-[#d3e2d8] rounded-2xl mx-auto flex items-center justify-center">
                {publishedModalData.type === 'bug' ? (
                  <Bug size={32} className="text-[#2d6a4f] animate-bounce" />
                ) : (
                  <CheckCircle2 size={32} className="text-[#2d6a4f] animate-bounce" />
                )}
              </div>

              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#2d6a4f]">
                  {publishedModalData.type === 'bug' ? 'Bug Challenge Deployed!' : 'Level Published Live!'}
                </span>
                <h3 className="text-2xl font-black text-[#1b382b] mt-1">
                  {publishedModalData.title}
                </h3>
                <p className="text-xs text-[#5b7566] mt-2">
                  {publishedModalData.type === 'bug'
                    ? 'Your bug puzzle has been uploaded to the Bug Exchange. Other coders can now debug it in multiplayer arena!'
                    : 'Your custom puzzle is now live for adventurers to explore across the world.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#f4f8f5] p-4 rounded-2xl border border-[#e2ece5]">
                <div className="flex items-center gap-2 justify-center">
                  <Sparkles size={16} className="text-[#2d6a4f]" />
                  <div className="text-left">
                    <p className="text-[10px] text-[#7a9386] font-bold">REWARD</p>
                    <p className="text-sm font-black text-[#1b382b]">+{publishedModalData.xp} XP</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Coins size={16} className="text-[#2d6a4f]" />
                  <div className="text-left">
                    <p className="text-[10px] text-[#7a9386] font-bold">BOUNTY</p>
                    <p className="text-sm font-black text-[#1b382b]">+{publishedModalData.coins} Coins</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/multiplayer"
                  className="w-full py-3 bg-[#2d6a4f] hover:bg-[#245840] text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-card"
                >
                  View in Bug Exchange <ArrowRight size={14} />
                </Link>
                <button
                  onClick={() => setPublishedModalData(null)}
                  className="w-full py-2.5 bg-[#f4f8f5] hover:bg-[#eaf2ec] text-[#5b7566] font-bold rounded-xl text-xs cursor-pointer border border-[#e2ece5]"
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
