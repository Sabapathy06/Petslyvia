import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, Bug, Sparkles, CheckCircle2, Play,
  Trophy, Clock, Zap, Coins, ShieldCheck, UserPlus, Send, Swords, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hand, Trash2, Box, Plus
} from 'lucide-react';
import { useGameData } from '@/hooks/useGameData';
import type { BugExchangeItem, CommunityProblem, VisualBlock, SimulationResult, SimulationStep, GridPos } from '@/types/game';
import type { Contact } from '@/types/database';
import { runDeterministicSimulation } from '@/services/gameEngine';
import { PetSVG } from '@/components/PetSVG';
import { DuelArena3D } from '@/components/game3d/DuelArena3D';
import { GameScene3D } from '@/components/game3d/GameScene3D';
import { sound } from '@/utils/audio';

import { getArenaForContact } from '@/data/arenas';

export function MultiplayerPage() {
  const { profile, pet, bugExchanges, communityProblems, contacts, solveBug, completeMission } = useGameData();

  const [activeTab, setActiveTab] = useState<'bug_exchange' | 'community' | 'friends'>('friends');
  const [viewMode3D, setViewMode3D] = useState<boolean>(true);
  const [selectedBug, setSelectedBug] = useState<BugExchangeItem | null>(
    bugExchanges[0] || null
  );

  // Active debug workspace for selected bug
  const [bugBlocks, setBugBlocks] = useState<VisualBlock[]>(
    bugExchanges[0]?.brokenBlocks || []
  );
  const [solving, setSolving] = useState(false);
  const [solveResult, setSolveResult] = useState<string | null>(null);
  const [bugSimSteps, setBugSimSteps] = useState<SimulationStep[]>([]);
  const [bugSimStepIndex, setBugSimStepIndex] = useState(0);
  const [showBugClue, setShowBugClue] = useState(false);

  // Challenge / Duel state
  const [selectedOpponent, setSelectedOpponent] = useState<Contact | null>(null);
  const [duelBlocks, setDuelBlocks] = useState<VisualBlock[]>([
    { id: 'd1', type: 'move_down' },
    { id: 'd2', type: 'move_down' },
    { id: 'd3', type: 'move_down' },
    { id: 'd4', type: 'move_right' },
  ]);
  const [duelRacing, setDuelRacing] = useState(false);
  const [playerDuelStep, setPlayerDuelStep] = useState(0);
  const [opponentDuelStep, setOpponentDuelStep] = useState(0);
  const [playerSimulationSteps, setPlayerSimulationSteps] = useState<SimulationStep[]>([]);
  const [duelResult, setDuelResult] = useState<{ winner: 'player' | 'opponent' | null; message: string } | null>(null);
  const raceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Close duel modal and safely cleanup racing interval
  const handleCloseDuel = () => {
    if (raceIntervalRef.current) {
      clearInterval(raceIntervalRef.current);
      raceIntervalRef.current = null;
    }
    setDuelRacing(false);
    sound.playClick();
    setSelectedOpponent(null);
  };

  // Keyboard shortcut: Escape key closes duel modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedOpponent) {
        handleCloseDuel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (raceIntervalRef.current) {
        clearInterval(raceIntervalRef.current);
        raceIntervalRef.current = null;
      }
    };
  }, [selectedOpponent]);

  // Select a bug to inspect & solve
  const handleSelectBug = (bug: BugExchangeItem) => {
    sound.playClick();
    setSelectedBug(bug);
    setBugBlocks([...bug.brokenBlocks]);
    setSolveResult(null);
    setBugSimSteps([]);
    setBugSimStepIndex(0);
    setShowBugClue(false);
  };

  // Replace block in bug workspace
  const handleSwapBlock = (index: number, newType: VisualBlock['type']) => {
    sound.playSnap();
    setBugBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, type: newType } : b))
    );
  };

  const handleAddBugBlock = (type: VisualBlock['type']) => {
    sound.playSnap();
    setBugBlocks((prev) => [
      ...prev,
      { id: `bug_b_${Date.now()}_${Math.random()}`, type },
    ]);
  };

  const handleRemoveBugBlock = (index: number) => {
    sound.playClick();
    setBugBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  // Challenge creator of a bug directly to a 1v1 duel
  const handleChallengeCreator = (creatorName: string) => {
    const matchedContact = contacts.find(
      (c) => c.friend_name.toLowerCase() === creatorName.toLowerCase()
    ) || {
      id: `c_creator_${creatorName}`,
      user_id: 'current',
      friend_user_id: `user_${creatorName.toLowerCase()}`,
      friend_name: creatorName,
      friend_pet_type: creatorName.toLowerCase().includes('pixel') ? 'bunny' : 'fox',
      friend_pet_stage: 'teen',
      status: 'accepted',
      is_online: true,
      created_at: new Date().toISOString(),
    };
    handleOpenChallenge(matchedContact);
  };

  // Test and solve bug with step-by-step visual animation
  const handleRunSolve = () => {
    if (!selectedBug) return;
    sound.playClick();
    setSolving(true);
    setSolveResult(null);

    const result = runDeterministicSimulation(
      selectedBug.grid,
      selectedBug.grid.start,
      'right',
      selectedBug.grid.goal,
      selectedBug.grid.obstacles,
      selectedBug.grid.crystals,
      selectedBug.grid.switches || [],
      bugBlocks
    );

    setBugSimSteps(result.steps);
    setBugSimStepIndex(0);

    let step = 0;
    const interval = setInterval(async () => {
      step++;
      if (step < result.steps.length) {
        setBugSimStepIndex(step);
        sound.playStep();
      } else {
        clearInterval(interval);
        setSolving(false);
        if (result.success) {
          sound.playVictory();
          await solveBug(selectedBug.id);
          setSolveResult('🏆 Bug Challenge Solved! Bounty Claimed!');
        } else {
          sound.playError();
          setSolveResult(`❌ Test Failed: ${result.message}`);
        }
      }
    }, 380);
  };

  // Open Duel against a Contact with opponent-specific arena setup
  const handleOpenChallenge = (contact: Contact) => {
    sound.playClick();
    if (raceIntervalRef.current) {
      clearInterval(raceIntervalRef.current);
      raceIntervalRef.current = null;
    }
    const arena = getArenaForContact(contact);
    setSelectedOpponent(contact);
    if (arena.startPos.y > arena.goalPos.y) {
      setDuelBlocks([
        { id: 'd1', type: 'move_up' },
        { id: 'd2', type: 'move_up' },
        { id: 'd3', type: 'move_right' },
      ]);
    } else {
      setDuelBlocks([
        { id: 'd1', type: 'move_down' },
        { id: 'd2', type: 'move_down' },
        { id: 'd3', type: 'move_right' },
      ]);
    }
    setPlayerDuelStep(0);
    setOpponentDuelStep(0);
    setPlayerSimulationSteps([]);
    setDuelResult(null);
    setDuelRacing(false);
  };

  // Launch a Community Level directly in the 3D Duel Stadium
  const handlePlayCommunityLevel = (problem: CommunityProblem) => {
    sound.playClick();
    if (raceIntervalRef.current) {
      clearInterval(raceIntervalRef.current);
      raceIntervalRef.current = null;
    }
    const pseudoContact: Contact = {
      id: `comm_${problem.id}`,
      user_id: 'community',
      friend_user_id: problem.creatorId || 'community',
      friend_name: problem.creatorName,
      friend_pet_type: 'fox',
      friend_pet_stage: 'teen',
      status: 'accepted',
      is_online: true,
      created_at: new Date().toISOString(),
    };
    setSelectedOpponent(pseudoContact);

    if (problem.grid.start.y > problem.grid.goal.y) {
      setDuelBlocks([
        { id: 'd1', type: 'move_up' },
        { id: 'd2', type: 'move_up' },
        { id: 'd3', type: 'move_right' },
      ]);
    } else {
      setDuelBlocks([
        { id: 'd1', type: 'move_down' },
        { id: 'd2', type: 'move_down' },
        { id: 'd3', type: 'move_right' },
      ]);
    }
    setPlayerDuelStep(0);
    setOpponentDuelStep(0);
    setPlayerSimulationSteps([]);
    setDuelResult(null);
    setDuelRacing(false);
  };

  // Add block to Duel sequence
  const handleAddDuelBlock = (type: VisualBlock['type']) => {
    sound.playSnap();
    setDuelBlocks((prev) => [
      ...prev,
      { id: `duel_${Date.now()}_${Math.random()}`, type },
    ]);
  };

  const handleRemoveDuelBlock = (index: number) => {
    sound.playClick();
    setDuelBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  // Launch Duel Race
  const handleStartDuelRace = () => {
    if (duelBlocks.length === 0) {
      sound.playError();
      return;
    }
    sound.playClick();
    setDuelRacing(true);
    setDuelResult(null);

    const arena = selectedOpponent
      ? getArenaForContact(selectedOpponent, communityProblems)
      : getArenaForContact(contacts[0], communityProblems);

    // Player simulation
    const playerSim = runDeterministicSimulation(
      arena.gridSize,
      arena.startPos,
      arena.startDir,
      arena.goalPos,
      arena.obstacles,
      arena.crystals,
      arena.switches || [],
      duelBlocks
    );

    setPlayerSimulationSteps(playerSim.steps);

    const opponentTotalSteps = arena.botPath.length - 1;
    let stepCount = 0;

    if (raceIntervalRef.current) {
      clearInterval(raceIntervalRef.current);
      raceIntervalRef.current = null;
    }

    raceIntervalRef.current = setInterval(() => {
      stepCount++;
      setPlayerDuelStep(Math.min(stepCount, playerSim.steps.length - 1));
      setOpponentDuelStep(Math.min(stepCount, opponentTotalSteps));
      sound.playStep();

      const maxSteps = Math.max(playerSim.steps.length, opponentTotalSteps + 1);
      if (stepCount >= maxSteps) {
        if (raceIntervalRef.current) {
          clearInterval(raceIntervalRef.current);
          raceIntervalRef.current = null;
        }
        setDuelRacing(false);

        if (playerSim.success && playerSim.steps.length <= opponentTotalSteps + 2) {
          sound.playVictory();
          setDuelResult({
            winner: 'player',
            message: `Victory! Your algorithm outpaced ${selectedOpponent?.friend_name}!`,
          });
          completeMission('multiplayer_duel', 50, 30, { collaboration: 15, logic: 10 });
        } else if (playerSim.success) {
          sound.playVictory();
          setDuelResult({
            winner: 'player',
            message: `Challenge Completed! Reached target safely.`,
          });
          completeMission('multiplayer_duel', 40, 20, { collaboration: 10 });
        } else {
          sound.playError();
          setDuelResult({
            winner: 'opponent',
            message: `Duel Lost: ${playerSim.message || 'Companion did not reach the portal.'}`,
          });
        }
      }
    }, 450);
  };

  const currentArena = selectedOpponent
    ? getArenaForContact(selectedOpponent, communityProblems)
    : null;

  // Active positions on the duel arena grid
  const playerActivePos =
    playerSimulationSteps.length > 0 && playerSimulationSteps[playerDuelStep]
      ? playerSimulationSteps[playerDuelStep].petPos
      : currentArena?.startPos || { x: 0, y: 0 };

  const opponentActivePos =
    currentArena && currentArena.botPath[Math.min(opponentDuelStep, currentArena.botPath.length - 1)]
      ? currentArena.botPath[Math.min(opponentDuelStep, currentArena.botPath.length - 1)]
      : { x: 0, y: 0 };

  const playerCrystals =
    playerSimulationSteps.length > 0 && playerSimulationSteps[playerDuelStep]
      ? playerSimulationSteps[playerDuelStep].crystalsCollected
      : [];

  // Active positions on the bug test grid
  const bugActivePos =
    bugSimSteps.length > 0 && bugSimSteps[bugSimStepIndex]
      ? bugSimSteps[bugSimStepIndex].petPos
      : selectedBug?.grid.start || { x: 0, y: 0 };

  const bugCrystals =
    bugSimSteps.length > 0 && bugSimSteps[bugSimStepIndex]
      ? bugSimSteps[bugSimStepIndex].crystalsCollected
      : [];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="p-6 bg-white rounded-3xl border border-[#e2ece5] shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eaf2ec] border border-[#d3e2d8] rounded-full text-xs font-bold text-[#2d6a4f] mb-2">
            <Users size={14} /> Global Multiplayer Arena
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1b382b] tracking-tight">
            Bug Exchange & Community
          </h1>
          <p className="text-xs sm:text-sm text-[#5b7566] mt-1 font-medium">
            Exchange intentional bugs with other players, solve community puzzles, and challenge companions to live logic duels!
          </p>
        </div>

        {/* Global Debugging Stats */}
        <div className="flex gap-2 bg-[#f4f8f5] p-3 rounded-2xl border border-[#e2ece5] text-xs">
          <div className="text-center px-3 border-r border-[#e2ece5]">
            <span className="text-[#5b7566] block text-[10px] uppercase font-bold">Bugs Solved</span>
            <span className="text-base font-black text-[#2d6a4f]">{profile?.bugs_solved ?? 0}</span>
          </div>
          <div className="text-center px-3">
            <span className="text-[#5b7566] block text-[10px] uppercase font-bold">Bugs Created</span>
            <span className="text-base font-black text-[#1b382b]">{profile?.bugs_created ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-[#e2ece5] gap-2 max-w-lg shadow-soft">
        <button
          onClick={() => {
            setActiveTab('friends');
            sound.playClick();
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'friends'
              ? 'bg-[#2d6a4f] text-white shadow-sm'
              : 'text-[#5b7566] hover:text-[#1b382b]'
          }`}
        >
          <Swords size={14} /> Challenge Arena ({contacts.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('bug_exchange');
            sound.playClick();
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'bug_exchange'
              ? 'bg-[#2d6a4f] text-white shadow-sm'
              : 'text-[#5b7566] hover:text-[#1b382b]'
          }`}
        >
          <Bug size={14} /> Bug Exchange ({bugExchanges.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('community');
            sound.playClick();
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'community'
              ? 'bg-[#2d6a4f] text-white shadow-sm'
              : 'text-[#5b7566] hover:text-[#1b382b]'
          }`}
        >
          <Sparkles size={14} /> Community ({communityProblems.length})
        </button>
      </div>

      {/* TAB 1: CONTACTS & LIVE CHALLENGE ARENA */}
      {activeTab === 'friends' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1b382b] flex items-center gap-2">
              <Swords className="text-[#2d6a4f]" size={18} /> Companion Explorer Network & Duels
            </h3>
            <span className="text-xs text-[#5b7566] font-mono">{contacts.length} Connections Ready</span>
          </div>

          <p className="text-xs text-[#5b7566] font-medium">
            Click <strong>Challenge</strong> on any player to enter the live head-to-head algorithm race arena!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="p-4 bg-[#f4f8f5] rounded-2xl border border-[#e2ece5] flex items-center justify-between hover:border-[#2d6a4f] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <PetSVG
                      type={c.friend_pet_type}
                      stage={c.friend_pet_stage}
                      state="happy"
                      size={44}
                    />
                    {c.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#2d6a4f] border border-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-[#1b382b]">{c.friend_name}</p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <span className="text-[10px] text-[#5b7566] capitalize">
                        {c.friend_pet_stage} {c.friend_pet_type}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-[#eaf2ec] text-[#2d6a4f] rounded font-mono font-bold w-fit border border-[#d3e2d8]">
                        {getArenaForContact(c).arenaName}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenChallenge(c)}
                  className="px-3.5 py-2 bg-[#2d6a4f] hover:bg-[#245840] text-white rounded-xl text-xs font-black shadow-card transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Swords size={13} /> Challenge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BUG EXCHANGE & COMMUNITY CHALLENGES */}
      {activeTab === 'bug_exchange' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Bug List with Challenge Actions */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#1b382b] flex items-center gap-2">
                <Bug className="text-[#2d6a4f]" size={16} /> Open Bug Bounties
              </h3>
              <Link
                to="/app/creator"
                onClick={() => sound.playClick()}
                className="px-3 py-1 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus size={13} /> Create Bug
              </Link>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              {bugExchanges.map((b) => {
                const isSelected = selectedBug?.id === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBug(b)}
                    className={`w-full text-left p-4 rounded-3xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-[#eaf2ec] border-[#2d6a4f] shadow-card'
                        : 'bg-white border-[#e2ece5] hover:border-[#2d6a4f]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-[#eaf2ec] text-[#2d6a4f] border border-[#d3e2d8]">
                          ⚡ Bug Challenge
                        </span>
                        <span className="text-[10px] font-bold text-[#5b7566]">
                          by <strong className="text-[#1b382b]">{b.creatorName}</strong>
                        </span>
                      </div>
                      <span className="text-[10px] bg-[#f4f8f5] text-[#5b7566] font-mono px-2 py-0.5 rounded-full border border-[#e2ece5]">
                        {b.solversCount} Solves
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-[#1b382b]">{b.title}</h4>
                    <p className="text-xs text-[#5b7566] line-clamp-2">{b.intendedGoal}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-[#e2ece5] text-[11px] font-bold">
                      <span className="text-[#2d6a4f] font-black">+{b.rewardCoins} Coins</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChallengeCreator(b.creatorName);
                          }}
                          className="px-2.5 py-1 bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#e2ece5] text-[#2d6a4f] rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                          title={`Duel ${b.creatorName} in Live Arena`}
                        >
                          <Swords size={11} /> Duel Creator
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectBug(b)}
                          className="px-2.5 py-1 bg-[#2d6a4f] hover:bg-[#245840] text-white rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          ⚔️ Challenge
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Bug Sandbox with 2D Visual Grid */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card space-y-4">
            {selectedBug ? (
              <>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-black text-lg text-[#1b382b]">{selectedBug.title}</h3>
                      <p className="text-xs text-[#5b7566] mt-0.5">{selectedBug.intendedGoal}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-[#2d6a4f] bg-[#eaf2ec] px-2.5 py-1 rounded-xl border border-[#d3e2d8]">
                        +{selectedBug.rewardCoins} Coins
                      </span>
                      <button
                        onClick={() => handleChallengeCreator(selectedBug.creatorName)}
                        className="px-3 py-1.5 bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#e2ece5] text-[#2d6a4f] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Swords size={12} /> Duel Creator
                      </button>
                    </div>
                  </div>

                  {/* Creator Clue Toggle */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        sound.playClick();
                        setShowBugClue(!showBugClue);
                      }}
                      className="text-xs font-bold text-[#2d6a4f] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      💡 {showBugClue ? 'Hide Creator Clue' : 'Show Creator Clue'}
                    </button>
                  </div>

                  {showBugClue && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-[#fbf5e8] border border-[#f0dfba] text-[#74551d] text-xs rounded-xl"
                    >
                      <strong>Creator's Note ({selectedBug.creatorName}):</strong> {selectedBug.clue}
                    </motion.div>
                  )}
                </div>

                {/* VISUAL 3D / 2D BUG SIMULATION ARENA GRID */}
                <div className="bg-[#f4f8f5] p-4 rounded-2xl border border-[#e2ece5] flex flex-col items-center justify-between">
                  <div className="flex items-center justify-between w-full mb-3 px-1 text-[11px] text-[#5b7566] font-mono">
                    <span className="text-[#2d6a4f] font-bold">
                      Bug Matrix: {selectedBug.grid.width}x{selectedBug.grid.height}
                    </span>
                    <button
                      onClick={() => {
                        sound.playClick();
                        setViewMode3D((prev) => !prev);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1 transition-all cursor-pointer ${
                        viewMode3D
                          ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                          : 'bg-white text-[#5b7566] border-[#e2ece5]'
                      }`}
                    >
                      <Box size={13} />
                      {viewMode3D ? '3D Matrix' : '2D View'}
                    </button>
                  </div>

                  {viewMode3D ? (
                    <GameScene3D
                      gridSize={{ width: selectedBug.grid.width, height: selectedBug.grid.height }}
                      startPos={selectedBug.grid.start}
                      goalPos={selectedBug.grid.goal}
                      obstacles={selectedBug.grid.obstacles}
                      crystals={selectedBug.grid.crystals}
                      switches={selectedBug.grid.switches || []}
                      activeStep={
                        bugSimSteps.length > 0 && bugSimSteps[bugSimStepIndex]
                          ? bugSimSteps[bugSimStepIndex]
                          : {
                              stepIndex: 0,
                              petPos: selectedBug.grid.start,
                              petDir: 'right',
                              petAction: 'idle',
                              crystalsCollected: [],
                              openGates: [],
                              status: 'running',
                            }
                      }
                      petType={pet?.pet_type || 'cat'}
                      equipped={pet?.equipped_items}
                      theme="dungeon"
                      height="300px"
                    />
                  ) : (
                    <div
                      className="grid gap-1.5 p-2 bg-white rounded-2xl border border-[#e2ece5] shadow-soft"
                      style={{
                        gridTemplateColumns: `repeat(${selectedBug.grid.width}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: selectedBug.grid.height }).map((_, row) =>
                        Array.from({ length: selectedBug.grid.width }).map((__, col) => {
                          const isPetHere = bugActivePos.x === col && bugActivePos.y === row;
                          const isGoal = selectedBug.grid.goal.x === col && selectedBug.grid.goal.y === row;
                          const obs = selectedBug.grid.obstacles.find((o) => o.x === col && o.y === row);
                          const crystal = selectedBug.grid.crystals.find((c) => c.x === col && c.y === row);
                          const isCollected = bugCrystals.some((c) => c.x === col && c.y === row);

                          return (
                            <div
                              key={`bug_grid_${col}_${row}`}
                              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center relative transition-all ${
                                isGoal
                                  ? 'bg-[#eaf2ec] border-2 border-[#2d6a4f]'
                                  : obs?.type === 'wall'
                                  ? 'bg-[#e2ece5] border border-[#d3e2d8]'
                                  : obs?.type === 'water'
                                  ? 'bg-sky-50 border border-sky-300'
                                  : crystal && !isCollected
                                  ? 'bg-[#eaf2ec] border border-[#2d6a4f]'
                                  : 'bg-[#f4f8f5] border border-[#e2ece5]'
                              }`}
                            >
                              {obs?.type === 'wall' && <span className="text-base">🧱</span>}
                              {obs?.type === 'water' && <span className="text-base">🌊</span>}
                              {crystal && !isCollected && !isPetHere && (
                                <span className="text-base animate-bounce">💎</span>
                              )}
                              {isGoal && !isPetHere && <span className="text-base">🌟</span>}

                              {isPetHere && pet && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                  <PetSVG
                                    type={pet.pet_type}
                                    stage={pet.stage}
                                    state={
                                      bugSimSteps[bugSimStepIndex]?.status === 'collision'
                                        ? 'tired'
                                        : bugSimSteps[bugSimStepIndex]?.status === 'success'
                                        ? 'excited'
                                        : 'focused'
                                    }
                                    equipped={pet.equipped_items}
                                    size={34}
                                    reaction={
                                      bugSimSteps[bugSimStepIndex]?.status === 'success'
                                        ? { config: { expression: 'victory', label: 'Fixed!', icon: '🏆', sound: 'victory', duration: 2 }, id: 1 }
                                        : bugSimSteps[bugSimStepIndex]?.status === 'collision' || bugSimSteps[bugSimStepIndex]?.status === 'failed'
                                        ? { config: { expression: 'hurt', label: 'Hit Bug!', icon: '💥', sound: 'hurt', duration: 2 }, id: 2 }
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
                  )}
                </div>

                {/* Bug Sequence Editor */}
                <div className="bg-[#f4f8f5] p-4 rounded-2xl border border-[#e2ece5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-[#5b7566] block">
                      Inspect & Fix Broken Sequence:
                    </span>
                    <span className="text-[10px] text-[#7a9386] font-mono">
                      {bugBlocks.length} Steps in Program
                    </span>
                  </div>

                  {/* Add action chips */}
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    <button
                      type="button"
                      onClick={() => handleAddBugBlock('move_forward')}
                      className="px-2.5 py-1 bg-white hover:bg-[#eaf2ec] border border-[#e2ece5] text-[#1b382b] rounded-lg text-xs font-bold cursor-pointer"
                    >
                      + forward
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBugBlock('turn_right')}
                      className="px-2.5 py-1 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-lg text-xs font-bold cursor-pointer"
                    >
                      + turn_right
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBugBlock('turn_left')}
                      className="px-2.5 py-1 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-lg text-xs font-bold cursor-pointer"
                    >
                      + turn_left
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBugBlock('move_down')}
                      className="px-2.5 py-1 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-lg text-xs font-bold cursor-pointer"
                    >
                      + move_down
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBugBlock('interact')}
                      className="px-2.5 py-1 bg-[#2d6a4f] hover:bg-[#245840] border border-[#2d6a4f] text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      + interact
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                    {bugBlocks.map((blk, idx) => (
                      <div
                        key={blk.id || idx}
                        className="flex items-center justify-between bg-white p-2 rounded-xl border border-[#e2ece5] text-xs shadow-soft"
                      >
                        <span className="font-mono text-[#7a9386] w-6">#{idx + 1}</span>
                        <select
                          value={blk.type}
                          onChange={(e) => handleSwapBlock(idx, e.target.value as any)}
                          className="bg-[#f4f8f5] text-[#1b382b] font-bold px-3 py-1 rounded-lg border border-[#e2ece5] outline-none text-xs flex-1 mx-2"
                        >
                          <option value="move_forward">move_forward()</option>
                          <option value="turn_right">turn_right()</option>
                          <option value="turn_left">turn_left()</option>
                          <option value="move_up">move_up()</option>
                          <option value="move_down">move_down()</option>
                          <option value="move_left">move_left()</option>
                          <option value="move_right">move_right()</option>
                          <option value="interact">interact()</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveBugBlock(idx)}
                          className="text-[#7a9386] hover:text-rose-600 text-sm px-1.5 py-0.5 rounded cursor-pointer"
                          title="Delete instruction"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {solveResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl text-xs font-bold text-center ${
                      solveResult.includes('Claimed')
                        ? 'bg-[#eaf2ec] border border-[#d3e2d8] text-[#2d6a4f]'
                        : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}
                  >
                    {solveResult}
                  </motion.div>
                )}

                <button
                  onClick={handleRunSolve}
                  disabled={solving}
                  className="w-full py-3.5 bg-[#2d6a4f] hover:bg-[#245840] text-white font-black text-sm rounded-2xl shadow-card transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play size={18} className="fill-white" />
                  {solving ? 'SIMULATING PATCH ON GRID...' : 'RUN BUG CHALLENGE TEST & CLAIM BOUNTY'}
                </button>
              </>
            ) : (
              <div className="text-center py-20 text-[#7a9386] text-sm font-medium">
                Select a bug from the bounties list to debug!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COMMUNITY LEVELS */}
      {activeTab === 'community' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {communityProblems.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-3xl p-5 border border-[#e2ece5] space-y-3 flex flex-col justify-between shadow-card"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#5b7566]">
                    By <strong className="text-[#1b382b]">{p.creatorName}</strong>
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#2d6a4f] bg-[#eaf2ec] px-2 py-0.5 rounded-full border border-[#d3e2d8]">
                    {p.difficulty}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-[#1b382b]">{p.title}</h4>
                <p className="text-xs text-[#5b7566] mt-1 line-clamp-3 font-medium">{p.description}</p>
              </div>

              <div className="pt-3 border-t border-[#e2ece5] flex items-center justify-between text-xs">
                <span className="text-[#5b7566] text-[11px]">
                  Plays: <strong className="text-[#1b382b]">{p.playsCount}</strong> · Solves:{' '}
                  <strong className="text-[#2d6a4f]">{p.solvesCount}</strong>
                </span>
                <button
                  onClick={() => handlePlayCommunityLevel(p)}
                  className="px-3 py-1.5 bg-[#2d6a4f] hover:bg-[#245840] text-white rounded-xl text-xs font-bold cursor-pointer shadow-soft"
                >
                  Play Level
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIVE 1V1 DUEL CHALLENGE MODAL WITH VISUAL 2D ARENA GRID */}
      <AnimatePresence>
        {selectedOpponent && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !duelRacing) {
                handleCloseDuel();
              }
            }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-[#e2ece5] rounded-3xl p-5 sm:p-6 max-w-2xl w-full space-y-4 shadow-card relative my-6"
            >
              {/* Top Close Button */}
              <button
                onClick={handleCloseDuel}
                className="absolute top-4 right-4 px-3 py-1.5 text-xs font-extrabold text-[#5b7566] hover:text-[#1b382b] rounded-xl bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#e2ece5] flex items-center gap-1.5 cursor-pointer z-10 transition-colors shadow-soft"
                title="Close Duel"
              >
                <X size={15} /> Close
              </button>

              {/* Match Versus Banner */}
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#eaf2ec] text-[#2d6a4f] border border-[#d3e2d8] text-[10px] uppercase font-black tracking-widest">
                  {currentArena?.arenaName || 'Logic Duel Arena'} · {currentArena?.themeTag}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-[#1b382b] flex items-center justify-center gap-2">
                  <span className="text-[#2d6a4f]">{pet?.pet_name || 'Your Pet'}</span>
                  <span className="text-[#7a9386] text-sm">VS</span>
                  <span className="text-[#1b382b]">{selectedOpponent.friend_name}</span>
                </h3>
              </div>

              {/* Competitor Status Bars */}
              <div className="grid grid-cols-2 gap-3 bg-[#f4f8f5] p-3 rounded-2xl border border-[#e2ece5] text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#e2ece5] flex items-center justify-center shrink-0 shadow-soft">
                    {pet && <PetSVG type={pet.pet_type} stage={pet.stage} state="happy" size={28} />}
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-[#2d6a4f] block truncate">{pet?.pet_name} (You)</span>
                    <span className="text-[10px] text-[#5b7566] font-mono">
                      Pos: ({playerActivePos.x}, {playerActivePos.y})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end text-right">
                  <div className="min-w-0">
                    <span className="font-extrabold text-[#1b382b] block truncate">{selectedOpponent.friend_name}</span>
                    <span className="text-[10px] text-[#5b7566] font-mono">
                      Pos: ({opponentActivePos.x}, {opponentActivePos.y})
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#e2ece5] flex items-center justify-center shrink-0 shadow-soft">
                    <PetSVG type={selectedOpponent.friend_pet_type} stage={selectedOpponent.friend_pet_stage} state="happy" size={28} />
                  </div>
                </div>
              </div>

              {/* VISUAL 3D / 2D DUEL ARENA GRID */}
              {currentArena && (
                <div className="bg-[#f4f8f5] p-4 rounded-2xl border border-[#e2ece5] flex flex-col items-center justify-center">
                  <div className="flex items-center justify-between w-full mb-3 px-1 text-[11px] text-[#5b7566] font-mono">
                    <span className="text-[#2d6a4f] font-bold">
                      {currentArena.arenaName} ({currentArena.gridSize.width}x{currentArena.gridSize.height})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#2d6a4f] font-bold">
                        Crystals: {playerCrystals.length} / {currentArena.crystals.length}
                      </span>
                      <button
                        onClick={() => {
                          sound.playClick();
                          setViewMode3D((prev) => !prev);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1 transition-all cursor-pointer ${
                          viewMode3D
                            ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                            : 'bg-white text-[#5b7566] border-[#e2ece5]'
                        }`}
                      >
                        <Box size={13} />
                        {viewMode3D ? '3D Stadium' : '2D View'}
                      </button>
                    </div>
                  </div>

                  {viewMode3D ? (
                    <GameScene3D
                      gridSize={currentArena.gridSize}
                      startPos={currentArena.startPos}
                      goalPos={currentArena.goalPos}
                      obstacles={currentArena.obstacles}
                      crystals={currentArena.crystals.map((c) => ({
                        x: c.x,
                        y: c.y,
                        collected: playerCrystals.some((pc) => pc.x === c.x && pc.y === c.y),
                      }))}
                      switches={currentArena.switches || []}
                      activeStep={{
                        stepIndex: playerDuelStep,
                        petPos: playerActivePos,
                        petDir: 'right',
                        petAction: duelRacing ? 'move_forward' : 'idle',
                        crystalsCollected: playerCrystals,
                        openGates: [],
                        status:
                          duelResult?.winner === 'player'
                            ? 'success'
                            : duelResult?.winner === 'opponent'
                            ? 'failed'
                            : 'running',
                        message:
                          duelResult?.message || (duelRacing ? 'Racing to the goal!' : 'Ready to race!'),
                      }}
                      petType={pet?.pet_type || 'cat'}
                      equipped={pet?.equipped_items}
                      theme="arena"
                      opponentPet={{
                        type: selectedOpponent.friend_pet_type,
                        pos: opponentActivePos,
                        dir: 'right',
                        name: selectedOpponent.friend_name,
                      }}
                      cameraPreset="iso"
                      height="380px"
                    />
                  ) : (
                    <div
                      className="grid gap-1.5 p-2 bg-white rounded-2xl border border-[#e2ece5] shadow-soft"
                      style={{
                        gridTemplateColumns: `repeat(${currentArena.gridSize.width}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: currentArena.gridSize.height }).map((_, row) =>
                        Array.from({ length: currentArena.gridSize.width }).map((__, col) => {
                          const isPlayerHere = playerActivePos.x === col && playerActivePos.y === row;
                          const isOpponentHere = opponentActivePos.x === col && opponentActivePos.y === row;
                          const isGoal = currentArena.goalPos.x === col && currentArena.goalPos.y === row;
                          const obs = currentArena.obstacles.find((o) => o.x === col && o.y === row);
                          const sw = currentArena.switches?.find((s) => s.x === col && s.y === row);
                          const crystal = currentArena.crystals.find((c) => c.x === col && c.y === row);
                          const isCrystalCollected = playerCrystals.some((c) => c.x === col && c.y === row);

                          return (
                            <div
                              key={`duel_${col}_${row}`}
                              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center relative transition-all ${
                                isGoal
                                  ? 'bg-[#eaf2ec] border-2 border-[#2d6a4f]'
                                  : obs?.type === 'wall'
                                  ? 'bg-[#e2ece5] border border-[#d3e2d8]'
                                  : obs?.type === 'water'
                                  ? 'bg-sky-50 border border-sky-300'
                                  : obs?.type === 'gate'
                                  ? 'bg-rose-50 border-2 border-rose-400'
                                  : sw
                                  ? 'bg-[#eaf2ec] border border-[#2d6a4f]'
                                  : crystal && !isCrystalCollected
                                  ? 'bg-[#eaf2ec] border border-[#2d6a4f]'
                                  : 'bg-[#f4f8f5] border border-[#e2ece5]'
                              }`}
                            >
                              {obs?.type === 'wall' && <span className="text-base">🧱</span>}
                              {obs?.type === 'water' && <span className="text-base">🌊</span>}
                              {obs?.type === 'gate' && <span className="text-base">🚪</span>}
                              {sw && !isPlayerHere && !isOpponentHere && <span className="text-base">🔘</span>}
                              {crystal && !isCrystalCollected && !isPlayerHere && !isOpponentHere && (
                                <span className="text-base animate-bounce">💎</span>
                              )}
                              {isGoal && !isPlayerHere && !isOpponentHere && <span className="text-base">🌟</span>}

                              {/* Both Competitor Pets on Arena Tiles */}
                              {isPlayerHere && pet && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                  <PetSVG
                                    type={pet.pet_type}
                                    stage={pet.stage}
                                    state={
                                      duelResult?.winner === 'player'
                                        ? 'excited'
                                        : duelResult?.winner === 'opponent'
                                        ? 'tired'
                                        : 'focused'
                                    }
                                    equipped={pet.equipped_items}
                                    size={32}
                                    reaction={
                                      duelResult?.winner === 'player'
                                        ? { config: { expression: 'victory', label: 'Winner!', icon: '🏆', sound: 'victory', duration: 3 }, id: 1 }
                                        : duelResult?.winner === 'opponent'
                                        ? { config: { expression: 'hurt', label: '2nd Place', icon: '💨', sound: 'hurt', duration: 3 }, id: 2 }
                                        : null
                                    }
                                  />
                                  <span className="absolute -bottom-1 text-[8px] bg-[#2d6a4f] text-white font-black px-1 rounded-full">
                                    You
                                  </span>
                                </div>
                              )}

                              {isOpponentHere && !isPlayerHere && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                  <PetSVG
                                    type={selectedOpponent.friend_pet_type}
                                    stage={selectedOpponent.friend_pet_stage}
                                    state={
                                      duelResult?.winner === 'opponent'
                                        ? 'excited'
                                        : duelResult?.winner === 'player'
                                        ? 'tired'
                                        : 'focused'
                                    }
                                    size={32}
                                    reaction={
                                      duelResult?.winner === 'opponent'
                                        ? { config: { expression: 'victory', label: 'Winner!', icon: '🏆', sound: 'victory', duration: 3 }, id: 3 }
                                        : duelResult?.winner === 'player'
                                        ? { config: { expression: 'hurt', label: '2nd Place', icon: '💨', sound: 'hurt', duration: 3 }, id: 4 }
                                        : null
                                    }
                                  />
                                  <span className="absolute -bottom-1 text-[8px] bg-[#1b382b] text-white font-black px-1 rounded-full">
                                    Bot
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Arena Controls & Instruction Sequence */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#5b7566]">
                    Snap Directional Moves to Race:
                  </span>
                  <button
                    onClick={() => setDuelBlocks([])}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                </div>

                {/* Direct Action Chips */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleAddDuelBlock('move_up')}
                    className="px-2.5 py-1.5 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowUp size={13} /> Up
                  </button>
                  <button
                    onClick={() => handleAddDuelBlock('move_down')}
                    className="px-2.5 py-1.5 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowDown size={13} /> Down
                  </button>
                  <button
                    onClick={() => handleAddDuelBlock('move_left')}
                    className="px-2.5 py-1.5 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={13} /> Left
                  </button>
                  <button
                    onClick={() => handleAddDuelBlock('move_right')}
                    className="px-2.5 py-1.5 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRight size={13} /> Right
                  </button>
                  <button
                    onClick={() => handleAddDuelBlock('interact')}
                    className="px-2.5 py-1.5 bg-[#2d6a4f] hover:bg-[#245840] border border-[#2d6a4f] text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Hand size={13} /> Interact
                  </button>
                </div>

                {/* Duel Logic Queue */}
                <div className="min-h-[55px] max-h-[85px] overflow-y-auto bg-[#f4f8f5] p-2 rounded-xl border border-[#e2ece5] flex flex-wrap gap-1.5 items-center custom-scrollbar">
                  {duelBlocks.length === 0 ? (
                    <span className="text-xs text-[#7a9386]">Tap buttons above to plan your moves...</span>
                  ) : (
                    duelBlocks.map((b, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white border border-[#e2ece5] text-[11px] font-bold text-[#1b382b] rounded-lg flex items-center gap-1 shadow-soft"
                      >
                        #{i + 1} {b.type.replace('move_', '')}
                        <button
                          onClick={() => handleRemoveDuelBlock(i)}
                          className="text-[#7a9386] hover:text-rose-600 text-[10px]"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Race Result Banner */}
              {duelResult && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl text-xs font-bold text-center space-y-2 shadow-card ${
                    duelResult.winner === 'player'
                      ? 'bg-[#eaf2ec] border border-[#d3e2d8] text-[#2d6a4f]'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}
                >
                  <div className="text-sm font-black flex items-center justify-center gap-1.5">
                    {duelResult.winner === 'player' ? '🏆 VICTORY!' : '⚡ RACE FINISHED'}
                  </div>
                  <div>{duelResult.message}</div>
                </motion.div>
              )}

              {/* Race Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                {duelResult ? (
                  <>
                    <button
                      onClick={handleCloseDuel}
                      className="flex-1 py-3.5 bg-[#2d6a4f] hover:bg-[#245840] text-white font-black text-sm rounded-2xl shadow-card transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 size={18} />
                      CLOSE ARENA & RETURN
                    </button>
                    <button
                      onClick={handleStartDuelRace}
                      disabled={duelRacing || duelBlocks.length === 0}
                      className="px-6 py-3.5 bg-[#f4f8f5] hover:bg-[#eaf2ec] text-[#2d6a4f] border border-[#e2ece5] font-black text-sm rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play size={16} />
                      RETRY RACE
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleCloseDuel}
                      disabled={duelRacing}
                      className="px-6 py-3.5 bg-[#f4f8f5] hover:bg-[#eaf2ec] text-[#5b7566] hover:text-[#1b382b] border border-[#e2ece5] font-bold text-sm rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <X size={16} />
                      CLOSE
                    </button>
                    <button
                      onClick={handleStartDuelRace}
                      disabled={duelRacing || duelBlocks.length === 0}
                      className="flex-1 py-3.5 bg-[#2d6a4f] hover:bg-[#245840] text-white font-black text-sm rounded-2xl shadow-card transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play size={18} className="fill-white" />
                      {duelRacing ? 'RACING IN LIVE ARENA...' : 'START DUEL RACE!'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
