import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RotateCcw, CheckCircle2, AlertCircle, BookOpen,
  Bug, Lightbulb, Lock, Star, Zap, ChevronRight, Map, Volume2, VolumeX
} from 'lucide-react';
import { PROGRESSIVE_MISSIONS, CONCEPT_SET_ORDER, CONCEPT_SET_LABELS } from '@/data/progressiveMissions';
import type { MissionDefinition, VisualBlock, SimulationResult, SimulationStep } from '@/types/game';
import { runDeterministicSimulation } from '@/services/gameEngine';
import { useGameData } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { Link } from 'react-router-dom';
import { sound } from '@/utils/audio';
import type { PetState } from '@/types/database';

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  move_forward: 'Forward', move_back: 'Back', move_up: 'Up', move_down: 'Down',
  move_left: 'Left', move_right: 'Right', turn_left: 'Turn Left', turn_right: 'Turn Right',
  interact: 'Interact', jump: 'Jump', repeat: 'Repeat', if_clear: 'IF Clear', if_crystal: 'IF Crystal',
};
const BLOCK_ICONS: Record<string, string> = {
  move_forward: '↑', move_back: '↓', move_up: '↑', move_down: '↓',
  move_left: '←', move_right: '→', turn_left: '↺', turn_right: '↻',
  interact: '⚡', jump: '⬆', repeat: '🔄', if_clear: '?', if_crystal: '◆',
};

function blocksToCode(blocks: VisualBlock[], lang: 'python' | 'javascript'): string {
  return blocks.map(b => {
    if (b.type === 'repeat') return lang === 'python'
      ? `for step in range(${b.params?.count || 3}):\n    move_right()`
      : `for (let i = 0; i < ${b.params?.count || 3}; i++) {\n  move_right();\n}`;
    return lang === 'python' ? `${b.type}()` : `${b.type}();`;
  }).join('\n');
}

function parseCodeToBlocks(source: string): VisualBlock[] {
  const result: VisualBlock[] = [];
  const mkId = () => `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const typeMap: Record<string, VisualBlock['type']> = {
    move_right: 'move_right', move_left: 'move_left', move_up: 'move_up', move_down: 'move_down',
    move_forward: 'move_forward', turn_left: 'turn_left', turn_right: 'turn_right', interact: 'interact',
  };
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith('#') || t.startsWith('//')) continue;
    const pyLoop = t.match(/for\s+\w+\s+in\s+range\((\d+)\):/i);
    const jsLoop = t.match(/for\s*\(.*;\s*\w+\s*<\s*(\d+);/i);
    if (pyLoop || jsLoop) {
      result.push({ id: mkId(), type: 'repeat', params: { count: parseInt((pyLoop || jsLoop)![1], 10) || 3 } });
      if (i + 1 < lines.length) i++;
      continue;
    }
    const clean = t.replace(/[();]/g, '').trim();
    const mapped = typeMap[clean];
    if (mapped) result.push({ id: mkId(), type: mapped });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────
// Pet Companion
// ─────────────────────────────────────────────────────────────────────────

const PET_MESSAGES: Record<string, string[]> = {
  excited: ["You did it! 🎉", "Amazing work! ⭐", "I'm so proud!", "Keep going! 🚀"],
  happy:   ["You can do this!", "I believe in you! 💪", "Great thinking!", "Let's go! 🐾"],
  focused: ["Think it through…", "Plan first! 📝", "You've got this!", "Take your time."],
  tired:   ["Oops! Try again 💫", "Don't give up!", "Check the hint!", "Almost there!"],
  neutral: ["Make your move!", "Add a block!", "What's the plan?", "Ready when you are!"],
};

function PetCompanion({ state, petType, petStage, petName }: {
  state: PetState; petType: any; petStage: any; petName: string;
}) {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const pool = PET_MESSAGES[state] || PET_MESSAGES.neutral;
    setMsgIdx(Math.floor(Math.random() * pool.length));
  }, [state]);
  const pool = PET_MESSAGES[state] || PET_MESSAGES.neutral;
  const msg = pool[msgIdx % pool.length];
  const glowColor = state === 'excited' ? '#fbbf24' : state === 'tired' ? '#f87171' : '#14b8a6';

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <motion.div key={msg} initial={{ opacity: 0, scale: 0.85, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="relative bg-[#0d2617]/90 border border-white/15 rounded-2xl px-3 py-1.5 text-xs font-medium text-white/90 text-center max-w-[160px]">
        {msg}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <svg width="10" height="8" viewBox="0 0 10 8">
            <path d="M5 8 L0 0 L10 0 Z" fill="rgba(13,38,23,0.9)" />
          </svg>
        </div>
      </motion.div>
      <div className="relative flex items-center justify-center">
        <motion.div className="absolute rounded-full blur-2xl"
          style={{ width: 110, height: 110, background: glowColor, opacity: 0.25 }}
          animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 3 }} />
        <motion.div
          animate={state === 'excited' ? { rotate: [-4, 4, -4, 0], scale: [1, 1.07, 1] } : { y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: state === 'excited' ? 0.45 : 3.5 }}>
          <PetSVG type={petType} state={state} stage={petStage} size={110} />
        </motion.div>
      </div>
      <div className="text-center">
        <div className="text-white text-xs font-bold">{petName}</div>
        <div className="text-white/30 text-[10px] capitalize">{state}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Grid
// ─────────────────────────────────────────────────────────────────────────

function MissionGrid({ mission, activeStep }: { mission: MissionDefinition; activeStep: SimulationStep }) {
  const { gridSize, obstacles, crystals, switches, goalPos } = mission;
  const { petPos, petDir, crystalsCollected, openGates } = activeStep;
  const CELL = Math.min(40, Math.floor(300 / Math.max(gridSize.width, gridSize.height)));
  const collected = new Set(crystalsCollected.map(p => `${p.x},${p.y}`));
  const dir: Record<string, string> = { right: '→', left: '←', up: '↑', down: '↓' };
  return (
    <div className="inline-grid rounded-xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
      style={{ gridTemplateColumns: `repeat(${gridSize.width}, ${CELL}px)` }}>
      {Array.from({ length: gridSize.height }, (_, y) =>
        Array.from({ length: gridSize.width }, (_, x) => {
          const isGoal = x === goalPos.x && y === goalPos.y;
          const isPet  = x === petPos.x  && y === petPos.y;
          const obs    = obstacles.find(o => o.x === x && o.y === y);
          const gateOpen = obs?.id && openGates.includes(obs.id);
          const crystal  = crystals.find(c => c.x === x && c.y === y);
          const isCollected = crystal && collected.has(`${x},${y}`);
          const sw = switches?.find(s => s.x === x && s.y === y);
          let bg = (x + y) % 2 === 0 ? '#1a3228' : '#152b21';
          if (obs?.type === 'wall') bg = '#2d3748';
          if (obs?.type === 'water') bg = '#1e3a6e';
          if (obs?.type === 'gate' && !gateOpen) bg = '#4c1d95';
          if (obs?.type === 'gate' && gateOpen)  bg = '#14532d';
          if (isGoal) bg = '#14532d';
          return (
            <div key={`${x},${y}`} className="flex items-center justify-center border border-black/30 text-xs"
              style={{ width: CELL, height: CELL, background: bg }}>
              {isGoal && !isPet && (
                <motion.span className="text-emerald-400 font-bold" style={{ fontSize: CELL * 0.45 }}
                  animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.8 }}>⬡</motion.span>
              )}
              {sw && !isPet && <span style={{ color: sw.color || '#60a5fa', fontSize: CELL * 0.42 }}>◈</span>}
              {crystal && !isCollected && !isPet && <span className="text-yellow-300" style={{ fontSize: CELL * 0.38 }}>◆</span>}
              {isCollected && <span className="text-white/20" style={{ fontSize: CELL * 0.32 }}>◇</span>}
              {isPet && (
                <motion.span className="font-bold text-cyan-300" style={{ fontSize: CELL * 0.5 }}
                  animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}>
                  {dir[petDir] || '→'}
                </motion.span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Pseudocode fill-in
// ─────────────────────────────────────────────────────────────────────────

function PseudocodePanel({ mission, onComplete }: { mission: MissionDefinition; onComplete: () => void }) {
  const tmpl = mission.pseudocodeTemplate!;
  const parts = tmpl.template.split('___');
  const [answers, setAnswers] = useState<string[]>(Array(tmpl.answers.length).fill(''));
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const check = () => {
    const res = answers.map((a, i) => a.trim().toLowerCase() === tmpl.answers[i].toLowerCase());
    setResults(res); setChecked(true);
    if (res.every(Boolean)) { sound.playVictory(); setTimeout(onComplete, 900); } else sound.playError();
  };
  return (
    <div className="space-y-4">
      <div className="bg-black/30 border border-white/8 rounded-2xl p-5 font-mono text-sm leading-9">
        {parts.map((part, i) => (
          <span key={i}>
            <span className="text-emerald-300 whitespace-pre">{part}</span>
            {i < tmpl.answers.length && (
              <input value={answers[i]} onChange={e => setAnswers(p => { const n = [...p]; n[i] = e.target.value; return n; })}
                className={`inline-block w-28 mx-1 px-2 py-0.5 rounded-lg border text-center font-mono text-sm ${checked ? (results[i] ? 'border-emerald-400 bg-emerald-900/40 text-emerald-200' : 'border-red-400 bg-red-900/30 text-red-200') : 'border-white/20 bg-white/10 text-white'}`}
                placeholder="___" />
            )}
          </span>
        ))}
      </div>
      {checked && results.every(Boolean) && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-900/40 border border-emerald-400/30 rounded-xl p-3 text-emerald-300 text-sm">✅ {tmpl.explanation}</motion.div>
      )}
      {checked && !results.every(Boolean) && (
        <div className="bg-red-900/20 border border-red-400/20 rounded-xl p-3 text-red-300 text-sm">❌ Check the red fields.</div>
      )}
      <button onClick={check} className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition-colors">
        Check Answers
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Scenario
// ─────────────────────────────────────────────────────────────────────────

function ScenarioPanel({ mission, onComplete }: { mission: MissionDefinition; onComplete: () => void }) {
  const sc = mission.scenarioChallenge!;
  const [code, setCode] = useState(sc.starterCode);
  const [output, setOutput] = useState<string[]>([]);
  const [passed, setPassed] = useState(false);
  const [hintIdx, setHintIdx] = useState(-1);
  const [ran, setRan] = useState(false);
  const runCode = () => {
    const out: string[] = [];
    try {
      if (sc.concept === 'conditions') {
        const fm = code.match(/def classify_temperature\(temp\):\s*\n([\s\S]*?)(?=\n\S|$)/);
        if (fm && (fm[1].includes('"HOT"') || fm[1].includes("'HOT'"))) {
          const fn = (t: number) => t > 30 ? 'HOT' : t >= 15 ? 'WARM' : 'COLD';
          [...code.matchAll(/print\(classify_temperature\((\d+)\)\)/g)].forEach(p => out.push(fn(+p[1])));
        }
      } else if (sc.concept === 'loops') {
        if (code.match(/def calculate_total/)) {
          const fn = (prices: number[]) => { let t = prices.reduce((a, b) => a + b, 0); if (t > 50) t *= 0.9; return Math.round(t * 100) / 100; };
          [...code.matchAll(/print\(calculate_total\(\[([^\]]+)\]\)\)/g)].forEach(p =>
            out.push(String(fn(p[1].split(',').map((s: string) => parseFloat(s.trim())))))
          );
        }
      } else if (sc.concept === 'functions') {
        if (code.includes('self.hunger') && code.includes('self.happiness')) {
          let h = 50; let hap = 50;
          h = Math.max(0, h - 20); hap = Math.min(100, hap + 10); hap = Math.min(100, hap + 20);
          out.push(`Hunger: ${h} | Happiness: ${hap} | Mood: ${hap > 70 ? 'Happy' : hap > 40 ? 'Okay' : 'Sad'}`);
        }
      }
    } catch { out.push('Error: check your syntax.'); }
    setOutput(out); setRan(true);
    const ok = sc.expectedOutput.every((exp: string, i: number) => out[i]?.trim() === exp.trim());
    setPassed(ok);
    if (ok) { sound.playVictory(); setTimeout(onComplete, 1500); } else sound.playError();
  };
  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute top-2 right-3 text-[9px] text-white/20 uppercase tracking-widest font-mono">Python</div>
        <textarea value={code} onChange={e => setCode(e.target.value)}
          className="w-full h-52 px-4 py-3 rounded-2xl font-mono text-sm text-emerald-200 bg-black/40 border border-white/8 resize-none focus:outline-none focus:border-emerald-500/40"
          spellCheck={false} />
      </div>
      {ran && (
        <div className={`rounded-xl border p-3 font-mono text-sm ${passed ? 'border-emerald-500/30 bg-emerald-900/15' : 'border-red-500/20 bg-red-900/10'}`}>
          <div className="text-[9px] text-white/25 uppercase mb-2">Output</div>
          {output.map((line: string, i: number) => {
            const ok = line?.trim() === sc.expectedOutput[i]?.trim();
            return <div key={i} className={ok ? 'text-emerald-300' : 'text-red-300'}>
              {ok ? '✓' : '✗'} {line}
              {!ok && sc.expectedOutput[i] && <span className="text-white/25 ml-2">expected: {sc.expectedOutput[i]}</span>}
            </div>;
          })}
          {passed && <div className="text-emerald-400 font-bold mt-1">All tests passed! 🎉</div>}
        </div>
      )}
      {sc.hints.length > 0 && (
        <button onClick={() => setHintIdx(p => Math.min(p + 1, sc.hints.length - 1))}
          className="text-yellow-400/60 text-sm hover:text-yellow-300 transition-colors">
          💡 {hintIdx < 0 ? 'Reveal hint' : hintIdx < sc.hints.length - 1 ? 'Next hint' : 'No more hints'}
        </button>
      )}
      {hintIdx >= 0 && <div className="bg-yellow-900/20 border border-yellow-500/25 rounded-xl p-3 text-yellow-200 text-sm font-mono">{sc.hints[hintIdx]}</div>}
      <button onClick={runCode} className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors flex items-center justify-center gap-2">
        <Play className="w-4 h-4" fill="white" /> Run Code
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AcademyPage
// ─────────────────────────────────────────────────────────────────────────

export function AcademyPage() {
  const { profile, pet, progress, completeMission, soundEnabled, toggleSound } = useGameData();
  const completedIds = new Set(Object.keys(progress || {}).filter(k => (progress as any)[k]?.completed));

  function isMissionUnlocked(idx: number): boolean {
    if (idx === 0) return true;
    return completedIds.has(PROGRESSIVE_MISSIONS[idx - 1].id);
  }

  const firstIncomplete = PROGRESSIVE_MISSIONS.findIndex((m, i) => !completedIds.has(m.id) && isMissionUnlocked(i));
  const [selectedIdx, setSelectedIdx] = useState(Math.max(0, firstIncomplete === -1 ? 0 : firstIncomplete));
  const mission = PROGRESSIVE_MISSIONS[selectedIdx];
  const [petState, setPetState]       = useState<PetState>('focused');
  const [blocks, setBlocks]           = useState<VisualBlock[]>([]);
  const [rawCode, setRawCode]         = useState('');
  const [repeatCount, setRepeatCount] = useState(3);
  const [simResult, setSimResult]     = useState<SimulationResult | null>(null);
  const [stepIdx, setStepIdx]         = useState(0);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState<string | undefined>();
  const [missionDone, setMissionDone] = useState(false);
  const [hintIdx, setHintIdx]         = useState(-1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const init = mission.initialBlocks ? [...mission.initialBlocks] : [];
    setBlocks(init); setRawCode(blocksToCode(init, 'python'));
    setSimResult(null); setStepIdx(0); setIsPlaying(false);
    setErrorMsg(undefined); setMissionDone(false); setHintIdx(-1); setPetState('focused');
    if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
  }, [mission.id]);

  useEffect(() => () => { if (simRef.current) { clearInterval(simRef.current); simRef.current = null; } }, []);

  const handleAddBlock = (type: VisualBlock['type']) => {
    sound.playSnap();
    const nb: VisualBlock = { id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, type, params: type === 'repeat' ? { count: repeatCount } : undefined };
    const next = [...blocks, nb]; setBlocks(next); setRawCode(blocksToCode(next, 'python'));
  };
  const handleRemoveBlock = (i: number) => {
    const n = blocks.filter((_, idx) => idx !== i); setBlocks(n); setRawCode(blocksToCode(n, 'python'));
  };
  const handleRun = () => {
    if (blocks.length === 0) { sound.playError(); setErrorMsg('Add blocks or write code first!'); setPetState('tired'); return; }
    sound.playClick(); setErrorMsg(undefined);
    const result = runDeterministicSimulation(mission.gridSize, mission.startPos, mission.startDir, mission.goalPos, mission.obstacles, mission.crystals, mission.switches, blocks);
    if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
    setSimResult(result); setIsPlaying(true); setStepIdx(0); setPetState('happy');
    let s = 0;
    simRef.current = setInterval(() => {
      s++;
      if (s < result.steps.length) { setStepIdx(s); sound.playStep(); }
      else {
        if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
        setIsPlaying(false);
        if (result.success) {
          sound.playVictory(); setMissionDone(true); setPetState('excited');
          completeMission(mission.id, mission.xpReward, mission.coinReward, { algorithms: 20 } as any);
        } else { sound.playError(); setErrorMsg(result.message); setPetState('tired'); }
      }
    }, 420);
  };
  const handleReset = () => {
    if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
    const init = mission.initialBlocks ? [...mission.initialBlocks] : [];
    setBlocks(init); setRawCode(blocksToCode(init, 'python')); setSimResult(null);
    setStepIdx(0); setIsPlaying(false); setErrorMsg(undefined); setPetState('focused');
  };

  const activeStep: SimulationStep = simResult?.steps[stepIdx] ?? {
    stepIndex: 0, petPos: mission.startPos, petDir: mission.startDir,
    petAction: 'idle', crystalsCollected: [], openGates: [], status: 'running',
  };
  const mode       = mission.learningMode ?? 'guided';
  const isScenario = mode === 'scenario';
  const isPseudo   = mode === 'pseudocode' && !!mission.pseudocodeTemplate;
  const isTyped    = mode === 'typed' || mode === 'debug';

  const setProgress = CONCEPT_SET_ORDER.reduce<Record<string, { done: number; total: number }>>((acc, cs) => {
    const csMs = PROGRESSIVE_MISSIONS.filter(m => m.conceptSet === cs);
    acc[cs] = { done: csMs.filter(m => completedIds.has(m.id)).length, total: csMs.length };
    return acc;
  }, {});

  const MODE_TAG: Record<string, { label: string; color: string }> = {
    guided:     { label: '🎯 Guided',        color: '#3b82f6' },
    visual:     { label: '🧩 Visual Blocks',  color: '#8b5cf6' },
    pseudocode: { label: '📝 Pseudocode',    color: '#6366f1' },
    typed:      { label: '💻 Typed Code',    color: '#0ea5e9' },
    debug:      { label: '🐛 Debug Mode',    color: '#ef4444' },
    scenario:   { label: '🌍 Scenario',      color: '#14b8a6' },
  };

  const petType  = (pet?.type  as any) || 'cat';
  const petStage = (pet?.stage as any) || 'infant';
  const petName  = pet?.name  || 'Buddy';

  return (
    <div className="flex h-screen bg-[#080f09] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ═══ SIDEBAR ═══ */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside key="sidebar"
            initial={{ width: 0, opacity: 0 }} animate={{ width: 224, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="shrink-0 bg-[#060e07] border-r border-white/5 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>

            {/* Brand */}
            <div className="px-4 pt-5 pb-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2 text-white">
                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                <span className="font-bold text-sm">petslyvia.</span>
              </div>
              <p className="text-white/25 text-[10px] mt-1">A little code. A lot of possibility.</p>
            </div>

            {/* Journey tree */}
            <div className="flex-1 overflow-y-auto py-3">
              <div className="px-4 mb-2 text-[10px] text-white/25 uppercase tracking-widest font-semibold">Your Journey</div>
              {CONCEPT_SET_ORDER.map((cs, csIdx) => {
                const info     = CONCEPT_SET_LABELS[cs];
                const prog     = setProgress[cs];
                const csMs     = PROGRESSIVE_MISSIONS.filter(m => m.conceptSet === cs);
                const prevDone = csIdx === 0 ? true : setProgress[CONCEPT_SET_ORDER[csIdx - 1]]?.done > 0;
                const isComplete = prog.done === prog.total && prog.total > 0;
                return (
                  <div key={cs} className="mb-0.5">
                    <div className={`flex items-center gap-2 px-4 py-1.5 text-[11px] font-semibold
                      ${isComplete ? 'text-emerald-400' : prevDone ? 'text-white/70' : 'text-white/20'}`}>
                      <span>{info.icon}</span>
                      <span className="flex-1">{info.label}</span>
                      {isComplete && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                      {!prevDone  && <Lock className="w-3 h-3 text-white/15 shrink-0" />}
                    </div>
                    {prevDone && csMs.map(m => {
                      const mIdx     = PROGRESSIVE_MISSIONS.indexOf(m);
                      const isDone   = completedIds.has(m.id);
                      const unlocked = isMissionUnlocked(mIdx);
                      const isSel    = selectedIdx === mIdx;
                      return (
                        <button key={m.id} disabled={!unlocked}
                          onClick={() => { if (unlocked) setSelectedIdx(mIdx); }}
                          className={`w-full text-left flex items-center gap-2 pl-8 pr-3 py-1.5 text-[11px] transition-all
                            ${isSel    ? 'bg-emerald-700/25 text-emerald-300 border-r-2 border-emerald-500'
                            : isDone   ? 'text-emerald-500/60 hover:bg-white/4'
                            : unlocked ? 'text-white/40 hover:bg-white/4 hover:text-white/60'
                                       : 'text-white/15 cursor-not-allowed'}`}>
                          <span className={`w-3 h-3 rounded-full border shrink-0 flex items-center justify-center
                            ${isDone ? 'bg-emerald-500 border-emerald-500' : isSel ? 'border-emerald-400 bg-emerald-900/40' : 'border-white/15'}`}>
                            {isDone && <span className="text-white text-[6px]">✓</span>}
                            {!isDone && isSel && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block" />}
                          </span>
                          <span className="flex-1 truncate">{m.title}</span>
                          {m.isMasteryCheck && <Star className="w-2.5 h-2.5 text-yellow-400 shrink-0" />}
                          {!unlocked && <Lock className="w-2 h-2 text-white/15 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Pet companion at bottom */}
            <div className="shrink-0 border-t border-white/5 py-4 px-3 bg-gradient-to-t from-[#040a05]">
              <PetCompanion state={petState} petType={petType} petStage={petStage} petName={petName} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="h-12 shrink-0 border-b border-white/5 bg-[#060e07]/80 backdrop-blur flex items-center px-4 gap-3">
          <button onClick={() => setSidebarOpen(p => !p)}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <nav className="flex items-center gap-1 text-[11px] text-white/30">
            <Link to="/app" className="hover:text-white/60 transition-colors">Your world</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/50">Academy</span>
          </nav>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1 text-yellow-400 font-semibold"><Zap className="w-3 h-3" /> {profile?.xp ?? 0} XP</div>
            <div className="text-teal-400 font-semibold">💎 {profile?.coins ?? 0}</div>
          </div>
          <button onClick={toggleSound} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 transition-colors">
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <Link to="/app" className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 border border-white/8 rounded-lg px-2.5 py-1 transition-colors">
            <Map className="w-3 h-3" /> World map
          </Link>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Mission title area */}
          <div className="px-6 pt-5">
            <div className="flex items-center gap-2 text-[10px] text-white/25 uppercase tracking-widest mb-1">
              <span>{CONCEPT_SET_LABELS[mission.conceptSet!]?.icon}</span>
              <span>{mission.progressLabel?.toUpperCase()}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{mission.title}</h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border"
                style={{ color: MODE_TAG[mode]?.color, borderColor: MODE_TAG[mode]?.color + '40', background: MODE_TAG[mode]?.color + '18' }}>
                {MODE_TAG[mode]?.label}
              </span>
              {mission.isMasteryCheck && (
                <span className="text-[10px] font-bold bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ⭐ Mastery
                </span>
              )}
            </div>
            <p className="text-white/45 text-sm mb-4">{mission.story}</p>
          </div>

          {/* Mission complete banner */}
          <AnimatePresence>
            {missionDone && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mx-6 mb-4 bg-emerald-900/30 border border-emerald-500/25 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-emerald-300 font-bold text-base">🎉 Mission Complete! +{mission.xpReward} XP</div>
                  <div className="text-white/50 text-sm mt-0.5">{mission.explanation}</div>
                </div>
                {selectedIdx < PROGRESSIVE_MISSIONS.length - 1 && (
                  <button onClick={() => setSelectedIdx(p => Math.min(p + 1, PROGRESSIVE_MISSIONS.length - 1))}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Two-column workspace */}
          <div className="px-6 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* LEFT: objective + grid / scenario desc + hints */}
            <div className="space-y-3">
              <div className="bg-white/4 border border-white/6 rounded-2xl px-4 py-3 flex items-start gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                </div>
                <p className="text-sm text-white/70">{mission.objective}</p>
              </div>

              {!isScenario && (
                <div className="bg-white/4 border border-white/6 rounded-2xl p-4 flex flex-col items-center gap-3">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-[10px] text-white/25 uppercase tracking-widest">Mission {String(selectedIdx + 1).padStart(2, '0')}</div>
                    {simResult
                      ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${simResult.success ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>{simResult.success ? '✓ Success' : '✗ Failed'}</span>
                      : <span className="text-xs text-white/25 bg-white/5 px-2 py-0.5 rounded-full">Ready to explore</span>
                    }
                  </div>
                  <MissionGrid mission={mission} activeStep={activeStep} />
                  {mission.crystals.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-white/35 self-start">
                      <span className="text-yellow-400">◆</span>
                      {activeStep.crystalsCollected.length} / {mission.crystals.length}
                    </div>
                  )}
                  {simResult && (
                    <div className={`w-full text-xs text-center rounded-xl p-2 ${simResult.success ? 'bg-emerald-900/25 text-emerald-300' : 'bg-red-900/20 text-red-300'}`}>
                      {activeStep.message || (simResult.success ? '🎯 Reached the goal!' : '…')}
                    </div>
                  )}
                  {errorMsg && (
                    <div className="w-full bg-red-900/20 border border-red-500/15 rounded-xl p-2 text-red-300 text-xs flex gap-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-px" /> {errorMsg}
                    </div>
                  )}
                </div>
              )}

              {isScenario && mission.scenarioChallenge && (
                <div className="bg-blue-950/40 border border-blue-400/12 rounded-2xl p-4 text-sm text-blue-200 whitespace-pre-wrap font-mono leading-6 max-h-72 overflow-y-auto">
                  {mission.scenarioChallenge.scenarioDescription}
                </div>
              )}

              {mission.hints.length > 0 && !missionDone && (
                <div className="space-y-2">
                  <button onClick={() => setHintIdx(p => Math.min(p + 1, mission.hints.length - 1))}
                    className="flex items-center gap-2 text-sm text-white/25 hover:text-yellow-300 transition-colors">
                    <Lightbulb className="w-3.5 h-3.5 text-yellow-500/40" />
                    {hintIdx < 0 ? 'Reveal a hint' : hintIdx < mission.hints.length - 1 ? 'Show next hint' : 'No more hints'}
                  </button>
                  <AnimatePresence>
                    {hintIdx >= 0 && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-yellow-900/15 border border-yellow-500/20 rounded-xl p-3 text-yellow-200 text-sm">
                        💡 {mission.hints[hintIdx]}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* RIGHT: workspace */}
            <div className="bg-white/4 border border-white/6 rounded-2xl p-4 flex flex-col gap-3">

              {isPseudo && !missionDone && (
                <>
                  <div className="text-[10px] text-white/25 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-indigo-400" /> Fill in the blanks
                  </div>
                  <PseudocodePanel mission={mission} onComplete={() => {
                    setMissionDone(true); setPetState('excited');
                    completeMission(mission.id, mission.xpReward, mission.coinReward, { algorithms: 20 } as any);
                  }} />
                </>
              )}

              {isScenario && !missionDone && mission.scenarioChallenge && (
                <ScenarioPanel mission={mission} onComplete={() => {
                  setMissionDone(true); setPetState('excited');
                  completeMission(mission.id, mission.xpReward, mission.coinReward, { algorithms: 20 } as any);
                }} />
              )}

              {!isScenario && !isPseudo && !missionDone && (
                <>
                  <div className="text-[10px] text-white/25 uppercase tracking-widest">
                    {isTyped ? 'Code Editor' : 'Make your move'}
                  </div>

                  {isTyped ? (
                    <textarea value={rawCode}
                      onChange={e => { setRawCode(e.target.value); setBlocks(parseCodeToBlocks(e.target.value)); }}
                      className="flex-1 min-h-[150px] px-4 py-3 rounded-xl font-mono text-sm text-emerald-200 bg-black/35 border border-white/8 resize-none focus:outline-none focus:border-emerald-500/40"
                      spellCheck={false} placeholder="# Write your code here" />
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-1.5">
                        {mission.allowedBlocks.map(bt => (
                          <button key={bt} onClick={() => handleAddBlock(bt)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/6 text-white/55 hover:bg-emerald-900/30 hover:border-emerald-500/25 hover:text-white transition-all group">
                            <span className="text-base leading-none">{BLOCK_ICONS[bt] || '•'}</span>
                            <span className="font-medium flex-1 text-left">{BLOCK_LABELS[bt] || bt}</span>
                            <span className="text-white/15 group-hover:text-emerald-500">+</span>
                          </button>
                        ))}
                      </div>

                      {mission.allowedBlocks.includes('repeat') && (
                        <div className="flex items-center gap-2 text-xs text-white/30">
                          <span>Repeat count</span>
                          <input type="number" min={1} max={20} value={repeatCount}
                            onChange={e => setRepeatCount(Number(e.target.value))}
                            className="w-12 px-2 py-1 rounded-lg bg-black/30 border border-white/8 text-white text-xs text-center focus:outline-none" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-[10px] text-white/25 uppercase tracking-widest flex items-center gap-1">
                            Your next moves
                            {blocks.length > 0 && <span className="bg-emerald-500/20 text-emerald-300 text-[9px] rounded-full px-1.5 font-bold ml-1">{blocks.length}</span>}
                          </div>
                          {blocks.length > 0 && <button onClick={handleReset} className="text-[10px] text-white/20 hover:text-red-400 transition-colors">Clear</button>}
                        </div>
                        <div className="min-h-[80px] bg-black/20 rounded-xl border border-white/5 p-2 flex flex-wrap gap-1.5 content-start">
                          {blocks.length === 0 && (
                            <div className="w-full text-center text-white/15 text-xs py-5 leading-relaxed">
                              A little plan goes a long way.<br />Choose your first move above.
                            </div>
                          )}
                          {blocks.map((b, i) => (
                            <motion.button key={b.id} initial={{ scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                              onClick={() => handleRemoveBlock(i)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                                ${mission.brokenTargetBlockIndex === i
                                  ? 'bg-red-900/50 border border-red-500/40 text-red-200'
                                  : 'bg-emerald-900/35 border border-emerald-500/20 text-emerald-300 hover:bg-red-900/30 hover:text-red-300 hover:border-red-500/30'}`}>
                              {BLOCK_ICONS[b.type] || ''} {BLOCK_LABELS[b.type] || b.type}
                              {b.params?.count !== undefined && <span className="ml-1 opacity-50">×{b.params.count}</span>}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button id="academy-run-btn" onClick={handleRun} disabled={isPlaying}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                      <Play className="w-4 h-4" fill="white" /> {isPlaying ? 'Running…' : 'Play'}
                    </button>
                    <button onClick={handleReset}
                      className="px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/6 text-white/40 transition-colors">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {mode === 'debug' && (
                    <div className="bg-red-900/15 border border-red-500/15 rounded-xl p-3 text-red-300 text-xs flex gap-2">
                      <Bug className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      The sequence has a bug. Run to see where — the <span className="font-bold text-red-200">red block</span> went wrong.
                    </div>
                  )}
                </>
              )}

              {missionDone && (
                <div className="bg-white/4 border border-white/6 rounded-xl p-3 text-sm text-white/50 leading-relaxed">
                  <div className="text-[9px] text-white/20 uppercase mb-1.5">What you just learned</div>
                  {mission.explanation}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
