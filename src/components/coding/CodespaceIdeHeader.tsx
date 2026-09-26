import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Copy,
  Check,
  ChevronDown,
  Lightbulb,
  KeyRound,
  RotateCcw,
  Sparkles,
  Download
} from 'lucide-react';
import { sound } from '@/utils/audio';

export type SupportedLanguage = 'c' | 'python' | 'javascript';

interface CodespaceIdeHeaderProps {
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onOpenHint: () => void;
  onOpenSolution: () => void;
  onResetCode?: () => void;
  onOpenTutor?: () => void;
  code: string;
  missionTitle?: string;
  hasHints?: boolean;
}

const LANGUAGE_LABELS: Record<SupportedLanguage, { short: string; full: string; badge: string }> = {
  c: { short: 'C (gcc 8.x)', full: 'C (gcc 14.2 / C17)', badge: '⚙️' },
  python: { short: 'Python 3.12', full: 'Python (Python 3.12)', badge: '🐍' },
  javascript: { short: 'JS (Node 20)', full: 'JavaScript (Node.js 20)', badge: '⚡' },
};

export function CodespaceIdeHeader({
  language,
  onLanguageChange,
  onOpenHint,
  onOpenSolution,
  onResetCode,
  onOpenTutor,
  code,
  missionTitle,
  hasHints = true,
}: CodespaceIdeHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  // Compute absolute viewport position for portal menu to prevent ANY clipping
  const updateMenuPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
  };

  useEffect(() => {
    if (dropdownOpen) {
      updateMenuPosition();
      const handleWindowChange = () => updateMenuPosition();
      window.addEventListener('scroll', handleWindowChange, true);
      window.addEventListener('resize', handleWindowChange);
      return () => {
        window.removeEventListener('scroll', handleWindowChange, true);
        window.removeEventListener('resize', handleWindowChange);
      };
    }
  }, [dropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement)?.closest?.('.language-portal-menu')
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleCopy = () => {
    sound.playSnap();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    sound.playClick();
    const ext = language === 'c' ? 'c' : language === 'python' ? 'py' : 'js';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solution_${(missionTitle || 'petslyvia').toLowerCase().replace(/\s+/g, '_')}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#121316] border-b border-[#26282e] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 select-none relative z-30 overflow-visible rounded-t-2xl sm:rounded-t-3xl">
      {/* Left Icon Actions: Tutor, Download/Copy, Reset */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Tutor / Teacher Icon */}
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            if (onOpenTutor) onOpenTutor();
            else onOpenHint();
          }}
          title="Concept Tutor & Walkthrough"
          className="w-8 h-8 rounded-full bg-[#1e2330] hover:bg-[#283042] border border-[#3b82f6]/40 text-[#60a5fa] hover:text-[#93c5fd] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <GraduationCap size={15} />
        </button>

        {/* Download / Export Code Icon */}
        <button
          type="button"
          onClick={handleDownload}
          title="Download Code File"
          className="w-8 h-8 rounded-full bg-[#18191f] hover:bg-[#23252d] border border-[#323642] text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Download size={14} />
        </button>

        {/* Copy to Clipboard Button */}
        <button
          type="button"
          onClick={handleCopy}
          title="Copy Code"
          className="w-8 h-8 rounded-full bg-[#18191f] hover:bg-[#23252d] border border-[#323642] text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={13} />}
        </button>

        {/* Reset Code Button */}
        {onResetCode && (
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onResetCode();
            }}
            title="Reset to Starter Code"
            className="w-8 h-8 rounded-full bg-[#18191f] hover:bg-[#23252d] border border-[#323642] text-zinc-400 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>

      {/* Center / Right: Language Selector Dropdown + Hint + Solution Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Language Selector Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setDropdownOpen((prev) => !prev);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#23252b] hover:bg-[#2c2f38] border border-[#3a3e4a] text-zinc-200 hover:text-white rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer shadow-inner whitespace-nowrap shrink-0 relative"
          >
            <span className="whitespace-nowrap">{LANGUAGE_LABELS[language].short}</span>
            <ChevronDown size={14} className={`text-zinc-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />

            {/* Invisible Native Select Overlay: Guarantees language can ALWAYS be changed on ANY browser or device */}
            <select
              aria-label="Select Programming Language"
              value={language}
              onChange={(e) => {
                sound.playClick();
                onLanguageChange(e.target.value as SupportedLanguage);
                setDropdownOpen(false);
              }}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
            >
              <option value="python">🐍 Python (Python 3.12)</option>
              <option value="javascript">⚡ JavaScript (Node.js 20)</option>
              <option value="c">⚙️ C (gcc 14.2 / C17)</option>
            </select>
          </button>

          {/* Portal Dropdown Menu: Mounted to document.body with fixed positioning so it's NEVER clipped */}
          {dropdownOpen && menuPos && typeof document !== 'undefined' && createPortal(
            <div
              style={{
                position: 'fixed',
                top: `${menuPos.top}px`,
                right: `${menuPos.right}px`,
                zIndex: 99999,
              }}
              className="language-portal-menu w-56 bg-[#18191f] border border-[#3b3f4f] rounded-xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] py-1.5 font-mono text-xs animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-400 border-b border-[#252832] flex items-center justify-between">
                <span>Select Language</span>
                <span className="text-[9px] text-emerald-400 font-bold uppercase">{language}</span>
              </div>
              {(['python', 'javascript', 'c'] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onLanguageChange(lang);
                    setDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                    language === lang
                      ? 'bg-[#22332a] text-emerald-300 font-bold border-l-2 border-emerald-400'
                      : 'text-zinc-300 hover:bg-[#232630] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{LANGUAGE_LABELS[lang].badge}</span>
                    <span className="font-semibold">{LANGUAGE_LABELS[lang].full}</span>
                  </span>
                  {language === lang && <Check size={14} className="text-emerald-400 shrink-0" />}
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>

        {/* 💡 Hint Button */}
        {hasHints && (
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenHint();
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <Lightbulb size={13} className="text-amber-400 animate-pulse" />
            <span>Hint</span>
          </button>
        )}

        {/* 🔓 Solution Button */}
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onOpenSolution();
          }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <KeyRound size={13} className="text-emerald-400" />
          <span>Solution</span>
        </button>
      </div>
    </div>
  );
}
