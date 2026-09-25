import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { petslyviaService } from '@/services/petslyviaService';
import type { Profile, Pet, MissionProgress, Contact, UserInventoryItem } from '@/types/database';
import type { EquippedAccessories, CommunityProblem, BugExchangeItem } from '@/types/game';
import { sound } from '@/utils/audio';

export type TaskCategory = 'easy' | 'medium' | 'hard' | 'complex';

export interface ProductivityTaskResult {
  success: boolean;
  reason?: string;
  energyCost: number;
  happinessGain: number;
  xpGain: number;
  coinsGain: number;
  leveledUp?: boolean;
}

interface GameDataContextValue {
  profile: Profile | null;
  pet: Pet | null;
  inventory: UserInventoryItem[];
  progress: Record<string, MissionProgress>;
  contacts: Contact[];
  communityProblems: CommunityProblem[];
  bugExchanges: BugExchangeItem[];
  loading: boolean;
  soundEnabled: boolean;
  toggleSound: () => boolean;
  refreshData: () => Promise<void>;
  completeMission: (
    missionId: string,
    xpReward: number,
    coinReward: number,
    skillRewards: Partial<Profile['skills']>
  ) => Promise<{ profile: Profile; pet: Pet; progress: MissionProgress }>;
  buyAccessory: (accessoryId: string) => Promise<void>;
  equipAccessory: (accessoryId: string, category: keyof EquippedAccessories) => Promise<void>;
  unequipAccessory: (category: keyof EquippedAccessories) => Promise<void>;
  publishProblem: (problem: Omit<CommunityProblem, 'id' | 'playsCount' | 'solvesCount' | 'likesCount' | 'createdAt'>) => Promise<CommunityProblem>;
  publishBug: (bug: Omit<BugExchangeItem, 'id' | 'solversCount' | 'attemptsCount' | 'avgSolveTimeSec' | 'createdAt'>) => Promise<BugExchangeItem>;
  solveBug: (bugId: string) => Promise<void>;
  petAction: (action: 'pet' | 'feed' | 'rest') => Promise<void>;
  setPlayerRole: (role: 'non_coder' | 'coder') => Promise<void>;
  completeProductivityTask: (category: TaskCategory) => Promise<ProductivityTaskResult>;
}

const GameDataContext = createContext<GameDataContextValue | null>(null);

export function GameDataProvider({ children }: { children: ReactNode }) {
  const { user, profile: authProfile, pet: authPet, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(authProfile);
  const [pet, setPet] = useState<Pet | null>(authPet);
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);
  const [progress, setProgress] = useState<Record<string, MissionProgress>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [communityProblems, setCommunityProblems] = useState<CommunityProblem[]>([]);
  const [bugExchanges, setBugExchanges] = useState<BugExchangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(sound.isEnabled());

  const refreshData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [p, petData, inv, prog, cList, comm, bugs] = await Promise.all([
        petslyviaService.getProfile(user.id),
        petslyviaService.getPet(user.id),
        petslyviaService.getInventory(user.id),
        petslyviaService.getMissionProgress(user.id),
        petslyviaService.getContacts(user.id),
        petslyviaService.getCommunityProblems(),
        petslyviaService.getBugExchanges(),
      ]);

      if (p) setProfile(p);
      if (petData) setPet(petData);
      setInventory(inv);
      setProgress(prog);
      setContacts(cList);
      setCommunityProblems(comm);
      setBugExchanges(bugs);
    } catch (err) {
      console.error('Error refreshing game data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authProfile) setProfile(authProfile);
    if (authPet) setPet(authPet);
  }, [authProfile, authPet]);

  useEffect(() => {
    if (user?.id) {
      refreshData();
    } else {
      setLoading(false);
    }
  }, [user?.id, refreshData]);

  const toggleSound = () => {
    const isNow = sound.toggleSound();
    setSoundEnabled(isNow);
    return isNow;
  };

  const completeMission = async (
    missionId: string,
    xpReward: number,
    coinReward: number,
    skillRewards: Partial<Profile['skills']>
  ) => {
    if (!user?.id) throw new Error('Not authenticated');
    const result = await petslyviaService.completeMission(user.id, missionId, xpReward, coinReward, skillRewards);
    setProfile(result.profile);
    setPet(result.pet);
    setProgress((prev) => ({ ...prev, [missionId]: result.progress }));
    await refreshProfile();
    return result;
  };

  const buyAccessory = async (accessoryId: string) => {
    if (!user?.id) return;
    const { profile: updatedProfile, item } = await petslyviaService.purchaseAccessory(user.id, accessoryId);
    setProfile(updatedProfile);
    setInventory((prev) => [...prev, item]);
    sound.playCrystal();
  };

  const equipAccessory = async (accessoryId: string, category: keyof EquippedAccessories) => {
    if (!user?.id) return;
    const updatedPet = await petslyviaService.equipAccessory(user.id, accessoryId, category);
    setPet(updatedPet);
    sound.playSnap();
  };

  const unequipAccessory = async (category: keyof EquippedAccessories) => {
    if (!user?.id) return;
    const updatedPet = await petslyviaService.unequipAccessory(user.id, category);
    setPet(updatedPet);
    sound.playSnap();
  };

  const publishProblem = async (problem: Omit<CommunityProblem, 'id' | 'playsCount' | 'solvesCount' | 'likesCount' | 'createdAt'>) => {
    const created = await petslyviaService.publishCommunityProblem(problem);
    setCommunityProblems((prev) => [created, ...prev]);
    sound.playVictory();
    return created;
  };

  const publishBug = async (bug: Omit<BugExchangeItem, 'id' | 'solversCount' | 'attemptsCount' | 'avgSolveTimeSec' | 'createdAt'>) => {
    const created = await petslyviaService.publishBugExchange(bug);
    setBugExchanges((prev) => [created, ...prev]);
    sound.playVictory();
    return created;
  };

  const solveBug = async (bugId: string) => {
    if (!user?.id) return;
    const { profile: updatedProfile, bug } = await petslyviaService.solveBugExchange(user.id, bugId);
    setProfile(updatedProfile);
    setBugExchanges((prev) => prev.map((b) => (b.id === bugId ? bug : b)));
    sound.playVictory();
  };

  const petAction = async (action: 'pet' | 'feed' | 'rest') => {
    if (!pet || !user?.id) return;
    const updated: Pet = { ...pet };
    if (action === 'feed') {
      updated.energy = Math.min(100, updated.energy + 20);
      updated.happiness = Math.min(100, updated.happiness + 10);
      updated.productivity_state = 'happy';
      sound.playCrystal();
    } else if (action === 'pet') {
      updated.happiness = Math.min(100, updated.happiness + 15);
      updated.productivity_state = 'excited';
      sound.playStep();
    } else if (action === 'rest') {
      updated.energy = 100;
      updated.productivity_state = 'calm';
      sound.playClick();
    }
    const saved = await petslyviaService.savePet(updated);
    setPet(saved);
  };

  const setPlayerRole = async (role: 'non_coder' | 'coder') => {
    if (!profile || !user?.id) return;
    const updated: Profile = {
      ...profile,
      role,
      coding_mode_unlocked: role === 'coder' || profile.coding_mode_unlocked,
    };
    const saved = await petslyviaService.saveProfile(updated);
    setProfile(saved);
    sound.playCrystal();
  };

  const completeProductivityTask = async (category: TaskCategory): Promise<ProductivityTaskResult> => {
    if (!user?.id) {
      return {
        success: false,
        reason: 'User not authenticated',
        energyCost: 0,
        happinessGain: 0,
        xpGain: 0,
        coinsGain: 0,
      };
    }

    const { profile: updatedProfile, pet: updatedPet, result } =
      await petslyviaService.completeProductivityTask(user.id, category);

    if (result.success) {
      setProfile(updatedProfile);
      setPet(updatedPet);
      if (result.leveledUp) {
        sound.playVictory();
      } else {
        sound.playCrystal();
      }
    } else {
      sound.playHurt();
    }

    return result;
  };

  return (
    <GameDataContext.Provider
      value={{
        profile,
        pet,
        inventory,
        progress,
        contacts,
        communityProblems,
        bugExchanges,
        loading,
        soundEnabled,
        toggleSound,
        refreshData,
        completeMission,
        buyAccessory,
        equipAccessory,
        unequipAccessory,
        publishProblem,
        publishBug,
        solveBug,
        petAction,
        setPlayerRole,
        completeProductivityTask,
      }}
    >
      {children}
    </GameDataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGameData() {
  const context = useContext(GameDataContext);
  if (!context) throw new Error('useGameData must be used within GameDataProvider');
  return context;
}

// Legacy alias for compatibility
// eslint-disable-next-line react-refresh/only-export-components
export function useAppData() {
  return useGameData();
}
