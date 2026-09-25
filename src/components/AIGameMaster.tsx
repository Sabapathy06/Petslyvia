import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Lightbulb, HelpCircle, X, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';
import type { MissionDefinition, VisualBlock } from '@/types/game';
import { aiGameMaster } from '@/services/aiGameMaster';
import { sound } from '@/utils/audio';

interface AIGameMasterProps {
  mission: MissionDefinition;
  currentBlocks: VisualBlock[];
  lastError?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AIGameMaster({ mission, currentBlocks, lastError, isOpen, onClose }: AIGameMasterProps) {
  const [hintLevel, setHintLevel] = useState(1);

  if (!isOpen) return null;

  const currentHint = aiGameMaster.getProgressiveHint(mission, currentBlocks, hintLevel, lastError);
  const failureExplanation = lastError ? aiGameMaster.explainFailure(lastError, 'infant') : null;

  const handleNextHint = () => {
    if (hintLevel < 3) {
      setHintLevel((prev) => prev + 1);
      sound.playClick();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-indigo-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Bot className="text-amber-400" size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  AI Game Master <Sparkles size={14} className="text-amber-400" />
                </h3>
                <p className="text-[11px] text-slate-400">Adaptive Guide & Logic Mentor</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Error diagnosis banner if player encountered a glitch/collision */}
            {lastError && failureExplanation && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex items-start gap-3">
                <ShieldAlert size={18} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-rose-300 mb-1">Diagnostic Analysis</p>
                  <p className="text-rose-200/90 leading-relaxed">{failureExplanation}</p>
                </div>
              </div>
            )}

            {/* Progressive Hint Box */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Lightbulb size={15} /> {currentHint.title}
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-mono">
                  Level {hintLevel} / 3
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{currentHint.hintText}</p>
              {currentHint.suggestedAction && (
                <div className="text-[11px] text-indigo-300 font-semibold bg-indigo-950/40 p-2 rounded-xl border border-indigo-500/20">
                  Tip: {currentHint.suggestedAction}
                </div>
              )}
            </div>

            {/* Hint Tier Stepper */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-1.5">
                {[1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      setHintLevel(lvl);
                      sound.playClick();
                    }}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      hintLevel === lvl
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {hintLevel < 3 ? (
                <button
                  onClick={handleNextHint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Need More Clues? <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  Ready to Try! ✨
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
