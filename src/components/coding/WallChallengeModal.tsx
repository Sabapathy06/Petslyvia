import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Lightbulb,
  KeyRound,
  Hammer,
  CheckCircle2,
  AlertCircle,
  Code2,
  ChevronDown,
  RotateCcw,
  Copy,
  Check
} from 'lucide-react';
import { sound } from '@/utils/audio';
import type { SupportedLanguage } from './CodespaceIdeHeader';
import type { WallChallenge } from '@/services/wallChallengeService';

interface WallChallengeModalProps {
  isOpen: boolean;
  challenge: WallChallenge | null;
  onClose: () => void;
  onWallBroken: (wallKey: string) => void;
  initialLanguage?: SupportedLanguage;
}

export const WallChallengeModal: React.FC<WallChallengeModalProps> = ({
  isOpen,
  challenge,
  onClose,
  onWallBroken,
  initialLanguage = 'c',
}) => {
  const [lang, setLang] = useState<SupportedLanguage>(initialLanguage);
  const [code, setCode] = useState<string>('');
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; message: string } | null>(null);
  const [isShattering, setIsShattering] = useState(false);

  // Sync starter code when challenge or language changes
  useEffect(() => {
    if (challenge) {
      setCode(challenge.starterCodes[lang] || '');
      setResult(null);
      setShowHints(false);
      setShowSolution(false);
      setIsShattering(false);
    }
  }, [challenge, lang]);

  if (!isOpen || !challenge) return null;

  const handleTestAndBreak = () => {
    sound.playClick();
    const outcome = challenge.validate(code, lang);
    setResult(outcome);

    if (outcome.passed) {
      sound.playVictory();
      setIsShattering(true);
      setTimeout(() => {
        onWallBroken(challenge.wallKey);
        onClose();
      }, 1200);
    } else {
      sound.playError();
    }
  };

  const handleLoadSolution = () => {
    sound.playSnap();
    const sol = challenge.solutions[lang];
    setCode(sol);
    setResult({
      passed: true,
      message: '✓ Working solution loaded into editor! Click "Shatter Wall" to break it.',
    });
  };

  const handleCopySolution = () => {
    sound.playSnap();
    navigator.clipboard.writeText(challenge.solutions[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const difficultyColors = {
    Novice: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Easy: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Challenging: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    Expert: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl bg-[#0e1015] border-2 ${
          isShattering ? 'border-amber-400 scale-95 opacity-50 duration-700' : 'border-[#2d313d]'
        } rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all`}
      >
        {/* Modal Header */}
        <div className="bg-[#14161d] border-b border-[#262833] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner">
              🧱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-base sm:text-lg flex items-center gap-1.5">
                  {challenge.title}
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    difficultyColors[challenge.difficulty]
                  }`}
                >
                  {challenge.difficulty}
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-2">
                <span>Tile ({challenge.x}, {challenge.y})</span>
                <span className="text-zinc-600">·</span>
                <span className="text-amber-400/90 font-medium">{challenge.guardianName}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-emerald-400/90 font-mono text-[11px]">{challenge.concept}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#1e2029] hover:bg-[#282b37] border border-[#343846] text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Lore & Story Card */}
          <div className="bg-[#151821] border border-[#2b2f3d] rounded-2xl p-3.5 text-xs text-zinc-300 leading-relaxed shadow-sm">
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0">📜</span>
              <p>{challenge.story}</p>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-[#232733] flex items-center gap-2 text-amber-300/90 font-medium">
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              <span>{challenge.prompt}</span>
            </div>
          </div>

          {/* Language Selector Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-[#232733] pb-2">
            <div className="flex items-center gap-1.5">
              {(['c', 'python', 'javascript'] as SupportedLanguage[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setLang(l);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    lang === l
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-[#181a22] text-zinc-400 hover:text-white border border-[#2b2e3b]'
                  }`}
                >
                  <span>{l === 'c' ? '⚙️ C' : l === 'python' ? '🐍 Python' : '⚡ JavaScript'}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setCode(challenge.starterCodes[lang]);
                  setResult(null);
                }}
                title="Reset Starter Code"
                className="w-7 h-7 rounded-lg bg-[#181a22] hover:bg-[#252834] border border-[#2b2e3b] text-zinc-400 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          {/* Dark Code Editor */}
          <div className="rounded-2xl border border-[#262936] bg-[#090a0d] overflow-hidden shadow-inner flex flex-col font-mono text-xs">
            <div className="bg-[#12141a] px-3 py-1.5 border-b border-[#1f222d] text-[11px] text-zinc-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                <Code2 size={13} className="text-emerald-400" />
                <span>wall_break.{lang === 'c' ? 'c' : lang === 'python' ? 'py' : 'js'}</span>
              </span>
              <span className="text-[10px] text-zinc-500">Edit or type your solution below</span>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={8}
              className="w-full bg-transparent text-zinc-200 p-3.5 outline-none resize-none font-mono text-xs sm:text-sm leading-relaxed custom-scrollbar selection:bg-emerald-500/30"
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
            />
          </div>

          {/* Hints & Solution Accordion */}
          <div className="space-y-2">
            {/* Hint Toggle */}
            <div className="bg-[#13151c] border border-[#252833] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowHints(!showHints);
                }}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-amber-400/90 font-bold hover:bg-[#1a1d26] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Lightbulb size={14} className="text-amber-400" />
                  <span>Problem Hints ({challenge.hints.length})</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`text-zinc-400 transition-transform ${showHints ? 'rotate-180' : ''}`}
                />
              </button>

              {showHints && (
                <div className="px-3.5 py-3 border-t border-[#20232d] space-y-2 bg-[#0e1015]/60 text-xs text-zinc-300">
                  {challenge.hints.map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold font-mono">#{i + 1}</span>
                      <p>{h}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Solution Toggle */}
            <div className="bg-[#13151c] border border-[#252833] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowSolution(!showSolution);
                }}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-emerald-400 font-bold hover:bg-[#1a1d26] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <KeyRound size={14} className="text-emerald-400" />
                  <span>View Full Solution ({lang.toUpperCase()})</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`text-zinc-400 transition-transform ${showSolution ? 'rotate-180' : ''}`}
                />
              </button>

              {showSolution && (
                <div className="p-3.5 border-t border-[#20232d] bg-[#0a0b0e] space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-sans">{challenge.solutionExplanation}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopySolution}
                        className="px-2 py-1 rounded bg-[#1e2029] hover:bg-[#282b37] border border-[#323644] text-zinc-300 text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleLoadSolution}
                        className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>Apply to Editor</span>
                      </button>
                    </div>
                  </div>
                  <pre className="p-3 rounded-lg bg-[#0e1014] border border-[#1e212a] text-emerald-300 text-[11px] overflow-x-auto">
                    {challenge.solutions[lang]}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Validation Feedback Banner */}
          {result && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 animate-in fade-in duration-150 ${
                result.passed
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}
            >
              {result.passed ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{result.message}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-[#12141a] border-t border-[#232733] px-5 py-3.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleLoadSolution}
            className="text-xs text-zinc-400 hover:text-emerald-400 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Auto-fill working solution
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-[#1c1e27] hover:bg-[#252834] text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isShattering}
              onClick={handleTestAndBreak}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
                isShattering
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold shadow-amber-500/20'
              }`}
            >
              <Hammer size={14} className={isShattering ? 'animate-spin' : ''} />
              <span>{isShattering ? '💥 Shattering Wall...' : '🔨 Test & Shatter Wall'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
