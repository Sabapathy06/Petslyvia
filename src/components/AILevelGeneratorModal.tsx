import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Bot, Zap, Coins, ShieldCheck, Play,
  RefreshCw, CheckCircle2, ArrowRight, Layers, X
} from 'lucide-react';
import type { MissionDefinition } from '@/types/game';
import { generateProceduralAILevel, type AILevelGenerationOptions } from '@/services/aiLevelGenerator';
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
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [theme, setTheme] = useState<'forest' | 'dungeon' | 'city' | 'arena'>('forest');
  const [focusConcept, setFocusConcept] = useState<'mixed' | 'pathfinding' | 'loops' | 'switches' | 'crystals'>('mixed');
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
    }, 600);
  };

  const handleStartMission = () => {
    if (!generatedLevel) return;
    sound.playVictory();
    onLaunchLevel(generatedLevel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 relative overflow-hidden"
      >
        {/* Glow Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Bot size={22} className="text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-1.5">
                AI Level Architect <Sparkles size={16} className="text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">
                Generate infinite, 100% solvable 3D puzzle stages powered by AI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Options Selection */}
        {!generatedLevel || isGenerating ? (
          <div className="space-y-4">
            {/* Difficulty */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                1. Select Difficulty:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'easy', label: 'Easy', size: '5x5' },
                  { id: 'medium', label: 'Medium', size: '6x6' },
                  { id: 'hard', label: 'Hard', size: '7x6' },
                  { id: 'expert', label: 'Expert', size: '7x7' },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      sound.playSnap();
                      setDifficulty(d.id as any);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      difficulty === d.id
                        ? 'bg-indigo-600 border-indigo-400 text-white font-black shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-extrabold capitalize">{d.label}</div>
                    <div className="text-[10px] text-indigo-300 font-mono mt-0.5">{d.size}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                2. World Theme:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'forest', label: '🌲 Forest' },
                  { id: 'dungeon', label: '🐛 Dungeon' },
                  { id: 'city', label: '🏙️ City' },
                  { id: 'arena', label: '⚔️ Arena' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      sound.playSnap();
                      setTheme(t.id as any);
                    }}
                    className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      theme === t.id
                        ? 'bg-purple-600 border-purple-400 text-white font-black shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Focus Concept */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                3. Puzzle Focus:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'mixed', label: '🎲 Dynamic Mixed' },
                  { id: 'switches', label: '🔒 Laser Gates' },
                  { id: 'crystals', label: '💎 Crystal Run' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      sound.playSnap();
                      setFocusConcept(c.id as any);
                    }}
                    className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      focusConcept === c.id
                        ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-md'
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
                  Synthesizing Level Geometry & Pathfinding...
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
            <div className="p-4 bg-slate-950 rounded-2xl border border-indigo-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-black uppercase">
                  {generatedLevel.gridSize.width}x{generatedLevel.gridSize.height} • {theme.toUpperCase()}
                </span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={14} /> Solvability Verified
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
                onClick={handleStartMission}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={18} className="fill-slate-950" />
                Launch 3D Mission 🚀
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
