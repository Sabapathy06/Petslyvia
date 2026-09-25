import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag, Coins, Sparkles, Check, CheckCircle2,
  Lock, Eye, Shirt, ArrowRight
} from 'lucide-react';
import { useGameData } from '@/hooks/useGameData';
import { ACCESSORIES_CATALOG } from '@/data/accessories';
import { PetSVG } from '@/components/PetSVG';
import type { AccessoryItem, EquippedAccessories } from '@/types/game';
import { sound } from '@/utils/audio';

export function ShopPage() {
  const { profile, pet, inventory, buyAccessory, equipAccessory } = useGameData();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewEquipped, setPreviewEquipped] = useState<EquippedAccessories>(
    pet?.equipped_items || {}
  );
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const categories = ['all', 'head', 'eyes', 'body', 'back', 'feet', 'special'];

  const filteredItems = ACCESSORIES_CATALOG.filter((item) =>
    selectedCategory === 'all' ? true : item.category === selectedCategory
  );

  const isItemOwned = (itemId: string) =>
    inventory.some((inv) => inv.item_id === itemId);

  const handleTryOn = (item: AccessoryItem) => {
    sound.playSnap();
    setPreviewEquipped((prev) => ({
      ...prev,
      [item.category]: prev[item.category] === item.id ? null : item.id,
    }));
  };

  const handlePurchase = async (item: AccessoryItem) => {
    if (!profile || profile.coins < item.price) {
      sound.playError();
      setFeedback(`Not enough coins! You need ${item.price} coins.`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setBuyingId(item.id);
    sound.playClick();
    try {
      await buyAccessory(item.id);
      await equipAccessory(item.id, item.category);
      setFeedback(`Purchased and equipped ${item.name}! ✨`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Purchase failed.');
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Shop Header Banner */}
      <div className="p-6 bg-gradient-to-r from-fuchsia-950/90 via-slate-900 to-indigo-950 rounded-3xl border border-fuchsia-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-fuchsia-500/20 border border-fuchsia-500/40 rounded-full text-xs font-bold text-fuchsia-300 mb-2">
            <ShoppingBag size={14} /> Cosmetic Bazaar & Wardrobe
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Pet Accessory Emporium
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Customize your pet's appearance with accessories earned through logic missions!
          </p>
        </div>

        {/* Coin Balance Badge */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 font-extrabold text-sm shadow-lg shadow-amber-500/10">
          <Coins size={18} className="text-amber-400" />
          <span>{profile?.coins ?? 100} Coins</span>
        </div>
      </div>

      {/* Main Grid: Left Items Catalog | Right Live Try-on Dressing Room */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Items Catalog */}
        <div className="lg:col-span-8 space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  sound.playClick();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  selectedCategory === cat
                    ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Feedback Toast */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-2xl text-center"
            >
              {feedback}
            </motion.div>
          )}

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const owned = isItemOwned(item.id);
              const isEquippedInPreview = previewEquipped[item.category] === item.id;
              const isLocked = item.requiredLevel && (profile?.current_level ?? 1) < item.requiredLevel;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-3xl border flex flex-col justify-between transition-all ${
                    isEquippedInPreview
                      ? 'bg-gradient-to-br from-fuchsia-950/40 via-purple-950/20 to-slate-900 border-fuchsia-400 shadow-lg shadow-fuchsia-500/10'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-3xl p-2 bg-slate-950 rounded-2xl border border-slate-800">
                        {item.icon}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${
                          item.rarity === 'legendary'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : item.rarity === 'epic'
                            ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {item.rarity}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-white">{item.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs font-black text-amber-400">
                      <Coins size={14} /> {item.price}
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleTryOn(item)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                          isEquippedInPreview
                            ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                        title="Try on in Dressing Room"
                      >
                        <Eye size={12} /> {isEquippedInPreview ? 'Tried' : 'Try'}
                      </button>

                      {owned ? (
                        <span className="px-2.5 py-1.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl text-[11px] font-bold flex items-center gap-1">
                          <Check size={12} /> Owned
                        </span>
                      ) : isLocked ? (
                        <span className="px-2.5 py-1.5 bg-slate-800 text-slate-500 rounded-xl text-[11px] font-bold flex items-center gap-1">
                          <Lock size={12} /> Lv.{item.requiredLevel}
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={buyingId === item.id}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[11px] font-black transition-all shadow-md shadow-amber-500/20"
                        >
                          {buyingId === item.id ? 'Buying...' : 'BUY'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Pet Dressing Room & Wardrobe Mirror */}
        <div className="lg:col-span-4 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 flex flex-col items-center justify-between shadow-2xl">
          <div className="text-center w-full">
            <span className="text-[10px] uppercase font-black tracking-widest text-fuchsia-400">
              Live Dressing Room
            </span>
            <h3 className="text-base font-extrabold text-white mt-0.5">
              {pet?.pet_name || 'Your Pet'}'s Style
            </h3>
          </div>

          <div className="my-6 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/20 via-pink-500/10 to-indigo-500/20 rounded-full blur-2xl" />
            {pet && (
              <PetSVG
                type={pet.pet_type}
                stage={pet.stage}
                state="happy"
                equipped={previewEquipped}
                size={220}
              />
            )}
          </div>

          <div className="w-full bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <p className="font-extrabold text-slate-300">Equipped In Dressing Room:</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(previewEquipped).map(([cat, val]) => {
                if (!val) return null;
                const acc = ACCESSORIES_CATALOG.find((a) => a.id === val);
                return (
                  <span
                    key={cat}
                    className="px-2 py-1 bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-200 rounded-lg text-[10px] font-bold"
                  >
                    {acc?.name || val}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
