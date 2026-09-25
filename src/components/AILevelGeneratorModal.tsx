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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        {/* Glow Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Bot size={24} className="text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                AI Level Architect <Sparkles size={18} className="text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">
                Infinite procedural 3D puzzle stages & Master Vault challenges
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('forge');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'forge'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={14} className="text-amber-300" /> ⚡ AI Stage Forge (Custom)
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('vault');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'vault'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={14} /> 🏆 AI Challenge Vault ({AI_VAULT_LEVELS.length})
          </button>
        </div>

        {/* TAB 1: AI STAGE FORGE */}
        {activeTab === 'forge' && (
          <div>
            {!generatedLevel || isGenerating ? (
              <div className="space-y-4">
                {/* Difficulty Grid (6 Tiers) */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                    1. Select Difficulty & Grid Size:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'novice', label: 'Novice', size: '4x4', color: 'border-emerald-500/40' },
                      { id: 'easy', label: 'Easy', size: '5x5', color: 'border-teal-500/40' },
                      { id: 'medium', label: 'Medium', size: '6x6', color: 'border-indigo-500/40' },
                      { id: 'hard', label: 'Hard', size: '7x6', color: 'border-purple-500/40' },
                      { id: 'expert', label: 'Expert', size: '7x7', color: 'border-rose-500/40' },
                      { id: 'grandmaster', label: 'Master 👑', size: '8x8', color: 'border-amber-500/40' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          sound.playSnap();
                          setDifficulty(d.id as any);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          difficulty === d.id
                            ? 'bg-indigo-600 border-indigo-400 text-white font-black shadow-md scale-102'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[11px] font-extrabold truncate">{d.label}</div>
                        <div className="text-[10px] text-indigo-300 font-mono mt-0.5">{d.size}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Selector (6 Biomes) */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">
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
                            ? 'bg-purple-600 border-purple-400 text-white font-black shadow-md scale-102'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Focus Concepts (5 Mechanics) */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">
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
                            ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-md scale-102'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
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
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Running BFS Solvability Pathfinder...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className="text-amber-300 animate-bounce" />
                      Generate AI Stage Now
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Preview Generated Level Card */
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-2xl border border-indigo-500/40 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-black uppercase">
                      {generatedLevel.gridSize.width}x{generatedLevel.gridSize.height} • {theme.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck size={14} /> Solvability Verified (BFS)
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">{generatedLevel.title}</h3>
                    <p className="text-xs text-slate-300 mt-1 italic leading-relaxed">
                      &ldquo;{generatedLevel.story}&rdquo;
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs text-amber-300 font-semibold">
                    🎯 {generatedLevel.objective}
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-400">
                    <span>Obstacles: {generatedLevel.obstacles.length}</span>
                    <span>Crystals: {generatedLevel.crystals.length}</span>
                    <span className="text-amber-400 font-bold">+{generatedLevel.xpReward} XP • +{generatedLevel.coinReward} Coins</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleGenerate}
                    className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Re-roll
                  </button>

                  <button
                    onClick={() => handleStartMission()}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Play size={18} className="fill-slate-950" />
                    Launch 3D Mission 🚀
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI CHALLENGE VAULT */}
        {activeTab === 'vault' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400">
              Handcrafted AI benchmark missions featuring specialized mechanics, laser circuits, and master labyrinths:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AI_VAULT_LEVELS.map((vLevel) => (
                <div
                  key={vLevel.id}
                  className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 hover:border-amber-400/50 flex flex-col justify-between space-y-2.5 transition-all shadow-md group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
                        Level {vLevel.number}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {vLevel.gridSize.width}x{vLevel.gridSize.height}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors mt-1">
                      {vLevel.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {vLevel.story}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold text-amber-400">
                      +{vLevel.xpReward} XP • +{vLevel.coinReward} Coins
                    </span>

                    <button
                      onClick={() => handleStartMission(vLevel)}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer hover:opacity-95 active:scale-95"
                    >
                      <Play size={13} className="fill-slate-950" /> Play Now
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
