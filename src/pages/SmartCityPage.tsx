import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Play, RotateCcw, Sparkles, CheckCircle2,
  ShieldCheck, ArrowRight, Zap, Coins, Bot, Activity,
  ArrowUp, ArrowDown, ArrowLeft, Trash2, HelpCircle, Eye, EyeOff, Box
} from 'lucide-react';
import { MISSIONS_LIST } from '@/data/missions';
import type { VisualBlock, SimulationResult, SimulationStep, MissionDefinition } from '@/types/game';
import { runDeterministicSimulation } from '@/services/gameEngine';
import { useGameData } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { GameScene3D } from '@/components/game3d/GameScene3D';
import { AIGameMaster } from '@/components/AIGameMaster';
import { sound } from '@/utils/audio';

export function SmartCityPage() {
  const { pet, completeMission } = useGameData();

  const cityMissions = MISSIONS_LIST.filter((m) => m.worldArea === 'smart_city');
  const [selectedMissionId, setSelectedMissionId] = useState<string>(cityMissions[0]?.id || 'smart_city_1');
  const cityMission = cityMissions.find((m) => m.id === selectedMissionId) || cityMissions[0];

  const [viewMode3D, setViewMode3D] = useState<boolean>(true);

  // User instructions workspace (starts clean so user actually builds the logic)
  const [blocks, setBlocks] = useState<VisualBlock[]>([
    { id: 'start_1', type: 'move_forward' },
  ]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [showHintPanel, setShowHintPanel] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [lastError, setLastError] = useState<string | undefined>();

  // Reset workspace when mission level changes
  useEffect(() => {
    setBlocks([{ id: `start_${Date.now()}`, type: 'move_forward' }]);
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setLastError(undefined);
    setSuccessBanner(false);
    setShowHintPanel(false);
  }, [cityMission.id]);

  const handleAddBlock = (type: VisualBlock['type']) => {
    sound.playSnap();
    setBlocks((prev) => [
      ...prev,
      { id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type },
    ]);
  };

  const handleRemoveBlock = (index: number) => {
    sound.playClick();
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    sound.playClick();
    setBlocks([]);
    setSimulationResult(null);
    setCurrentStepIndex(0);
    setLastError(undefined);
  };

  const handleRunTrafficTest = () => {
    if (blocks.length === 0) {
      sound.playError();
      setLastError('Workspace is empty! Add instructions to guide the vehicle.');
      return;
    }

    sound.playClick();
    setLastError(undefined);
    const result = runDeterministicSimulation(
      cityMission.gridSize,
      cityMission.startPos,
      cityMission.startDir,
      cityMission.goalPos,
      cityMission.obstacles,
      cityMission.crystals,
      cityMission.switches,
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
          completeMission(cityMission.id, cityMission.xpReward, cityMission.coinReward, {
            logic: 30,
            creativity: 20,
          });
          setSuccessBanner(true);
        } else {
          sound.playError();
          setLastError(result.message);
        }
      }
    }, 450);
  };

  const activeStep: SimulationStep =
    simulationResult && simulationResult.steps[currentStepIndex]
      ? simulationResult.steps[currentStepIndex]
      : {
          stepIndex: 0,
          petPos: cityMission.startPos,
          petDir: cityMission.startDir,
          petAction: 'idle',
          crystalsCollected: [],
          openGates: [],
          status: 'running',
          message: 'Signal automation standing by',
        };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-sky-950/90 via-slate-900 to-indigo-950 rounded-3xl border border-sky-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/20 border border-sky-500/40 rounded-full text-xs font-bold text-sky-300 mb-2">
            <Building2 size={14} /> Stage 5: Smart City Automation
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {cityMission.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Program sensor triggers and traffic signals to coordinate autonomous city transit!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHintPanel(!showHintPanel)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
          >
            {showHintPanel ? <EyeOff size={14} /> : <Eye size={14} />}
            {showHintPanel ? 'Hide Hint' : '💡 Show Hint'}
          </button>
          <button
            onClick={() => setShowAiHelper(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shrink-0 shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Bot size={16} /> Signal Assistant
          </button>
        </div>
      </div>

      {/* Level Selection Tabs */}
      <div className="flex flex-wrap bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 gap-2">
        {cityMissions.map((m, idx) => {
          const isSelected = m.id === cityMission.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMissionId(m.id);
                sound.playClick();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20 scale-105'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>Level {idx + 1}:</span>
              <span>{m.title}</span>
            </button>
          );
        })}
      </div>

      {/* Solution Hint Banner */}
      {showHintPanel && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs text-amber-200"
        >
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <HelpCircle size={16} /> Transit Engineer's Hint:
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            {cityMission.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D City Grid Simulation */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 flex flex-col justify-between shadow-2xl">
          <div className="flex items-center justify-between gap-2 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs text-slate-300 font-medium mb-4">
            <div>
              🚗 <strong>Autonomous Objective:</strong> {cityMission.objective}
            </div>

            {/* 3D / 2D Switch */}
            <button
              onClick={() => {
                sound.playClick();
                setViewMode3D((prev) => !prev);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                viewMode3D
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Box size={14} />
              {viewMode3D ? '3D City' : '2D View'}
            </button>
          </div>

          {viewMode3D ? (
            <GameScene3D
              gridSize={cityMission.gridSize}
              startPos={cityMission.startPos}
              goalPos={cityMission.goalPos}
              obstacles={cityMission.obstacles}
              crystals={cityMission.crystals}
              switches={cityMission.switches}
              activeStep={activeStep}
              petType={pet?.pet_type || 'cat'}
              equipped={pet?.equipped_items}
              theme="city"
              height="360px"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 min-h-[300px]">
              <div
                className="grid gap-2 p-3 bg-slate-900 rounded-2xl border border-slate-800 relative shadow-inner"
                style={{
                  gridTemplateColumns: `repeat(${cityMission.gridSize.width}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: cityMission.gridSize.height }).map((_, row) =>
                  Array.from({ length: cityMission.gridSize.width }).map((__, col) => {
                    const isPetHere = activeStep.petPos.x === col && activeStep.petPos.y === row;
                    const isGoal = cityMission.goalPos.x === col && cityMission.goalPos.y === row;
                    const obs = cityMission.obstacles.find((o) => o.x === col && o.y === row);
                    const isGateOpen =
                      obs?.type === 'gate' &&
                      activeStep.openGates.includes(obs.id || `${col},${row}`);
                    const sw = cityMission.switches?.find((s) => s.x === col && s.y === row);
                    const crystal = cityMission.crystals.find((c) => c.x === col && c.y === row);
                    const isCollected = activeStep.crystalsCollected.some((c) => c.x === col && c.y === row);

                    return (
                      <div
                        key={`city_${col}_${row}`}
                        className={`w-14 h-14 rounded-xl flex items-center justify-center relative transition-all ${
                          isGoal
                            ? 'bg-emerald-950 border-2 border-emerald-400'
                            : obs?.type === 'gate'
                            ? isGateOpen
                              ? 'bg-indigo-950/60 border border-emerald-400'
                              : 'bg-rose-950/80 border-2 border-rose-500'
                            : obs?.type === 'wall'
                            ? 'bg-slate-800/80 border border-slate-700'
                            : sw
                            ? 'bg-emerald-950/60 border border-emerald-400 animate-pulse'
                            : 'bg-slate-900 border border-slate-800'
                        }`}
                      >
                        {obs?.type === 'wall' && <span className="text-xl">🏢</span>}
                        {obs?.type === 'gate' && (
                          <span className="text-xl">{isGateOpen ? '🟢' : '🔴'}</span>
                        )}
                        {sw && !isPetHere && <span className="text-xl">📶</span>}
                        {crystal && !isCollected && !isPetHere && (
                          <span className="text-xl animate-bounce">🔋</span>
                        )}
                        {isGoal && !isPetHere && <span className="text-xl">⚡</span>}

                        {isPetHere && pet && (
                          <PetSVG
                            type={pet.pet_type}
                            stage={pet.stage}
                            state={activeStep.status === 'collision' ? 'tired' : activeStep.status === 'success' ? 'excited' : 'focused'}
                            equipped={pet.equipped_items}
                            size={46}
                            reaction={
                              activeStep.status === 'success'
                                ? { config: { expression: 'victory', label: 'Delivered!', icon: '⚡', sound: 'victory', duration: 2 }, id: 1 }
                                : activeStep.status === 'collision' || activeStep.status === 'failed'
                                ? { config: { expression: 'hurt', label: 'Blocked!', icon: '💥', sound: 'hurt', duration: 2 }, id: 2 }
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
              Transit Status:{' '}
              <strong className={activeStep.status === 'collision' ? 'text-rose-400' : 'text-emerald-400'}>
                {activeStep.message || 'Ready for deployment'}
              </strong>
            </span>
            <span className="text-amber-400">
              Batteries: {activeStep.crystalsCollected.length} / {cityMission.crystals.length}
            </span>
          </div>
        </div>

        {/* Right: Automation Logic Controller & Block Builder */}
        <div className="lg:col-span-5 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Activity className="text-sky-400" size={18} /> Signal Automation Program
            </h3>
            <button
              onClick={handleClear}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>

          {/* Action Chips to build logic */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-bold block">Add Movement & Signal Actions:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleAddBlock('move_up')}
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowUp size={12} /> Up
              </button>
              <button
                onClick={() => handleAddBlock('move_down')}
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowDown size={12} /> Down
              </button>
              <button
                onClick={() => handleAddBlock('move_left')}
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={12} /> Left
              </button>
              <button
                onClick={() => handleAddBlock('move_right')}
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowRight size={12} /> Right
              </button>
              <button
                onClick={() => handleAddBlock('move_forward')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                + Forward
              </button>
              <button
                onClick={() => handleAddBlock('turn_left')}
                className="px-2.5 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                ↩ Left
              </button>
              <button
                onClick={() => handleAddBlock('turn_right')}
                className="px-2.5 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                ↪ Right
              </button>
              <button
                onClick={() => handleAddBlock('interact')}
                className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                📶 Signal Interact
              </button>
            </div>
          </div>

          {/* Instruction Queue List */}
          <div className="min-h-[140px] max-h-[200px] overflow-y-auto bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1.5 custom-scrollbar">
            {blocks.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-semibold">
                No instructions added yet. Tap action buttons above to construct your transit route!
              </div>
            ) : (
              blocks.map((b, i) => (
                <div
                  key={b.id || i}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    simulationResult && currentStepIndex === i + 1
                      ? 'bg-sky-500 text-slate-950 scale-102 shadow-md shadow-sky-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">#{i + 1}</span>
                    <span className="capitalize">{b.type.replace('_', ' ')}</span>
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

          {lastError && (
            <div className="p-3 bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl text-center">
              {lastError}
            </div>
          )}

          <button
            onClick={handleRunTrafficTest}
            disabled={isPlaying}
            className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-sky-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play size={18} className="fill-slate-950" />
            {isPlaying ? 'SIMULATING TRANSIT GRID...' : 'DEPLOY TRANSIT AUTOMATION'}
          </button>

          {successBanner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-extrabold text-sm">
                <ShieldCheck size={18} /> City Grid Synchronized!
              </div>
              <p className="text-xs text-slate-300">
                You automated dynamic signal switching, ensuring power cells safely reached destination.
              </p>
              <div className="flex justify-center gap-3 pt-1 text-xs font-bold text-emerald-300">
                <span>+{cityMission.xpReward} XP</span>
                <span>+{cityMission.coinReward} Coins</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AIGameMaster
        mission={cityMission}
        currentBlocks={blocks}
        lastError={lastError}
        isOpen={showAiHelper}
        onClose={() => setShowAiHelper(false)}
      />
    </div>
  );
}
