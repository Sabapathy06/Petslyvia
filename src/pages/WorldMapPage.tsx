import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Compass, Bug, Building2, ShoppingBag,
  Sparkles, Users, Code2, Lock, ArrowRight, Star, Bot, Zap, Map
} from 'lucide-react';
import { useGameData } from '@/hooks/useGameData';
import { AILevelGeneratorModal } from '@/components/AILevelGeneratorModal';
import { PetSVG } from '@/components/PetSVG';
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
  bgLight: string;
  unlockLevel: number;
  stageTag: string;
}

const WORLD_REGIONS: WorldRegion[] = [
  {
    id: 'logic_forest',
    name: 'Logic Forest',
    tagline: 'Pathways & Sequences',
    description: 'Guide your pet through crystal glades, discover secret code, and master Repeat loops.',
    path: '/app/forest',
    icon: Compass,
    themeColor: '#2d6a4f',
    bgLight: 'bg-[#eaf2ec]',
    unlockLevel: 1,
    stageTag: 'Stage 1: Whispering Woods',
  },
  {
    id: 'pet_home',
    name: 'Pet Sanctuary',
    tagline: 'Companion Haven',
    description: 'Rest, feed, play, and equip custom cosmetic wardrobe items on your pet.',
    path: '/app/sanctuary',
    icon: Home,
    themeColor: '#d97706',
    bgLight: 'bg-[#fef3c7]',
    unlockLevel: 1,
    stageTag: 'Stage 2: Companion',
  },
  {
    id: 'coding_lab',
    name: 'Coding Lab',
    tagline: 'Real Python / JS Runtime',
    description: 'Transition from visual blocks to real production syntax with sandboxed execution.',
    path: '/app/lab',
    icon: Code2,
    themeColor: '#4f46e5',
    bgLight: 'bg-[#e0e7ff]',
    unlockLevel: 1,
    stageTag: 'Stage 3: Forest of Logic',
  },
  {
    id: 'bug_dungeon',
    name: 'Bug Dungeon',
    tagline: 'Break & Fix Arena',
    description: 'Inspect glitched movement sequences, identify flawed instructions, and fix the world.',
    path: '/app/dungeon',
    icon: Bug,
    themeColor: '#e11d48',
    bgLight: 'bg-[#ffe4e6]',
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
    themeColor: '#0284c7',
    bgLight: 'bg-[#e0f2fe]',
    unlockLevel: 3,
    stageTag: 'Stage 5: Alter Systems',
  },
  {
    id: 'creator_world',
    name: 'Creator World',
    tagline: 'Visual Level Designer',
    description: 'Build your own custom grid puzzles or craft intentional bugs to test other players worldwide.',
    path: '/app/creator',
    icon: Sparkles,
    themeColor: '#7c3aed',
    bgLight: 'bg-[#ede9fe]',
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
    themeColor: '#db2777',
    bgLight: 'bg-[#fce7f3]',
    unlockLevel: 2,
    stageTag: 'Multiplayer',
  },
  {
    id: 'shop',
    name: 'Cosmetic Bazaar',
    tagline: 'Pet Wardrobe & Styles',
    description: 'Spend your earned adventure coins on Hats, Glasses, Capes, Suits, and Ninja Cloaks.',
    path: '/app/shop',
    icon: ShoppingBag,
    themeColor: '#059669',
    bgLight: 'bg-[#d1fae5]',
    unlockLevel: 1,
    stageTag: 'Customization',
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
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* World Map Hero Header */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-white border border-[#e2ece5] overflow-hidden shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eaf2ec] border border-[#d8e5dc] rounded-full text-xs font-bold text-[#1b382b] mb-3">
            <Star size={13} className="fill-amber-400 text-amber-500" /> Welcome back, {profile?.display_name || 'Explorer'}!
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1b382b] tracking-tight">
            The World of <span className="text-[#2d6a4f]">petslyvia.</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5b7566] mt-2 leading-relaxed font-medium">
            Explore diverse logic sectors, unlock real code superpowers, and raise <strong className="text-[#1b382b]">{pet?.pet_name || 'your pet'}</strong> from an Infant to a Grandmaster!
          </p>
        </div>

        {/* Pet Companion Greeting Card */}
        {pet && (
          <div
            onClick={() => sound.playPet()}
            className="relative z-10 bg-[#f4f8f5] p-3.5 rounded-2xl border border-[#d8e5dc] flex items-center gap-3.5 shadow-soft shrink-0 max-w-sm cursor-pointer hover:border-[#2d6a4f] transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-[#d8e5dc] flex items-center justify-center shrink-0 shadow-sm">
              <PetSVG type={pet.pet_type} stage={pet.stage} state="happy" equipped={pet.equipped_items} size={46} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#2d6a4f] uppercase tracking-wider block">
                🐾 {pet.pet_name} whispers:
              </span>
              <p className="text-xs text-[#1b382b] italic mt-0.5 font-medium">
                "Where should we explore today? I'm ready to learn!"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Infinite Stage Architect Portal Card */}
      <div className="p-6 rounded-3xl bg-white border border-[#e2ece5] shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-[#eaf2ec] border border-[#d8e5dc] flex items-center justify-center shadow-soft shrink-0">
            <Bot size={24} className="text-[#2d6a4f]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2d6a4f] bg-[#eaf2ec] border border-[#d5e3da] px-2 py-0.5 rounded-full">
                AI Procedural Engine
              </span>
              <span className="text-xs font-semibold text-[#5b7566] flex items-center gap-1">
                ✓ 100% Solvable Logic
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[#1b382b] mt-1">
              AI Level Architect
            </h2>
            <p className="text-xs text-[#5b7566] mt-1 max-w-xl leading-relaxed">
              Generate infinite custom 3D logic puzzles with tailored difficulties, themes, laser barriers, and energy crystals on demand.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            setShowAiModal(true);
          }}
          className="px-5 py-3 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-bold text-xs rounded-2xl shadow-soft flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Sparkles size={14} className="text-[#a7f3d0]" />
          <span>Launch AI Architect</span>
        </button>
      </div>

      {/* World Regions Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-extrabold text-[#1b382b] flex items-center gap-2">
            <Map size={16} className="text-[#2d6a4f]" />
            <span>Exploration Regions</span>
          </h2>
          <span className="text-xs text-[#7a9386] font-medium">
            Your Level: {userLevel}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {WORLD_REGIONS.map((region) => {
            const isUnlocked = userLevel >= region.unlockLevel;
            const Icon = region.icon;

            return (
              <motion.div
                key={region.id}
                whileHover={isUnlocked ? { y: -3 } : {}}
                className={`rounded-3xl p-5 border flex flex-col justify-between transition-all relative overflow-hidden bg-white ${
                  isUnlocked
                    ? 'border-[#e2ece5] hover:border-[#2d6a4f] shadow-soft'
                    : 'border-[#e2ece5] opacity-60 bg-[#f8faf8]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${region.bgLight}`}>
                      <Icon size={20} style={{ color: region.themeColor }} />
                    </div>
                    <span className="text-[10px] font-bold text-[#5b7566] px-2 py-0.5 rounded-full bg-[#f4f8f5] border border-[#e2ece5]">
                      {region.stageTag}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-[#1b382b]">
                    {region.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-[#7a9386] mb-1">
                    {region.tagline}
                  </p>
                  <p className="text-xs text-[#5b7566] leading-relaxed">
                    {region.description}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-[#f0f5f1] flex items-center justify-between">
                  {isUnlocked ? (
                    <Link
                      to={region.path}
                      onClick={() => sound.playClick()}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2d6a4f] hover:underline"
                    >
                      <span>Explore</span>
                      <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7a9386]">
                      <Lock size={12} />
                      <span>Unlocks at Lv.{region.unlockLevel}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* AI Level Modal */}
      <AILevelGeneratorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onLaunchLevel={handleLaunchAiLevel}
      />
    </div>
  );
}
