import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { PetType, PetState } from '@/types/database';
import type { EquippedAccessories, PetStage } from '@/types/game';
import { createPet3D, type Pet3DModel } from './PetMesh3D';
import { Heart } from 'lucide-react';
import { sound } from '@/utils/audio';

interface PetSanctuary3DProps {
  type: PetType;
  state?: PetState;
  stage?: PetStage;
  equipped?: EquippedAccessories | null;
  onPetClick?: () => void;
  onFeedClick?: () => void;
  onRestClick?: () => void;
  actionTrigger?: 'pet' | 'feed' | 'rest' | null;
  className?: string;
  height?: string | number;
}

export function PetSanctuary3D({
  type = 'cat',
  state = 'neutral',
  stage = 'infant',
  equipped = null,
  onPetClick,
  onFeedClick,
  onRestClick,
  actionTrigger = null,
  className = '',
  height = '400px',
}: PetSanctuary3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pet3DRef = useRef<Pet3DModel | null>(null);

  const [activeReaction, setActiveReaction] = useState<'heart' | 'sparkle' | 'food' | 'sleep' | null>(null);
  const activeReactionRef = useRef<'heart' | 'sparkle' | 'food' | 'sleep' | null>(null);
  const stateRef = useRef<PetState>(state);

  // Sync state refs to avoid scene recreation
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    activeReactionRef.current = activeReaction;
  }, [activeReaction]);

  // Orbit state
  const isDraggingRef = useRef(false);
  const pointerStartPosRef = useRef({ x: 0, y: 0 });
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const orbitRef = useRef({
    radius: 4.5,
    theta: Math.PI / 4,
    phi: Math.PI / 3,
  });

  // Love hearts in scene
  const loveHeartsRef = useRef<THREE.Group[]>([]);

  // 1. Primary Scene Creation (Only runs on pet structure/costume changes)
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xeef7f2);
    scene.fog = new THREE.FogExp2(0xeef7f2, 0.018);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Cinematic 3-Point Studio Character Lighting
    const hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x86efac, 0.9);
    scene.add(hemiLight);

    const warmKeyLight = new THREE.DirectionalLight(0xfffbeb, 1.7);
    warmKeyLight.position.set(4.5, 7.5, 4.0);
    warmKeyLight.castShadow = true;
    warmKeyLight.shadow.mapSize.width = 2048;
    warmKeyLight.shadow.mapSize.height = 2048;
    warmKeyLight.shadow.camera.near = 0.5;
    warmKeyLight.shadow.camera.far = 25;
    warmKeyLight.shadow.camera.left = -3;
    warmKeyLight.shadow.camera.right = 3;
    warmKeyLight.shadow.camera.top = 3;
    warmKeyLight.shadow.camera.bottom = -3;
    warmKeyLight.shadow.bias = -0.0005;
    scene.add(warmKeyLight);

    // Warm golden rim light behind pet to illuminate fur peach-fuzz sheen
    const rimLight = new THREE.DirectionalLight(0xfef08a, 1.7);
    rimLight.position.set(-4.0, 5.0, -4.5);
    rimLight.lookAt(0, 0.4, 0);
    scene.add(rimLight);

    // Soft front bounce fill light
    const frontBounceLight = new THREE.PointLight(0xffedd5, 0.45, 10);
    frontBounceLight.position.set(0, 2.0, 3.8);
    scene.add(frontBounceLight);

    // 5. Handcrafted Miniature Sanctuary Island Diorama
    const islandGroup = new THREE.Group();
    scene.add(islandGroup);

    // A. Polished Dark Walnut Wood Pedestal Base
    const woodGeo = new THREE.CylinderGeometry(2.35, 1.8, 0.5, 36);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3d2415,
      roughness: 0.55,
      metalness: 0.05,
    });
    const woodMesh = new THREE.Mesh(woodGeo, woodMat);
    woodMesh.position.y = -0.52;
    woodMesh.receiveShadow = true;
    islandGroup.add(woodMesh);

    // Polished Brass Collar Trim
    const brassTrimGeo = new THREE.TorusGeometry(2.36, 0.032, 10, 36);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.22,
    });
    const brassTrim = new THREE.Mesh(brassTrimGeo, brassMat);
    brassTrim.rotation.x = Math.PI / 2;
    brassTrim.position.y = -0.28;
    islandGroup.add(brassTrim);

    // B. Tiered Lush Fresh Clover Grass Island
    const grassGeo = new THREE.CylinderGeometry(2.4, 2.34, 0.26, 36);
    const grassMat = new THREE.MeshPhysicalMaterial({
      color: 0x4ade80, // Rich vibrant fresh clover green
      roughness: 0.78,
      sheen: 0.55,
      sheenRoughness: 0.35,
      sheenColor: new THREE.Color(0xbbf7d0),
    });
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.position.y = -0.13;
    grassMesh.receiveShadow = true;
    islandGroup.add(grassMesh);

    // C. 3D Grass Tufts around Island Perimeter
    const grassTuftGroup = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + Math.sin(i * 3) * 0.1;
      const rad = 1.75 + Math.cos(i * 2) * 0.28;
      const tuft = new THREE.Group();
      tuft.position.set(Math.cos(ang) * rad, 0.0, Math.sin(ang) * rad);

      const bladeGeo = new THREE.ConeGeometry(0.04, 0.18, 5);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x22c55e : 0x16a34a,
        roughness: 0.65,
      });

      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set((b - 1) * 0.03, 0.08, 0);
        blade.rotation.z = (b - 1) * 0.25;
        blade.rotation.y = (b * Math.PI) / 3;
        tuft.add(blade);
      }
      grassTuftGroup.add(tuft);
    }
    islandGroup.add(grassTuftGroup);

    // D. Blooming Miniature Daisies & Buttercups
    const flowerGroup = new THREE.Group();
    const daisyWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 });
    const daisyGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.3,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.3,
    });
    const buttercupMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.3 });

    const flowerAngles = [0.4, 1.2, 2.3, 3.4, 4.6, 5.7];
    flowerAngles.forEach((ang, idx) => {
      const fl = new THREE.Group();
      const rad = 1.6 + (idx % 3) * 0.25;
      fl.position.set(Math.cos(ang) * rad, 0.015, Math.sin(ang) * rad);

      const center = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), daisyGoldMat);
      center.scale.y = 0.5;
      center.position.y = 0.03;
      fl.add(center);

      const petalCount = idx % 2 === 0 ? 6 : 5;
      for (let p = 0; p < petalCount; p++) {
        const pAng = (p / petalCount) * Math.PI * 2;
        const petal = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 6, 6),
          idx % 3 === 1 ? buttercupMat : daisyWhiteMat
        );
        petal.scale.set(1.4, 0.4, 0.7);
        petal.position.set(Math.cos(pAng) * 0.04, 0.025, Math.sin(pAng) * 0.04);
        petal.rotation.y = -pAng;
        fl.add(petal);
      }
      flowerGroup.add(fl);
    });
    islandGroup.add(flowerGroup);

    // E. Polished River Stones
    const stonesGroup = new THREE.Group();
    const stoneMat1 = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 });
    const stoneMat2 = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35 });

    const stone1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), stoneMat1);
    stone1.scale.set(1.3, 0.55, 0.9);
    stone1.position.set(1.45, 0.04, 0.85);
    stone1.rotation.y = 0.6;
    stone1.castShadow = true;

    const stone2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), stoneMat2);
    stone2.scale.set(1.2, 0.5, 0.9);
    stone2.position.set(1.62, 0.03, 0.72);
    stone2.castShadow = true;

    stonesGroup.add(stone1, stone2);
    islandGroup.add(stonesGroup);

    // F. Scalloped Cream Woven Rug with Braided Stitched Fringe
    const rugGeo = new THREE.CylinderGeometry(1.22, 1.22, 0.035, 36);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0xfefae0, // Soft warm cream linen
      roughness: 0.8,
    });
    const rugMesh = new THREE.Mesh(rugGeo, rugMat);
    rugMesh.position.y = 0.015;
    rugMesh.receiveShadow = true;
    islandGroup.add(rugMesh);

    const fringeRimGeo = new THREE.TorusGeometry(1.23, 0.018, 8, 36);
    const fringeRimMat = new THREE.MeshStandardMaterial({ color: 0xe2d9cc, roughness: 0.85 });
    const fringeRim = new THREE.Mesh(fringeRimGeo, fringeRimMat);
    fringeRim.rotation.x = Math.PI / 2;
    fringeRim.position.y = 0.02;
    islandGroup.add(fringeRim);

    // G. Soft Ground Contact Shadow (Under Pet)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.6)');
      grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.25)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.88, 0.88),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
      })
    );
    contactShadowPlane.rotation.x = -Math.PI / 2;
    contactShadowPlane.position.y = 0.035;
    islandGroup.add(contactShadowPlane);

    // H. Emerald Velvet Plush Cushion Bed
    const pillowGeo = new THREE.SphereGeometry(0.38, 20, 20);
    pillowGeo.scale(1.2, 0.45, 0.85);
    const pillowMat = new THREE.MeshPhysicalMaterial({
      color: 0x059669,
      roughness: 0.72,
      sheen: 0.8,
      sheenRoughness: 0.35,
      sheenColor: new THREE.Color(0xa7f3d0),
    });
    const pillow = new THREE.Mesh(pillowGeo, pillowMat);
    pillow.position.set(0.95, 0.12, -0.65);
    pillow.rotation.y = -0.4;
    pillow.castShadow = true;
    pillow.receiveShadow = true;

    // Tufted center button on cushion
    const buttonGeo = new THREE.SphereGeometry(0.04, 10, 10);
    const buttonMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 });
    const pillowButton = new THREE.Mesh(buttonGeo, buttonMat);
    pillowButton.position.set(0, 0.13, 0);
    pillow.add(pillowButton);
    islandGroup.add(pillow);

    // I. Ceramic Pet Bowl with Star Kibbles & Sweet Berries
    const bowlGroup = new THREE.Group();
    bowlGroup.position.set(-0.95, 0.04, 0.65);

    const bowlOuterGeo = new THREE.CylinderGeometry(0.22, 0.15, 0.13, 24);
    const bowlCeramicMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.18,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
    });
    const bowlOuter = new THREE.Mesh(bowlOuterGeo, bowlCeramicMat);
    bowlOuter.castShadow = true;
    bowlGroup.add(bowlOuter);

    const bowlRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.014, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 })
    );
    bowlRim.rotation.x = Math.PI / 2;
    bowlRim.position.y = 0.065;
    bowlGroup.add(bowlRim);

    const pawBadge = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 })
    );
    pawBadge.scale.set(1, 1, 0.3);
    pawBadge.position.set(0, 0.01, 0.2);
    bowlGroup.add(pawBadge);

    const kibbleMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 });
    const berryMat = new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.15, clearcoat: 0.9 });
    for (let k = 0; k < 6; k++) {
      const kAng = (k / 6) * Math.PI * 2;
      const kRad = 0.08;
      const kibble = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), kibbleMat);
      kibble.position.set(Math.cos(kAng) * kRad, 0.045, Math.sin(kAng) * kRad);
      kibble.rotation.set(Math.random(), Math.random(), Math.random());
      bowlGroup.add(kibble);
    }
    const berry1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), berryMat);
    berry1.position.set(0.02, 0.06, 0.01);
    const berry2 = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), berryMat);
    berry2.position.set(-0.04, 0.055, -0.03);
    bowlGroup.add(berry1, berry2);

    islandGroup.add(bowlGroup);

    // 6. Floating Warm Golden Fireflies / Fairy Motes
    const fireflyGroup = new THREE.Group();
    scene.add(fireflyGroup);
    const fireflyCount = 28;
    const fireflyMeshes: Array<{ mesh: THREE.Mesh; basePos: THREE.Vector3; speed: number; phase: number }> = [];

    const fireflyGeo = new THREE.SphereGeometry(0.028, 8, 8);
    const fireflyMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < fireflyCount; i++) {
      const fMesh = new THREE.Mesh(fireflyGeo, fireflyMat);
      const basePos = new THREE.Vector3(
        (Math.random() - 0.5) * 4.2,
        0.4 + Math.random() * 2.2,
        (Math.random() - 0.5) * 4.2
      );
      fMesh.position.copy(basePos);
      fireflyGroup.add(fMesh);
      fireflyMeshes.push({
        mesh: fMesh,
        basePos,
        speed: 0.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // 7. Instantiate 3D Pet Model
    const stageScale = stage === 'infant' ? 1.0 : stage === 'child' ? 1.15 : stage === 'teen' ? 1.3 : 1.45;
    const petModel = createPet3D(type, equipped, stageScale);
    scene.add(petModel.group);
    pet3DRef.current = petModel;
    petModel.group.position.set(0, 0, 0);

    // 8. Render & Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Camera Orbit Position
      const orbit = orbitRef.current;
      const camX = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
      const camY = orbit.radius * Math.cos(orbit.phi);
      const camZ = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, 0.35, 0);

      // Pet animation with emotion support
      const currentReaction = activeReactionRef.current;
      const currentPetState = stateRef.current;

      const isHappy = currentPetState === 'happy' || currentPetState === 'excited' || currentPetState === 'energetic';
      const isSleepy = currentPetState === 'sleepy' || currentReaction === 'sleep';
      const isEating = currentReaction === 'food';
      const isPetting = currentReaction === 'heart';

      petModel.updateAnimation(
        delta,
        time,
        false,
        isHappy,
        false,
        isEating ? 'eating' : isPetting ? 'petting' : isSleepy ? 'sleepy' : isHappy ? 'happy' : 'neutral'
      );

      // Floating island gentle hover
      islandGroup.position.y = Math.sin(time * 1.5) * 0.05;

      // Update floating fireflies
      fireflyMeshes.forEach((ff) => {
        ff.mesh.position.y = ff.basePos.y + Math.sin(time * ff.speed + ff.phase) * 0.18;
        ff.mesh.position.x = ff.basePos.x + Math.cos(time * ff.speed * 0.6 + ff.phase) * 0.12;
        ff.mesh.scale.setScalar(0.75 + Math.sin(time * ff.speed * 2 + ff.phase) * 0.35);
      });

      // Update floating love hearts
      loveHeartsRef.current.forEach((heartGroup, idx) => {
        heartGroup.position.y += delta * 0.8;
        heartGroup.scale.multiplyScalar(0.985);
        heartGroup.rotation.y += delta * 2;
        if (heartGroup.scale.x < 0.1) {
          scene.remove(heartGroup);
          loveHeartsRef.current.splice(idx, 1);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      try {
        petModel.cleanup();
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
            obj.geometry?.dispose?.();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m?.dispose?.());
            } else if (obj.material) {
              obj.material.dispose?.();
            }
          }
        });
        renderer.dispose();
        renderer.forceContextLoss?.();
        if (renderer.domElement && renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      } catch (err) {
        console.warn('PetSanctuary3D cleanup caught error:', err);
      }
    };
  }, [type, stage, JSON.stringify(equipped)]);

  // 1. Petting / Cuddle Action
  const triggerCuddleAnimation = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    sound.playPet();
    setActiveReaction('heart');
    if (pet3DRef.current) {
      pet3DRef.current.playPetting(1.0);
    }
    setTimeout(() => setActiveReaction(null), 2500);

    for (let i = 0; i < 8; i++) {
      const heartGroup = new THREE.Group();
      const heartGeo = new THREE.SphereGeometry(0.1, 12, 12);
      heartGeo.scale(1, 1.2, 0.6);
      const heartMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xf43f5e,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const heartMesh = new THREE.Mesh(heartGeo, heartMat);

      heartGroup.add(heartMesh);
      heartGroup.position.set(
        (Math.random() - 0.5) * 0.7,
        0.5 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.7
      );
      scene.add(heartGroup);
      loveHeartsRef.current.push(heartGroup);
    }
  };

  const handlePet = (fromUserClick: boolean = false) => {
    triggerCuddleAnimation();
    if (fromUserClick && onPetClick) {
      onPetClick();
    }
  };

  // 2. Feeding Action
  const triggerFeedAnimation = () => {
    sound.playEat();
    setActiveReaction('food');
    if (pet3DRef.current) {
      pet3DRef.current.playEating(1.0);
    }
    setTimeout(() => setActiveReaction(null), 2500);
  };

  const handleFeed = (fromUserClick: boolean = false) => {
    triggerFeedAnimation();
    if (fromUserClick && onFeedClick) {
      onFeedClick();
    }
  };

  // 3. Resting Action
  const triggerRestAnimation = () => {
    sound.playSleep();
    setActiveReaction('sleep');
    if (pet3DRef.current) {
      pet3DRef.current.playSleeping(0);
    }
    setTimeout(() => setActiveReaction(null), 3000);
  };

  const handleRest = (fromUserClick: boolean = false) => {
    triggerRestAnimation();
    if (fromUserClick && onRestClick) {
      onRestClick();
    }
  };

  // Handle external Action Trigger prop changes
  useEffect(() => {
    if (!actionTrigger) return;
    if (actionTrigger === 'pet') triggerCuddleAnimation();
    else if (actionTrigger === 'feed') triggerFeedAnimation();
    else if (actionTrigger === 'rest') triggerRestAnimation();
  }, [actionTrigger]);

  // Handle pointer interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Smooth head and eye tracking to cursor
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pet3DRef.current?.setLookTarget?.(ndcX, ndcY);
    }

    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    orbitRef.current.theta -= deltaX * 0.008;
    orbitRef.current.phi = THREE.MathUtils.clamp(
      orbitRef.current.phi + deltaY * 0.008,
      0.1,
      Math.PI / 2.1
    );

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const dist = Math.hypot(
        e.clientX - pointerStartPosRef.current.x,
        e.clientY - pointerStartPosRef.current.y
      );
      if (dist < 6) {
        // Pure click on pet / 3D sanctuary without dragging
        handlePet(true);
      }
    }
  };

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden bg-[#eef7f2] border border-[#d8ece0] shadow-card select-none ${className}`}
      style={{ height }}
    >
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          isDraggingRef.current = false;
          pet3DRef.current?.setLookTarget?.(0, 0);
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating 3D Interaction Button Overlay */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="px-3 py-1 bg-slate-900/85 backdrop-blur-md rounded-full border border-slate-700/80 flex items-center gap-1.5 shadow-md pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-[11px] font-black text-amber-300">3D Sanctuary Playground</span>
        </div>

        {/* Quick 3D Care Actions */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => handleFeed(true)}
            title="Feed Treat"
            className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 rounded-xl text-xs font-black flex items-center gap-1 shadow-lg backdrop-blur-md transition-all cursor-pointer active:scale-95"
          >
            <span>🍎</span> Feed
          </button>
          <button
            onClick={() => handlePet(true)}
            title="Cuddle Companion"
            className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-300 rounded-xl text-xs font-black flex items-center gap-1 shadow-lg backdrop-blur-md transition-all cursor-pointer active:scale-95"
          >
            <Heart size={13} className="fill-rose-400 text-rose-400" /> Cuddle
          </button>
          <button
            onClick={() => handleRest(true)}
            title="Rest Companion"
            className="px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/50 text-indigo-300 rounded-xl text-xs font-black flex items-center gap-1 shadow-lg backdrop-blur-md transition-all cursor-pointer active:scale-95"
          >
            <span>💤</span> Rest
          </button>
        </div>
      </div>

      {/* Touch / Click Hint */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center pointer-events-none">
        <div className="px-3 py-1 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-800 text-[10px] text-slate-400 font-medium">
          Drag to orbit 360° • Click pet to cuddle • Tap Feed / Cuddle / Rest
        </div>
      </div>
    </div>
  );
}
