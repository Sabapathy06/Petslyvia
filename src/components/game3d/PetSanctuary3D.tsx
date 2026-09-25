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
    scene.background = new THREE.Color(0xdce8e0);
    scene.fog = new THREE.FogExp2(0xdce8e0, 0.02);

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
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xf0fdf4, 1.05);
    scene.add(ambientLight);

    const warmLight = new THREE.DirectionalLight(0xfffdf5, 1.4);
    warmLight.position.set(4, 7, 4);
    warmLight.castShadow = true;
    warmLight.shadow.mapSize.width = 1024;
    warmLight.shadow.mapSize.height = 1024;
    scene.add(warmLight);

    const fillLight = new THREE.PointLight(0x22c55e, 0.6, 12);
    fillLight.position.set(-4, 4, -4);
    scene.add(fillLight);

    // 5. Floating Sanctuary Island Platform
    const islandGroup = new THREE.Group();
    scene.add(islandGroup);

    // Grassy circular disc (mild sage diorama)
    const grassGeo = new THREE.CylinderGeometry(2.4, 2.2, 0.4, 32);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x98bfa8,
      roughness: 0.7,
      metalness: 0.1,
    });
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.position.y = -0.2;
    grassMesh.receiveShadow = true;
    islandGroup.add(grassMesh);

    // Stone base underside
    const stoneGeo = new THREE.CylinderGeometry(2.2, 0.4, 1.2, 32);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x5a7a6a,
      roughness: 0.85,
    });
    const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
    stoneMesh.position.y = -0.8;
    islandGroup.add(stoneMesh);

    // Cozy Cushion / Rug
    const rugGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.05, 32);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0xeaf2ec,
      roughness: 0.7,
    });
    const rugMesh = new THREE.Mesh(rugGeo, rugMat);
    rugMesh.position.y = 0.02;
    rugMesh.receiveShadow = true;
    islandGroup.add(rugMesh);

    // Bed pillow
    const pillowGeo = new THREE.SphereGeometry(0.35, 16, 16);
    pillowGeo.scale(1.2, 0.4, 0.8);
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.5 });
    const pillow = new THREE.Mesh(pillowGeo, pillowMat);
    pillow.position.set(0.9, 0.12, -0.6);
    pillow.rotation.y = -0.4;
    pillow.castShadow = true;
    islandGroup.add(pillow);

    // Treat Bowl
    const bowlGeo = new THREE.CylinderGeometry(0.2, 0.14, 0.12, 16);
    const bowlMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.2 });
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    bowl.position.set(-0.9, 0.06, 0.6);
    bowl.castShadow = true;
    islandGroup.add(bowl);

    // 6. Floating Sparkles in air
    const sparkleCount = 40;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePos = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount * 3; i += 3) {
      sparklePos[i] = (Math.random() - 0.5) * 4.5;
      sparklePos[i + 1] = Math.random() * 2.5 + 0.2;
      sparklePos[i + 2] = (Math.random() - 0.5) * 4.5;
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
    const sparkleMat = new THREE.PointsMaterial({
      size: 0.1,
      color: 0xfcd34d,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparkles);

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
      className={`relative w-full rounded-3xl overflow-hidden bg-[#dce8e0] border border-[#e2ece5] shadow-card select-none ${className}`}
      style={{ height }}
    >
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          isDraggingRef.current = false;
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
