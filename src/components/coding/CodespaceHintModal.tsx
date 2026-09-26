import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, ChevronRight, CheckCircle2, Sparkles, BookOpen, AlertTriangle } from 'lucide-react';
import { sound } from '@/utils/audio';
import type { SupportedLanguage } from './CodespaceIdeHeader';

interface CodespaceHintModalProps {
  isOpen: boolean;
  onClose: () => void;
  hints: string[];
  missionTitle: string;
  language: SupportedLanguage;
  onThirdHintRevealed?: () => void;
}

export function CodespaceHintModal({
  isOpen,
  onClose,
  hints,
  missionTitle,
  language,
  onThirdHintRevealed,
}: CodespaceHintModalProps) {
  const [revealedCount, setRevealedCount] = useState<number>(1);

  if (!isOpen) return null;

  const handleNextHint = () => {
    sound.playClick();
    if (revealedCount < hints.length) {
      const nextCount = revealedCount + 1;
      setRevealedCount(nextCount);
      if (nextCount >= 3) {
        onThirdHintRevealed?.();
      }
    }
  };

  const handleRevealAll = () => {
    sound.playClick();
    setRevealedCount(hints.length);
    if (hints.length >= 3) {
      onThirdHintRevealed?.();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-[#16171d] border border-[#2d303b] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#1b1d24] border-b border-[#2d303b] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lightbulb size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  Hints & Strategy Guide
                </h3>
                <p className="text-[11px] text-zinc-400 truncate max-w-xs">
                  {missionTitle}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="w-7 h-7 rounded-lg bg-[#242630] hover:bg-[#2e313e] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-3.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {revealedCount >= 3 && (
              <div className="px-3.5 py-2.5 bg-amber-500/15 border border-amber-500/35 rounded-2xl flex items-center gap-2.5 text-amber-300 text-xs font-mono animate-in fade-in slide-in-from-top-1">
                <AlertTriangle size={16} className="shrink-0 text-amber-400" />
                <div>
                  <span className="font-bold text-amber-200">Hint Penalty Applied:</span>{' '}
                  <span>3rd hint revealed! Final XP and Coin rewards are reduced by 25%.</span>
                </div>
              </div>
            )}

            {hints.map((hint, idx) => {
              const isRevealed = idx < revealedCount;
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isRevealed
                      ? 'bg-[#1e2029] border-[#373b49] text-zinc-200'
                      : 'bg-[#14151a] border-[#22242c] text-zinc-600 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 text-[11px] font-bold">
                    <span className={isRevealed ? 'text-amber-400 flex items-center gap-1' : 'text-zinc-500'}>
                      {isRevealed && <Sparkles size={12} />}
                      Hint {idx + 1} of {hints.length}
                    </span>
                    {isRevealed ? (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 size={11} /> Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono">🔒 Locked</span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap">
                    {isRevealed ? hint : 'Click "Reveal Next Hint" below to unlock this hint step.'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="px-5 py-3.5 bg-[#14151a] border-t border-[#2d303b] flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-400 font-mono">
              Revealed {revealedCount} of {hints.length}
            </span>

            <div className="flex items-center gap-2">
              {revealedCount < hints.length ? (
                <>
                  <button
                    onClick={handleRevealAll}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Reveal All
                  </button>
                  <button
                    onClick={handleNextHint}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next Hint</span>
                    <ChevronRight size={13} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="px-4 py-1.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Got It!
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
