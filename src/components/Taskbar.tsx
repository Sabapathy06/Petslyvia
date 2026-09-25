import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Plus, Sparkles, Zap, Heart, Coins, Award,
  ChevronUp, ChevronDown, Trash2, Check, AlertTriangle, Coffee, Filter, Smile
} from 'lucide-react';
import { useGameData, type TaskCategory } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { sound } from '@/utils/audio';

export interface TaskItem {
  id: string;
  title: string;
  category: TaskCategory;
  completed: boolean;
  completedAt?: string;
  isCustom?: boolean;
}

const CATEGORY_CONFIG: Record<
  TaskCategory,
  {
    label: string;
    energyCost: number;
    happinessGain: number;
    xpGain: number;
    coinsGain: number;
    color: string;
    bg: string;
    border: string;
    badge: string;
    icon: string;
  }
> = {
  easy: {
    label: 'Easy',
    energyCost: 8,
    happinessGain: 12,
    xpGain: 20,
    coinsGain: 15,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: '🌱',
  },
  medium: {
    label: 'Medium',
    energyCost: 18,
    happinessGain: 25,
    xpGain: 40,
    coinsGain: 35,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    icon: '⚡',
  },
  hard: {
    label: 'Hard',
    energyCost: 32,
    happinessGain: 50,
    xpGain: 90,
    coinsGain: 75,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🔥',
  },
  complex: {
    label: 'Complex',
    energyCost: 48,
    happinessGain: 85,
    xpGain: 160,
    coinsGain: 130,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    icon: '👑',
  },
};

const DEFAULT_PRESET_TASKS: TaskItem[] = [
  { id: 'preset_1', title: 'Hydration & 5 min posture stretch', category: 'easy', completed: false },
  { id: 'preset_2', title: 'Clear email inbox & daily planning', category: 'easy', completed: false },
  { id: 'preset_3', title: '25 min Focused Pomodoro Sprint', category: 'medium', completed: false },
  { id: 'preset_4', title: 'Review PR & write logic test cases', category: 'medium', completed: false },
  { id: 'preset_5', title: '60 min Deep Work: Implement feature logic', category: 'hard', completed: false },
  { id: 'preset_6', title: 'Fix critical production deadlock / bug', category: 'hard', completed: false },
  { id: 'preset_7', title: 'Architect complete full-stack milestone', category: 'complex', completed: false },
];

const LOCAL_STORAGE_KEY = 'petslyvia_productivity_tasks_v2';

export function Taskbar() {
  const { pet, completeProductivityTask } = useGameData();
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PRESET_TASKS;
    } catch {
      return DEFAULT_PRESET_TASKS;
    }
  });

  const [activeFilter, setActiveFilter] = useState<'all' | TaskCategory>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('medium');
  const [isAdding, setIsAdding] = useState(false);
  const [rewardToast, setRewardToast] = useState<{
    show: boolean;
    text: string;
    subtext: string;
    isError?: boolean;
  } | null>(null);

  // Live Pet Reaction inside Taskbar
  const [petReaction, setPetReaction] = useState<{
    config: { expression: string; label: string; icon: string; sound: string; duration: number };
    id: number;
  } | null>(null);

  // Persist tasks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks', e);
    }
  }, [tasks]);

  const energy = pet?.energy ?? 100;
  const happiness = pet?.happiness ?? 100;

  // Derive dynamic mood expression from current vitals
  let currentMoodState: 'happy' | 'excited' | 'tired' | 'sleepy' | 'thinking' = 'happy';
  let moodLabel = 'Happy & Ready';
  let moodIcon = '😊';

  if (energy < 15) {
    currentMoodState = 'sleepy';
    moodLabel = 'Exhausted';
    moodIcon = '😴';
  } else if (energy < 35) {
    currentMoodState = 'tired';
    moodLabel = 'Low Energy';
    moodIcon = '🥱';
  } else if (happiness >= 80) {
    currentMoodState = 'excited';
    moodLabel = 'Super Hyped!';
    moodIcon = '✨';
  } else if (happiness >= 50) {
    currentMoodState = 'happy';
    moodLabel = 'Feeling Good';
    moodIcon = '😊';
  } else {
    currentMoodState = 'thinking';
    moodLabel = 'Focused';
    moodIcon = '🤔';
  }

  // Interactive pet click
  const handlePetClick = () => {
    sound.playCheer();
    setPetReaction({
      config: {
        expression: 'heart',
        label: 'Pet loves you! 💖',
        icon: '💖',
        sound: 'cheer',
        duration: 2.2,
      },
      id: Date.now(),
    });
    setTimeout(() => setPetReaction(null), 2200);
  };

  const handleToggleComplete = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.completed) {
      // Un-complete
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: false, completedAt: undefined } : t))
      );
      sound.playClick();
      return;
    }

    // Attempt completion
    const config = CATEGORY_CONFIG[task.category];
    const currentEnergy = pet?.energy ?? 100;

    if (currentEnergy < config.energyCost) {
      sound.playHurt();
      setPetReaction({
        config: {
          expression: 'hurt',
          label: 'Too tired... need rest!',
          icon: '😫',
          sound: 'hurt',
          duration: 2.5,
        },
        id: Date.now(),
      });
      setTimeout(() => setPetReaction(null), 2500);

      setRewardToast({
        show: true,
        text: '🐾 Pet is Too Tired!',
        subtext: `Needs ${config.energyCost}% energy (Pet has ${currentEnergy}%). Feed snacks or rest at Pet Home!`,
        isError: true,
      });
      setTimeout(() => setRewardToast(null), 4000);
      return;
    }

    const res = await completeProductivityTask(task.category);

    if (res.success) {
      sound.playVictory();
      setPetReaction({
        config: {
          expression: 'victory',
          label: 'Task Complete! 🎉',
          icon: '🏆',
          sound: 'victory',
          duration: 3,
        },
        id: Date.now(),
      });
      setTimeout(() => setPetReaction(null), 3000);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
        )
      );

      setRewardToast({
        show: true,
        text: `✨ Task Completed: ${task.title}`,
        subtext: `⚡ -${res.energyCost} Energy | 💖 +${res.happinessGain} Happiness | 🌟 +${res.xpGain} XP | 🪙 +${res.coinsGain} Coins`,
      });
      setTimeout(() => setRewardToast(null), 4500);
    } else {
      setRewardToast({
        show: true,
        text: 'Task Failed',
        subtext: res.reason || 'Could not complete task.',
        isError: true,
      });
      setTimeout(() => setRewardToast(null), 4000);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      completed: false,
      isCustom: true,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
    setIsAdding(false);
    sound.playSnap();
  };

  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    sound.playClick();
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'all') return true;
    return t.category === activeFilter;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <>
      {/* Floating Reward / Energy Warning Toast */}
      <AnimatePresence>
        {rewardToast?.show && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-20 right-6 z-50 max-w-sm p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 ${
              rewardToast.isError
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-rose-950/50'
                : 'bg-slate-900/90 border-amber-500/50 text-slate-100 shadow-amber-950/50'
            }`}
          >
            {rewardToast.isError ? (
              <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={22} />
            ) : (
              <Sparkles className="text-amber-400 shrink-0 mt-0.5 animate-bounce" size={22} />
            )}
            <div className="flex-1">
              <div className="font-bold text-sm tracking-wide">{rewardToast.text}</div>
              <div className="text-xs text-slate-300 mt-1 leading-snug">{rewardToast.subtext}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Docked Taskbar Controller */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
        {/* Expanded Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-84 sm:w-96 max-h-[80vh] bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden mb-3"
            >
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-100 tracking-wider">
                      PRODUCTIVITY TASKBAR
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Work in real life ➔ Fuel your Pet&apos;s happiness!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setIsAdding(!isAdding);
                      sound.playClick();
                    }}
                    className={`p-1.5 rounded-xl border transition-colors ${
                      isAdding
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                    title="Add Custom Task"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      sound.playClick();
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>

              {/* PET COMPANION WITH LIVE EXPRESSIONS & VITALS */}
              <div className="p-3 bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                {/* Pet Avatar with Real-time Expression Reaction */}
                <div
                  onClick={handlePetClick}
                  className="flex items-center gap-2.5 cursor-pointer group select-none"
                  title="Click to interact & cheer up your pet!"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:border-amber-400 transition-all shrink-0">
                    {pet && (
                      <PetSVG
                        type={pet.pet_type}
                        stage={pet.stage}
                        state={petReaction ? (petReaction.config.expression as any) : currentMoodState}
                        equipped={pet.equipped_items}
                        reaction={petReaction}
                        size={44}
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-100 tracking-wide">
                        {pet?.name || 'Your Pet'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 font-extrabold border border-slate-700 flex items-center gap-1">
                        <span>{moodIcon}</span> {moodLabel}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                      {petReaction?.config.label || (energy < 35 ? 'Need snacks / rest!' : 'Ready to conquer goals!')}
                    </p>
                  </div>
                </div>

                {/* Live Vitals Gauge */}
                <div className="space-y-1.5 text-[11px] shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-0.5">
                      <Zap size={10} /> {energy}%
                    </span>
                    <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className={`h-full transition-all duration-300 ${
                          energy > 30 ? 'bg-amber-400' : 'bg-rose-500'
                        }`}
                        style={{ width: `${energy}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[10px] font-mono text-rose-400 font-bold flex items-center gap-0.5">
                      <Heart size={10} /> {happiness}%
                    </span>
                    <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-rose-400 transition-all duration-300"
                        style={{ width: `${happiness}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Custom Task Form */}
              <AnimatePresence>
                {isAdding && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddTask}
                    className="p-3 bg-slate-950/80 border-b border-slate-800 space-y-2.5 overflow-hidden"
                  >
                    <input
                      type="text"
                      placeholder="e.g., Code API endpoint, stretch, read..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      autoFocus
                    />

                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        {(['easy', 'medium', 'hard', 'complex'] as TaskCategory[]).map((cat) => {
                          const cfg = CATEGORY_CONFIG[cat];
                          const isSelected = newTaskCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setNewTaskCategory(cat)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? `${cfg.badge} border-amber-400 font-black shadow`
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {cfg.icon} {cfg.label}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="submit"
                        disabled={!newTaskTitle.trim()}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-md"
                      >
                        Add
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Category Filter Chips */}
              <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                <button
                  onClick={() => {
                    setActiveFilter('all');
                    sound.playClick();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({tasks.length})
                </button>
                {(['easy', 'medium', 'hard', 'complex'] as TaskCategory[]).map((cat) => {
                  const count = tasks.filter((t) => t.category === cat).length;
                  const cfg = CATEGORY_CONFIG[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setActiveFilter(cat);
                        sound.playClick();
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                        activeFilter === cat
                          ? `${cfg.badge} border-amber-400 shadow-md`
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {cfg.icon} {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Task List */}
              <div className="flex-1 overflow-y-auto max-h-[380px] p-3 space-y-2 custom-scrollbar">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    <Coffee className="mx-auto mb-2 opacity-40" size={24} />
                    No tasks in this category. Click + to add one!
                  </div>
                ) : (
                  filteredTasks.map((t) => {
                    const cfg = CATEGORY_CONFIG[t.category];
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleComplete(t.id)}
                        className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                          t.completed
                            ? 'bg-slate-950/50 border-slate-800/80 opacity-60'
                            : `${cfg.bg} ${cfg.border} hover:border-slate-500 shadow-sm`
                        }`}
                      >
                        {/* Checkbox Icon */}
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center mt-0.5 transition-all ${
                            t.completed
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'border-2 border-slate-600 group-hover:border-amber-400'
                          }`}
                        >
                          {t.completed && <Check size={13} strokeWidth={3} />}
                        </div>

                        {/* Task Title & Tags */}
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-xs font-bold leading-tight ${
                              t.completed ? 'line-through text-slate-500' : 'text-slate-200'
                            }`}
                          >
                            {t.title}
                          </div>

                          {/* Stat Cost/Reward Indicators */}
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${cfg.badge}`}
                            >
                              {cfg.icon} {cfg.label}
                            </span>
                            <span className="text-amber-400 font-semibold">
                              ⚡ -{cfg.energyCost}%
                            </span>
                            <span className="text-rose-400 font-semibold">
                              💖 +{cfg.happinessGain}%
                            </span>
                            <span className="text-indigo-300">🌟 +{cfg.xpGain} XP</span>
                            <span className="text-amber-300">🪙 +{cfg.coinsGain}</span>
                          </div>
                        </div>

                        {/* Delete Custom Task button */}
                        {t.isCustom && (
                          <button
                            onClick={(e) => handleDeleteTask(t.id, e)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete task"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Taskbar Bottom Summary Footer */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{completedCount} Done</span>
                  <span>•</span>
                  <span>{pendingCount} Remaining</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Keep your pet active & happy!
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimized Dock Button with Pet Avatar */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            sound.playClick();
          }}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 rounded-2xl shadow-xl shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all font-black text-xs border border-amber-300/40 cursor-pointer"
        >
          {pet && (
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <PetSVG
                type={pet.pet_type}
                stage={pet.stage}
                state={currentMoodState}
                equipped={pet.equipped_items}
                size={22}
              />
            </div>
          )}
          <span className="tracking-wide">TASKBAR</span>
          <span className="bg-slate-950/80 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-mono">
            {pendingCount}
          </span>
          {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>
    </>
  );
}
