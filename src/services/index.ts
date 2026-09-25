export { petslyviaService } from './petslyviaService';
export { runDeterministicSimulation } from './gameEngine';
export { aiGameMaster } from './aiGameMaster';

import { supabase } from '@/lib/supabase';
import type { Profile, Pet, Goal, Task, FocusSession, Streak, Notification, PetStateLog } from '@/types/database';

export const profileService = {
  async get(userId: string): Promise<Profile | null> {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    return data as Profile | null;
  },

  async update(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().maybeSingle();
    if (error) throw error;
    return data as Profile | null;
  },
};

export const petService = {
  async getActive(userId: string): Promise<Pet | null> {
    const { data } = await supabase.from('pets').select('*').eq('user_id', userId).eq('is_active', true).maybeSingle();
    return data as Pet | null;
  },

  async getAll(userId: string): Promise<Pet[]> {
    const { data } = await supabase.from('pets').select('*').eq('user_id', userId).order('created_at');
    return (data as Pet[]) ?? [];
  },

  async create(pet: { pet_type: Pet['pet_type']; pet_name: string; personality?: string }): Promise<Pet | null> {
    const { data, error } = await supabase.from('pets').insert(pet).select().maybeSingle();
    if (error) throw error;
    return data as Pet | null;
  },

  async update(petId: string, updates: Partial<Pet>): Promise<Pet | null> {
    const { data, error } = await supabase.from('pets').update(updates).eq('id', petId).select().maybeSingle();
    if (error) throw error;
    return data as Pet | null;
  },

  async interact(petId: string, interaction: 'pet' | 'feed' | 'play' | 'rest' | 'encourage') {
    const { data, error } = await supabase.rpc('pet_interact', { p_pet_id: petId, p_interaction: interaction });
    if (error) throw error;
    return data;
  },

  async refreshState(petId: string) {
    const { data, error } = await supabase.rpc('update_pet_state', { p_pet_id: petId });
    if (error) throw error;
    return data;
  },

  async getStatesHistory(petId: string, limit = 20): Promise<PetStateLog[]> {
    const { data } = await supabase
      .from('pet_states')
      .select('*')
      .eq('pet_id', petId)
      .order('calculated_at', { ascending: false })
      .limit(limit);
    return (data as PetStateLog[]) ?? [];
  },
};
