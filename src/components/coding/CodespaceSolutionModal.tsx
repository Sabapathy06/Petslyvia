import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound,
  X,
  Copy,
  Check,
  Zap,
  ArrowRight,
  BookOpen,
  Sparkles,
  Terminal,
  AlertTriangle,
} from 'lucide-react';
import { sound } from '@/utils/audio';
import type { SupportedLanguage } from './CodespaceIdeHeader';
import type { ProblemSolution } from '@/services/codingSolutionService';

interface CodespaceSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionTitle: string;
  solutionC: ProblemSolution;
  solutionPython: ProblemSolution;
  solutionJs: ProblemSolution;
  initialLanguage: SupportedLanguage;
  onApplySolution: (code: string, lang: SupportedLanguage) => void;
  onSolutionViewed?: () => void;
}

export function CodespaceSolutionModal({
  isOpen,
  onClose,
  missionTitle,
  solutionC,
  solutionPython,
  solutionJs,
  initialLanguage,
  onApplySolution,
  onSolutionViewed,
}: CodespaceSolutionModalProps) {
  const [activeLang, setActiveLang] = useState<SupportedLanguage>(initialLanguage);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      onSolutionViewed?.();
    }
  }, [isOpen, onSolutionViewed]);

  if (!isOpen) return null;

  const currentSolution =
    activeLang === 'c' ? solutionC : activeLang === 'python' ? solutionPython : solutionJs;

  const lines = currentSolution.code.split('\n');

  const handleCopy = () => {
    sound.playSnap();
    navigator.clipboard.writeText(currentSolution.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    sound.playSuccess();
    onApplySolution(currentSolution.code, activeLang);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="w-full max-w-2xl bg-[#14151a] border border-[#2d303b] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#1b1d24] border-b border-[#2d303b] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <KeyRound size={17} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Verified Solution</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                    {currentSolution.keyConcept}
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 truncate max-w-xs sm:max-w-md">
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

          {/* Language Selector Subheader */}
          <div className="px-5 py-2.5 bg-[#17181f] border-b border-[#252832] flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-mono text-zinc-400 font-bold">
              Solution Language:
            </span>

            <div className="flex bg-[#0f1014] p-1 rounded-xl border border-[#2c2f3a] gap-1">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveLang('c');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeLang === 'c'
                    ? 'bg-[#2b3548] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ⚙️ C (gcc 14.x)
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveLang('python');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeLang === 'python'
                    ? 'bg-[#2b3548] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                🐍 Python 3.12
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveLang('javascript');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeLang === 'javascript'
                    ? 'bg-[#2b3548] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ⚡ JS (Node 20)
              </button>
            </div>
          </div>

          {/* Code Viewer Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
            {/* Penalty Warning Banner */}
            <div className="px-3.5 py-2.5 bg-rose-500/15 border border-rose-500/35 rounded-2xl flex items-center gap-2.5 text-rose-300 text-xs font-mono animate-in fade-in slide-in-from-top-1">
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
              <div>
                <span className="font-bold text-rose-200">Solution Penalty Applied:</span>{' '}
                <span>Full solution viewed! Final XP and Coin rewards are reduced by 50%.</span>
              </div>
            </div>

            {/* Dark Syntax Code Display */}
            <div className="relative rounded-2xl bg-[#0b0c0e] border border-[#22242c] overflow-hidden shadow-inner">
              <div className="px-3.5 py-1.5 bg-[#121317] border-b border-[#1c1e25] flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Terminal size={12} className="text-emerald-400" />
                  solution.{activeLang === 'c' ? 'c' : activeLang === 'python' ? 'py' : 'js'}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-white bg-[#1e2027] hover:bg-[#282a33] px-2 py-0.5 rounded-lg border border-[#30333e] transition-colors cursor-pointer"
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="p-3 font-mono text-xs sm:text-[13px] text-zinc-200 overflow-x-auto flex leading-relaxed select-text">
                {/* Line Numbers Gutter */}
                <div className="select-none pr-3 mr-3 text-right text-zinc-600 border-r border-[#1e2027] font-mono shrink-0">
                  {lines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                {/* Code Content */}
                <pre className="flex-1 text-emerald-300 font-mono whitespace-pre">
                  <code>{currentSolution.code}</code>
                </pre>
              </div>
            </div>

            {/* Explanation Card */}
            <div className="p-4 rounded-2xl bg-[#1b1c24] border border-[#2c2f3d] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <BookOpen size={14} />
                <span>How This Solution Works:</span>
              </div>
              <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed font-sans">
                {currentSolution.explanation}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 bg-[#111216] border-t border-[#252832] flex items-center justify-between gap-3">
            <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
              Tested & validated in deterministic simulator
            </span>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-[#1e2029] hover:bg-[#282b37] border border-[#353947] transition-all cursor-pointer flex items-center gap-1.5"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleApply}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Zap size={14} className="fill-white" />
                <span>Apply to My Codespace</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
