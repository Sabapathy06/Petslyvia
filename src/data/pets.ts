import type { PetType, PetState } from '@/types/database';

export interface PetConfig {
  type: PetType;
  name: string;
  emoji: string;
  personality: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bgFrom: string;
    bgTo: string;
  };
}

export const PET_CONFIGS: Record<PetType, PetConfig> = {
  cat: {
    type: 'cat',
    name: 'Cat',
    emoji: '🐱',
    personality: 'Calm, independent, encouraging',
    description: 'A composed companion who celebrates quiet, steady progress.',
    colors: { primary: '#8b5cf6', secondary: '#a78bfa', accent: '#c4b5fd', bgFrom: '#faf5ff', bgTo: '#ede9fe' },
  },
  dog: {
    type: 'dog',
    name: 'Dog',
    emoji: '🐶',
    personality: 'Energetic, cheerful, highly motivational',
    description: 'Always excited to see you work. The ultimate hype companion.',
    colors: { primary: '#f59e0b', secondary: '#fbbf24', accent: '#fcd34d', bgFrom: '#fffbeb', bgTo: '#fef3c7' },
  },
  bunny: {
    type: 'bunny',
    name: 'Bunny',
    emoji: '🐰',
    personality: 'Friendly, positive, gentle',
    description: 'A soft, encouraging presence that loves small wins.',
    colors: { primary: '#ec4899', secondary: '#f472b6', accent: '#f9a8d4', bgFrom: '#fdf2f8', bgTo: '#fce7f3' },
  },
  fox: {
    type: 'fox',
    name: 'Fox',
    emoji: '🦊',
    personality: 'Clever, strategic, goal-oriented',
    description: 'A sharp thinker who rewards planning and deep focus.',
    colors: { primary: '#ea580c', secondary: '#f97316', accent: '#fdba74', bgFrom: '#fff7ed', bgTo: '#ffedd5' },
  },
  panda: {
    type: 'panda',
    name: 'Panda',
    emoji: '🐼',
    personality: 'Calm, relaxed, balance-focused',
    description: 'Believes in sustainable pace and balanced days.',
    colors: { primary: '#0d9488', secondary: '#14b8a6', accent: '#5eead4', bgFrom: '#f0fdfa', bgTo: '#ccfbf1' },
  },
  koala: {
    type: 'koala',
    name: 'Koala',
    emoji: '🐨',
    personality: 'Recovery-focused, gentle, anti-burnout',
    description: 'Champions rest and recovery as part of productivity.',
    colors: { primary: '#2563eb', secondary: '#3b82f6', accent: '#93c5fd', bgFrom: '#eff6ff', bgTo: '#dbeafe' },
  },
  hamster: {
    type: 'hamster',
    name: 'Hamster',
    emoji: '🐹',
    personality: 'Busy, eager, task-loving',
    description: 'Loves ticking off tasks and keeping momentum going.',
    colors: { primary: '#d97706', secondary: '#f59e0b', accent: '#fcd34d', bgFrom: '#fffbeb', bgTo: '#fef3c7' },
  },
  penguin: {
    type: 'penguin',
    name: 'Penguin',
    emoji: '🐧',
    personality: 'Determined, steady, focused',
    description: 'Marches forward no matter what. Loves consistency.',
    colors: { primary: '#1d4ed8', secondary: '#2563eb', accent: '#60a5fa', bgFrom: '#eff6ff', bgTo: '#dbeafe' },
  },
};

export const PET_LIST = Object.values(PET_CONFIGS);

export interface StateInfo {
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export const PET_STATE_INFO: Record<PetState, StateInfo> = {
  energetic: { label: 'Energetic', emoji: '⚡', color: '#f59e0b', description: 'Bursting with energy from your productivity!' },
  happy: { label: 'Happy', emoji: '😊', color: '#22c55e', description: 'In a great mood from your solid progress.' },
  focused: { label: 'Focused', emoji: '🎯', color: '#3b82f6', description: 'Locked in with you during deep work.' },
  excited: { label: 'Excited', emoji: '🤩', color: '#ec4899', description: 'Thrilled by your excellent productivity!' },
  calm: { label: 'Calm', emoji: '😌', color: '#14b8a6', description: 'Relaxed from a steady, balanced day.' },
  neutral: { label: 'Neutral', emoji: '🙂', color: '#64748b', description: 'A few tasks done. Keep going!' },
  tired: { label: 'Tired', emoji: '😮‍💨', color: '#f97316', description: 'Heavy workload lately. Time for a break.' },
  sleepy: { label: 'Sleepy', emoji: '😴', color: '#8b5cf6', description: 'Low activity today. A small task will help.' },
  recovering: { label: 'Recovering', emoji: '🌿', color: '#10b981', description: 'Recovering nicely thanks to healthy breaks.' },
  thinking: { label: 'Thinking', emoji: '🤔', color: '#6366f1', description: 'Pondering your next algorithmic move.' },
};

export function getPetConfig(type: PetType): PetConfig {
  return PET_CONFIGS[type] ?? PET_CONFIGS.cat;
}
