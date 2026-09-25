import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Heart, Zap, Sparkles, ShoppingBag, ShieldCheck,
  Award, Shirt, Compass, Smile, Flame, Box
} from 'lucide-react';
import { useGameData } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { PetSanctuary3D } from '@/components/game3d/PetSanctuary3D';
import { ACCESSORIES_CATALOG, getAccessoryById } from '@/data/accessories';
import type { EquippedAccessories } from '@/types/game';
import { sound } from '@/utils/audio';

export function PetHomePage() {
  const { pet, profile, inventory, equipAccessory, unequipAccessory, petAction } = useGameData();
  const [activeTab, setActiveTab] = useState<'care' | 'wardrobe' | 'evolution'>('care');
  const [viewMode3D, setViewMode3D] = useState<boolean>(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const [activeActionTrigger, setActiveActionTrigger] = useState<'feed' | 'pet' | 'rest' | null>(null);

  if (!pet) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading Pet Sanctuary...
      </div>
    );
  }

  const handleAction = async (action: 'feed' | 'pet' | 'rest') => {
    setActiveActionTrigger(action);
    if (action === 'feed') {
      sound.playEat();
      setActionFeedback('Yum! Energy restored (+20)');
    } else if (action === 'pet') {
      sound.playPet();
      setActionFeedback('Purr! Happiness boosted (+15)');
    } else if (action === 'rest') {
      sound.playSleep();
      setActionFeedback('Zzz... Energy fully recharged (100)');
    }
    await petAction(action);
    setTimeout(() => {
      setActionFeedback(null);
      setActiveActionTrigger(null);
    }, 3000);
  };

  const handleEquipToggle = async (accessoryId: string, category: keyof EquippedAccessories) => {
    const isCurrentlyEquipped = pet.equipped_items?.[category] === accessoryId;
    if (isCurrentlyEquipped) {
      await unequipAccessory(category);
    } else {
      await equipAccessory(accessoryId, category);
    }
  };

  // Owned accessories filtered from inventory
  const ownedAccessories = inventory
    .map((inv) => getAccessoryById(inv.item_id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const STAGE_REQUIREMENTS = {
    infant: { next: 'child', minLevel: 3, abilities: ['Runner (Sequence Actions)'] },
    child: { next: 'teen', minLevel: 5, abilities: ['Runner', 'Repeat (Loops)', 'Bug Sense (Inspect Logic)'] },
    teen: { next: 'adult', minLevel: 8, abilities: ['Runner', 'Repeat', 'Bug Sense', 'Smart Path', 'Combo Mastery'] },
    adult: { next: 'max', minLevel: 10, abilities: ['All Master Abilities Unlocked'] },
  };

  const currentStageInfo = STAGE_REQUIREMENTS[pet.stage || 'infant'];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-300 mb-2">
            <Sparkles size={13} /> Pet Sanctuary & Wardrobe
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {pet.pet_name}'s Cozy Grove
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Life Stage: <strong className="capitalize text-amber-300">{pet.stage}</strong> · Level {pet.level} Companion
          </p>
        </div>

        <Link
          to="/app/shop"
          onClick={() => sound.playClick()}
          className="px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-pink-600/20 flex items-center gap-2 transition-all"
        >
          <ShoppingBag size={16} /> Visit Bazaar Shop
        </Link>
      </div>

      {/* Main Sanctuary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive 3D / 2D Pet Stage */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-5 border border-slate-800 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden space-y-4">
          {/* Action floating toast & 3D switch */}
          <div className="w-full flex items-center justify-between z-20">
            {actionFeedback ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full"
              >
                {actionFeedback}
              </motion.div>
            ) : <div />}

            <button
              onClick={() => {
                sound.playClick();
                setViewMode3D((prev) => !prev);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode3D
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Box size={13} />
              {viewMode3D ? '3D Playground' : '2D Avatar'}
            </button>
          </div>

          {/* 3D Sanctuary Playground or 2D SVG Avatar */}
          {viewMode3D ? (
            <PetSanctuary3D
              type={pet.pet_type}
              stage={pet.stage}
              state={pet.productivity_state}
              equipped={pet.equipped_items}
              onPetClick={() => handleAction('pet')}
              onFeedClick={() => handleAction('feed')}
              onRestClick={() => handleAction('rest')}
              actionTrigger={activeActionTrigger}
              height="290px"
            />
          ) : (
            <div className="relative my-4 flex items-center justify-center min-h-[260px]">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-orange-500/10 to-indigo-500/20 rounded-full blur-2xl" />
              <PetSVG
                type={pet.pet_type}
                stage={pet.stage}
                state={activeActionTrigger === 'rest' ? 'sleepy' : pet.productivity_state}
                equipped={pet.equipped_items}
                size={230}
                reaction={
                  activeActionTrigger === 'feed'
                    ? { config: { expression: 'eat', label: 'Eating', icon: '🍎', sound: 'crystal', duration: 2 }, id: Date.now() }
                    : activeActionTrigger === 'pet'
                    ? { config: { expression: 'love', label: 'Purring', icon: '💖', sound: 'step', duration: 2 }, id: Date.now() }
                    : activeActionTrigger === 'rest'
                    ? { config: { expression: 'rest', label: 'Sleeping', icon: '💤', sound: 'click', duration: 2 }, id: Date.now() }
                    : null
                }
              />
            </div>
          )}

          {/* Vitals Bar */}
          <div className="w-full space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1 text-amber-400">
                  <Zap size={14} /> Energy
                </span>
                <span className="font-mono text-white">{pet.energy} / 100</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${pet.energy}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1 text-rose-400">
                  <Heart size={14} /> Happiness
                </span>
                <span className="font-mono text-white">{pet.happiness} / 100</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-400 to-pink-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${pet.happiness}%` }}
                />
              </div>
            </div>
          </div>

          {/* Care Action Buttons */}
          <div className="grid grid-cols-3 gap-2 w-full mt-4">
            <button
              onClick={() => handleAction('feed')}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 flex flex-col items-center gap-1 transition-all"
            >
              <span>🍎</span> Feed Pet
            </button>
            <button
              onClick={() => handleAction('pet')}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs rounded-xl border border-slate-700 flex flex-col items-center gap-1 transition-all"
            >
              <span>💖</span> Pet Pet
            </button>
            <button
              onClick={() => handleAction('rest')}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-xl border border-slate-700 flex flex-col items-center gap-1 transition-all"
            >
              <span>🌙</span> Rest Grove
            </button>
          </div>
        </div>

        {/* Right Column: Tabbed Modules (Wardrobe, Evolution, Abilities) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 gap-2">
            <button
              onClick={() => {
                setActiveTab('care');
                sound.playClick();
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'care'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smile size={15} /> Companion Care
            </button>
            <button
              onClick={() => {
                setActiveTab('wardrobe');
                sound.playClick();
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'wardrobe'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shirt size={15} /> Wardrobe ({ownedAccessories.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('evolution');
                sound.playClick();
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'evolution'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame size={15} /> Evolution & Skills
            </button>
          </div>

          {/* TAB 1: CARE & PERSONALITY */}
          {activeTab === 'care' && (
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Smile className="text-amber-400" size={18} /> Personality & Growth Notes
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                "{pet.personality || 'A composed companion who celebrates quiet, steady progress in logic and exploration.'}"
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Adventure XP</span>
                  <p className="text-lg font-black text-amber-400 mt-1">{pet.xp} XP</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Earned from mission completions</p>
                </div>
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Active State</span>
                  <p className="text-lg font-black text-emerald-400 capitalize mt-1">{pet.productivity_state}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ready for adventure</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WARDROBE & EQUIPPING ACCESSORIES */}
          {activeTab === 'wardrobe' && (
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Shirt className="text-amber-400" size={18} /> Equipped Cosmetics
                  </h3>
                  <p className="text-xs text-slate-400">Click any owned item to equip or unequip instantly.</p>
                </div>
                <Link
                  to="/app/shop"
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 underline"
                >
                  Buy More in Shop →
                </Link>
              </div>

              {ownedAccessories.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-3">
                  <div className="text-4xl">🧢</div>
                  <p className="text-xs text-slate-400 font-semibold">
                    You have not purchased any accessories yet!
                  </p>
                  <Link
                    to="/app/shop"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl"
                  >
                    Open Bazaar Shop (Balance: {profile?.coins ?? 100} Coins)
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ownedAccessories.map((item) => {
                    const isEquipped = pet.equipped_items?.[item.category] === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                          isEquipped
                            ? 'bg-amber-500/10 border-amber-400 shadow-lg shadow-amber-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <p className="text-xs font-extrabold text-white">{item.name}</p>
                            <span className="text-[10px] text-slate-400 capitalize">{item.category} item</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleEquipToggle(item.id, item.category)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isEquipped
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                              : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                          }`}
                        >
                          {isEquipped ? 'Unequip' : 'Equip'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EVOLUTION & DEMONSTRATED SKILLS */}
          {activeTab === 'evolution' && (
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Flame className="text-amber-400" size={18} /> Evolution Pathway
              </h3>
              <p className="text-xs text-slate-400">
                In Petslyvia, pet evolution is tied directly to demonstrated problem-solving skills!
              </p>

              <div className="space-y-3">
                {/* Stage 1: Infant */}
                <div
                  className={`p-4 rounded-2xl border ${
                    pet.stage === 'infant'
                      ? 'bg-amber-500/10 border-amber-400'
                      : 'bg-slate-950/50 border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-white">🌱 Stage 1: Infant Companion</span>
                    <span className="text-[10px] font-bold text-amber-400">Levels 1 - 2</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Learns directional navigation and sequential actions. Unlocks: <strong>Runner Ability</strong>.
                  </p>
                </div>

                {/* Stage 2: Child */}
                <div
                  className={`p-4 rounded-2xl border ${
                    pet.stage === 'child'
                      ? 'bg-emerald-500/10 border-emerald-400'
                      : 'bg-slate-950/50 border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-white">🌿 Stage 2: Child Adventurer</span>
                    <span className="text-[10px] font-bold text-emerald-400">Levels 3 - 4</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Masters Repeat loops and basic debugging. Unlocks: <strong>Repeat Ability & Bug Sense</strong>.
                  </p>
                </div>

                {/* Stage 3: Teen */}
                <div
                  className={`p-4 rounded-2xl border ${
                    pet.stage === 'teen'
                      ? 'bg-indigo-500/10 border-indigo-400'
                      : 'bg-slate-950/50 border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-white">⚡ Stage 3: Teen Pathfinder</span>
                    <span className="text-[10px] font-bold text-indigo-400">Levels 5 - 6</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Solves complex multi-step systems and conditionals. Unlocks: <strong>Smart Path & Arcane Crest</strong>.
                  </p>
                </div>

                {/* Stage 4: Adult */}
                <div
                  className={`p-4 rounded-2xl border ${
                    pet.stage === 'adult'
                      ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/50 border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-amber-300">👑 Stage 4: Adult Celestial Master</span>
                    <span className="text-[10px] font-bold text-amber-400">Levels 7+</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Achieves complete logic synthesis. Unlocks: <strong>Astral Wings, Rune Halo & Master Coding Sandbox</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
