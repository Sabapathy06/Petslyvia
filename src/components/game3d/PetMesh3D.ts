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
    emotion?: 'happy' | 'excited' | 'tired' | 'sleepy' | 'eating' | 'petting' | 'victory' | 'hurt' | 'neutral'
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

export function createPet3D(
  type: PetType = 'cat',
  equipped?: EquippedAccessories | null,
  scaleFactor: number = 1.0
): Pet3DModel {
  const group = new THREE.Group();
  group.name = `Pet3D_${type}`;

  const colors = PET_3D_COLORS[type] || PET_3D_COLORS.cat;

  // Materials with stylized cartoon toon/matte lighting
  const primaryMat = new THREE.MeshStandardMaterial({
    color: colors.primary,
    roughness: 0.35,
    metalness: 0.1,
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: colors.secondary,
    roughness: 0.4,
  });

  const bellyMat = new THREE.MeshStandardMaterial({
    color: colors.belly,
    roughness: 0.3,
  });

  const earInnerMat = new THREE.MeshStandardMaterial({
    color: colors.earInner,
    roughness: 0.5,
  });

  const eyeMat = new THREE.MeshStandardMaterial({
    color: colors.eye,
    roughness: 0.1,
    metalness: 0.3,
  });

  const eyeGlintMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.4,
    roughness: 0.1,
  });

  const snoutMat = new THREE.MeshStandardMaterial({
    color: colors.snout,
    roughness: 0.4,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: colors.accent,
    roughness: 0.4,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.3,
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
  // Cute rounded squishy body
  const bodyGeo = new THREE.SphereGeometry(0.38, 24, 24);
  bodyGeo.scale(1, 0.95, 0.9);
  const bodyMesh = new THREE.Mesh(bodyGeo, primaryMat);
  bodyMesh.position.y = 0.42;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyGroup.add(bodyMesh);

  // Belly Patch
  const bellyGeo = new THREE.SphereGeometry(0.3, 16, 16);
  bellyGeo.scale(0.8, 0.9, 0.4);
  const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
  bellyMesh.position.set(0, 0.38, 0.2);
  bodyGroup.add(bellyMesh);

  // --- 2. HEAD ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.68, 0.08);
  rootAnimGroup.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.34, 24, 24);
  headGeo.scale(1.05, 0.98, 0.95);
  const headMesh = new THREE.Mesh(headGeo, primaryMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Cheeks (blush)
  const cheekGeo = new THREE.SphereGeometry(0.08, 12, 12);
  cheekGeo.scale(1, 0.6, 0.3);
  const cheekMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    roughness: 0.5,
    transparent: true,
    opacity: 0.7,
  });

  const cheekLeft = new THREE.Mesh(cheekGeo, cheekMat);
  cheekLeft.position.set(-0.22, -0.04, 0.25);
  headGroup.add(cheekLeft);

  const cheekRight = new THREE.Mesh(cheekGeo, cheekMat);
  cheekRight.position.set(0.22, -0.04, 0.25);
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
    const snoutGeo = new THREE.SphereGeometry(0.12, 16, 16);
    snoutGeo.scale(1.1, 0.8, 0.8);
    const snoutMesh = new THREE.Mesh(snoutGeo, type === 'panda' || type === 'fox' ? accentMat : bellyMat);
    snoutMesh.position.set(0, -0.04, 0.26);
    headGroup.add(snoutMesh);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.04, 12, 12);
    noseGeo.scale(1.2, 0.8, 0.8);
    const noseMesh = new THREE.Mesh(noseGeo, snoutMat);
    noseMesh.position.set(0, 0.01, 0.34);
    headGroup.add(noseMesh);
  }

  // Eyes
  const eyeGroupLeft = new THREE.Group();
  const eyeGroupRight = new THREE.Group();
  eyeGroupLeft.position.set(-0.13, 0.06, 0.27);
  eyeGroupRight.position.set(0.13, 0.06, 0.27);
  headGroup.add(eyeGroupLeft, eyeGroupRight);

  // Panda eye patches
  if (type === 'panda') {
    const patchGeo = new THREE.SphereGeometry(0.12, 14, 14);
    patchGeo.scale(1, 1.2, 0.2);
    const patchLeft = new THREE.Mesh(patchGeo, secondaryMat);
    patchLeft.position.set(-0.13, 0.05, 0.25);
    patchLeft.rotation.z = -0.3;
    const patchRight = new THREE.Mesh(patchGeo, secondaryMat);
    patchRight.position.set(0.13, 0.05, 0.25);
    patchRight.rotation.z = 0.3;
    headGroup.add(patchLeft, patchRight);
  }

  const eyeGeo = new THREE.SphereGeometry(0.065, 16, 16);
  eyeGeo.scale(0.9, 1.1, 0.4);

  const eyeMeshLeft = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeMeshRight = new THREE.Mesh(eyeGeo, eyeMat);
  eyeGroupLeft.add(eyeMeshLeft);
  eyeGroupRight.add(eyeMeshRight);

  // Glint highlights
  const glintGeo = new THREE.SphereGeometry(0.02, 10, 10);
  const glintLeft = new THREE.Mesh(glintGeo, eyeGlintMat);
  glintLeft.position.set(0.02, 0.025, 0.035);
  eyeGroupLeft.add(glintLeft);

  const glintRight = new THREE.Mesh(glintGeo, eyeGlintMat);
  glintRight.position.set(0.02, 0.025, 0.035);
  eyeGroupRight.add(glintRight);

  // --- 3. SPECIES SPECIFIC EARS ---
  const earsGroup = new THREE.Group();
  headGroup.add(earsGroup);

  if (type === 'cat' || type === 'fox') {
    // Pointy ears
    const earGeo = new THREE.ConeGeometry(0.12, 0.24, 12);
    const innerEarGeo = new THREE.ConeGeometry(0.08, 0.18, 12);

    const earL = new THREE.Mesh(earGeo, primaryMat);
    earL.position.set(-0.18, 0.28, -0.02);
    earL.rotation.set(-0.1, 0, 0.35);
    earL.castShadow = true;

    const innerL = new THREE.Mesh(innerEarGeo, earInnerMat);
    innerL.position.set(0, -0.02, 0.02);
    earL.add(innerL);

    const earR = new THREE.Mesh(earGeo, primaryMat);
    earR.position.set(0.18, 0.28, -0.02);
    earR.rotation.set(-0.1, 0, -0.35);
    earR.castShadow = true;

    const innerR = new THREE.Mesh(innerEarGeo, earInnerMat);
    innerR.position.set(0, -0.02, 0.02);
    earR.add(innerR);

    earsGroup.add(earL, earR);
  } else if (type === 'bunny') {
    // Long tall ears
    const earGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.46, 16);
    earGeo.scale(0.8, 1, 0.4);

    const earL = new THREE.Mesh(earGeo, primaryMat);
    earL.position.set(-0.13, 0.42, -0.04);
    earL.rotation.set(-0.15, 0, 0.15);
    earL.castShadow = true;

    const earInnerGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.38, 16);
    earInnerGeo.scale(0.7, 1, 0.2);
    const innerL = new THREE.Mesh(earInnerGeo, earInnerMat);
    innerL.position.set(0, 0, 0.02);
    earL.add(innerL);

    const earR = new THREE.Mesh(earGeo, primaryMat);
    earR.position.set(0.13, 0.42, -0.04);
    earR.rotation.set(-0.15, 0, -0.15);
    earR.castShadow = true;

    const innerR = new THREE.Mesh(earInnerGeo, earInnerMat);
    innerR.position.set(0, 0, 0.02);
    earR.add(innerR);

    earsGroup.add(earL, earR);
  } else if (type === 'dog') {
    // Droopy floppy ears
    const earGeo = new THREE.SphereGeometry(0.13, 16, 16);
    earGeo.scale(0.7, 1.4, 0.5);

    const earL = new THREE.Mesh(earGeo, secondaryMat);
    earL.position.set(-0.28, 0.12, 0.02);
    earL.rotation.set(0.2, 0.1, 0.4);
    earL.castShadow = true;

    const earR = new THREE.Mesh(earGeo, secondaryMat);
    earR.position.set(0.28, 0.12, 0.02);
    earR.rotation.set(0.2, -0.1, -0.4);
    earR.castShadow = true;

    earsGroup.add(earL, earR);
  } else if (type === 'koala') {
    // Big fluffy round ears
    const earGeo = new THREE.SphereGeometry(0.18, 16, 16);
    earGeo.scale(1, 1, 0.4);

    const earL = new THREE.Mesh(earGeo, primaryMat);
    earL.position.set(-0.3, 0.22, -0.02);
    earL.rotation.set(0, 0.2, 0.2);

    const innerEar = new THREE.SphereGeometry(0.11, 12, 12);
    innerEar.scale(1, 1, 0.3);
    const innerL = new THREE.Mesh(innerEar, earInnerMat);
    innerL.position.set(0, 0, 0.03);
    earL.add(innerL);

    const earR = new THREE.Mesh(earGeo, primaryMat);
    earR.position.set(0.3, 0.22, -0.02);
    earR.rotation.set(0, -0.2, -0.2);

    const innerR = new THREE.Mesh(innerEar, earInnerMat);
    innerR.position.set(0, 0, 0.03);
    earR.add(innerR);

    earsGroup.add(earL, earR);
  } else if (type === 'panda' || type === 'hamster') {
    // Cute round ears
    const earGeo = new THREE.SphereGeometry(0.11, 14, 14);
    earGeo.scale(1, 1, 0.5);

    const earL = new THREE.Mesh(earGeo, type === 'panda' ? secondaryMat : primaryMat);
    earL.position.set(-0.22, 0.24, -0.04);

    const earR = new THREE.Mesh(earGeo, type === 'panda' ? secondaryMat : primaryMat);
    earR.position.set(0.22, 0.24, -0.04);

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
  }

  // --- 5. LEGS / PAWS ---
  const legFrontLeft = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), type === 'penguin' ? snoutMat : (type === 'panda' ? secondaryMat : primaryMat));
  legFrontLeft.scale.set(1, 0.7, 1.2);
  legFrontLeft.position.set(-0.18, 0.1, 0.16);

  const legFrontRight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), type === 'penguin' ? snoutMat : (type === 'panda' ? secondaryMat : primaryMat));
  legFrontRight.scale.set(1, 0.7, 1.2);
  legFrontRight.position.set(0.18, 0.1, 0.16);

  const legBackLeft = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), type === 'penguin' ? snoutMat : (type === 'panda' ? secondaryMat : primaryMat));
  legBackLeft.scale.set(1, 0.7, 1.2);
  legBackLeft.position.set(-0.2, 0.1, -0.14);

  const legBackRight = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), type === 'penguin' ? snoutMat : (type === 'panda' ? secondaryMat : primaryMat));
  legBackRight.scale.set(1, 0.7, 1.2);
  legBackRight.position.set(0.2, 0.1, -0.14);

  bodyGroup.add(legFrontLeft, legFrontRight, legBackLeft, legBackRight);

  // --- 6. 3D ACCESSORIES (ROBUST CHECKING ACROSS HEAD, BODY/DRESS, EYES, BACK, FEET) ---
  const accessoriesGroup = new THREE.Group();
  rootAnimGroup.add(accessoriesGroup);

  const headwear = equipped?.head || equipped?.headwear;
  const costume = equipped?.body || equipped?.costume;
  const glasses = equipped?.eyes || equipped?.glasses;
  const backAcc = equipped?.back || equipped?.backpack;
  const feetAcc = equipped?.feet || equipped?.shoes;

  // HEADWEAR 1: Wizard / Magic Hat
  if (headwear === 'hat_wizard' || headwear?.includes('wizard') || headwear?.includes('magic')) {
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.98, 0.04);

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
    accessoriesGroup.add(hatGroup);
  }
  // HEADWEAR 2: Golden Crown
  else if (headwear === 'crown_golden' || headwear?.includes('crown')) {
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 0.98, 0.06);

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
    accessoriesGroup.add(crownGroup);
  }
  // HEADWEAR 3: Explorer Cap
  else if (headwear === 'cap_starter' || headwear?.includes('cap')) {
    const capGroup = new THREE.Group();
    capGroup.position.set(0, 0.92, 0.08);

    const capMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), capMat);

    const visorGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.02, 16, 1, false, -Math.PI / 3, (Math.PI * 2) / 3);
    const visor = new THREE.Mesh(visorGeo, new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.3 }));
    visor.position.set(0, 0.02, 0.12);
    visor.rotation.x = 0.2;

    const topButton = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), goldMat);
    topButton.position.y = 0.25;

    capGroup.add(capDome, visor, topButton);
    accessoriesGroup.add(capGroup);
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

  // --- EYES ACCESSORIES ---
  if (glasses === 'glasses_round' || glasses?.includes('round') || glasses?.includes('smart')) {
    const glassGroup = new THREE.Group();
    glassGroup.position.set(0, 0.74, 0.36);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3 });
    const lensL = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 8, 20), frameMat);
    lensL.position.set(-0.13, 0, 0);

    const lensR = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 8, 20), frameMat);
    lensR.position.set(0.13, 0, 0);

    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), frameMat);
    bridge.rotation.z = Math.PI / 2;

    glassGroup.add(lensL, lensR, bridge);
    accessoriesGroup.add(glassGroup);
  } else if (glasses === 'shades_cool' || glasses?.includes('shades') || glasses?.includes('sun')) {
    const glassGroup = new THREE.Group();
    glassGroup.position.set(0, 0.74, 0.38);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.02), frameMat);
    lensL.position.set(-0.13, 0, 0);

    const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.02), frameMat);
    lensR.position.set(0.13, 0, 0);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), frameMat);
    glassGroup.add(lensL, lensR, bridge);
    accessoriesGroup.add(glassGroup);
  } else if (glasses === 'goggles_vr' || glasses?.includes('goggles') || glasses?.includes('matrix')) {
    const glassGroup = new THREE.Group();
    glassGroup.position.set(0, 0.74, 0.38);

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
    accessoriesGroup.add(glassGroup);
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
    emotion?: 'happy' | 'excited' | 'tired' | 'sleepy' | 'eating' | 'petting' | 'victory' | 'hurt' | 'neutral'
  ) => {
    activeEmotion = emotion || (isVictory ? 'victory' : isHurt ? 'hurt' : 'neutral');
    emotionAnimTime += delta;

    // 1. Idle breathing and micro bobs (smooth gentle float, no rapid jitter)
    if (!isMoving && !isVictory && !isHurt && activeEmotion !== 'sleepy' && activeEmotion !== 'eating' && activeEmotion !== 'hurt') {
      const breath = Math.sin(time * 2.0) * 0.015;
      bodyGroup.scale.set(1 + breath * 0.4, 1 + breath, 1 + breath * 0.4);
      headGroup.position.y = 0.68 + breath * 0.5;
      headGroup.rotation.z = Math.sin(time * 1.0) * 0.02;
      tailGroup.rotation.y = Math.sin(time * 2.5) * 0.15;
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

    // 4. Hurt / Error collision recoil & Sad pose (gentle slump, no infinite high-frequency spring shake)
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

    // 9. Natural Blinking (when not sleeping/victory/hurt)
    if (activeEmotion !== 'sleepy' && activeEmotion !== 'petting' && activeEmotion !== 'victory' && activeEmotion !== 'hurt') {
      blinkTimer += delta;
      if (blinkTimer > 3.5 && !isBlinking) {
        isBlinking = true;
        eyeGroupLeft.scale.y = 0.1;
        eyeGroupRight.scale.y = 0.1;
        setTimeout(() => {
          eyeGroupLeft.scale.y = 1.0;
          eyeGroupRight.scale.y = 1.0;
          isBlinking = false;
          blinkTimer = Math.random() * 0.5;
        }, 120);
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
    eyeGroupLeft.scale.y = 0.1;
    eyeGroupRight.scale.y = 0.1;
    setTimeout(() => {
      eyeGroupLeft.scale.y = 1.0;
      eyeGroupRight.scale.y = 1.0;
    }, 150);
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
  };
}
