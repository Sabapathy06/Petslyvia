import type { AccessoryItem } from '@/types/game';

export const ACCESSORIES_CATALOG: AccessoryItem[] = [
  // HEAD
  {
    id: 'cap_starter',
    name: 'Explorer Cap',
    category: 'head',
    price: 60,
    description: 'A trusty red explorer cap for adventurous pets.',
    icon: '🧢',
    rarity: 'common',
    visualColor: '#ef4444',
  },
  {
    id: 'hat_wizard',
    name: 'Logic Wizard Hat',
    category: 'head',
    price: 150,
    description: 'Imbued with the arcane powers of Boolean logic.',
    icon: '🧙‍♂️',
    rarity: 'rare',
    requiredLevel: 2,
    visualColor: '#8b5cf6',
  },
  {
    id: 'crown_golden',
    name: 'Algorithm Crown',
    category: 'head',
    price: 300,
    description: 'Forged for masters of optimal pathfinding.',
    icon: '👑',
    rarity: 'legendary',
    requiredLevel: 4,
    visualColor: '#f59e0b',
  },

  // EYES
  {
    id: 'glasses_round',
    name: 'Smart Glasses',
    category: 'eyes',
    price: 50,
    description: 'Helps your pet spot subtle syntax and direction bugs.',
    icon: '👓',
    rarity: 'common',
    visualColor: '#0ea5e9',
  },
  {
    id: 'shades_cool',
    name: 'Cyber Shades',
    category: 'eyes',
    price: 120,
    description: 'Futuristic polarized sunglasses. 100% cooler.',
    icon: '🕶️',
    rarity: 'rare',
    requiredLevel: 2,
    visualColor: '#10b981',
  },
  {
    id: 'goggles_vr',
    name: 'Matrix Goggles',
    category: 'eyes',
    price: 240,
    description: 'Allows seeing behind-the-scenes byte code.',
    icon: '🥽',
    rarity: 'epic',
    requiredLevel: 3,
    visualColor: '#06b6d4',
  },

  // BODY
  {
    id: 'shirt_striped',
    name: 'Code Sailor Tee',
    category: 'body',
    price: 80,
    description: 'Comfortable striped cotton shirt for daily debugging.',
    icon: '👕',
    rarity: 'common',
    visualColor: '#3b82f6',
  },
  {
    id: 'dress_spring',
    name: 'Floral Logic Dress',
    category: 'body',
    price: 110,
    description: 'A cheerful sunny outfit with crystal embroidery.',
    icon: '👗',
    rarity: 'rare',
    visualColor: '#ec4899',
  },
  {
    id: 'suit_tuxedo',
    name: 'Senior Dev Tuxedo',
    category: 'body',
    price: 250,
    description: 'Formal attire for deploying on Friday.',
    icon: '👔',
    rarity: 'epic',
    requiredLevel: 3,
    visualColor: '#1e293b',
  },

  // BACK
  {
    id: 'backpack_adventure',
    name: 'Adventure Satchel',
    category: 'back',
    price: 90,
    description: 'Sturdy backpack to carry crystal shards and logic cards.',
    icon: '🎒',
    rarity: 'common',
    visualColor: '#d97706',
  },
  {
    id: 'cape_hero',
    name: 'Debug Hero Cape',
    category: 'back',
    price: 220,
    description: 'Flutters gloriously when you conquer an infinite loop.',
    icon: '🦸',
    rarity: 'epic',
    requiredLevel: 3,
    visualColor: '#dc2626',
  },

  // FEET / SHOES
  {
    id: 'shoes_sneakers',
    name: 'Turbo Sneakers',
    category: 'feet',
    price: 70,
    description: 'Lightweight sneakers to speed up loop execution.',
    icon: '👟',
    rarity: 'common',
    visualColor: '#10b981',
  },
  {
    id: 'shoes_boots',
    name: 'Iron Boots',
    category: 'feet',
    price: 130,
    description: 'Heavy boots that prevent slipping on bug traps.',
    icon: '🥾',
    rarity: 'rare',
    requiredLevel: 2,
    visualColor: '#78716c',
  },

  // SPECIAL / COSTUMES
  {
    id: 'costume_ninja',
    name: 'Shadow Ninja Cloak',
    category: 'special',
    price: 350,
    description: 'Complete ninja suit. Moves silently through branches.',
    icon: '🥷',
    rarity: 'legendary',
    requiredLevel: 4,
    visualColor: '#0f172a',
  },
];

export function getAccessoryById(id: string): AccessoryItem | undefined {
  return ACCESSORIES_CATALOG.find((item) => item.id === id);
}
