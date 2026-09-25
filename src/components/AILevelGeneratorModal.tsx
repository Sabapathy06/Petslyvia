import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Bot, Zap, Coins, ShieldCheck, Play,
  RefreshCw, CheckCircle2, ArrowRight, Layers, X, Trophy, Compass, Flame
} from 'lucide-react';
import type { MissionDefinition } from '@/types/game';
import {
  generateProceduralAILevel,
  AI_VAULT_LEVELS,
  type AILevelDifficulty,
  type AILevelTheme,
  type AILevelFocus
} from '@/services/aiLevelGenerator';
import { sound } from '@/utils/audio';

interface AILevelGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchLevel: (level: MissionDefinition) => void;
}

export function AILevelGeneratorModal({
  isOpen,
  onClose,
  onLaunchLevel
}: AILevelGeneratorModalProps) {
  const [activeTab, setActiveTab] = useState<'forge' | 'vault'>('forge');

  // Generator State
  const [difficulty, setDifficulty] = useState<AILevelDifficulty>('medium');
  const [theme, setTheme] = useState<AILevelTheme>('forest');
  const [focusConcept, setFocusConcept] = useState<AILevelFocus>('mixed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLevel, setGeneratedLevel] = useState<MissionDefinition | null>(null);

  if (!isOpen) return null;

  const handleGenerate = () => {
    sound.playClick();
    setIsGenerating(true);

    setTimeout(() => {
      const level = generateProceduralAILevel({
        difficulty,
        theme,
        focusConcept,
      });

      setGeneratedLevel(level);
      setIsGenerating(false);
      sound.playCheer();
    }, 500);
  };

  const handleStartMission = (levelToLaunch?: MissionDefinition) => {
    const target = levelToLaunch || generatedLevel;
    if (!target) return;
    sound.playVictory();
    onLaunchLevel(target);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#163324]/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 15 }}
        className="bg-white border border-[#e2ece5] rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar text-[#1b382b]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2ece5] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#eaf2ec] border border-[#d8e5dc] flex items-center justify-center shadow-soft">
              <Bot size={24} className="text-[#2d6a4f]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1b382b] flex items-center gap-2">
                AI Level Architect <Sparkles size={18} className="text-[#2d6a4f]" />
              </h2>
              <p className="text-xs text-[#5b7566]">
                Procedural 3D puzzle stages & Master Vault challenges
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-[#5b7566] hover:text-[#1b382b] p-1.5 rounded-xl bg-[#f4f8f5] border border-[#d8e5dc] hover:bg-[#eaf2ec] cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#f4f8f5] rounded-2xl border border-[#d8e5dc]">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('forge');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'forge'
                ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                : 'text-[#5b7566] hover:text-[#1b382b]'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'forge' ? 'text-[#a7f3d0]' : ''} /> AI Stage Forge (Custom)
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('vault');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'vault'
                ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                : 'text-[#5b7566] hover:text-[#1b382b]'
            }`}
          >
            <Trophy size={14} /> AI Challenge Vault ({AI_VAULT_LEVELS.length})
          </button>
        </div>

        {/* TAB 1: AI STAGE FORGE */}
        {activeTab === 'forge' && (
          <div>
            {!generatedLevel || isGenerating ? (
              <div className="space-y-4">
                {/* Difficulty Grid */}
                <div>
                  <label className="text-xs font-bold text-[#1b382b] mb-1.5 block">
                    1. Select Difficulty & Grid Size:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'novice', label: 'Novice', size: '4x4' },
                      { id: 'easy', label: 'Easy', size: '5x5' },
                      { id: 'medium', label: 'Medium', size: '6x6' },
                      { id: 'hard', label: 'Hard', size: '7x6' },
                      { id: 'expert', label: 'Expert', size: '7x7' },
                      { id: 'grandmaster', label: 'Master 👑', size: '8x8' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          sound.playSnap();
                          setDifficulty(d.id as any);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          difficulty === d.id
                            ? 'bg-[#2d6a4f] border-[#2d6a4f] text-white font-black shadow-soft'
                            : 'bg-[#f8faf8] border-[#e2ece5] text-[#5b7566] hover:bg-[#eaf2ec]'
                        }`}
                      >
                        <div className="text-[11px] font-bold truncate">{d.label}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${difficulty === d.id ? 'text-[#a7f3d0]' : 'text-[#7a9386]'}`}>{d.size}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Selector */}
                <div>
                  <label className="text-xs font-bold text-[#1b382b] mb-1.5 block">
                    2. World Biome & Theme:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'forest', label: '🌲 Forest' },
                      { id: 'dungeon', label: '🐛 Dungeon' },
                      { id: 'city', label: '🏙️ City' },
                      { id: 'arena', label: '⚔️ Arena' },
                      { id: 'nebula', label: '🌌 Nebula' },
                      { id: 'magma', label: '🌋 Magma' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          sound.playSnap();
                          setTheme(t.id as any);
                        }}
                        className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          theme === t.id
                            ? 'bg-[#2d6a4f] border-[#2d6a4f] text-white font-black shadow-soft'
                            : 'bg-[#f8faf8] border-[#e2ece5] text-[#5b7566] hover:bg-[#eaf2ec]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Focus Concepts */}
                <div>
                  <label className="text-xs font-bold text-[#1b382b] mb-1.5 block">
                    3. Puzzle Mechanics Focus:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'mixed', label: '🎲 Mixed' },
                      { id: 'switches', label: '🔒 Laser Gates' },
                      { id: 'crystals', label: '💎 Crystal Run' },
                      { id: 'loops', label: '🔁 Loop Master' },
                      { id: 'maze', label: '🧩 Maze Run' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          sound.playSnap();
                          setFocusConcept(c.id as any);
                        }}
                        className={`p-2 rounded-xl border text-center text-[11px] font-bold transition-all cursor-pointer ${
                          focusConcept === c.id
                            ? 'bg-[#2d6a4f] border-[#2d6a4f] text-white font-black shadow-soft'
                            : 'bg-[#f8faf8] border-[#e2ece5] text-[#5b7566] hover:bg-[#eaf2ec]'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-3.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-sm rounded-2xl shadow-soft transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Running BFS Solvability Pathfinder...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className="text-[#a7f3d0]" />
                      Generate AI Stage Now
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Generated Result Card */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 bg-[#f4f8f5] border border-[#d8e5dc] rounded-2xl space-y-4 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#2d6a4f] uppercase tracking-wider bg-[#eaf2ec] border border-[#d5e3da] px-2 py-0.5 rounded-full">
                      ✓ Solvable AI Level Generated
                    </span>
                    <h3 className="text-xl font-black text-[#1b382b] mt-1">
                      {generatedLevel.title}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#5b7566]">
                    Grid {generatedLevel.gridSize.width}x{generatedLevel.gridSize.height}
                  </span>
                </div>

                <p className="text-xs text-[#5b7566] leading-relaxed">
                  {generatedLevel.objective}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-white border border-[#e2ece5] rounded-xl text-center">
                    <span className="text-[10px] text-[#7a9386] font-semibold block">Obstacles</span>
                    <span className="text-xs font-bold text-[#1b382b]">{generatedLevel.obstacles.length}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-[#e2ece5] rounded-xl text-center">
                    <span className="text-[10px] text-[#7a9386] font-semibold block">Crystals</span>
                    <span className="text-xs font-bold text-[#2d6a4f]">{generatedLevel.crystals.length}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-[#e2ece5] rounded-xl text-center">
                    <span className="text-[10px] text-[#7a9386] font-semibold block">XP Reward</span>
                    <span className="text-xs font-bold text-amber-600">+{generatedLevel.xpReward}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setGeneratedLevel(null)}
                    className="flex-1 py-3 bg-[#eaf2ec] hover:bg-[#dde8df] text-[#1b382b] font-bold text-xs rounded-xl border border-[#d8e5dc] transition-all cursor-pointer"
                  >
                    Re-roll
                  </button>
                  <button
                    onClick={() => handleStartMission()}
                    className="flex-1 py-3 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-xs rounded-xl shadow-soft transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Play size={14} className="fill-white" />
                    Play Mission
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* TAB 2: AI CHALLENGE VAULT */}
        {activeTab === 'vault' && (
          <div className="space-y-3">
            <p className="text-xs text-[#5b7566]">
              Pre-compiled AI master challenge levels tested for high replayability:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
              {AI_VAULT_LEVELS.map((lvl) => (
                <div
                  key={lvl.id}
                  className="p-3.5 bg-[#f8faf8] border border-[#e2ece5] hover:border-[#2d6a4f] rounded-2xl transition-all flex flex-col justify-between space-y-2 shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-[#1b382b] group-hover:text-[#2d6a4f] transition-colors">
                      {lvl.title}
                    </h4>
                    <span className="text-[9px] px-2 py-0.5 bg-[#eaf2ec] text-[#2d6a4f] rounded-full font-bold">
                      {lvl.gridSize.width}x{lvl.gridSize.height}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#5b7566] line-clamp-2 leading-relaxed font-medium">
                    {lvl.objective}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#f0f5f1]">
                    <span className="text-[10px] text-amber-600 font-bold">
                      +{lvl.xpReward} XP
                    </span>
                    <button
                      onClick={() => handleStartMission(lvl)}
                      className="px-3 py-1 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                    >
                      <Play size={11} className="fill-white" /> Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
