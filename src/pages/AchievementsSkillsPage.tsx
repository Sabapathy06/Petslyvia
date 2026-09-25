import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award, Trophy, Zap, Coins, CheckCircle2,
  Sparkles, Brain, Bug, Palette, Code2, Users
} from 'lucide-react';
import { useGameData } from '@/hooks/useGameData';
import { ACHIEVEMENTS_LIST } from '@/data/achievements';
import { sound } from '@/utils/audio';

export function AchievementsSkillsPage() {
  const { profile, pet } = useGameData();

  const skills = profile?.skills || {
    logic: 15,
    debugging: 10,
    creativity: 15,
    coding: 0,
    collaboration: 10,
  };

  const skillMeta = [
    { key: 'logic', name: 'Logic & Sequences', icon: Brain, color: 'from-amber-500 to-orange-500', val: skills.logic },
    { key: 'debugging', name: 'Bug Hunting & Repair', icon: Bug, color: 'from-rose-500 to-pink-500', val: skills.debugging },
    { key: 'creativity', name: 'System Creation', icon: Palette, color: 'from-violet-500 to-purple-500', val: skills.creativity },
    { key: 'coding', name: 'Real Syntax & Code', icon: Code2, color: 'from-indigo-500 to-blue-500', val: skills.coding },
    { key: 'collaboration', name: 'Multiplayer Teamwork', icon: Users, color: 'from-emerald-500 to-teal-500', val: skills.collaboration },
  ];

  // Calculate unlocked achievements count
  const unlockedAchievementsCount = ACHIEVEMENTS_LIST.filter(
    (ach) => (profile?.total_xp ?? 0) >= ach.xp_reward
  ).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="p-6 bg-white rounded-3xl border border-[#e2ece5] shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eaf2ec] border border-[#d3e2d8] rounded-full text-xs font-bold text-[#2d6a4f] mb-2">
            <Trophy size={14} /> Demonstrated Mastery
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1b382b] tracking-tight">
            Player Skills & Achievements
          </h1>
          <p className="text-xs sm:text-sm text-[#5b7566] mt-1 font-medium">
            Skills are earned purely through gameplay problem-solving, not study tests!
          </p>
        </div>

        <div className="flex gap-2 bg-[#f4f8f5] p-3 rounded-2xl border border-[#e2ece5] text-xs font-bold">
          <span className="text-[#2d6a4f] flex items-center gap-1">
            <Zap size={15} /> {profile?.total_xp ?? 50} Total XP
          </span>
          <span className="text-[#c8dad0]">·</span>
          <span className="text-[#1b382b]">Level {profile?.current_level ?? 1}</span>
        </div>
      </div>

      {/* Companion Mentor Bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-3xl bg-white border border-[#e2ece5] shadow-card flex items-center gap-3.5"
      >
        <div className="w-11 h-11 rounded-2xl bg-[#eaf2ec] border border-[#d3e2d8] flex items-center justify-center shrink-0">
          {pet && (
            <PetSVG
              type={pet.pet_type}
              stage={pet.stage}
              state="happy"
              equipped={pet.equipped_items}
              size={40}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#1b382b]">{pet?.pet_name || 'Your Pet'} Pride & Growth</span>
            <span className="text-[10px] bg-[#eaf2ec] text-[#2d6a4f] font-bold px-2 py-0.5 rounded-full border border-[#d3e2d8]">
              {unlockedAchievementsCount} / {ACHIEVEMENTS_LIST.length} Trophies Unlocked
            </span>
          </div>
          <p className="text-xs text-[#5b7566] italic mt-0.5 font-medium">
            "Every puzzle you solve and level you build makes us stronger! Look how far we've journeyed together! 🌟"
          </p>
        </div>
      </motion.div>

      {/* Main Grid: Skills (Left) + Achievements Badges (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 5 Core Skills Bars */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card space-y-5">
          <h3 className="text-base font-extrabold text-[#1b382b] flex items-center gap-2">
            <Brain className="text-[#2d6a4f]" size={18} /> Gameplay Skill Radar
          </h3>

          <div className="space-y-4">
            {skillMeta.map((s) => {
              const Icon = s.icon;

              return (
                <div key={s.key} className="p-3.5 bg-[#f4f8f5] rounded-2xl border border-[#e2ece5] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2 text-[#1b382b]">
                      <Icon size={16} className="text-[#2d6a4f]" />
                      <span>{s.name}</span>
                    </div>
                    <span className="font-mono text-[#2d6a4f]">{s.val} / 100</span>
                  </div>

                  <div className="w-full bg-[#e2ece5] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2d6a4f] transition-all duration-700"
                      style={{ width: `${s.val}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Achievement Badges Collection */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-[#1b382b] flex items-center gap-2">
              <Award className="text-[#2d6a4f]" size={18} /> Trophies & Milestones
            </h3>
            <span className="text-xs text-[#5b7566] font-mono">
              {ACHIEVEMENTS_LIST.length} Total Badges
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
            {ACHIEVEMENTS_LIST.map((ach) => {
              const isUnlocked = (profile?.total_xp ?? 0) >= ach.xp_reward;

              return (
                <div
                  key={ach.id}
                  className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                    isUnlocked
                      ? 'bg-[#f4f8f5] border-[#d3e2d8] shadow-sm'
                      : 'bg-white border-[#e2ece5] opacity-50'
                  }`}
                >
                  <span className="text-3xl p-2 bg-white rounded-xl border border-[#e2ece5] shrink-0 shadow-soft">
                    {ach.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-xs text-[#1b382b]">{ach.name}</h4>
                      {isUnlocked && <CheckCircle2 size={13} className="text-[#2d6a4f]" />}
                    </div>
                    <p className="text-[11px] text-[#5b7566] mt-0.5 leading-relaxed font-medium">
                      {ach.description}
                    </p>
                    <div className="flex gap-2 mt-2 text-[10px] font-bold text-[#2d6a4f]">
                      <span>+{ach.xp_reward} XP</span>
                      <span>+{ach.coin_reward} Coins</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
