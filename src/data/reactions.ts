import type { PetType } from '@/types/database';

export type InteractionType = 'pet' | 'feed' | 'play' | 'rest' | 'encourage';

export interface ReactionConfig {
  expression: 'love' | 'eat' | 'playful' | 'sleep' | 'cheer';
  particle: string;
  particleColor: string;
  messages: Record<PetType, string[]>;
}

export const REACTION_CONFIGS: Record<InteractionType, ReactionConfig> = {
  pet: {
    expression: 'love',
    particle: '♥',
    particleColor: '#fb7185',
    messages: {
      cat: ['Purr... that feels nice', 'You have good hands', 'Mmm, approved'],
      dog: ['I love you so much!', 'More pats please!', 'You\'re the best!'],
      bunny: ['That\'s so gentle...', 'My ears are tingling!', 'Soft and warm'],
      fox: ['Clever pets accepted', 'I allow this', 'You know exactly where'],
      panda: ['That\'s... nice', 'Slow and gentle, just right', 'Mmm, peaceful'],
      koala: ['So relaxing...', 'You calm me', 'Gentle like a breeze'],
      hamster: ['Tiny happy squeak!', 'Do it again!', 'Wheee!'],
      penguin: ['I tolerate this', '...okay, once more', 'Steady and calm'],
    },
  },
  feed: {
    expression: 'eat',
    particle: '✦',
    particleColor: '#fbbf24',
    messages: {
      cat: ['Yum, acceptable.', 'My compliments.', 'About time.'],
      dog: ['Om nom nom!', 'Best meal ever!', 'Can I have more?!'],
      bunny: ['A crunchy treat!', 'Munch munch munch...', 'So fresh!'],
      fox: ['A strategic snack.', 'Fuel for the mind.', 'Well chosen.'],
      panda: ['Bamboo... perfect.', 'Slow eating, long joy.', 'Mmm, balanced.'],
      koala: ['A cozy snack.', 'Just what I needed.', 'Gentle fuel.'],
      hamster: ['STUFFING CHEEKS!', 'So much food!', 'My favorite!'],
      penguin: ['Sustenance acquired.', 'Good fuel.', 'Ready to march.'],
    },
  },
  play: {
    expression: 'playful',
    particle: '✦',
    particleColor: '#f472b6',
    messages: {
      cat: ['I\'ll chase it... maybe.', 'My paws are ready!', 'This is acceptable play.'],
      dog: ['FETCH FETCH FETCH!', 'I caught it!!', 'Again again again!'],
      bunny: ['Boing boing!', 'Hop hop hop!', 'This is so fun!'],
      fox: ['Outsmarted the toy!', 'My turn to win.', 'Clever play!'],
      panda: ['A gentle tumble...', 'Slow motion play.', 'This is nice.'],
      koala: ['A little stretch...', 'Lazy play is best.', 'Just enough movement.'],
      hamster: ['WHEEL TIME!', 'Zoom zoom zoom!', 'I\'m a blur!'],
      penguin: ['Slide time!', 'Wheee on the ice!', 'Perfect glide.'],
    },
  },
  rest: {
    expression: 'sleep',
    particle: 'z',
    particleColor: '#a78bfa',
    messages: {
      cat: ['Nap time... purr...', 'Don\'t wake me.', 'Cats nap 16 hours.'],
      dog: ['Cozy nap time!', 'Zzz... dreaming of treats...', 'I\'ll guard you in sleep.'],
      bunny: ['Snug as a bug...', 'Flopping down to rest.', 'Warm and safe.'],
      fox: ['Strategic rest.', 'Recharging cleverness.', 'Foxes rest smart.'],
      panda: ['Long, slow rest...', 'Balance means rest too.', 'Peaceful bamboo dreams.'],
      koala: ['My specialty!', 'Rest is productive.', 'Gentle sleep...'],
      hamster: ['Tiny power nap!', 'Zzz... just 5 minutes...', 'Burrowing in!'],
      penguin: ['Resting on the ice.', 'Steady recovery.', 'Tomorrow we march.'],
    },
  },
  encourage: {
    expression: 'cheer',
    particle: '✦',
    particleColor: '#22c55e',
    messages: {
      cat: ['You\'re doing well. Continue.', 'I believe in you. Quietly.', 'Keep going. I notice.'],
      dog: ['YOU GOT THIS!!', 'I\'m so proud of you!', 'Keep going, buddy!'],
      bunny: ['You\'re doing amazing!', 'Every step counts!', 'I believe in you!'],
      fox: ['Strategy is paying off.', 'Stay sharp, keep going.', 'Your plan is working.'],
      panda: ['Slow and steady wins.', 'You\'re doing just right.', 'No rush. You\'re enough.'],
      koala: ['Be kind to yourself.', 'Rest counts too.', 'You\'re enough as you are.'],
      hamster: ['Go go go!!', 'One more task!', 'You\'re on fire!'],
      penguin: ['One step at a time.', 'Steady progress is progress.', 'I march with you.'],
    },
  },
};

export function getRandomMessage(type: InteractionType, petType: PetType): string {
  const messages = REACTION_CONFIGS[type].messages[petType];
  return messages[Math.floor(Math.random() * messages.length)];
}
