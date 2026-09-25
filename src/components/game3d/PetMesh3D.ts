import * as THREE from 'three';
import type { PetType } from '@/types/database';
import type { EquippedAccessories } from '@/types/game';

export interface Pet3DModel {
  group: THREE.Group;
  updateAnimation: (
    delta: number,
    time: number,
    isMoving: boolean,
    isVictory: boolean,
    isHurt: boolean,
    emotion?: 'happy' | 'excited' | 'tired' | 'sleepy' | 'eating' | 'petting' | 'victory' | 'hurt' | 'neutral' | string | null
  ) => void;
  playHop: (progress: number) => void;
  resetHop: () => void;
  playVictoryDance: (time: number) => void;
  playEating: (progress: number) => void;
  playPetting: (progress: number) => void;
  playSleeping: (time: number) => void;
  triggerBlink: () => void;
  triggerEmotionEffect: (type: 'hearts' | 'stars' | 'tears' | 'zzz' | 'crumbs') => void;
  cleanup: () => void;
  setLookTarget?: (x: number, y: number) => void;
}

// Color palettes for pet species in 3D
export const PET_3D_COLORS: Record<
  PetType,
  {
    primary: number;
    secondary: number;
    accent: number;
    belly: number;
    earInner: number;
    eye: number;
    snout: number;
    highlight: number;
  }
> = {
  cat: {
    primary: 0xf59e0b, // Warm Amber
    secondary: 0xd97706,
    accent: 0xfef08a,
    belly: 0xfef3c7,
    earInner: 0xf472b6,
    eye: 0x1e293b,
    snout: 0xfb7185,
    highlight: 0xffedd5,
  },
  dog: {
    primary: 0xea580c, // Vibrant Orange
    secondary: 0xc2410c,
    accent: 0xfdba74,
    belly: 0xffedd5,
    earInner: 0x9a3412,
    eye: 0x0f172a,
    snout: 0x1e293b,
    highlight: 0xfed7aa,
  },
  bunny: {
    primary: 0xf472b6, // Pinkish
    secondary: 0xdb2777,
    accent: 0xfbcfe8,
    belly: 0xfff1f2,
    earInner: 0xf9a8d4,
    eye: 0x831843,
    snout: 0xf43f5e,
    highlight: 0xffffff,
  },
  fox: {
    primary: 0xf97316, // Fox Orange
    secondary: 0xc2410c,
    accent: 0xffffff,
    belly: 0xffedd5,
    earInner: 0x1e293b,
    eye: 0x0f172a,
    snout: 0x18181b,
    highlight: 0xffffff,
  },
  panda: {
    primary: 0xf8fafc, // White
    secondary: 0x0f172a, // Dark
    accent: 0x334155,
    belly: 0xf1f5f9,
    earInner: 0x1e293b,
    eye: 0x020617,
    snout: 0x0f172a,
    highlight: 0xffffff,
  },
  koala: {
    primary: 0x64748b, // Slate Grey / Soft Blue
    secondary: 0x475569,
    accent: 0x94a3b8,
    belly: 0xe2e8f0,
    earInner: 0xfbcfe8,
    eye: 0x0f172a,
    snout: 0x1e293b,
    highlight: 0xf8fafc,
  },
  hamster: {
    primary: 0xfbbf24, // Golden
    secondary: 0xd97706,
    accent: 0xfef3c7,
    belly: 0xfffbeb,
    earInner: 0xf472b6,
    eye: 0x0f172a,
    snout: 0xf43f5e,
    highlight: 0xffffff,
  },
  penguin: {
    primary: 0x0f172a, // Obsidian Navy
    secondary: 0x1e293b,
    accent: 0xf59e0b, // Yellow beak/feet
    belly: 0xf8fafc,
    earInner: 0x020617,
    eye: 0x020617,
    snout: 0xf59e0b,
    highlight: 0xffffff,
  },
};

// Procedural soft airbrushed blush texture cache
let _blushTexture: THREE.CanvasTexture | null = null;
function getBlushTexture(): THREE.CanvasTexture {
  if (_blushTexture) return _blushTexture;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 58);
    grad.addColorStop(0, 'rgba(251, 113, 133, 0.95)'); // Warm soft coral-rose
    grad.addColorStop(0.35, 'rgba(244, 63, 94, 0.6)');
    grad.addColorStop(0.7, 'rgba(253, 164, 175, 0.2)');
    grad.addColorStop(1, 'rgba(253, 164, 175, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  _blushTexture = new THREE.CanvasTexture(canvas);
  return _blushTexture;
}

export function createPet3D(
  type: PetType = 'cat',
  equipped?: EquippedAccessories | null,
  scaleFactor: number = 1.0
): Pet3DModel {
  const group = new THREE.Group();
  group.name = `Pet3D_${type}`;

  const colors = PET_3D_COLORS[type] || PET_3D_COLORS.cat;

  // Ultra-cute stylized realistic materials with soft velvety fur sheen
  const highlightColor = colors.highlight || 0xffeedd;

  const primaryMat = new THREE.MeshPhysicalMaterial({
    color: colors.primary,
    roughness: 0.74,
    metalness: 0.02,
    sheen: 0.95,
    sheenRoughness: 0.35,
    sheenColor: new THREE.Color(highlightColor),
  });

  const secondaryMat = new THREE.MeshPhysicalMaterial({
    color: colors.secondary,
    roughness: 0.76,
    metalness: 0.02,
    sheen: 0.85,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color(highlightColor),
  });

  const bellyMat = new THREE.MeshPhysicalMaterial({
    color: colors.belly,
    roughness: 0.8,
    metalness: 0.0,
    sheen: 0.9,
    sheenRoughness: 0.35,
    sheenColor: new THREE.Color(0xffffff),
  });

  const earInnerMat = new THREE.MeshPhysicalMaterial({
    color: colors.earInner,
    roughness: 0.72,
    sheen: 0.85,
    sheenRoughness: 0.3,
    sheenColor: new THREE.Color(0xfbcfe8),
  });

  // Deep glassy obsidian eyes with optical depth
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x090d16,
    roughness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const eyeGlintMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  // Moist cute button nose with clearcoat shine
  const snoutMat = new THREE.MeshPhysicalMaterial({
    color: colors.snout,
    roughness: 0.25,
    clearcoat: 0.65,
    clearcoatRoughness: 0.12,
  });

  const accentMat = new THREE.MeshPhysicalMaterial({
    color: colors.accent,
    roughness: 0.72,
    sheen: 0.75,
    sheenColor: new THREE.Color(0xffffff),
  });

  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    metalness: 0.88,
    roughness: 0.18,
    clearcoat: 0.4,
    clearcoatRoughness: 0.1,
  });

  const magicGlowMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    metalness: 0.5,
    roughness: 0.2,
    emissive: 0xc084fc,
    emissiveIntensity: 0.6,
  });

  // Root Sub-groups
  const rootAnimGroup = new THREE.Group();
  group.add(rootAnimGroup);

  const bodyGroup = new THREE.Group();
  rootAnimGroup.add(bodyGroup);

  // --- 1. BODY ---
  // Cute rounded squishy body with soft fur peach-fuzz sheen
  const bodyGeo = new THREE.SphereGeometry(0.38, 28, 28);
  bodyGeo.scale(1, 0.95, 0.9);
  const bodyMesh = new THREE.Mesh(bodyGeo, primaryMat);
  bodyMesh.position.y = 0.42;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyGroup.add(bodyMesh);

  // Soft belly patch
  const bellyGeo = new THREE.SphereGeometry(0.31, 24, 24);
  bellyGeo.scale(0.82, 0.9, 0.42);
  const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
  bellyMesh.position.set(0, 0.38, 0.2);
  bodyGroup.add(bellyMesh);

  // --- 2. HEAD ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.68, 0.08);
  rootAnimGroup.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.34, 28, 28);
  headGeo.scale(1.05, 0.98, 0.95);
  const headMesh = new THREE.Mesh(headGeo, primaryMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  // Soft Airbrushed Gradient Blush Cheeks
  const blushTex = getBlushTexture();
  const cheekMat = new THREE.MeshBasicMaterial({
    map: blushTex,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const cheekPlaneGeo = new THREE.PlaneGeometry(0.2, 0.15);

  const cheekLeft = new THREE.Mesh(cheekPlaneGeo, cheekMat);
  cheekLeft.position.set(-0.24, -0.04, 0.25);
  cheekLeft.rotation.set(-0.1, -0.42, 0.12);
  headGroup.add(cheekLeft);

  const cheekRight = new THREE.Mesh(cheekPlaneGeo, cheekMat);
  cheekRight.position.set(0.24, -0.04, 0.25);
  cheekRight.rotation.set(-0.1, 0.42, -0.12);
  headGroup.add(cheekRight);

  // Snout / Muzzle / Beak
  if (type === 'penguin') {
    // Beak
    const beakGeo = new THREE.ConeGeometry(0.1, 0.18, 16);
    beakGeo.rotateX(Math.PI / 2);
    const beakMesh = new THREE.Mesh(beakGeo, snoutMat);
    beakMesh.position.set(0, -0.02, 0.34);
    headGroup.add(beakMesh);
  } else {
    // Soft rounded muzzle patch
    const snoutGeo = new THREE.SphereGeometry(0.125, 20, 20);
    snoutGeo.scale(1.18, 0.85, 0.86);
    const snoutMesh = new THREE.Mesh(snoutGeo, type === 'panda' || type === 'fox' ? accentMat : bellyMat);
    snoutMesh.position.set(0, -0.04, 0.26);
    headGroup.add(snoutMesh);

    // Realistic cute moist button nose with soft triangular curvature
    const noseGeo = new THREE.SphereGeometry(0.042, 16, 16);
    noseGeo.scale(1.25, 0.85, 0.82);
    const noseMesh = new THREE.Mesh(noseGeo, snoutMat);
    noseMesh.position.set(0, 0.018, 0.352);
    headGroup.add(noseMesh);

    // Subtle specular shine on the bridge of the nose
    const noseGlintGeo = new THREE.SphereGeometry(0.01, 8, 8);
    const noseGlint = new THREE.Mesh(
      noseGlintGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 })
    );
    noseGlint.position.set(0.01, 0.028, 0.378);
    headGroup.add(noseGlint);

    // Iconic cute kitten/hamster smiling :3 mouth curve
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.65 });
    const smileLeftCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.008, 0.352),
      new THREE.Vector3(0, -0.035, 0.355),
      new THREE.Vector3(-0.042, -0.052, 0.33),
      new THREE.Vector3(-0.075, -0.038, 0.295),
    ]);
    const smileLMesh = new THREE.Mesh(new THREE.TubeGeometry(smileLeftCurve, 12, 0.0055, 6, false), mouthMat);

    const smileRightCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.008, 0.352),
      new THREE.Vector3(0, -0.035, 0.355),
      new THREE.Vector3(0.042, -0.052, 0.33),
      new THREE.Vector3(0.075, -0.038, 0.295),
    ]);
    const smileRMesh = new THREE.Mesh(new THREE.TubeGeometry(smileRightCurve, 12, 0.0055, 6, false), mouthMat);

    // Sweet peek of pink tongue tip
    const tongueGeo = new THREE.SphereGeometry(0.022, 10, 10);
    tongueGeo.scale(1, 0.45, 0.8);
    const tongueMesh = new THREE.Mesh(
      tongueGeo,
      new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.35 })
    );
    tongueMesh.position.set(0, -0.052, 0.34);
    tongueMesh.rotation.x = 0.25;

    headGroup.add(smileLMesh, smileRMesh, tongueMesh);

    // Delicate cute whiskers for hamster / cat / dog / fox
    if (type === 'hamster' || type === 'cat' || type === 'dog' || type === 'fox') {
      const whiskerMat = new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.65 });
      const whiskerAngles = [-0.1, 0.02, 0.14];
      whiskerAngles.forEach((ang) => {
        // Left whisker
        const wLCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.1, -0.025 + ang * 0.25, 0.29),
          new THREE.Vector3(-0.21, -0.028 + ang * 0.7, 0.27),
          new THREE.Vector3(-0.31, -0.038 + ang * 1.1, 0.22),
        ]);
        const wL = new THREE.Mesh(new THREE.TubeGeometry(wLCurve, 8, 0.0035, 4, false), whiskerMat);

        // Right whisker
        const wRCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.1, -0.025 + ang * 0.25, 0.29),
          new THREE.Vector3(0.21, -0.028 + ang * 0.7, 0.27),
          new THREE.Vector3(0.31, -0.038 + ang * 1.1, 0.22),
        ]);
        const wR = new THREE.Mesh(new THREE.TubeGeometry(wRCurve, 8, 0.0035, 4, false), whiskerMat);
        headGroup.add(wL, wR);
      });
    }
  }

  // --- EYES (PIXAR / ANIME GLOSSY OPTICAL DEPTH) ---
  const eyeGroupLeft = new THREE.Group();
  const eyeGroupRight = new THREE.Group();
  eyeGroupLeft.position.set(-0.135, 0.065, 0.27);
  eyeGroupRight.position.set(0.135, 0.065, 0.27);
  headGroup.add(eyeGroupLeft, eyeGroupRight);

  // Panda eye patches
  if (type === 'panda') {
    const patchGeo = new THREE.SphereGeometry(0.12, 16, 16);
    patchGeo.scale(1, 1.2, 0.2);
    const patchLeft = new THREE.Mesh(patchGeo, secondaryMat);
    patchLeft.position.set(-0.135, 0.055, 0.25);
    patchLeft.rotation.z = -0.3;
    const patchRight = new THREE.Mesh(patchGeo, secondaryMat);
    patchRight.position.set(0.135, 0.055, 0.25);
    patchRight.rotation.z = 0.3;
    headGroup.add(patchLeft, patchRight);
  }

  // Deep glassy eye spheres
  const eyeGeo = new THREE.SphereGeometry(0.068, 20, 20);
  eyeGeo.scale(0.92, 1.12, 0.45);

  const eyeMeshLeft = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeMeshRight = new THREE.Mesh(eyeGeo, eyeMat);
  eyeGroupLeft.add(eyeMeshLeft);
  eyeGroupRight.add(eyeMeshRight);

  // Species-tailored warm iris reflection crescent in bottom of eyes
  const irisHue =
    type === 'hamster' || type === 'cat'
      ? 0xd97706
      : type === 'dog' || type === 'fox'
      ? 0xc2410c
      : type === 'bunny'
      ? 0xec4899
      : 0x0284c7;

  const irisRingMat = new THREE.MeshBasicMaterial({
    color: irisHue,
    transparent: true,
    opacity: 0.65,
  });
  const irisCrescentGeo = new THREE.TorusGeometry(0.042, 0.012, 8, 16, Math.PI * 0.7);

  const irisL = new THREE.Mesh(irisCrescentGeo, irisRingMat);
  irisL.rotation.z = -Math.PI * 0.85;
  irisL.position.set(0, -0.018, 0.026);
  eyeGroupLeft.add(irisL);

  const irisR = new THREE.Mesh(irisCrescentGeo, irisRingMat);
  irisR.rotation.z = -Math.PI * 0.85;
  irisR.position.set(0, -0.018, 0.026);
  eyeGroupRight.add(irisR);

  // Dual Glint Catchlights: Primary Large Sparkle (top-outer) + Secondary Twinkle (bottom-inner)
  const primaryGlintGeo = new THREE.SphereGeometry(0.022, 12, 12);
  const secondaryGlintGeo = new THREE.SphereGeometry(0.011, 8, 8);

  const glintL1 = new THREE.Mesh(primaryGlintGeo, eyeGlintMat);
  glintL1.position.set(-0.016, 0.024, 0.038);
  const glintL2 = new THREE.Mesh(secondaryGlintGeo, eyeGlintMat);
  glintL2.position.set(0.018, -0.018, 0.036);
  eyeGroupLeft.add(glintL1, glintL2);

  const glintR1 = new THREE.Mesh(primaryGlintGeo, eyeGlintMat);
  glintR1.position.set(0.016, 0.024, 0.038);
  const glintR2 = new THREE.Mesh(secondaryGlintGeo, eyeGlintMat);
  glintR2.position.set(-0.018, -0.018, 0.036);
  eyeGroupRight.add(glintR1, glintR2);

  // Upper eyelid gentle curved brow line for a friendly expression
  const eyelidGeo = new THREE.TorusGeometry(0.068, 0.007, 6, 16, Math.PI * 0.65);
  const eyelidMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });

  const eyelidL = new THREE.Mesh(eyelidGeo, eyelidMat);
  eyelidL.rotation.z = Math.PI * 0.18;
  eyelidL.position.set(-0.01, 0.038, 0.034);
  eyeGroupLeft.add(eyelidL);

  const eyelidR = new THREE.Mesh(eyelidGeo, eyelidMat);
  eyelidR.rotation.z = Math.PI * 0.18;
  eyelidR.scale.x = -1;
  eyelidR.position.set(0.01, 0.038, 0.034);
  eyeGroupRight.add(eyelidR);

  // --- 3. SPECIES SPECIFIC EARS ---
  const earsGroup = new THREE.Group();
  headGroup.add(earsGroup);

  if (type === 'cat' || type === 'fox') {
    // Pointy ears with soft inner lining
    const earGeo = new THREE.ConeGeometry(0.12, 0.24, 14);
    const innerEarGeo = new THREE.ConeGeometry(0.08, 0.18, 14);

    const earL = new THREE.Mesh(earGeo, primaryMat);
    earL.position.set(-0.2, 0.28, -0.02);
    earL.rotation.set(-0.1, 0.05, 0.38);
    earL.castShadow = true;

    const innerL = new THREE.Mesh(innerEarGeo, earInnerMat);
    innerL.position.set(0, -0.02, 0.02);
    earL.add(innerL);

    const earR = new THREE.Mesh(earGeo, primaryMat);
    earR.position.set(0.2, 0.28, -0.02);
    earR.rotation.set(-0.1, -0.05, -0.38);
    earR.castShadow = true;

    const innerR = new THREE.Mesh(innerEarGeo, earInnerMat);
    innerR.position.set(0, -0.02, 0.02);
    earR.add(innerR);

    earsGroup.add(earL, earR);
  } else if (type === 'bunny') {
    // Long tall ears with inner velvet pad
    const earGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.46, 16);
    earGeo.scale(0.8, 1, 0.4);

    const earL = new THREE.Mesh(earGeo, primaryMat);
    earL.position.set(-0.14, 0.42, -0.04);
    earL.rotation.set(-0.15, 0.05, 0.18);
    earL.castShadow = true;

    const earInnerGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.38, 16);
    earInnerGeo.scale(0.7, 1, 0.2);
    const innerL = new THREE.Mesh(earInnerGeo, earInnerMat);
    innerL.position.set(0, 0, 0.02);
    earL.add(innerL);

    const earR = new THREE.Mesh(earGeo, primaryMat);
    earR.position.set(0.14, 0.42, -0.04);
    earR.rotation.set(-0.15, -0.05, -0.18);
    earR.castShadow = true;

    const innerR = new THREE.Mesh(earInnerGeo, earInnerMat);
    innerR.position.set(0, 0, 0.02);
    earR.add(innerR);

    earsGroup.add(earL, earR);
  } else if (type === 'dog') {
    // Droopy floppy ears with soft fur sheen
    const earGeo = new THREE.SphereGeometry(0.13, 16, 16);
    earGeo.scale(0.7, 1.4, 0.5);

    const earL = new THREE.Mesh(earGeo, secondaryMat);
    earL.position.set(-0.29, 0.12, 0.02);
    earL.rotation.set(0.2, 0.1, 0.42);
    earL.castShadow = true;

    const earR = new THREE.Mesh(earGeo, secondaryMat);
    earR.position.set(0.29, 0.12, 0.02);
    earR.rotation.set(0.2, -0.1, -0.42);
    earR.castShadow = true;

    earsGroup.add(earL, earR);
  } else if (type === 'koala') {
    // Big fluffy round ears
    const earGeo = new THREE.SphereGeometry(0.18, 16, 16);
    earGeo.scale(1, 1, 0.4);

    const earL = new THREE.Mesh(earGeo, primaryMat);
    earL.position.set(-0.31, 0.22, -0.02);
    earL.rotation.set(0, 0.2, 0.2);

    const innerEar = new THREE.SphereGeometry(0.11, 14, 14);
    innerEar.scale(1, 1, 0.3);
    const innerL = new THREE.Mesh(innerEar, earInnerMat);
    innerL.position.set(0, 0, 0.03);
    earL.add(innerL);

    const earR = new THREE.Mesh(earGeo, primaryMat);
    earR.position.set(0.31, 0.22, -0.02);
    earR.rotation.set(0, -0.2, -0.2);

    const innerR = new THREE.Mesh(innerEar, earInnerMat);
    innerR.position.set(0, 0, 0.03);
    earR.add(innerR);

    earsGroup.add(earL, earR);
  } else if (type === 'hamster') {
    // Adorable cupped hamster ears with soft pink inner velvet pad
    const earOuterGeo = new THREE.SphereGeometry(0.115, 16, 16);
    earOuterGeo.scale(1, 1.1, 0.45);

    const earInnerGeo = new THREE.SphereGeometry(0.08, 14, 14);
    earInnerGeo.scale(1, 1.1, 0.35);

    // Left ear positioned cutely on the upper side
    const earL = new THREE.Mesh(earOuterGeo, primaryMat);
    earL.position.set(-0.25, 0.22, 0.02);
    earL.rotation.set(-0.1, 0.2, 0.35);
    earL.castShadow = true;

    const innerL = new THREE.Mesh(earInnerGeo, earInnerMat);
    innerL.position.set(0, 0, 0.02);
    earL.add(innerL);

    // Right ear
    const earR = new THREE.Mesh(earOuterGeo, primaryMat);
    earR.position.set(0.25, 0.22, 0.02);
    earR.rotation.set(-0.1, -0.2, -0.35);
    earR.castShadow = true;

    const innerR = new THREE.Mesh(earInnerGeo, earInnerMat);
    innerR.position.set(0, 0, 0.02);
    earR.add(innerR);

    earsGroup.add(earL, earR);
  } else if (type === 'panda') {
    // Round panda ears with contrast
    const earGeo = new THREE.SphereGeometry(0.12, 16, 16);
    earGeo.scale(1, 1, 0.5);

    const earL = new THREE.Mesh(earGeo, secondaryMat);
    earL.position.set(-0.24, 0.24, -0.02);
    earL.rotation.set(-0.1, 0.15, 0.3);

    const earR = new THREE.Mesh(earGeo, secondaryMat);
    earR.position.set(0.24, 0.24, -0.02);
    earR.rotation.set(-0.1, -0.15, -0.3);

    earsGroup.add(earL, earR);
  }

  // --- 4. TAIL ---
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.28, -0.32);
  bodyGroup.add(tailGroup);

  if (type === 'bunny') {
    const tailGeo = new THREE.SphereGeometry(0.1, 14, 14);
    const tailMesh = new THREE.Mesh(tailGeo, accentMat);
    tailMesh.position.set(0, 0, -0.04);
    tailGroup.add(tailMesh);
  } else if (type === 'fox') {
    const tailGeo = new THREE.ConeGeometry(0.15, 0.45, 16);
    tailGeo.rotateX(-Math.PI / 2.6);
    const tailMesh = new THREE.Mesh(tailGeo, primaryMat);
    tailMesh.position.set(0, 0.1, -0.15);

    // White tip
    const tipGeo = new THREE.ConeGeometry(0.08, 0.2, 12);
    tipGeo.rotateX(-Math.PI / 2.6);
    const tipMesh = new THREE.Mesh(tipGeo, accentMat);
    tipMesh.position.set(0, 0.18, -0.25);
    tailGroup.add(tailMesh, tipMesh);
  } else if (type === 'cat' || type === 'dog') {
    // Curved tail
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.1, -0.15),
      new THREE.Vector3(0.04, 0.25, -0.22),
      new THREE.Vector3(0.08, 0.35, -0.18),
    ]);
    const tailGeo = new THREE.TubeGeometry(curve, 16, 0.04, 8, false);
    const tailMesh = new THREE.Mesh(tailGeo, primaryMat);
    tailGroup.add(tailMesh);
  } else if (type === 'hamster') {
    // Tiny cute rounded hamster tail
    const tailGeo = new THREE.SphereGeometry(0.048, 10, 10);
    const tailMesh = new THREE.Mesh(tailGeo, primaryMat);
    tailMesh.position.set(0, 0.02, -0.04);
    tailGroup.add(tailMesh);
  }

  // --- 5. LEGS / PAWS WITH PINK TOE BEANS ---
  const legFrontLeft = new THREE.Mesh(
    new THREE.SphereGeometry(0.092, 14, 14),
    type === 'penguin' ? snoutMat : type === 'panda' ? secondaryMat : primaryMat
  );
  legFrontLeft.scale.set(1, 0.72, 1.25);
  legFrontLeft.position.set(-0.18, 0.1, 0.16);

  const legFrontRight = new THREE.Mesh(
    new THREE.SphereGeometry(0.092, 14, 14),
    type === 'penguin' ? snoutMat : type === 'panda' ? secondaryMat : primaryMat
  );
  legFrontRight.scale.set(1, 0.72, 1.25);
  legFrontRight.position.set(0.18, 0.1, 0.16);

  const legBackLeft = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 14, 14),
    type === 'penguin' ? snoutMat : type === 'panda' ? secondaryMat : primaryMat
  );
  legBackLeft.scale.set(1, 0.72, 1.25);
  legBackLeft.position.set(-0.2, 0.1, -0.14);

  const legBackRight = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 14, 14),
    type === 'penguin' ? snoutMat : type === 'panda' ? secondaryMat : primaryMat
  );
  legBackRight.scale.set(1, 0.72, 1.25);
  legBackRight.position.set(0.2, 0.1, -0.14);

  // Add adorable pink toe beans to front paws
  const addToeBeans = (legMesh: THREE.Mesh) => {
    const padMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.55 });
    // Main heart/oval pad
    const mainPad = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), padMat);
    mainPad.scale.set(1.2, 0.35, 0.9);
    mainPad.position.set(0, -0.065, 0.02);
    mainPad.rotation.x = -0.3;
    // 3 tiny round toe bean dots
    [-0.032, 0, 0.032].forEach((xOff, idx) => {
      const bean = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), padMat);
      bean.scale.set(1, 0.45, 1);
      bean.position.set(xOff, -0.062, 0.062 + (idx === 1 ? 0.008 : 0));
      bean.rotation.x = -0.3;
      legMesh.add(bean);
    });
    legMesh.add(mainPad);
  };
  if (type !== 'penguin') {
    addToeBeans(legFrontLeft);
    addToeBeans(legFrontRight);
  }

  bodyGroup.add(legFrontLeft, legFrontRight, legBackLeft, legBackRight);

  // --- 6. 3D ACCESSORIES (HEAD ACCESSORIES ATTACHED TO HEADGROUP FOR NATURAL HEAD MOTION) ---
  const accessoriesGroup = new THREE.Group();
  rootAnimGroup.add(accessoriesGroup);

  const headAccessoriesGroup = new THREE.Group();
  headGroup.add(headAccessoriesGroup);

  const headwear = equipped?.head || equipped?.headwear;
  const costume = equipped?.body || equipped?.costume;
  const glasses = equipped?.eyes || equipped?.glasses;
  const backAcc = equipped?.back || equipped?.backpack;
  const feetAcc = equipped?.feet || equipped?.shoes;

  // HEADWEAR 1: Wizard / Magic Hat
  if (headwear === 'hat_wizard' || headwear?.includes('wizard') || headwear?.includes('magic')) {
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.3, -0.02);

    const brimGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 24);
    const brimMesh = new THREE.Mesh(brimGeo, magicGlowMat);

    const coneGeo = new THREE.ConeGeometry(0.22, 0.55, 20);
    const coneMesh = new THREE.Mesh(coneGeo, magicGlowMat);
    coneMesh.position.y = 0.28;
    coneMesh.rotation.z = -0.1;

    const buckleGeo = new THREE.TorusGeometry(0.16, 0.03, 8, 16);
    const buckleMesh = new THREE.Mesh(buckleGeo, goldMat);
    buckleMesh.position.y = 0.08;
    buckleMesh.rotation.x = Math.PI / 2;

    hatGroup.add(brimMesh, coneMesh, buckleMesh);
    headAccessoriesGroup.add(hatGroup);
  }
  // HEADWEAR 2: Golden Crown
  else if (headwear === 'crown_golden' || headwear?.includes('crown')) {
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 0.3, -0.02);

    const ringGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.14, 16, 1, true);
    const crownMesh = new THREE.Mesh(ringGeo, goldMat);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spikeGeo = new THREE.ConeGeometry(0.045, 0.13, 8);
      const spike = new THREE.Mesh(spikeGeo, goldMat);
      spike.position.set(Math.sin(angle) * 0.22, 0.12, Math.cos(angle) * 0.22);

      const gemGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const gemMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xef4444 : 0x38bdf8,
        emissive: i % 2 === 0 ? 0xdc2626 : 0x0284c7,
        emissiveIntensity: 0.8,
      });
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(Math.sin(angle) * 0.22, 0.18, Math.cos(angle) * 0.22);

      crownGroup.add(spike, gem);
    }
    crownGroup.add(crownMesh);
    headAccessoriesGroup.add(crownGroup);
  }
  // HEADWEAR 3: Realistically Styled Explorer Baseball Cap
  else if (headwear === 'cap_starter' || headwear?.includes('cap')) {
    const capGroup = new THREE.Group();
    capGroup.position.set(0, 0.22, -0.01);
    capGroup.rotation.x = -0.12; // Naturally tilted back to showcase cute eyes & forehead

    const capMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4444, // Vibrant sporty crimson red
      roughness: 0.72,
      sheen: 0.6,
      sheenColor: 0xffa4b6,
      sheenRoughness: 0.4,
    });
    const capBrimMat = new THREE.MeshPhysicalMaterial({
      color: 0xb91c1c, // Darker crimson red for visor & trim
      roughness: 0.68,
      sheen: 0.5,
    });

    // Main cap dome hugging head curvature
    const domeGeo = new THREE.SphereGeometry(0.33, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.54);
    domeGeo.scale(1.02, 0.9, 1.05);
    const capDome = new THREE.Mesh(domeGeo, capMat);
    capDome.castShadow = true;

    // Cap sweatband / bottom ring
    const rimBandGeo = new THREE.TorusGeometry(0.33, 0.018, 8, 32);
    const rimBand = new THREE.Mesh(rimBandGeo, capBrimMat);
    rimBand.rotation.x = Math.PI / 2;
    rimBand.position.y = -0.01;

    // Stitched seam ribs on crown (6 panels of a classic baseball cap)
    const seamsGroup = new THREE.Group();
    for (let s = 0; s < 3; s++) {
      const seamGeo = new THREE.TorusGeometry(0.332, 0.007, 4, 24, Math.PI);
      const seam = new THREE.Mesh(seamGeo, capBrimMat);
      seam.rotation.y = (s * Math.PI) / 3;
      seamsGroup.add(seam);
    }

    // Curved front baseball visor
    const visorCurve = new THREE.CylinderGeometry(0.34, 0.35, 0.024, 24, 1, false, -Math.PI * 0.28, Math.PI * 0.56);
    visorCurve.scale(1, 1, 0.75);
    const visor = new THREE.Mesh(visorCurve, capMat);
    visor.position.set(0, -0.02, 0.16);
    visor.rotation.x = 0.28;
    visor.castShadow = true;

    // Cute front star badge
    const badgeGeo = new THREE.OctahedronGeometry(0.042, 0);
    badgeGeo.scale(1, 1, 0.2);
    const badge = new THREE.Mesh(badgeGeo, goldMat);
    badge.position.set(0, 0.12, 0.32);
    badge.rotation.z = Math.PI / 4;

    // Top gold squatchee button
    const topButton = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), goldMat);
    topButton.position.y = 0.28;

    capGroup.add(capDome, rimBand, seamsGroup, visor, badge, topButton);
    headAccessoriesGroup.add(capGroup);
  }

  // --- DRESS / BODY OUTFITS ---
  // BODY 1: Floral Spring Logic Dress
  if (costume === 'dress_spring' || costume?.includes('dress')) {
    const dressGroup = new THREE.Group();
    bodyGroup.add(dressGroup);

    const dressMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    const sashMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.2,
      emissive: 0xdb2777,
      emissiveIntensity: 0.3,
    });
    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.2,
      emissive: 0xfde047,
      emissiveIntensity: 0.6,
    });

    const skirtGeo = new THREE.ConeGeometry(0.48, 0.36, 24, 1, true);
    const skirtMesh = new THREE.Mesh(skirtGeo, dressMat);
    skirtMesh.position.set(0, 0.3, 0);
    skirtMesh.castShadow = true;

    const sashGeo = new THREE.TorusGeometry(0.39, 0.035, 8, 24);
    const sashMesh = new THREE.Mesh(sashGeo, sashMat);
    sashMesh.position.set(0, 0.44, 0);
    sashMesh.rotation.x = Math.PI / 2;

    const bowGeo = new THREE.SphereGeometry(0.045, 8, 8);
    bowGeo.scale(1.8, 1, 0.8);
    const bowMesh = new THREE.Mesh(bowGeo, sashMat);
    bowMesh.position.set(0, 0.44, 0.38);

    for (let f = 0; f < 4; f++) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), flowerMat);
      const angle = (f / 4) * Math.PI - Math.PI / 4;
      flower.position.set(Math.sin(angle) * 0.42, 0.24, Math.cos(angle) * 0.42);
      dressGroup.add(flower);
    }

    dressGroup.add(skirtMesh, sashMesh, bowMesh);
  }
  // BODY 2: Code Sailor Striped Tee
  else if (costume === 'shirt_striped' || costume?.includes('shirt') || costume?.includes('tee')) {
    const shirtGroup = new THREE.Group();
    bodyGroup.add(shirtGroup);

    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

    const torsoGeo = new THREE.CylinderGeometry(0.39, 0.38, 0.32, 24, 1, true);
    const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
    torsoMesh.position.set(0, 0.42, 0);

    const stripe1 = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.018, 6, 24), stripeMat);
    stripe1.position.set(0, 0.48, 0);
    stripe1.rotation.x = Math.PI / 2;

    const stripe2 = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.018, 6, 24), stripeMat);
    stripe2.position.set(0, 0.38, 0);
    stripe2.rotation.x = Math.PI / 2;

    shirtGroup.add(torsoMesh, stripe1, stripe2);
  }
  // BODY 3: Senior Dev Tuxedo
  else if (costume === 'suit_tuxedo' || costume?.includes('tuxedo') || costume?.includes('suit')) {
    const tuxGroup = new THREE.Group();
    bodyGroup.add(tuxGroup);

    const coatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const shirtBibMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });

    const coatGeo = new THREE.CylinderGeometry(0.39, 0.38, 0.32, 24, 1, true);
    const coatMesh = new THREE.Mesh(coatGeo, coatMat);
    coatMesh.position.set(0, 0.42, 0);

    const bibGeo = new THREE.BoxGeometry(0.18, 0.22, 0.05);
    const bibMesh = new THREE.Mesh(bibGeo, shirtBibMat);
    bibMesh.position.set(0, 0.44, 0.34);

    const bowL = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 8), redMat);
    bowL.rotation.z = Math.PI / 2;
    bowL.position.set(-0.045, 0.52, 0.36);

    const bowR = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 8), redMat);
    bowR.rotation.z = -Math.PI / 2;
    bowR.position.set(0.045, 0.52, 0.36);

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), redMat);
    knot.position.set(0, 0.52, 0.37);

    tuxGroup.add(coatMesh, bibMesh, bowL, bowR, knot);
  }

  // --- BACK ACCESSORIES ---
  // BACK 1: Debug Hero Cape
  if (backAcc === 'cape_hero' || backAcc?.includes('cape')) {
    const capeGeo = new THREE.PlaneGeometry(0.5, 0.65, 4, 4);
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      side: THREE.DoubleSide,
      roughness: 0.3,
    });
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 0.36, -0.38);
    cape.rotation.x = 0.28;
    accessoriesGroup.add(cape);
  }
  // BACK 2: Adventure Satchel Backpack
  else if (backAcc === 'backpack_adventure' || backAcc?.includes('backpack') || backAcc?.includes('satchel')) {
    const packGroup = new THREE.Group();
    packGroup.position.set(0, 0.42, -0.36);

    const leatherMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    const mainPack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.18), leatherMat);
    mainPack.castShadow = true;

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), goldMat);
    buckle.position.set(0, 0, -0.1);

    packGroup.add(mainPack, buckle);
    accessoriesGroup.add(packGroup);
  }

  // --- EYES ACCESSORIES (ATTACHED TO HEAD FOR NATURAL HEAD TILT & LOOK-AT) ---
  if (glasses === 'glasses_round' || glasses?.includes('round') || glasses?.includes('smart')) {
    const glassGroup = new THREE.Group();
    glassGroup.position.set(0, 0.065, 0.28);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3 });
    const lensL = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 8, 20), frameMat);
    lensL.position.set(-0.13, 0, 0);

    const lensR = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 8, 20), frameMat);
    lensR.position.set(0.13, 0, 0);

    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), frameMat);
    bridge.rotation.z = Math.PI / 2;

    glassGroup.add(lensL, lensR, bridge);
    headAccessoriesGroup.add(glassGroup);
  } else if (glasses === 'shades_cool' || glasses?.includes('shades') || glasses?.includes('sun')) {
    const glassGroup = new THREE.Group();
    glassGroup.position.set(0, 0.065, 0.28);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.02), frameMat);
    lensL.position.set(-0.13, 0, 0);

    const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.02), frameMat);
    lensR.position.set(0.13, 0, 0);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), frameMat);
    glassGroup.add(lensL, lensR, bridge);
    headAccessoriesGroup.add(glassGroup);
  } else if (glasses === 'goggles_vr' || glasses?.includes('goggles') || glasses?.includes('matrix')) {
    const glassGroup = new THREE.Group();
    glassGroup.position.set(0, 0.065, 0.28);

    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
      roughness: 0.1,
    });
    const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), visorMat);
    const strapMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.04, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    strapMesh.position.y = 0;

    glassGroup.add(visorMesh, strapMesh);
    headAccessoriesGroup.add(glassGroup);
  }

  // --- FEET ACCESSORIES ---
  if (feetAcc === 'shoes_sneakers' || feetAcc?.includes('sneaker')) {
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 });
    [legFrontLeft, legFrontRight, legBackLeft, legBackRight].forEach((leg) => {
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 12), shoeMat);
      shoe.scale.set(1.1, 0.6, 1.3);
      shoe.position.set(0, -0.02, 0.02);
      leg.add(shoe);
    });
  }

  // Scale overall model
  group.scale.set(scaleFactor, scaleFactor, scaleFactor);

  // --- 7. DYNAMIC EMOTION PARTICLES & STATE TRACKERS ---
  const emotionParticleGroup = new THREE.Group();
  rootAnimGroup.add(emotionParticleGroup);

  let blinkTimer = 0;
  let isBlinking = false;
  let activeEmotion: string = 'neutral';
  let emotionAnimTime = 0;

  // Look-at Target for smooth natural head & eye cursor tracking
  const targetLook = { x: 0, y: 0 };
  const setLookTarget = (x: number, y: number) => {
    targetLook.x = THREE.MathUtils.clamp(x, -1, 1);
    targetLook.y = THREE.MathUtils.clamp(y, -1, 1);
  };

  // Treat snack mesh for eating animation
  const snackGroup = new THREE.Group();
  snackGroup.position.set(0, 0.45, 0.45);
  const snackMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, emissive: 0xd97706, emissiveIntensity: 0.4 })
  );
  snackGroup.add(snackMesh);
  snackGroup.visible = false;
  rootAnimGroup.add(snackGroup);

  const triggerEmotionEffect = (type: 'hearts' | 'stars' | 'tears' | 'zzz' | 'crumbs') => {
    while (emotionParticleGroup.children.length > 0) {
      const child = emotionParticleGroup.children[0];
      emotionParticleGroup.remove(child);
    }

    if (type === 'hearts') {
      for (let i = 0; i < 6; i++) {
        const hMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.9 })
        );
        hMesh.scale.set(1, 1.2, 0.5);
        hMesh.position.set((Math.random() - 0.5) * 0.7, 0.7 + Math.random() * 0.4, (Math.random() - 0.5) * 0.7);
        emotionParticleGroup.add(hMesh);
      }
    } else if (type === 'stars') {
      for (let i = 0; i < 8; i++) {
        const sMesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.08, 0),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
        );
        sMesh.position.set((Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 0.5, (Math.random() - 0.5) * 0.8);
        emotionParticleGroup.add(sMesh);
      }
    } else if (type === 'tears') {
      for (let i = 0; i < 4; i++) {
        const tMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8 })
        );
        tMesh.position.set((i % 2 === 0 ? -0.16 : 0.16), 0.65 - Math.random() * 0.2, 0.32);
        emotionParticleGroup.add(tMesh);
      }
    } else if (type === 'zzz') {
      for (let i = 0; i < 3; i++) {
        const zMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, 0.02),
          new THREE.MeshStandardMaterial({ color: 0xa5b4fc, emissive: 0x818cf8, emissiveIntensity: 0.7 })
        );
        zMesh.position.set(0.2 + i * 0.1, 0.85 + i * 0.18, 0.1);
        emotionParticleGroup.add(zMesh);
      }
    }
  };

  const updateAnimation = (
    delta: number,
    time: number,
    isMoving: boolean,
    isVictory: boolean,
    isHurt: boolean,
    emotion?: 'happy' | 'excited' | 'tired' | 'sleepy' | 'eating' | 'petting' | 'victory' | 'hurt' | 'neutral' | string | null
  ) => {
    const mappedEmotion =
      emotion === 'hearts' ? 'happy' :
      emotion === 'stars' ? 'excited' :
      emotion === 'tears' ? 'hurt' :
      emotion === 'zzz' ? 'sleepy' :
      emotion === 'crumbs' ? 'eating' :
      (emotion as any);
    activeEmotion = mappedEmotion || (isVictory ? 'victory' : isHurt ? 'hurt' : 'neutral');
    emotionAnimTime += delta;

    // 0. Smooth Head & Eye tracking towards cursor
    const targetHeadRotY = targetLook.x * 0.38;
    const targetHeadRotX = -targetLook.y * 0.22;
    headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, targetHeadRotY, delta * 5.5);
    headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, targetHeadRotX, delta * 5.5);

    // Living ear flutter every ~4.5 seconds
    if (earsGroup) {
      const earTwitchCycle = time % 4.5;
      if (earTwitchCycle < 0.22) {
        earsGroup.rotation.z = Math.sin(earTwitchCycle * 35) * 0.06;
      } else {
        earsGroup.rotation.z = 0;
      }
    }

    // 1. Idle breathing and squishy micro-bobs
    if (!isMoving && !isVictory && !isHurt && activeEmotion !== 'sleepy' && activeEmotion !== 'eating' && activeEmotion !== 'hurt') {
      const breath = Math.sin(time * 2.2) * 0.016;
      bodyGroup.scale.set(1 + breath * 0.5, 1 + breath, 1 + breath * 0.5);
      headGroup.position.y = 0.68 + breath * 0.6;
      headGroup.rotation.z = Math.sin(time * 1.1) * 0.02;
      tailGroup.rotation.y = Math.sin(time * 2.5) * 0.16;
      rootAnimGroup.position.x = 0;
      rootAnimGroup.rotation.z = 0;
    }

    // 2. Walking dynamic motion (gentle stride)
    if (isMoving) {
      const walkFreq = time * 8;
      tailGroup.rotation.y = Math.sin(walkFreq) * 0.25;
      headGroup.rotation.x = Math.sin(walkFreq) * 0.04;
      headGroup.rotation.z = Math.cos(walkFreq) * 0.03;

      legFrontLeft.position.z = 0.16 + Math.sin(walkFreq) * 0.05;
      legFrontRight.position.z = 0.16 - Math.sin(walkFreq) * 0.05;
      legBackLeft.position.z = -0.14 - Math.sin(walkFreq) * 0.05;
      legBackRight.position.z = -0.14 + Math.sin(walkFreq) * 0.05;
    } else {
      legFrontLeft.position.z = 0.16;
      legFrontRight.position.z = 0.16;
      legBackLeft.position.z = -0.14;
      legBackRight.position.z = -0.14;
    }

    // 3. Victory celebration dance & Star bursts
    if (isVictory || activeEmotion === 'victory') {
      const victorySpin = time * 4;
      rootAnimGroup.position.y = Math.abs(Math.sin(victorySpin)) * 0.2;
      headGroup.rotation.z = Math.sin(time * 6) * 0.15;
      headGroup.rotation.x = -0.1;
      tailGroup.rotation.y = Math.sin(time * 10) * 0.4;
      eyeGroupLeft.scale.y = 0.4;
      eyeGroupRight.scale.y = 0.4;
    }

    // 4. Hurt / Error collision recoil & Sad pose
    if (isHurt || activeEmotion === 'hurt') {
      const wobble = Math.sin(time * 6) * 0.012;
      rootAnimGroup.position.x = wobble;
      rootAnimGroup.rotation.z = wobble * 0.4;
      headGroup.rotation.x = 0.18; // Drooped sad head
      headGroup.position.y = 0.63;
      eyeGroupLeft.scale.y = 0.25; // Sad squint eyes
      eyeGroupRight.scale.y = 0.25;
    } else if (!isVictory && activeEmotion !== 'victory') {
      rootAnimGroup.position.x = 0;
      rootAnimGroup.rotation.z = 0;
    }

    // 5. Resting / Sleeping Pose
    if (activeEmotion === 'sleepy' || activeEmotion === 'tired') {
      rootAnimGroup.position.y = -0.06;
      bodyGroup.scale.set(1.04, 0.88, 1.04);
      headGroup.position.y = 0.60;
      headGroup.rotation.x = 0.18;
      eyeGroupLeft.scale.y = 0.05; // Closed eyes
      eyeGroupRight.scale.y = 0.05;
    }

    // 6. Eating Animation
    if (activeEmotion === 'eating') {
      snackGroup.visible = true;
      const chomp = Math.sin(time * 10) * 0.08;
      headGroup.position.y = 0.64 + chomp;
      headGroup.rotation.x = 0.15 + chomp * 0.4;
      snackGroup.scale.setScalar(Math.max(0.2, 1 - (emotionAnimTime % 2) * 0.4));
    } else {
      snackGroup.visible = false;
    }

    // 7. Petting Purr & Bounce
    if (activeEmotion === 'petting') {
      const purr = Math.sin(time * 12) * 0.02;
      bodyGroup.scale.set(1.06 + purr, 0.94 - purr, 1.06 + purr);
      headGroup.position.y = 0.65 + purr;
      eyeGroupLeft.scale.y = 0.3; // Happy closed smile
      eyeGroupRight.scale.y = 0.3;
    }

    // 8. Emotion particles float and drift
    emotionParticleGroup.children.forEach((p) => {
      p.position.y += delta * 0.4;
      p.rotation.y += delta * 2;
      p.scale.multiplyScalar(0.985);
      if (p.scale.x < 0.05) {
        emotionParticleGroup.remove(p);
      }
    });

    // 9. Natural Blinking with occasional sweet double-blink
    if (activeEmotion !== 'sleepy' && activeEmotion !== 'petting' && activeEmotion !== 'victory' && activeEmotion !== 'hurt') {
      blinkTimer += delta;
      if (blinkTimer > 3.6 && !isBlinking) {
        isBlinking = true;
        eyeGroupLeft.scale.y = 0.08;
        eyeGroupRight.scale.y = 0.08;
        setTimeout(() => {
          eyeGroupLeft.scale.y = 1.0;
          eyeGroupRight.scale.y = 1.0;
          isBlinking = false;
          // Occasional double-blink for super cute natural behavior
          if (Math.random() < 0.28) {
            setTimeout(() => {
              eyeGroupLeft.scale.y = 0.08;
              eyeGroupRight.scale.y = 0.08;
              setTimeout(() => {
                eyeGroupLeft.scale.y = 1.0;
                eyeGroupRight.scale.y = 1.0;
              }, 90);
            }, 120);
          }
          blinkTimer = Math.random() * 0.6;
        }, 110);
      }
    }
  };

  const playHop = (progress: number) => {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const hopY = Math.sin(p * Math.PI) * 0.26;
    rootAnimGroup.position.y = hopY;

    const squash = Math.sin(p * Math.PI) * 0.06;
    bodyGroup.scale.set(1 - squash * 0.5, 1 + squash, 1 - squash * 0.5);
  };

  const resetHop = () => {
    rootAnimGroup.position.y = 0;
    rootAnimGroup.position.x = 0;
    rootAnimGroup.position.z = 0;
    rootAnimGroup.rotation.z = 0;
    bodyGroup.scale.set(1, 1, 1);
    legFrontLeft.position.z = 0.16;
    legFrontRight.position.z = 0.16;
    legBackLeft.position.z = -0.14;
    legBackRight.position.z = -0.14;
  };

  const playVictoryDance = (time: number) => {
    rootAnimGroup.rotation.y += 0.05;
    rootAnimGroup.position.y = Math.abs(Math.sin(time * 6)) * 0.25;
    triggerEmotionEffect('stars');
  };

  const playEating = (progress: number) => {
    activeEmotion = 'eating';
    triggerEmotionEffect('crumbs');
  };

  const playPetting = (progress: number) => {
    activeEmotion = 'petting';
    triggerEmotionEffect('hearts');
  };

  const playSleeping = (time: number) => {
    activeEmotion = 'sleepy';
    if (Math.random() < 0.05) triggerEmotionEffect('zzz');
  };

  const triggerBlink = () => {
    eyeGroupLeft.scale.y = 0.08;
    eyeGroupRight.scale.y = 0.08;
    setTimeout(() => {
      eyeGroupLeft.scale.y = 1.0;
      eyeGroupRight.scale.y = 1.0;
    }, 130);
  };

  const cleanup = () => {
    try {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m?.dispose?.());
          } else if (obj.material) {
            obj.material.dispose?.();
          }
        }
      });
    } catch (err) {
      console.warn('PetMesh3D cleanup caught error:', err);
    }
  };

  return {
    group,
    updateAnimation,
    playHop,
    resetHop,
    playVictoryDance,
    playEating,
    playPetting,
    playSleeping,
    triggerBlink,
    triggerEmotionEffect,
    cleanup,
    setLookTarget,
  };
}
