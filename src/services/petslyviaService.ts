import { supabase } from '@/lib/supabase';
import type { Profile, Pet, MissionProgress, Contact, UserInventoryItem } from '@/types/database';
import type { EquippedAccessories, BugExchangeItem, CommunityProblem, PetStage } from '@/types/game';
import { ACCESSORIES_CATALOG } from '@/data/accessories';
import { INITIAL_BUG_EXCHANGES, INITIAL_COMMUNITY_PROBLEMS, INITIAL_CONTACTS } from '@/data/communitySeed';
import { generateFriendId } from '@/services/friendService';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const STORAGE_KEYS = {
  PROFILES: 'petslyvia_profiles',
  PETS: 'petslyvia_pets',
  INVENTORY: 'petslyvia_inventory',
  PROGRESS: 'petslyvia_mission_progress',
  COMMUNITY: 'petslyvia_community_problems',
  BUGS: 'petslyvia_bug_exchanges',
  CONTACTS: 'petslyvia_contacts',
  CURRENT_USER_ID: 'petslyvia_current_user_id',
  AUTH_USERS: 'petslyvia_auth_users',
};

// Check if Supabase credentials are configured
function isSupabaseConfigured(): boolean {
  const url = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || 'https://fgxjnowrzxlinbpozker.supabase.co';
  const key = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_l30DMOPfJgXNItzbN0geeA_P5y1QskO';
  return Boolean(url && key && url.length > 5 && !url.includes('placeholder'));
}

// ----------------------------------------------------
// LOCAL STORAGE STORE HELPERS
// ----------------------------------------------------
function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore
  }
}

export const petslyviaService = {
  // ----------------------------------------------------
  // PROFILE SERVICE
  // ----------------------------------------------------
  async getProfile(userId: string, userEmail?: string): Promise<Profile | null> {
    const cleanEmail = userEmail?.trim().toLowerCase();
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('profiles').select('*');
        if (cleanEmail && cleanEmail.includes('@')) {
          query = query.or(`id.eq.${userId},email.eq.${cleanEmail}`);
        } else {
          query = query.eq('id', userId);
        }
        const { data, error } = await query.maybeSingle();
        if (data && !error) {
          const profile = data as Profile;
          const skills = (profile.skills as Record<string, any>) || {};
          if (!profile.friend_id) {
            profile.friend_id = skills.friend_id || generateFriendId(profile.id || userId);
            // Save in skills
            const updatedSkills = { ...skills, friend_id: profile.friend_id };
            supabase.from('profiles').update({ skills: updatedSkills }).eq('id', profile.id).then();
            try {
              supabase.from('profiles').update({ friend_id: profile.friend_id }).eq('id', profile.id).then();
            } catch {
              // ignore
            }
          }
          const profiles = getLocal<Record<string, Profile>>(STORAGE_KEYS.PROFILES, {});
          profiles[userId] = profile;
          if (profile.id) profiles[profile.id] = profile;
          if (profile.email) profiles[profile.email.toLowerCase()] = profile;
          setLocal(STORAGE_KEYS.PROFILES, profiles);
          return profile;
        }
      } catch (err) {
        console.warn('Supabase getProfile error:', err);
      }
    }
    const profiles = getLocal<Record<string, Profile>>(STORAGE_KEYS.PROFILES, {});
    let localProf = profiles[userId] || (cleanEmail ? profiles[cleanEmail] : null) || null;
    if (localProf && !localProf.friend_id) {
      localProf.friend_id = generateFriendId(userId);
      profiles[userId] = localProf;
      if (localProf.id) profiles[localProf.id] = localProf;
      if (localProf.email) profiles[localProf.email.toLowerCase()] = localProf;
      setLocal(STORAGE_KEYS.PROFILES, profiles);
    }
    return localProf;
  },

  async saveProfile(profile: Profile): Promise<Profile> {
    const resolvedId = profile.id || generateUUID();
    const resolvedFriendId = profile.friend_id || generateFriendId(resolvedId);
    const existingSkills = typeof profile.skills === 'object' && profile.skills ? profile.skills : { logic: 15, debugging: 10, creativity: 15, coding: 0, collaboration: 10 };
    const mergedSkills = { ...existingSkills, friend_id: resolvedFriendId };

    const updatedProfile: Profile = {
      ...profile,
      id: resolvedId,
      friend_id: resolvedFriendId,
      skills: mergedSkills,
      email: profile.email ? profile.email.toLowerCase() : undefined,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const payload: Record<string, any> = {
          id: updatedProfile.id,
          friend_id: updatedProfile.friend_id,
          username: updatedProfile.username || updatedProfile.display_name?.toLowerCase().replace(/\s+/g, '_') || 'player',
          display_name: updatedProfile.display_name || 'Player',
          avatar_url: updatedProfile.avatar_url || null,
          role: updatedProfile.role || 'non_coder',
          coins: updatedProfile.coins ?? 100,
          total_xp: updatedProfile.total_xp ?? 50,
          current_level: updatedProfile.current_level ?? 1,
          skills: mergedSkills,
          unlocked_areas: updatedProfile.unlocked_areas || ['pet_home', 'logic_forest', 'shop'],
          coding_mode_unlocked: updatedProfile.coding_mode_unlocked ?? false,
          bugs_created: updatedProfile.bugs_created ?? 0,
          bugs_solved: updatedProfile.bugs_solved ?? 0,
          updated_at: updatedProfile.updated_at,
        };

        if (updatedProfile.email) {
          payload.email = updatedProfile.email;
        }

        let { data, error } = await supabase.from('profiles').upsert(payload).select().maybeSingle();

        // If friend_id column does not exist in remote table, omit it and retry
        if (error && (error.code === '42703' || error.message?.includes('friend_id'))) {
          delete payload.friend_id;
          const retryRes = await supabase.from('profiles').upsert(payload).select().maybeSingle();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (data && !error) {
          const saved = { ...data, friend_id: resolvedFriendId } as Profile;
          const profiles = getLocal<Record<string, Profile>>(STORAGE_KEYS.PROFILES, {});
          profiles[saved.id] = saved;
          profiles[updatedProfile.id] = saved;
          if (saved.email) profiles[saved.email.toLowerCase()] = saved;
          setLocal(STORAGE_KEYS.PROFILES, profiles);
          return saved;
        }
      } catch (err) {
        console.warn('Supabase saveProfile error:', err);
      }
    }
    const profiles = getLocal<Record<string, Profile>>(STORAGE_KEYS.PROFILES, {});
    profiles[updatedProfile.id] = updatedProfile;
    if (updatedProfile.email) profiles[updatedProfile.email.toLowerCase()] = updatedProfile;
    setLocal(STORAGE_KEYS.PROFILES, profiles);
    return profiles[updatedProfile.id];
  },

  // ----------------------------------------------------
  // PET SERVICE (1:1 with Profile)
  // ----------------------------------------------------
  async getPet(userId: string, targetProfileId?: string): Promise<Pet | null> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('pets').select('*').eq('is_active', true);
        if (targetProfileId && targetProfileId !== userId) {
          query = query.or(`user_id.eq.${userId},user_id.eq.${targetProfileId}`);
        } else {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.maybeSingle();
        if (data && !error) {
          const pet = data as Pet;
          const pets = getLocal<Record<string, Pet>>(STORAGE_KEYS.PETS, {});
          pets[userId] = pet;
          if (targetProfileId) pets[targetProfileId] = pet;
          if (pet.user_id) pets[pet.user_id] = pet;
          setLocal(STORAGE_KEYS.PETS, pets);
          return pet;
        }
      } catch (err) {
        console.warn('Supabase getPet error:', err);
      }
    }
    const pets = getLocal<Record<string, Pet>>(STORAGE_KEYS.PETS, {});
    return pets[userId] || (targetProfileId ? pets[targetProfileId] : null) || null;
  },

  async savePet(pet: Pet): Promise<Pet> {
    // Check evolution stage based on level/skills
    const stage: PetStage =
      pet.level >= 7 ? 'adult' : pet.level >= 5 ? 'teen' : pet.level >= 3 ? 'child' : 'infant';
    const updatedPet: Pet = {
      ...pet,
      id: pet.id || generateUUID(),
      stage,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const petPayload: Record<string, any> = {
          user_id: updatedPet.user_id,
          pet_type: updatedPet.pet_type,
          pet_name: updatedPet.pet_name,
          personality: updatedPet.personality || 'Curious, cheerful, and eager to explore logic puzzles!',
          stage: updatedPet.stage,
          level: updatedPet.level || 1,
          xp: updatedPet.xp || 50,
          happiness: updatedPet.happiness ?? 100,
          energy: updatedPet.energy ?? 100,
          productivity_state: updatedPet.productivity_state || 'happy',
          unlocked_abilities: updatedPet.unlocked_abilities || ['runner'],
          equipped_items: updatedPet.equipped_items || {},
          is_active: updatedPet.is_active ?? true,
          updated_at: updatedPet.updated_at,
        };

        // Check if pet already exists in Supabase for this user_id
        const { data: existingPet } = await supabase
          .from('pets')
          .select('id')
          .eq('user_id', updatedPet.user_id)
          .maybeSingle();

        let saved: Pet | null = null;
        if (existingPet?.id) {
          const { data, error } = await supabase
            .from('pets')
            .update(petPayload)
            .eq('id', existingPet.id)
            .select()
            .maybeSingle();
          if (data && !error) saved = data as Pet;
        } else {
          // If updatedPet.id is a valid UUID, include it
          if (updatedPet.id && updatedPet.id.length === 36 && !updatedPet.id.startsWith('pet_')) {
            petPayload.id = updatedPet.id;
          }
          const { data, error } = await supabase
            .from('pets')
            .insert(petPayload)
            .select()
            .maybeSingle();
          if (data && !error) saved = data as Pet;
        }

        if (saved) {
          const pets = getLocal<Record<string, Pet>>(STORAGE_KEYS.PETS, {});
          pets[pet.user_id] = saved;
          if (saved.user_id) pets[saved.user_id] = saved;
          setLocal(STORAGE_KEYS.PETS, pets);
          return saved;
        }
      } catch (err) {
        console.warn('Supabase savePet error:', err);
      }
    }
    const pets = getLocal<Record<string, Pet>>(STORAGE_KEYS.PETS, {});
    pets[pet.user_id] = updatedPet;
    setLocal(STORAGE_KEYS.PETS, pets);
    return updatedPet;
  },

  // ----------------------------------------------------
  // INITIALIZE NEW PLAYER (Profile + Infant Pet)
  // ----------------------------------------------------
  async initializeNewPlayer(
    userId: string,
    email: string,
    displayName: string,
    petType: Pet['pet_type'],
    petName: string,
    role: 'non_coder' | 'coder' = 'non_coder',
    forceOverwritePet = false
  ): Promise<{ profile: Profile; pet: Pet }> {
    // If not forcing overwrite, verify if pet and profile already exist
    const existingProfile = await this.getProfile(userId, email);
    const existingPet = await this.getPet(userId);

    if (!forceOverwritePet && existingProfile && existingPet) {
      return { profile: existingProfile, pet: existingPet };
    }

    const newProfile: Profile = existingProfile
      ? { ...existingProfile, friend_id: existingProfile.friend_id || generateFriendId(userId), display_name: displayName || existingProfile.display_name, role: role || existingProfile.role }
      : {
          id: userId,
          friend_id: generateFriendId(userId),
          email: email.toLowerCase(),
          username: displayName.toLowerCase().replace(/\s+/g, '_') || 'player',
          display_name: displayName || 'Player',
          avatar_url: null,
          role: role,
          coins: 100, // Starter coins
          total_xp: 50, // Starter XP
          current_level: 1,
          skills: {
            logic: 15,
            debugging: 10,
            creativity: 15,
            coding: role === 'coder' ? 20 : 0,
            collaboration: 10,
          },
          unlocked_areas: ['pet_home', 'logic_forest', 'shop'],
          coding_mode_unlocked: role === 'coder',
          bugs_created: 0,
          bugs_solved: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

    const newPet: Pet = (existingPet && !forceOverwritePet)
      ? existingPet
      : {
          id: existingPet?.id || generateUUID(),
          user_id: userId,
          pet_type: petType,
          pet_name: petName || 'Buddy',
          personality: 'Curious, cheerful, and eager to explore logic puzzles!',
          stage: 'infant',
          level: 1,
          xp: 50,
          happiness: 100,
          energy: 100,
          productivity_state: 'happy',
          unlocked_abilities: ['runner'],
          equipped_items: {},
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

    const savedProfile = await this.saveProfile(newProfile);
    const savedPet = await this.savePet(newPet);

    return { profile: savedProfile, pet: savedPet };
  },

  // ----------------------------------------------------
  // INVENTORY & ACCESSORIES SHOP
  // ----------------------------------------------------
  async getInventory(userId: string): Promise<UserInventoryItem[]> {
    const all = getLocal<UserInventoryItem[]>(STORAGE_KEYS.INVENTORY, []);
    return all.filter((item) => item.user_id === userId);
  },

  async purchaseAccessory(userId: string, accessoryId: string): Promise<{ profile: Profile; item: UserInventoryItem }> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('Player profile not found');

    const accessory = ACCESSORIES_CATALOG.find((a) => a.id === accessoryId);
    if (!accessory) throw new Error('Accessory does not exist');

    if (profile.coins < accessory.price) {
      throw new Error(`Not enough coins! You need ${accessory.price} coins.`);
    }

    const inventory = getLocal<UserInventoryItem[]>(STORAGE_KEYS.INVENTORY, []);
    const alreadyOwns = inventory.some((i) => i.user_id === userId && i.item_id === accessoryId);
    if (alreadyOwns) {
      throw new Error('You already own this item!');
    }

    // Deduct coins
    profile.coins -= accessory.price;
    await this.saveProfile(profile);

    const newItem: UserInventoryItem = {
      id: generateUUID(),
      user_id: userId,
      item_id: accessoryId,
      equipped: false,
      acquired_at: new Date().toISOString(),
    };

    inventory.push(newItem);
    setLocal(STORAGE_KEYS.INVENTORY, inventory);

    return { profile, item: newItem };
  },

  async equipAccessory(userId: string, accessoryId: string, category: keyof EquippedAccessories): Promise<Pet> {
    const pet = await this.getPet(userId);
    if (!pet) throw new Error('Pet not found');

    const equipped: EquippedAccessories = { ...(pet.equipped_items || {}) };
    equipped[category] = accessoryId;
    pet.equipped_items = equipped;

    return await this.savePet(pet);
  },

  async unequipAccessory(userId: string, category: keyof EquippedAccessories): Promise<Pet> {
    const pet = await this.getPet(userId);
    if (!pet) throw new Error('Pet not found');

    const equipped: EquippedAccessories = { ...(pet.equipped_items || {}) };
    equipped[category] = null;
    pet.equipped_items = equipped;

    return await this.savePet(pet);
  },

  // ----------------------------------------------------
  // MISSIONS & PROGRESS
  // ----------------------------------------------------
  async getMissionProgress(userId: string): Promise<Record<string, MissionProgress>> {
    const all = getLocal<Record<string, Record<string, MissionProgress>>>(STORAGE_KEYS.PROGRESS, {});
    return all[userId] || {};
  },

  async completeMission(
    userId: string,
    missionId: string,
    xpReward: number,
    coinReward: number,
    skillRewards: Partial<Profile['skills']>
  ): Promise<{ profile: Profile; pet: Pet; progress: MissionProgress }> {
    const profile = await this.getProfile(userId);
    const pet = await this.getPet(userId);
    if (!profile || !pet) throw new Error('Player or Pet not found');

    // Update Progress
    const allProgress = getLocal<Record<string, Record<string, MissionProgress>>>(STORAGE_KEYS.PROGRESS, {});
    if (!allProgress[userId]) allProgress[userId] = {};

    const existingProg = allProgress[userId][missionId];
    const newProg: MissionProgress = {
      id: existingProg?.id || generateUUID(),
      user_id: userId,
      mission_id: missionId,
      completed: true,
      stars: 3,
      best_steps: existingProg ? Math.min(existingProg.best_steps, 8) : 8,
      attempts: (existingProg?.attempts || 0) + 1,
      completed_at: new Date().toISOString(),
    };
    allProgress[userId][missionId] = newProg;
    setLocal(STORAGE_KEYS.PROGRESS, allProgress);

    // Reward XP & Coins
    profile.total_xp += xpReward;
    profile.coins += coinReward;
    pet.xp += xpReward;

    // Calculate level (100 XP per level)
    const newLevel = Math.max(1, Math.floor(profile.total_xp / 100) + 1);
    profile.current_level = newLevel;
    pet.level = newLevel;

    // Update Skills
    if (skillRewards) {
      Object.entries(skillRewards).forEach(([skillKey, points]) => {
        const key = skillKey as keyof Profile['skills'];
        if (profile.skills[key] !== undefined && typeof points === 'number') {
          profile.skills[key] = Math.min(100, profile.skills[key] + points);
        }
      });
    }

    // Unlock new areas
    if (newLevel >= 2 && !profile.unlocked_areas.includes('bug_dungeon')) {
      profile.unlocked_areas.push('bug_dungeon');
    }
    if (newLevel >= 3 && !profile.unlocked_areas.includes('smart_city')) {
      profile.unlocked_areas.push('smart_city');
    }
    if (newLevel >= 4 && !profile.unlocked_areas.includes('coding_lab')) {
      profile.unlocked_areas.push('coding_lab');
      profile.coding_mode_unlocked = true;
    }
    if (newLevel >= 2 && !profile.unlocked_areas.includes('creator_world')) {
      profile.unlocked_areas.push('creator_world');
      profile.unlocked_areas.push('challenge_arena');
    }

    // Pet Stage Evolution
    if (newLevel >= 5) {
      pet.stage = 'teen';
      if (!pet.unlocked_abilities.includes('combo')) pet.unlocked_abilities.push('combo');
    } else if (newLevel >= 3) {
      pet.stage = 'child';
      if (!pet.unlocked_abilities.includes('repeat')) pet.unlocked_abilities.push('repeat');
      if (!pet.unlocked_abilities.includes('bug_sense')) pet.unlocked_abilities.push('bug_sense');
    }

    const savedProfile = await this.saveProfile(profile);
    const savedPet = await this.savePet(pet);

    return { profile: savedProfile, pet: savedPet, progress: newProg };
  },

  // ----------------------------------------------------
  // COMMUNITY PROBLEMS & BUG EXCHANGES
  // ----------------------------------------------------
  async getCommunityProblems(): Promise<CommunityProblem[]> {
    return getLocal<CommunityProblem[]>(STORAGE_KEYS.COMMUNITY, INITIAL_COMMUNITY_PROBLEMS);
  },

  async publishCommunityProblem(problem: Omit<CommunityProblem, 'id' | 'playsCount' | 'solvesCount' | 'likesCount' | 'createdAt'>): Promise<CommunityProblem> {
    const list = await this.getCommunityProblems();
    const newProblem: CommunityProblem = {
      ...problem,
      id: `comm_${Date.now()}`,
      playsCount: 0,
      solvesCount: 0,
      likesCount: 1,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newProblem);
    setLocal(STORAGE_KEYS.COMMUNITY, list);
    return newProblem;
  },

  async createCommunityProblem(problem: CommunityProblem): Promise<CommunityProblem> {
    const list = await this.getCommunityProblems();
    list.unshift(problem);
    setLocal(STORAGE_KEYS.COMMUNITY, list);
    return problem;
  },

  async getBugExchanges(): Promise<BugExchangeItem[]> {
    return getLocal<BugExchangeItem[]>(STORAGE_KEYS.BUGS, INITIAL_BUG_EXCHANGES);
  },

  async publishBugExchange(bug: Omit<BugExchangeItem, 'id' | 'solversCount' | 'attemptsCount' | 'avgSolveTimeSec' | 'createdAt'>): Promise<BugExchangeItem> {
    const list = await this.getBugExchanges();
    const newBug: BugExchangeItem = {
      ...bug,
      id: `bug_${Date.now()}`,
      solversCount: 0,
      attemptsCount: 0,
      avgSolveTimeSec: 0,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newBug);
    setLocal(STORAGE_KEYS.BUGS, list);
    return newBug;
  },

  async solveBugExchange(userId: string, bugId: string): Promise<{ profile: Profile; bug: BugExchangeItem }> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('User not found');

    const bugs = await this.getBugExchanges();
    const bug = bugs.find((b) => b.id === bugId);
    if (!bug) throw new Error('Bug puzzle not found');

    bug.solversCount += 1;
    bug.attemptsCount += 1;
    setLocal(STORAGE_KEYS.BUGS, bugs);

    profile.total_xp += bug.rewardXp;
    profile.coins += bug.rewardCoins;
    profile.bugs_solved += 1;
    profile.skills.debugging = Math.min(100, profile.skills.debugging + 15);
    profile.skills.logic = Math.min(100, profile.skills.logic + 10);

    const savedProfile = await this.saveProfile(profile);
    return { profile: savedProfile, bug };
  },

  // ----------------------------------------------------
  // CONTACTS & SOCIAL
  // ----------------------------------------------------
  async getContacts(userId: string): Promise<Contact[]> {
    const contacts = getLocal<Contact[]>(STORAGE_KEYS.CONTACTS, INITIAL_CONTACTS);
    return contacts.filter((c) => c.user_id === userId || c.user_id === 'current');
  },

  async addContact(userId: string, friendName: string): Promise<Contact> {
    const contacts = getLocal<Contact[]>(STORAGE_KEYS.CONTACTS, INITIAL_CONTACTS);
    const newContact: Contact = {
      id: generateUUID(),
      user_id: userId,
      friend_user_id: generateUUID(),
      friend_name: friendName,
      friend_pet_type: 'fox',
      friend_pet_stage: 'child',
      status: 'accepted',
      is_online: true,
      created_at: new Date().toISOString(),
    };
    contacts.push(newContact);
    setLocal(STORAGE_KEYS.CONTACTS, contacts);
    return newContact;
  },

  // ----------------------------------------------------
  // PRODUCTIVITY TASKS
  // ----------------------------------------------------
  async completeProductivityTask(
    userId: string,
    category: 'easy' | 'medium' | 'hard' | 'complex'
  ): Promise<{
    profile: Profile;
    pet: Pet;
    result: {
      success: boolean;
      reason?: string;
      energyCost: number;
      happinessGain: number;
      xpGain: number;
      coinsGain: number;
      leveledUp?: boolean;
    };
  }> {
    const profile = await this.getProfile(userId);
    const pet = await this.getPet(userId);
    if (!profile || !pet) throw new Error('Player or Pet not found');

    const rates = {
      easy: { energyCost: 8, happinessGain: 12, xpGain: 20, coinsGain: 15 },
      medium: { energyCost: 18, happinessGain: 25, xpGain: 40, coinsGain: 35 },
      hard: { energyCost: 32, happinessGain: 50, xpGain: 90, coinsGain: 75 },
      complex: { energyCost: 48, happinessGain: 85, xpGain: 160, coinsGain: 130 },
    };

    const rate = rates[category] || rates.easy;

    if (pet.energy < rate.energyCost) {
      return {
        profile,
        pet,
        result: {
          success: false,
          reason: `Your pet is too tired (${pet.energy}% energy). Needs ${rate.energyCost}% energy! Please feed or let your pet rest.`,
          energyCost: rate.energyCost,
          happinessGain: rate.happinessGain,
          xpGain: rate.xpGain,
          coinsGain: rate.coinsGain,
        },
      };
    }

    // Apply stats
    pet.energy = Math.max(0, pet.energy - rate.energyCost);
    pet.happiness = Math.min(100, pet.happiness + rate.happinessGain);
    pet.productivity_state = pet.energy <= 15 ? 'tired' : pet.happiness >= 80 ? 'excited' : 'happy';

    const oldLevel = profile.current_level;
    profile.total_xp += rate.xpGain;
    profile.coins += rate.coinsGain;
    pet.xp += rate.xpGain;

    const newLevel = Math.max(1, Math.floor(profile.total_xp / 100) + 1);
    const leveledUp = newLevel > oldLevel;
    profile.current_level = newLevel;
    pet.level = newLevel;

    // Unlocks on level up
    if (newLevel >= 2 && !profile.unlocked_areas.includes('bug_dungeon')) {
      profile.unlocked_areas.push('bug_dungeon');
    }
    if (newLevel >= 3 && !profile.unlocked_areas.includes('smart_city')) {
      profile.unlocked_areas.push('smart_city');
    }
    if (newLevel >= 4 && !profile.unlocked_areas.includes('coding_lab')) {
      profile.unlocked_areas.push('coding_lab');
      profile.coding_mode_unlocked = true;
    }
    if (newLevel >= 2 && !profile.unlocked_areas.includes('creator_world')) {
      profile.unlocked_areas.push('creator_world');
      profile.unlocked_areas.push('challenge_arena');
    }

    // Pet Stage Evolution
    if (newLevel >= 5) {
      pet.stage = 'teen';
      if (!pet.unlocked_abilities.includes('combo')) pet.unlocked_abilities.push('combo');
    } else if (newLevel >= 3) {
      pet.stage = 'child';
      if (!pet.unlocked_abilities.includes('repeat')) pet.unlocked_abilities.push('repeat');
      if (!pet.unlocked_abilities.includes('bug_sense')) pet.unlocked_abilities.push('bug_sense');
    }

    const savedProfile = await this.saveProfile(profile);
    const savedPet = await this.savePet(pet);

    return {
      profile: savedProfile,
      pet: savedPet,
      result: {
        success: true,
        energyCost: rate.energyCost,
        happinessGain: rate.happinessGain,
        xpGain: rate.xpGain,
        coinsGain: rate.coinsGain,
        leveledUp,
      },
    };
  },
};
