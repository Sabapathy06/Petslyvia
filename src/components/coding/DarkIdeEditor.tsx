import { useState, useRef, useMemo } from 'react';
import {
  CodespaceIdeHeader,
  type SupportedLanguage,
} from './CodespaceIdeHeader';
import { CodespaceHintModal } from './CodespaceHintModal';
import { CodespaceSolutionModal } from './CodespaceSolutionModal';
import {
  getProblemHints,
  getProblemSolution,
} from '@/services/codingSolutionService';
import type { MissionDefinition } from '@/types/game';

interface DarkIdeEditorProps {
  mission: MissionDefinition;
  language: SupportedLanguage;
  code: string;
  onCodeChange: (newCode: string) => void;
  onLanguageChange: (newLang: SupportedLanguage) => void;
  onResetCode?: () => void;
  onOpenTutor?: () => void;
  minHeight?: string;
  snippets?: { label: string; code: string; color?: string }[];
  onInsertSnippet?: (snippet: string) => void;
}

export function DarkIdeEditor({
  mission,
  language,
  code,
  onCodeChange,
  onLanguageChange,
  onResetCode,
  onOpenTutor,
  minHeight = 'h-64 sm:h-80',
  snippets,
  onInsertSnippet,
}: DarkIdeEditorProps) {
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [solutionModalOpen, setSolutionModalOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Synchronize scroll between line numbers and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Line count
  const lines = useMemo(() => {
    return code.split('\n');
  }, [code]);

  // Problem-specific hints for current mission and language
  const hints = useMemo(() => {
    return getProblemHints(mission, language);
  }, [mission, language]);

  // Problem-specific solutions for current mission in all 3 languages
  const solutionC = useMemo(() => getProblemSolution(mission, 'c'), [mission]);
  const solutionPython = useMemo(() => getProblemSolution(mission, 'python'), [mission]);
  const solutionJs = useMemo(() => getProblemSolution(mission, 'javascript'), [mission]);

  const handleApplySolution = (appliedCode: string, appliedLang: SupportedLanguage) => {
    if (appliedLang !== language) {
      onLanguageChange(appliedLang);
    }
    onCodeChange(appliedCode);
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-[#272a33] bg-[#0d0e12] overflow-hidden shadow-2xl flex flex-col">
      {/* Top IDE Header (matching user's reference image!) */}
      <CodespaceIdeHeader
        language={language}
        onLanguageChange={onLanguageChange}
        onOpenHint={() => setHintModalOpen(true)}
        onOpenSolution={() => setSolutionModalOpen(true)}
        onResetCode={onResetCode}
        onOpenTutor={onOpenTutor}
        code={code}
        missionTitle={mission.title}
        hasHints={true}
      />

      {/* Editor Body with Line Numbers Gutter */}
      <div className={`relative flex font-mono text-xs sm:text-sm bg-[#090a0d] ${minHeight} overflow-hidden`}>
        {/* Line Numbers Column */}
        <div
          ref={lineNumbersRef}
          className="select-none py-3.5 pl-3 pr-2.5 text-right font-mono text-zinc-600 bg-[#0c0d11] border-r border-[#1e2027] shrink-0 overflow-hidden"
          style={{ minWidth: '2.5rem' }}
        >
          {lines.map((_, i) => (
            <div key={i} className="leading-relaxed">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea Editor */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          onScroll={handleScroll}
          className="w-full h-full bg-transparent text-zinc-100 font-mono text-xs sm:text-sm p-3.5 outline-none resize-none leading-relaxed custom-scrollbar selection:bg-emerald-500/30 selection:text-white"
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>

      {/* Quick Snippets Bar (optional) */}
      {snippets && snippets.length > 0 && onInsertSnippet && (
        <div className="px-3.5 py-2 bg-[#121318] border-t border-[#1e2129] flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono mr-1">
            Snippets:
          </span>
          {snippets.map((snip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onInsertSnippet(snip.code)}
              className={`px-2 py-0.5 rounded-lg border font-mono text-[11px] transition-all cursor-pointer ${
                snip.color || 'bg-[#1a1c24] hover:bg-[#252834] border-[#2e313e] text-zinc-300 hover:text-white'
              }`}
            >
              {snip.label}
            </button>
          ))}
        </div>
      )}

      {/* Progressive Hint Modal */}
      <CodespaceHintModal
        isOpen={hintModalOpen}
        onClose={() => setHintModalOpen(false)}
        hints={hints}
        missionTitle={mission.title}
        language={language}
      />

      {/* Verified Solution Modal */}
      <CodespaceSolutionModal
        isOpen={solutionModalOpen}
        onClose={() => setSolutionModalOpen(false)}
        missionTitle={mission.title}
        solutionC={solutionC}
        solutionPython={solutionPython}
        solutionJs={solutionJs}
        initialLanguage={language}
        onApplySolution={handleApplySolution}
      />
    </div>
  );
}
