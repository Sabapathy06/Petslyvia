import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Compass, Bug, Building2, ShoppingBag,
  Sparkles, Users, Code2, Lock, ArrowRight, Star, Bot, Zap
} from 'lucide-react';
import { useGameData } from '@/hooks/useGameData';
import { AILevelGeneratorModal } from '@/components/AILevelGeneratorModal';
import type { MissionDefinition } from '@/types/game';
import { sound } from '@/utils/audio';

interface WorldRegion {
  id: string;
  name: string;
  tagline: string;
  description: string;
  path: string;
  icon: typeof Compass;
  themeColor: string;
  bgGradient: string;
  unlockLevel: number;
  stageTag: string;
}

const WORLD_REGIONS: WorldRegion[] = [
  {
    id: 'pet_home',
    name: 'Pet Sanctuary',
    tagline: 'Companion Haven',
    description: 'Rest, feed, play, and equip custom cosmetic wardrobe items on your pet.',
    path: '/app/sanctuary',
    icon: Home,
    themeColor: '#f59e0b',
    bgGradient: 'from-amber-900/40 via-orange-950/40 to-slate-900/90',
    unlockLevel: 1,
    stageTag: 'Stage 1: Play',
  },
  {
    id: 'logic_forest',
    name: 'Logic Forest',
    tagline: 'Pathways & Sequences',
    description: 'Guide your pet through crystal glades, discover secret code, and master Repeat loops.',
    path: '/app/forest',
    icon: Compass,
    themeColor: '#10b981',
    bgGradient: 'from-emerald-900/40 via-teal-950/40 to-slate-900/90',
    unlockLevel: 1,
    stageTag: 'Stage 1 - 3: Discover & Logic',
  },
  {
    id: 'bug_dungeon',
    name: 'Bug Dungeon',
    tagline: 'Break & Fix Arena',
    description: 'Inspect glitched movement sequences, identify flawed instructions, and fix the world.',
    path: '/app/dungeon',
    icon: Bug,
    themeColor: '#f43f5e',
    bgGradient: 'from-rose-900/40 via-pink-950/40 to-slate-900/90',
    unlockLevel: 2,
    stageTag: 'Stage 4: Break & Fix',
  },
  {
    id: 'smart_city',
    name: 'Smart City',
    tagline: 'Autonomous Systems',
    description: 'Automate municipal traffic grids, sensors, and priority routes in a live simulated city.',
    path: '/app/city',
    icon: Building2,
    themeColor: '#0ea5e9',
    bgGradient: 'from-sky-900/40 via-blue-950/40 to-slate-900/90',
    unlockLevel: 3,
    stageTag: 'Stage 5: Alter Systems',
  },
  {
    id: 'shop',
    name: 'Cosmetic Bazaar',
    tagline: 'Pet Wardrobe & Styles',
    description: 'Spend your earned adventure coins on Hats, Glasses, Capes, Suits, and Ninja Cloaks.',
    path: '/app/shop',
    icon: ShoppingBag,
    themeColor: '#d946ef',
    bgGradient: 'from-fuchsia-900/40 via-purple-950/40 to-slate-900/90',
    unlockLevel: 1,
    stageTag: 'Customization',
  },
  {
    id: 'creator_world',
    name: 'Creator World',
    tagline: 'Visual Level Designer',
    description: 'Build your own custom grid puzzles or craft intentional bugs to test other players worldwide.',
    path: '/app/creator',
    icon: Sparkles,
    themeColor: '#8b5cf6',
    bgGradient: 'from-violet-900/40 via-indigo-950/40 to-slate-900/90',
    unlockLevel: 2,
    stageTag: 'Stage 6: Create',
  },
  {
    id: 'challenge_arena',
    name: 'Bug Exchange Hub',
    tagline: 'Multiplayer Puzzles',
    description: 'Solve community bugs, duel fellow players, and climb the collaborative leaderboards.',
    path: '/app/multiplayer',
    icon: Users,
    themeColor: '#ec4899',
    bgGradient: 'from-pink-900/40 via-rose-950/40 to-slate-900/90',
    unlockLevel: 2,
    stageTag: 'Multiplayer',
  },
  {
    id: 'coding_lab',
    name: 'Coding Lab',
    tagline: 'Real Python / JS Runtime',
    description: 'Transition from visual blocks to real production syntax with sandboxed execution.',
    path: '/app/lab',
    icon: Code2,
    themeColor: '#6366f1',
    bgGradient: 'from-indigo-900/40 via-blue-950/40 to-slate-900/90',
    unlockLevel: 4,
    stageTag: 'Stage 7: Real Code',
  },
];

export function WorldMapPage() {
  const { profile, pet } = useGameData();
  const navigate = useNavigate();
  const [showAiModal, setShowAiModal] = useState(false);

  const userLevel = profile?.current_level ?? 1;

  const handleLaunchAiLevel = (lvl: MissionDefinition) => {
    sessionStorage.setItem('petslyvia_active_ai_mission', JSON.stringify(lvl));
    sound.playVictory();
    navigate('/app/forest');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* World Map Hero Header */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300 mb-3">
            <Star size={13} className="fill-amber-400" /> Virtual Adventure Map
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            The Realm of <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400">PETSLYVIA</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Welcome, <strong className="text-white">{profile?.display_name || 'Player'}</strong>! Explore the diverse regions to develop your logic instincts, rescue glitched sectors, and evolve your companion <strong className="text-amber-300">{pet?.pet_name || 'Pet'}</strong> from an Infant into a Master.
          </p>
        </div>
      </div>

      {/* AI Infinite Stage Architect Portal Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-purple-950/70 to-slate-900 border border-indigo-500/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center shadow-xl shadow-indigo-500/30 shrink-0">
            <Bot size={28} className="text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                Infinite Procedural Engine
              </span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                ✓ 100% Guaranteed Solvable
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              AI Level Architect 🚀
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Generate infinite custom 3D logic puzzles with tailored difficulties, themes, laser barriers, and energy crystals on demand.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            setShowAiModal(true);
          }}
          className="relative z-10 px-6 py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          <Sparkles size={18} className="text-amber-300 animate-bounce" />
          Generate AI Mission ✨
        </button>
      </div>

      {/* World Regions Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Compass className="text-amber-400" size={20} /> Unlocked World Sectors
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Player Level: <strong className="text-amber-300">Lv.{userLevel}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {WORLD_REGIONS.map((region, i) => {
            const isUnlocked = userLevel >= region.unlockLevel;
            const Icon = region.icon;

            return (
              <motion.div
                key={region.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                {isUnlocked ? (
                  <Link
                    to={region.path}
                    onClick={() => sound.playClick()}
                    className={`group block h-full p-5 rounded-3xl bg-gradient-to-br ${region.bgGradient} border border-slate-700/60 hover:border-amber-400/60 hover:scale-[1.02] transition-all shadow-xl hover:shadow-2xl relative overflow-hidden`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: `${region.themeColor}20`, color: region.themeColor }}
                      >
                        <Icon size={24} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300">
                        {region.stageTag}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-white group-hover:text-amber-300 transition-colors">
                      {region.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">{region.tagline}</p>
                    <p className="text-xs text-slate-300/80 mt-2 line-clamp-2 leading-relaxed">
                      {region.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300">
                      <span>ENTER ZONE</span>
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ) : (
                  <div className="h-full p-5 rounded-3xl bg-slate-900/40 border border-slate-800/80 relative opacity-60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center">
                          <Lock size={22} />
                        </div>
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-500/20">
                          Unlocks at Lv.{region.unlockLevel}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-400">{region.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{region.description}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800/40 text-[11px] text-slate-500 font-semibold">
                      Requires Level {region.unlockLevel} to explore
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* AI Level Architect Modal */}
      <AILevelGeneratorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onLaunchLevel={handleLaunchAiLevel}
      />
    </div>
  );
}
