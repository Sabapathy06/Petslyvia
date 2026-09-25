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
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* Shop Header Banner */}
      <div className="p-6 bg-white rounded-3xl border border-[#e2ece5] shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eaf2ec] border border-[#d8e5dc] rounded-full text-xs font-bold text-[#2d6a4f] mb-2">
            <ShoppingBag size={14} /> Cosmetic Bazaar & Wardrobe
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1b382b]">
            Pet Accessory Emporium
          </h1>
          <p className="text-xs sm:text-sm text-[#5b7566] mt-1">
            Customize your pet's appearance with accessories earned through logic missions!
          </p>
        </div>

        {/* Coin Balance Badge */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#d8e5dc] rounded-2xl text-[#1b382b] font-extrabold text-sm shadow-soft">
          <span className="text-base">💎</span>
          <span>{profile?.coins ?? 100} Gems / Coins</span>
        </div>
      </div>

      {/* Main Grid: Left Items Catalog | Right Live Try-on Dressing Room */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Items Catalog */}
        <div className="lg:col-span-8 space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-[#e2ece5] shadow-sm">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  sound.playClick();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#2d6a4f] text-white shadow-soft font-black'
                    : 'text-[#5b7566] hover:text-[#1b382b] hover:bg-[#f4f8f5]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Feedback message */}
          {feedback && (
            <div className="p-3 bg-[#eaf2ec] border border-[#c8dad0] text-[#1b382b] text-xs font-bold rounded-2xl text-center shadow-soft">
              {feedback}
            </div>
          )}

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {filteredItems.map((item) => {
              const owned = isItemOwned(item.id);
              const isEquipped = pet?.equipped_items?.[item.category] === item.id;
              const isPreviewed = previewEquipped[item.category] === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-3xl border flex flex-col justify-between transition-all bg-white shadow-sm ${
                    isEquipped
                      ? 'border-[#2d6a4f] bg-[#f4f8f5]'
                      : 'border-[#e2ece5] hover:border-[#c8dad0]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">{item.icon}</span>
                      <span className="text-[10px] uppercase font-bold text-[#7a9386] bg-[#f4f8f5] px-2 py-0.5 rounded-full border border-[#e2ece5]">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-[#1b382b]">{item.name}</h3>
                    <p className="text-[11px] text-[#5b7566] mt-0.5 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#f0f5f1] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#5b7566]">Price:</span>
                      <span className="text-[#2d6a4f] flex items-center gap-1">
                        💎 {item.price} Coins
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTryOn(item)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isPreviewed
                            ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                            : 'bg-[#f4f8f5] border-[#d8e5dc] text-[#1b382b] hover:bg-[#eaf2ec]'
                        }`}
                      >
                        {isPreviewed ? 'Previewing' : 'Try On'}
                      </button>

                      {owned ? (
                        <button
                          onClick={() => equipAccessory(item.id, item.category)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isEquipped
                              ? 'bg-[#eaf2ec] text-[#2d6a4f] border border-[#d5e3da]'
                              : 'bg-[#2d6a4f] text-white hover:bg-[#23533e]'
                          }`}
                        >
                          {isEquipped ? 'Equipped ✓' : 'Equip'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={buyingId === item.id}
                          className="flex-1 py-1.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white text-xs font-bold rounded-xl shadow-soft transition-all cursor-pointer disabled:opacity-50"
                        >
                          {buyingId === item.id ? 'Buying...' : 'Buy'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Try-on Dressing Room */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card flex flex-col items-center justify-between space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-base font-extrabold text-[#1b382b]">Dressing Room Mirror</h2>
            <p className="text-xs text-[#5b7566]">Live preview of active cosmetic gear</p>
          </div>

          <div className="w-full aspect-square bg-[#dce8e0] rounded-2xl border border-[#d8e5dc] flex items-center justify-center relative overflow-hidden shadow-inner p-4">
            {pet && (
              <PetSVG
                type={pet.pet_type}
                stage={pet.stage}
                state="happy"
                equipped={previewEquipped}
                size={160}
              />
            )}
          </div>

          <div className="w-full space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#5b7566]">
              <span>Current Companion:</span>
              <strong className="text-[#1b382b] capitalize">{pet?.pet_name}</strong>
            </div>
            <div className="flex items-center justify-between text-[#5b7566]">
              <span>Form Stage:</span>
              <strong className="text-[#1b382b] capitalize">{pet?.stage}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
