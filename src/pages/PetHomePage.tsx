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
      <div className="p-8 text-center text-[#5b7566]">
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

  // Time of day greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-[#e2ece5] shadow-card relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eaf2ec] border border-[#d8e5dc] rounded-full text-xs font-bold text-[#2d6a4f] mb-2">
            <Sparkles size={13} /> {timeGreeting}, {profile?.display_name || 'Player'}! 🏡
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1b382b]">
            {pet.pet_name}'s Cozy Sanctuary
          </h1>
          <p className="text-xs sm:text-sm text-[#5b7566] mt-1 max-w-xl">
            {pet.pet_name} is an adorable <strong className="capitalize text-[#1b382b]">{pet.stage} {pet.pet_type}</strong> (Level {pet.level}). Care for your companion and dress them in unique cosmetic styles!
          </p>
        </div>

        <Link
          to="/app/forest"
          className="px-5 py-3 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-bold text-xs rounded-2xl shadow-soft flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Compass size={16} />
          <span>Go on Adventure</span>
        </Link>
      </div>

      {/* Main Sanctuary Stage: 3D / 2D Pet Hub (Left) + Actions/Wardrobe (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 3D Sanctuary Diorama */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1b382b]">Companion Grove</span>
              <span className="text-[10px] bg-[#eaf2ec] text-[#2d6a4f] px-2 py-0.5 rounded-full font-bold uppercase">
                {pet.productivity_state}
              </span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setViewMode3D(!viewMode3D);
              }}
              className="px-3 py-1 bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#d8e5dc] rounded-xl text-xs font-bold text-[#1b382b] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Box size={13} className="text-[#5b7566]" />
              <span>{viewMode3D ? '3D Diorama' : '2D View'}</span>
            </button>
          </div>

          {/* 3D Viewport or 2D Vector display */}
          <div className="rounded-2xl overflow-hidden relative border border-[#d8e5dc] bg-[#dce8e0] min-h-[380px] flex items-center justify-center">
            {viewMode3D ? (
              <PetSanctuary3D
                type={pet.pet_type}
                state={pet.productivity_state}
                stage={pet.stage}
                equipped={pet.equipped_items}
                actionTrigger={activeActionTrigger}
                onPetClick={() => handleAction('pet')}
                onFeedClick={() => handleAction('feed')}
                onRestClick={() => handleAction('rest')}
                height="380px"
              />
            ) : (
              <div className="p-8 flex flex-col items-center justify-center">
                <PetSVG
                  type={pet.pet_type}
                  stage={pet.stage}
                  state={pet.productivity_state}
                  equipped={pet.equipped_items}
                  size={180}
                />
              </div>
            )}

            {/* Floating Toast Notification */}
            {actionFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 inset-x-0 mx-auto w-max px-4 py-2 bg-white/95 backdrop-blur-md border border-[#c8dad0] text-[#1b382b] text-xs font-bold rounded-full shadow-card flex items-center gap-2 z-20"
              >
                <Sparkles size={14} className="text-[#2d6a4f]" />
                <span>{actionFeedback}</span>
              </motion.div>
            )}
          </div>

          {/* Pet Vital Status Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-[#f8faf8] border border-[#e2ece5] rounded-2xl">
              <div className="flex items-center justify-between text-xs font-bold text-[#1b382b] mb-1">
                <span className="flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-500" /> Energy
                </span>
                <span className="font-mono text-[11px]">{pet.energy} / 100</span>
              </div>
              <div className="w-full h-2 bg-[#e2ece5] rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${pet.energy}%` }}
                />
              </div>
            </div>

            <div className="p-3 bg-[#f8faf8] border border-[#e2ece5] rounded-2xl">
              <div className="flex items-center justify-between text-xs font-bold text-[#1b382b] mb-1">
                <span className="flex items-center gap-1.5">
                  <Heart size={13} className="text-rose-500" /> Happiness
                </span>
                <span className="font-mono text-[11px]">{pet.happiness} / 100</span>
              </div>
              <div className="w-full h-2 bg-[#e2ece5] rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${pet.happiness}%` }}
                />
              </div>
            </div>

            <div className="p-3 bg-[#f8faf8] border border-[#e2ece5] rounded-2xl col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#1b382b] mb-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#2d6a4f]" /> Level {pet.level}
                </span>
                <span className="font-mono text-[11px] text-[#5b7566] capitalize">{pet.stage}</span>
              </div>
              <div className="w-full h-2 bg-[#e2ece5] rounded-full overflow-hidden">
                <div
                  className="bg-[#2d6a4f] h-full rounded-full transition-all duration-500"
                  style={{ width: `${(profile?.total_xp || 50) % 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Care Actions & Wardrobe Styling Panel */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card flex flex-col justify-between space-y-5">
          {/* Tab Selection */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f4f8f5] rounded-2xl border border-[#d8e5dc]">
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('care');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'care'
                  ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                  : 'text-[#5b7566] hover:text-[#1b382b]'
              }`}
            >
              💖 Care
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('wardrobe');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'wardrobe'
                  ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                  : 'text-[#5b7566] hover:text-[#1b382b]'
              }`}
            >
              👔 Wardrobe
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('evolution');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'evolution'
                  ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                  : 'text-[#5b7566] hover:text-[#1b382b]'
              }`}
            >
              🌟 Evolution
            </button>
          </div>

          {/* TAB 1: CARE ACTIONS */}
          {activeTab === 'care' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-[#1b382b]">Daily Companion Care</h3>
                <p className="text-xs text-[#5b7566]">
                  Interact with {pet.pet_name} to maintain peak productivity & morale:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => handleAction('feed')}
                  className="p-3.5 bg-[#f8faf8] hover:bg-[#eaf2ec] border border-[#e2ece5] hover:border-[#2d6a4f] rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🍎</span>
                    <div>
                      <span className="text-xs font-bold text-[#1b382b] block">Feed Snack</span>
                      <span className="text-[11px] text-[#5b7566]">+20 Energy points</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#2d6a4f]">Feed →</span>
                </button>

                <button
                  onClick={() => handleAction('pet')}
                  className="p-3.5 bg-[#f8faf8] hover:bg-[#eaf2ec] border border-[#e2ece5] hover:border-[#2d6a4f] rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🐾</span>
                    <div>
                      <span className="text-xs font-bold text-[#1b382b] block">Pet & Cuddle</span>
                      <span className="text-[11px] text-[#5b7566]">+15 Happiness points</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#2d6a4f]">Pet →</span>
                </button>

                <button
                  onClick={() => handleAction('rest')}
                  className="p-3.5 bg-[#f8faf8] hover:bg-[#eaf2ec] border border-[#e2ece5] hover:border-[#2d6a4f] rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">💤</span>
                    <div>
                      <span className="text-xs font-bold text-[#1b382b] block">Rest in Cozy Bed</span>
                      <span className="text-[11px] text-[#5b7566]">Full energy refill</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#2d6a4f]">Rest →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WARDROBE & COSMETICS */}
          {activeTab === 'wardrobe' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1b382b]">Dressing Room</h3>
                  <p className="text-xs text-[#5b7566]">Equip styles from your collection:</p>
                </div>
                <Link
                  to="/app/shop"
                  className="text-xs font-bold text-[#2d6a4f] hover:underline flex items-center gap-1"
                >
                  <ShoppingBag size={13} />
                  <span>Bazaar</span>
                </Link>
              </div>

              {ownedAccessories.length === 0 ? (
                <div className="p-6 bg-[#f8faf8] border border-[#e2ece5] rounded-2xl text-center space-y-2">
                  <span className="text-2xl">🛍️</span>
                  <p className="text-xs font-semibold text-[#5b7566]">
                    No cosmetic accessories owned yet!
                  </p>
                  <Link
                    to="/app/shop"
                    className="inline-block px-3 py-1.5 bg-[#2d6a4f] text-white text-xs font-bold rounded-xl shadow-soft"
                  >
                    Visit Cosmetic Bazaar
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                  {ownedAccessories.map((acc) => {
                    const isEquipped = pet.equipped_items?.[acc.category] === acc.id;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => handleEquipToggle(acc.id, acc.category)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-sm ${
                          isEquipped
                            ? 'bg-[#eaf2ec] border-[#2d6a4f] text-[#1b382b]'
                            : 'bg-[#f8faf8] border-[#e2ece5] hover:border-[#c8dad0]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{acc.icon}</span>
                          <span className="text-[9px] font-bold uppercase text-[#7a9386]">
                            {acc.category}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className="text-xs font-bold block truncate">{acc.name}</span>
                          <span className="text-[10px] text-[#2d6a4f] font-semibold block mt-0.5">
                            {isEquipped ? '✓ Equipped' : 'Click to Equip'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EVOLUTION PATH */}
          {activeTab === 'evolution' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-[#1b382b]">Growth & Abilities</h3>
                <p className="text-xs text-[#5b7566]">
                  Current Stage: <strong className="capitalize text-[#1b382b]">{pet.stage}</strong> (Level {pet.level})
                </p>
              </div>

              <div className="space-y-2">
                {Object.entries(STAGE_REQUIREMENTS).map(([stg, info]) => {
                  const isUnlocked = pet.level >= info.minLevel;
                  const isCurrent = pet.stage === stg;

                  return (
                    <div
                      key={stg}
                      className={`p-3 rounded-2xl border text-xs transition-all ${
                        isCurrent
                          ? 'bg-[#eaf2ec] border-[#2d6a4f] text-[#1b382b] font-bold shadow-sm'
                          : isUnlocked
                          ? 'bg-[#f8faf8] border-[#e2ece5] text-[#5b7566]'
                          : 'bg-[#f8faf8] border-[#e2ece5] opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="capitalize font-black flex items-center gap-1.5">
                          {isCurrent ? '🌟' : isUnlocked ? '✓' : '🔒'} {stg} Form
                        </span>
                        <span className="text-[10px] font-mono">Req Lv.{info.minLevel}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {info.abilities.map((ab, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-white border border-[#d8e5dc] text-[#5b7566] px-1.5 py-0.5 rounded-md"
                          >
                            {ab}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
