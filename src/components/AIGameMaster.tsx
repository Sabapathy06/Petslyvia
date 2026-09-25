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
      <div className="fixed inset-0 z-50 bg-[#163324]/50 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="bg-white border border-[#e2ece5] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-[#1b382b]"
        >
          {/* Header */}
          <div className="bg-[#f4f8f5] p-5 border-b border-[#e2ece5] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#d8e5dc] flex items-center justify-center shadow-soft">
                <Bot className="text-[#2d6a4f]" size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#1b382b] flex items-center gap-1.5">
                  AI Game Master <Sparkles size={14} className="text-[#2d6a4f]" />
                </h3>
                <p className="text-[11px] text-[#5b7566]">Adaptive Guide & Logic Mentor</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white border border-[#d8e5dc] hover:bg-[#eaf2ec] flex items-center justify-center text-[#5b7566] hover:text-[#1b382b] transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Error diagnosis banner if player encountered a glitch/collision */}
            {lastError && failureExplanation && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-rose-800 mb-1">Diagnostic Analysis</p>
                  <p className="text-rose-700 leading-relaxed font-medium">{failureExplanation}</p>
                </div>
              </div>
            )}

            {/* Progressive Hint Box */}
            <div className="p-4 bg-[#f8faf8] border border-[#d8e5dc] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1b382b] flex items-center gap-1.5">
                  <Lightbulb size={15} className="text-amber-500" /> {currentHint.title}
                </span>
                <span className="text-[10px] bg-white border border-[#d8e5dc] px-2 py-0.5 rounded-full text-[#5b7566] font-mono font-bold">
                  Level {hintLevel} / 3
                </span>
              </div>
              <p className="text-xs text-[#5b7566] leading-relaxed font-medium">{currentHint.hintText}</p>
              {currentHint.suggestedAction && (
                <div className="text-[11px] text-[#2d6a4f] font-bold bg-[#eaf2ec] p-2 rounded-xl border border-[#d5e3da]">
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
                    className={`w-7 h-7 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      hintLevel === lvl
                        ? 'bg-[#2d6a4f] text-white shadow-soft'
                        : 'bg-[#f4f8f5] border border-[#d8e5dc] text-[#5b7566] hover:bg-[#eaf2ec]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {hintLevel < 3 ? (
                <button
                  onClick={handleNextHint}
                  className="px-4 py-2 bg-[#eaf2ec] hover:bg-[#dde8df] border border-[#d8e5dc] text-[#1b382b] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-soft cursor-pointer"
                >
                  Need More Clues? <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
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
