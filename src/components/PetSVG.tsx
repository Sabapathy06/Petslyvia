import type { PetType, PetState } from '@/types/database';
import type { PetStage, EquippedAccessories } from '@/types/game';
import type { ReactionConfig } from '@/data/reactions';

interface PetSVGProps {
  type: PetType;
  state?: PetState;
  stage?: PetStage;
  size?: number;
  animationKey?: number;
  reaction?: { config: ReactionConfig; id: number } | null;
  equipped?: EquippedAccessories | null;
  className?: string;
}

const PET_COLORS: Record<PetType, { body: string; bodyDark: string; ear: string; accent: string; belly: string }> = {
  cat: { body: '#fbbf24', bodyDark: '#f59e0b', ear: '#f59e0b', accent: '#fcd34d', belly: '#fef3c7' },
  dog: { body: '#f97316', bodyDark: '#ea580c', ear: '#c2410c', accent: '#fdba74', belly: '#fed7aa' },
  bunny: { body: '#f9a8d4', bodyDark: '#f472b6', ear: '#ec4899', accent: '#fbcfe8', belly: '#fce7f3' },
  fox: { body: '#fb923c', bodyDark: '#f97316', ear: '#ea580c', accent: '#fdba74', belly: '#ffedd5' },
  panda: { body: '#f8fafc', bodyDark: '#e2e8f0', ear: '#1e293b', accent: '#cbd5e1', belly: '#f1f5f9' },
  koala: { body: '#93c5fd', bodyDark: '#60a5fa', ear: '#3b82f6', accent: '#bfdbfe', belly: '#dbeafe' },
  hamster: { body: '#fcd34d', bodyDark: '#fbbf24', ear: '#f59e0b', accent: '#fef3c7', belly: '#fffbeb' },
  penguin: { body: '#1e293b', bodyDark: '#0f172a', ear: '#0f172a', accent: '#fbbf24', belly: '#f8fafc' },
};

export function PetSVG({
  type = 'cat',
  state = 'neutral',
  stage = 'infant',
  size = 200,
  animationKey = 0,
  reaction = null,
  equipped = null,
  className = '',
}: PetSVGProps) {
  const c = PET_COLORS[type] || PET_COLORS.cat;
  const isLowEnergy = state === 'tired' || state === 'sleepy' || state === 'recovering';
  const isHappy = state === 'happy' || state === 'excited' || state === 'energetic';
  const isFocused = state === 'focused';
  const isSleeping = state === 'sleepy';

  const reactionExpression = reaction?.config.expression;
  const reactionId = reaction?.id;

  const eyeState = isSleeping ? 'closed' : isFocused ? 'focused' : isLowEnergy ? 'tired' : 'open';
  const mouthState = isHappy ? 'happy' : isSleeping ? 'sleeping' : isLowEnergy ? 'flat' : 'neutral';

  // Stage scaling and adjustments
  // Stage scaling and adjustments
  const stageScale = stage === 'infant' ? 0.85 : stage === 'child' ? 1.0 : stage === 'teen' ? 1.15 : 1.25;
  const stageOffsetY = stage === 'infant' ? 14 : stage === 'child' ? 0 : stage === 'teen' ? -10 : -16;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`pet-svg select-none ${className}`}
      key={reactionId ?? animationKey}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Glow Filters */}
        <filter id="pet-glow-aura" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <radialGradient id="teen-aura-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#c084fc" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="adult-aura-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="100" cy="180" rx={stage === 'infant' ? 36 : stage === 'adult' ? 56 : 48} ry="7" fill="#00000025" />

      {/* Evolution Stage Aura Rings & Celestial Wings for Adult */}
      {stage === 'teen' && (
        <circle cx="100" cy="115" r="74" fill="url(#teen-aura-grad)" className="animate-pulse" />
      )}
      {stage === 'adult' && (
        <g>
          <circle cx="100" cy="110" r="86" fill="url(#adult-aura-grad)" className="animate-pulse" />
          {/* Celestial Astral Wings */}
          <path
            d="M 55,105 C 10,70 15,120 50,135 C 25,120 20,90 55,105 Z"
            fill="#fbbf24"
            opacity="0.8"
            filter="url(#pet-glow-aura)"
          />
          <path
            d="M 145,105 C 190,70 185,120 150,135 C 175,120 180,90 145,105 Z"
            fill="#fbbf24"
            opacity="0.8"
            filter="url(#pet-glow-aura)"
          />
          {/* Golden Rune Halo */}
          <ellipse cx="100" cy="35" rx="34" ry="9" fill="none" stroke="#fcd34d" strokeWidth="2.5" opacity="0.85" filter="url(#pet-glow-aura)" />
        </g>
      )}

      {/* Main Pet Body Group with Stage Scaling */}
      <g
        transform={`translate(${100 * (1 - stageScale)}, ${stageOffsetY + 140 * (1 - stageScale)}) scale(${stageScale})`}
        style={{
          transformOrigin: '100px 140px',
        }}
      >
        {/* Idle bounce group */}
        <g
          style={{
            animation: isSleeping
              ? 'pet-breathe 3s ease-in-out infinite'
              : reactionExpression
                ? 'pet-react 0.6s ease-out'
                : 'pet-bounce 2.5s ease-in-out infinite',
            transformOrigin: '100px 140px',
          }}
        >
          {/* BACK ACCESSORY: Cape or Backpack */}
          {equipped?.back && renderBackAccessory(equipped.back)}

          {/* Bottom Feet / Paws */}
          {renderBottomFeet(type, c)}

          {/* Ears */}
          {renderEars(type, c, reactionExpression)}

          {/* Teen/Adult Horns or Crest */}
          {(stage === 'teen' || stage === 'adult') && (
            <g>
              <path d="M 80,50 Q 75,30 68,33 Q 78,44 84,52 Z" fill={stage === 'adult' ? '#f59e0b' : '#6366f1'} />
              <path d="M 120,50 Q 125,30 132,33 Q 122,44 116,52 Z" fill={stage === 'adult' ? '#f59e0b' : '#6366f1'} />
              <circle cx="68" cy="33" r="3.5" fill={stage === 'adult' ? '#fde68a' : '#a5b4fc'} />
              <circle cx="132" cy="33" r="3.5" fill={stage === 'adult' ? '#fde68a' : '#a5b4fc'} />
            </g>
          )}

          {/* Body */}
          <ellipse cx="100" cy="130" rx="48" ry="45" fill={c.body} />
          <ellipse cx="100" cy="140" rx="32" ry="30" fill={c.belly} opacity="0.75" />

          {/* Child Explorer Scarf / Bandana */}
          {stage === 'child' && (
            <path d="M 82,108 Q 100,120 118,108 Q 100,114 82,108 Z" fill="#10b981" />
          )}

          {/* Adult Mystical Chest Gem */}
          {stage === 'adult' && (
            <polygon points="100,122 106,132 100,142 94,132" fill="#fbbf24" stroke="#fff" strokeWidth="1.5" filter="url(#pet-glow-aura)" />
          )}

          {/* BODY ACCESSORY: Shirt, Dress, Tuxedo */}
          {equipped?.body && renderBodyAccessory(equipped.body)}

          {/* Head */}
          <circle cx="100" cy="85" r={stage === 'infant' ? 44 : 42} fill={c.body} />

          {/* Face details */}
          {renderFace(type, c)}

          {/* SPECIAL: Ninja mask or costume overlay */}
          {equipped?.special === 'costume_ninja' && (
            <path d="M 68,75 Q 100,68 132,75 L 132,105 Q 100,115 68,105 Z" fill="#0f172a" opacity="0.9" />
          )}

          {/* Eyes */}
          {reactionExpression ? renderReactionEyes(reactionExpression) : renderEyes(eyeState, c)}

          {/* EYES ACCESSORY: Glasses, Shades, Goggles */}
          {equipped?.eyes && renderEyesAccessory(equipped.eyes)}

          {/* Nose */}
          <ellipse cx="100" cy="92" rx="3.5" ry="2.5" fill="#1e293b" />

          {/* Mouth */}
          {reactionExpression ? renderReactionMouth(reactionExpression) : renderMouth(mouthState)}

          {/* Cheeks */}
          {(isHappy || stage === 'infant') && (
            <>
              <circle cx="76" cy="95" r={stage === 'infant' ? 7 : 6} fill="#fb7185" opacity={stage === 'infant' ? 0.6 : 0.45} />
              <circle cx="124" cy="95" r={stage === 'infant' ? 7 : 6} fill="#fb7185" opacity={stage === 'infant' ? 0.6 : 0.45} />
            </>
          )}

          {/* Infant Fairy Sparkles */}
          {stage === 'infant' && (
            <g opacity="0.85">
              <circle cx="64" cy="55" r="3" fill="#fef08a" />
              <circle cx="136" cy="58" r="2.5" fill="#fef08a" />
              <circle cx="100" cy="46" r="2" fill="#fed7aa" />
            </g>
          )}

          {/* HEAD ACCESSORY: Cap, Wizard Hat, Crown */}
          {equipped?.head && renderHeadAccessory(equipped.head)}

          {/* FRONT PAWS WITH CUTE PAW PADS & BEANS */}
          {renderFrontPaws(type, c, isHappy || reactionExpression === 'playful', stage)}

          {/* FEET ACCESSORY: Sneakers or Boots */}
          {equipped?.feet && renderFeetAccessory(equipped.feet)}
        </g>
      </g>
    </svg>
  );
}

// ----------------------------------------------------
// HEAD ACCESSORIES
// ----------------------------------------------------
function renderHeadAccessory(headId: string) {
  switch (headId) {
    case 'cap_starter':
      return (
        <g id="acc_cap_starter">
          {/* Red Baseball Cap */}
          <path d="M 66,66 Q 100,42 134,66 Q 100,58 66,66 Z" fill="#dc2626" />
          <ellipse cx="100" cy="58" rx="26" ry="12" fill="#ef4444" />
          {/* Cap Visor */}
          <path d="M 64,65 Q 40,68 45,74 Q 80,72 105,66 Z" fill="#b91c1c" />
          <circle cx="100" cy="46" r="3" fill="#ffffff" />
        </g>
      );
    case 'hat_wizard':
      return (
        <g id="acc_hat_wizard">
          {/* Wizard Hat Cone */}
          <path d="M 60,65 L 98,12 L 138,65 Q 100,55 60,65 Z" fill="#7c3aed" />
          <ellipse cx="99" cy="65" rx="42" ry="10" fill="#6d28d9" />
          {/* Gold Stars */}
          <polygon points="98,32 100,38 106,38 101,42 103,48 98,44 93,48 95,42 90,38 96,38" fill="#fbbf24" />
          <circle cx="98" cy="12" r="4" fill="#fbbf24" />
        </g>
      );
    case 'crown_golden':
      return (
        <g id="acc_crown_golden">
          {/* Gold King Crown */}
          <polygon points="68,62 72,42 86,52 100,38 114,52 128,42 132,62" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
          <ellipse cx="100" cy="62" rx="32" ry="6" fill="#fbbf24" />
          <circle cx="72" cy="42" r="3" fill="#ef4444" />
          <circle cx="100" cy="38" r="3.5" fill="#3b82f6" />
          <circle cx="128" cy="42" r="3" fill="#10b981" />
        </g>
      );
    default:
      return null;
  }
}

// ----------------------------------------------------
// EYES ACCESSORIES
// ----------------------------------------------------
function renderEyesAccessory(eyesId: string) {
  switch (eyesId) {
    case 'glasses_round':
      return (
        <g id="acc_glasses_round">
          {/* Wire frame glasses */}
          <circle cx="85" cy="85" r="11" fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
          <circle cx="115" cy="85" r="11" fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
          <line x1="96" y1="85" x2="104" y2="85" stroke="#0ea5e9" strokeWidth="2.5" />
          <line x1="74" y1="84" x2="62" y2="80" stroke="#0ea5e9" strokeWidth="2" />
          <line x1="126" y1="84" x2="138" y2="80" stroke="#0ea5e9" strokeWidth="2" />
        </g>
      );
    case 'shades_cool':
      return (
        <g id="acc_shades_cool">
          {/* Dark cool sunglasses */}
          <polygon points="72,78 96,78 92,94 76,94" fill="#0f172a" />
          <polygon points="104,78 128,78 124,94 108,94" fill="#0f172a" />
          <line x1="96" y1="80" x2="104" y2="80" stroke="#0f172a" strokeWidth="3" />
          <polygon points="76,82 88,82 82,86 78,86" fill="#10b981" opacity="0.75" />
          <polygon points="108,82 120,82 114,86 110,86" fill="#10b981" opacity="0.75" />
        </g>
      );
    case 'goggles_vr':
      return (
        <g id="acc_goggles_vr">
          {/* Cyber matrix visor */}
          <rect x="70" y="76" width="60" height="18" rx="8" fill="#06b6d4" opacity="0.9" stroke="#0891b2" strokeWidth="2" />
          <line x1="76" y1="85" x2="124" y2="85" stroke="#ecfeff" strokeWidth="2" strokeDasharray="4 2" />
          <rect x="58" y="80" width="14" height="8" rx="3" fill="#1e293b" />
          <rect x="128" y="80" width="14" height="8" rx="3" fill="#1e293b" />
        </g>
      );
    default:
      return null;
  }
}

// ----------------------------------------------------
// BODY ACCESSORIES
// ----------------------------------------------------
function renderBodyAccessory(bodyId: string) {
  switch (bodyId) {
    case 'shirt_striped':
      return (
        <g id="acc_shirt_striped">
          {/* Main Fitted Tee Torso */}
          <path
            d="M 68,105 Q 100,114 132,105 L 144,130 L 142,166 Q 100,174 58,166 L 56,130 Z"
            fill="#3b82f6"
          />
          {/* Sleeves */}
          <path d="M 68,105 L 52,122 L 58,136 L 68,124 Z" fill="#2563eb" />
          <path d="M 132,105 L 148,122 L 142,136 L 132,124 Z" fill="#2563eb" />
          {/* Collar */}
          <path d="M 76,104 Q 100,116 124,104" stroke="#1d4ed8" strokeWidth="3" fill="none" />
          {/* White Nautical Stripes */}
          <path d="M 62,120 Q 100,128 138,120" stroke="#ffffff" strokeWidth="3.5" fill="none" />
          <path d="M 59,134 Q 100,142 141,134" stroke="#ffffff" strokeWidth="3.5" fill="none" />
          <path d="M 58,148 Q 100,156 142,148" stroke="#ffffff" strokeWidth="3.5" fill="none" />
          <path d="M 60,160 Q 100,166 140,160" stroke="#ffffff" strokeWidth="2.5" fill="none" />
        </g>
      );
    case 'dress_spring':
      return (
        <g id="acc_dress_spring">
          {/* Shoulder Straps & Bodice */}
          <path
            d="M 72,103 Q 100,114 128,103 L 136,134 Q 100,140 64,134 Z"
            fill="#ec4899"
          />
          {/* Lacy Ruffle Collar */}
          <path
            d="M 70,103 Q 100,116 130,103"
            stroke="#fce7f3"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Waist Satin Sash / Ribbon */}
          <path d="M 64,133 Q 100,140 136,133" stroke="#f472b6" strokeWidth="5" fill="none" />
          <ellipse cx="100" cy="136" rx="5" ry="3.5" fill="#fdf2f8" />
          {/* Full Flared Pleated Skirt */}
          <path
            d="M 64,135 Q 100,140 136,135 L 148,168 Q 100,178 52,168 Z"
            fill="#db2777"
          />
          {/* Scalloped Hem Ruffles */}
          <path
            d="M 53,167 Q 65,172 77,168 Q 89,173 101,168 Q 113,173 125,168 Q 137,172 147,167"
            stroke="#fbcfe8"
            strokeWidth="3"
            fill="none"
          />
          {/* Floral Blossom Embroidery */}
          <circle cx="80" cy="122" r="3" fill="#fef08a" />
          <circle cx="120" cy="122" r="3" fill="#fef08a" />
          <circle cx="75" cy="152" r="3.5" fill="#fef08a" />
          <circle cx="100" cy="156" r="3.5" fill="#fef08a" />
          <circle cx="125" cy="152" r="3.5" fill="#fef08a" />
        </g>
      );
    case 'suit_tuxedo':
      return (
        <g id="acc_suit_tuxedo">
          {/* Tuxedo Jacket */}
          <path
            d="M 66,104 Q 100,112 134,104 L 144,166 Q 100,174 56,166 Z"
            fill="#0f172a"
          />
          {/* White Shirt Front */}
          <polygon points="86,105 114,105 108,150 92,150" fill="#f8fafc" />
          {/* Black Satin Lapels */}
          <polygon points="68,104 86,105 94,142 80,140" fill="#1e293b" />
          <polygon points="132,104 114,105 106,142 120,140" fill="#1e293b" />
          {/* Red Bowtie */}
          <polygon points="92,109 100,113 92,117" fill="#ef4444" />
          <polygon points="108,109 100,113 108,117" fill="#ef4444" />
          <circle cx="100" cy="113" r="2" fill="#b91c1c" />
          {/* Tuxedo Buttons */}
          <circle cx="100" cy="124" r="1.8" fill="#1e293b" />
          <circle cx="100" cy="133" r="1.8" fill="#1e293b" />
          <circle cx="100" cy="142" r="1.8" fill="#1e293b" />
        </g>
      );
    default:
      return null;
  }
}

// ----------------------------------------------------
// BACK ACCESSORIES
// ----------------------------------------------------
function renderBackAccessory(backId: string) {
  switch (backId) {
    case 'backpack_adventure':
      return (
        <g id="acc_backpack_adventure">
          <rect x="42" y="115" width="20" height="34" rx="7" fill="#d97706" stroke="#b45309" strokeWidth="1.5" />
          <rect x="46" y="125" width="12" height="14" rx="3" fill="#f59e0b" />
          <line x1="60" y1="120" x2="72" y2="135" stroke="#78350f" strokeWidth="2.5" />
        </g>
      );
    case 'cape_hero':
      return (
        <g id="acc_cape_hero">
          <path d="M 64,115 Q 35,145 42,175 Q 80,165 96,155 Q 85,130 76,115 Z" fill="#dc2626" opacity="0.95" />
          <path d="M 66,115 L 72,118" stroke="#facc15" strokeWidth="3" />
        </g>
      );
    default:
      return null;
  }
}

// ----------------------------------------------------
// FEET ACCESSORIES
// ----------------------------------------------------
function renderFeetAccessory(feetId: string) {
  switch (feetId) {
    case 'shoes_sneakers':
      return (
        <g id="acc_shoes_sneakers">
          <ellipse cx="78" cy="172" rx="14" ry="6" fill="#10b981" />
          <ellipse cx="122" cy="172" rx="14" ry="6" fill="#10b981" />
          <line x1="72" y1="172" x2="84" y2="172" stroke="#ffffff" strokeWidth="2" />
          <line x1="116" y1="172" x2="128" y2="172" stroke="#ffffff" strokeWidth="2" />
        </g>
      );
    case 'shoes_boots':
      return (
        <g id="acc_shoes_boots">
          <rect x="66" y="164" width="24" height="12" rx="5" fill="#78716c" stroke="#44403c" strokeWidth="1.5" />
          <rect x="110" y="164" width="24" height="12" rx="5" fill="#78716c" stroke="#44403c" strokeWidth="1.5" />
        </g>
      );
    default:
      return null;
  }
}

// ----------------------------------------------------
// BASE PET PARTS RENDERING HELPERS
// ----------------------------------------------------
function renderEars(type: PetType, c: { ear: string; body: string; bodyDark: string; accent: string }, _reactionExpression?: string) {
  switch (type) {
    case 'cat':
      return (
        <g>
          <polygon points="68,58 56,22 84,48" fill={c.ear} />
          <polygon points="70,54 62,30 82,46" fill="#fce7f3" />
          <polygon points="132,58 144,22 116,48" fill={c.ear} />
          <polygon points="130,54 138,30 118,46" fill="#fce7f3" />
        </g>
      );
    case 'dog':
      return (
        <g>
          <ellipse cx="60" cy="72" rx="12" ry="22" fill={c.ear} transform="rotate(-15 60 72)" />
          <ellipse cx="140" cy="72" rx="12" ry="22" fill={c.ear} transform="rotate(15 140 72)" />
        </g>
      );
    case 'bunny':
      return (
        <g>
          <ellipse cx="76" cy="36" rx="10" ry="32" fill={c.ear} transform="rotate(-8 76 36)" />
          <ellipse cx="76" cy="36" rx="5" ry="24" fill="#fce7f3" transform="rotate(-8 76 36)" />
          <ellipse cx="124" cy="36" rx="10" ry="32" fill={c.ear} transform="rotate(8 124 36)" />
          <ellipse cx="124" cy="36" rx="5" ry="24" fill="#fce7f3" transform="rotate(8 124 36)" />
        </g>
      );
    case 'fox':
      return (
        <g>
          <polygon points="66,60 52,18 86,46" fill={c.ear} />
          <polygon points="68,54 58,26 82,44" fill="#1e293b" />
          <polygon points="134,60 148,18 114,46" fill={c.ear} />
          <polygon points="132,54 142,26 118,44" fill="#1e293b" />
        </g>
      );
    case 'panda':
      return (
        <g>
          <circle cx="66" cy="52" r="14" fill="#1e293b" />
          <circle cx="134" cy="52" r="14" fill="#1e293b" />
        </g>
      );
    case 'koala':
      return (
        <g>
          <circle cx="58" cy="58" r="18" fill={c.ear} />
          <circle cx="58" cy="58" r="11" fill="#e2e8f0" />
          <circle cx="142" cy="58" r="18" fill={c.ear} />
          <circle cx="142" cy="58" r="11" fill="#e2e8f0" />
        </g>
      );
    case 'hamster':
      return (
        <g>
          <circle cx="68" cy="54" r="11" fill={c.ear} />
          <circle cx="68" cy="54" r="6" fill="#fce7f3" />
          <circle cx="132" cy="54" r="11" fill={c.ear} />
          <circle cx="132" cy="54" r="6" fill="#fce7f3" />
        </g>
      );
    case 'penguin':
      return null;
  }
}

function renderFace(type: PetType, c: { accent: string; body: string }) {
  if (type === 'panda') {
    return (
      <g>
        <ellipse cx="84" cy="82" rx="10" ry="12" fill="#1e293b" transform="rotate(-15 84 82)" />
        <ellipse cx="116" cy="82" rx="10" ry="12" fill="#1e293b" transform="rotate(15 116 82)" />
      </g>
    );
  }
  if (type === 'fox') {
    return (
      <g>
        <polygon points="100,92 68,82 66,95 100,108" fill="#fff" opacity="0.9" />
        <polygon points="100,92 132,82 134,95 100,108" fill="#fff" opacity="0.9" />
      </g>
    );
  }
  if (type === 'cat') {
    return (
      <g>
        <line x1="60" y1="90" x2="44" y2="87" stroke="#d97706" strokeWidth="1.5" />
        <line x1="60" y1="95" x2="42" y2="96" stroke="#d97706" strokeWidth="1.5" />
        <line x1="140" y1="90" x2="156" y2="87" stroke="#d97706" strokeWidth="1.5" />
        <line x1="140" y1="95" x2="158" y2="96" stroke="#d97706" strokeWidth="1.5" />
      </g>
    );
  }
  if (type === 'penguin') {
    return (
      <g>
        <polygon points="94,90 106,90 100,100" fill="#f59e0b" />
      </g>
    );
  }
  return null;
}

function renderEyes(eyeState: string, c: { bodyDark: string }) {
  if (eyeState === 'closed') {
    return (
      <g>
        <path d="M 78 85 Q 85 91 92 85" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 108 85 Q 115 91 122 85" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (eyeState === 'tired') {
    return (
      <g>
        <path d="M 78 84 Q 85 80 92 84" stroke="#1e293b" strokeWidth="2" fill="none" />
        <circle cx="85" cy="86" r="3" fill="#1e293b" />
        <path d="M 108 84 Q 115 80 122 84" stroke="#1e293b" strokeWidth="2" fill="none" />
        <circle cx="115" cy="86" r="3" fill="#1e293b" />
      </g>
    );
  }
  if (eyeState === 'focused') {
    return (
      <g>
        <circle cx="85" cy="83" r="5" fill="#1e293b" />
        <circle cx="87" cy="81" r="2" fill="#fff" />
        <circle cx="115" cy="83" r="5" fill="#1e293b" />
        <circle cx="117" cy="81" r="2" fill="#fff" />
        <line x1="77" y1="76" x2="91" y2="78" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        <line x1="123" y1="76" x2="109" y2="78" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <circle cx="85" cy="83" r="5.5" fill="#1e293b" />
      <circle cx="87" cy="81" r="2" fill="#fff" />
      <circle cx="115" cy="83" r="5.5" fill="#1e293b" />
      <circle cx="117" cy="81" r="2" fill="#fff" />
    </g>
  );
}

function renderMouth(mouthState: string) {
  if (mouthState === 'happy') {
    return (
      <path d="M 94 98 Q 100 106 106 98" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    );
  }
  if (mouthState === 'sleeping') {
    return (
      <path d="M 96 99 Q 100 101 104 99" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    );
  }
  if (mouthState === 'flat') {
    return (
      <line x1="95" y1="100" x2="105" y2="100" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
    );
  }
  return (
    <path d="M 95 98 Q 100 102 105 98" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
  );
}

function renderReactionEyes(expr: string) {
  if (expr === 'love' || expr === 'petting') {
    return (
      <g>
        <path d="M 81,80 C 81,77 77,75 75,78 C 73,75 69,77 69,80 C 69,84 75,88 75,88 C 75,88 81,84 81,80 Z" fill="#fb7185" transform="scale(1.2) translate(-14,-14)" />
        <path d="M 121,80 C 121,77 117,75 115,78 C 113,75 109,77 109,80 C 109,84 115,88 115,88 C 115,88 121,84 121,80 Z" fill="#fb7185" transform="scale(1.2) translate(-21,-14)" />
      </g>
    );
  }
  if (expr === 'victory' || expr === 'win' || expr === 'happy') {
    return (
      <g>
        {/* Happy closed arched eyes ^^ */}
        <path d="M 76,84 Q 85,76 94,84" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 106,84 Q 115,76 124,84" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (expr === 'hurt' || expr === 'collision' || expr === 'lose' || expr === 'failed') {
    return (
      <g>
        {/* Dizzy / hurt cross eyes xx */}
        <line x1="78" y1="78" x2="90" y2="88" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="90" y1="78" x2="78" y2="88" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="110" y1="78" x2="122" y2="88" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="122" y1="78" x2="110" y2="88" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        {/* Tear drops */}
        <path d="M 72,86 C 72,82 76,82 76,86 C 76,89 72,93 72,93 C 72,93 68,89 68,86 Z" fill="#38bdf8" />
        <path d="M 128,86 C 128,82 132,82 132,86 C 132,89 128,93 128,93 C 128,93 124,89 124,86 Z" fill="#38bdf8" />
      </g>
    );
  }
  if (expr === 'sleep' || expr === 'rest') {
    return (
      <g>
        <path d="M 78 85 Q 85 91 92 85" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 108 85 Q 115 91 122 85" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  return null;
}

function renderReactionMouth(expr: string) {
  if (expr === 'eat' || expr === 'eating') {
    return (
      <g>
        <ellipse cx="100" cy="101" rx="6" ry="7" fill="#1e293b" />
        {/* Tongue */}
        <path d="M 96,104 Q 100,108 104,104" fill="#fb7185" />
      </g>
    );
  }
  if (expr === 'hurt' || expr === 'collision' || expr === 'lose' || expr === 'failed') {
    return (
      <path d="M 94 102 Q 100 96 106 102" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    );
  }
  if (expr === 'victory' || expr === 'win' || expr === 'love') {
    return (
      <path d="M 92 97 Q 100 108 108 97" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    );
  }
  return null;
}

// Render grounded bottom feet / paws
function renderBottomFeet(_type: PetType, c: { bodyDark: string; body: string }) {
  return (
    <g id="pet-bottom-feet">
      {/* Left Bottom Foot */}
      <g>
        <ellipse cx="72" cy="168" rx="14" ry="9" fill={c.bodyDark} />
        {/* Foot Toe Pads */}
        <circle cx="65" cy="168" r="3" fill="#f472b6" opacity="0.8" />
        <circle cx="72" cy="170" r="3.5" fill="#f472b6" opacity="0.8" />
        <circle cx="79" cy="168" r="3" fill="#f472b6" opacity="0.8" />
      </g>
      {/* Right Bottom Foot */}
      <g>
        <ellipse cx="128" cy="168" rx="14" ry="9" fill={c.bodyDark} />
        {/* Foot Toe Pads */}
        <circle cx="121" cy="168" r="3" fill="#f472b6" opacity="0.8" />
        <circle cx="128" cy="170" r="3.5" fill="#f472b6" opacity="0.8" />
        <circle cx="135" cy="168" r="3" fill="#f472b6" opacity="0.8" />
      </g>
    </g>
  );
}

// Render cute front paws with adorable pink paw pads & toe beans
function renderFrontPaws(
  _type: PetType,
  c: { bodyDark: string; body: string },
  isExcited: boolean,
  stage: PetStage
) {
  const leftPaw = isExcited ? { cx: 64, cy: 114, rx: 11, ry: 9 } : { cx: 74, cy: 136, rx: 11, ry: 9 };
  const rightPaw = isExcited ? { cx: 136, cy: 114, rx: 11, ry: 9 } : { cx: 126, cy: 136, rx: 11, ry: 9 };

  return (
    <g id="pet-front-paws">
      {/* Left Front Paw */}
      <g>
        <ellipse cx={leftPaw.cx} cy={leftPaw.cy} rx={leftPaw.rx} ry={leftPaw.ry} fill={c.bodyDark} />
        {/* Main Center Paw Pad */}
        <ellipse cx={leftPaw.cx} cy={leftPaw.cy + 1} rx="4.5" ry="3.5" fill="#fb7185" />
        {/* 3 Toe Beans */}
        <circle cx={leftPaw.cx - 4.5} cy={leftPaw.cy - 3} r="1.8" fill="#fda4af" />
        <circle cx={leftPaw.cx} cy={leftPaw.cy - 4.5} r="2" fill="#fda4af" />
        <circle cx={leftPaw.cx + 4.5} cy={leftPaw.cy - 3} r="1.8" fill="#fda4af" />
        {/* Mystical Rune on Teen/Adult */}
        {(stage === 'teen' || stage === 'adult') && (
          <circle cx={leftPaw.cx} cy={leftPaw.cy} r="1.5" fill="#fff" opacity="0.9" />
        )}
      </g>

      {/* Right Front Paw */}
      <g>
        <ellipse cx={rightPaw.cx} cy={rightPaw.cy} rx={rightPaw.rx} ry={rightPaw.ry} fill={c.bodyDark} />
        {/* Main Center Paw Pad */}
        <ellipse cx={rightPaw.cx} cy={rightPaw.cy + 1} rx="4.5" ry="3.5" fill="#fb7185" />
        {/* 3 Toe Beans */}
        <circle cx={rightPaw.cx - 4.5} cy={rightPaw.cy - 3} r="1.8" fill="#fda4af" />
        <circle cx={rightPaw.cx} cy={rightPaw.cy - 4.5} r="2" fill="#fda4af" />
        <circle cx={rightPaw.cx + 4.5} cy={rightPaw.cy - 3} r="1.8" fill="#fda4af" />
        {/* Mystical Rune on Teen/Adult */}
        {(stage === 'teen' || stage === 'adult') && (
          <circle cx={rightPaw.cx} cy={rightPaw.cy} r="1.5" fill="#fff" opacity="0.9" />
        )}
      </g>
    </g>
  );
}
