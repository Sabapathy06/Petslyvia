import { useState, useCallback, useRef } from 'react';
import { petService } from '@/services';
import { REACTION_CONFIGS, getRandomMessage } from '@/data/reactions';
import type { PetType, InteractionType } from '@/types/database';
import type { ReactionConfig } from '@/data/reactions';
import { sound } from '@/utils/audio';

interface PetReactionState {
  reaction: { config: ReactionConfig; id: number } | null;
  message: string | null;
  interacting: InteractionType | null;
}

interface PetReactionHook extends PetReactionState {
  interact: (petId: string, type: InteractionType, petType: PetType, onDone?: () => void) => Promise<void>;
}

export function usePetReaction(): PetReactionHook {
  const [state, setState] = useState<PetReactionState>({
    reaction: null,
    message: null,
    interacting: null,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const interact = useCallback(async (petId: string, type: InteractionType, petType: PetType, onDone?: () => void) => {
    setState((s) => ({ ...s, interacting: type }));

    // Trigger audio for the emotion
    if (type === 'pet') sound.playPet();
    else if (type === 'feed') sound.playEat();
    else if (type === 'play') sound.playHappy();
    else if (type === 'rest') sound.playSleep();
    else if (type === 'encourage') sound.playSparkle();

    const config = REACTION_CONFIGS[type];
    const id = Date.now();
    const message = getRandomMessage(type, petType);

    setState((s) => ({ ...s, reaction: { config, id }, message }));

    try {
      await petService.interact(petId, type);
      onDone?.();
    } catch (err) {
      console.error('Interaction failed:', err);
    } finally {
      setState((s) => ({ ...s, interacting: null }));
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setState((s) => ({ ...s, reaction: null, message: null }));
    }, 2200);
  }, []);

  return { ...state, interact };
}
