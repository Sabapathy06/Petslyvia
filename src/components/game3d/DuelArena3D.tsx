import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { PetType } from '@/types/database';
import type { GridPos, Direction } from '@/types/game';
import { createPet3D, type Pet3DModel } from './PetMesh3D';
import { Trophy, Zap, Flag, Camera, RotateCcw, Maximize2 } from 'lucide-react';

interface DuelArena3DProps {
  playerPetType: PetType;
  opponentPetType: PetType;
  opponentName: string;
  gridSize: { width: number; height: number };
  playerPos: GridPos;
  playerDir: Direction;
  opponentPos: GridPos;
  opponentDir: Direction;
  goalPos: GridPos;
  obstacles: Array<{ x: number; y: number; type: 'wall' | 'water' | 'gate'; id?: string; isOpen?: boolean }>;
  crystals: Array<{ x: number; y: number }>;
  switches?: Array<{ x: number; y: number; targetGateId?: string }>;
  isRacing: boolean;
  winner?: 'player' | 'opponent' | null;
  className?: string;
  height?: string | number;
}

export function DuelArena3D({
  playerPetType = 'cat',
  opponentPetType = 'dog',
  opponentName = 'Opponent',
  gridSize,
  playerPos,
  playerDir,
  opponentPos,
  opponentDir,
  goalPos,
  obstacles,
  crystals,
  switches = [],
  isRacing,
  winner,
  className = '',
  height = '440px',
}: DuelArena3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const player3DRef = useRef<Pet3DModel | null>(null);
  const opp3DRef = useRef<Pet3DModel | null>(null);

  const playerTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const oppTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  const [camMode, setCamMode] = useState<'stadium' | 'follow_player' | 'cinematic'>('stadium');

  const gridToWorld = useCallback(
    (x: number, y: number): THREE.Vector3 => {
      const offsetX = -(gridSize.width - 1) / 2;
      const offsetZ = -(gridSize.height - 1) / 2;
      return new THREE.Vector3(x + offsetX, 0, y + offsetZ);
    },
    [gridSize.width, gridSize.height]
  );

  const dirToAngle = (dir: Direction): number => {
    switch (dir) {
      case 'up':
        return Math.PI; // -Z (Up)
      case 'down':
        return 0; // +Z (Down)
      case 'left':
        return -Math.PI / 2; // -X (Left)
      case 'right':
        return Math.PI / 2; // +X (Right)
      default:
        return 0;
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 440;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x070b19); // Cyber stadium arena
    scene.fog = new THREE.FogExp2(0x070b19, 0.03);

    // Calculate dynamic camera distance based on arena dimensions
    const maxDim = Math.max(gridSize.width, gridSize.height);
    const camDist = Math.max(8.5, maxDim * 1.6);
    const camHeight = Math.max(7.5, maxDim * 1.4);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120);
    cameraRef.current = camera;
    camera.position.set(0, camHeight, camDist);
    camera.lookAt(0, 0, 0);

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
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Stadium Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const stadiumSpot1 = new THREE.SpotLight(0x38bdf8, 3.0, 40, Math.PI / 3.5, 0.3);
    stadiumSpot1.position.set(-10, 14, 10);
    stadiumSpot1.castShadow = true;
    scene.add(stadiumSpot1);

    const stadiumSpot2 = new THREE.SpotLight(0xf43f5e, 3.0, 40, Math.PI / 3.5, 0.3);
    stadiumSpot2.position.set(10, 14, -10);
    stadiumSpot2.castShadow = true;
    scene.add(stadiumSpot2);

    const centerGlow = new THREE.PointLight(0xa855f7, 1.5, 20);
    centerGlow.position.set(0, 4, 0);
    scene.add(centerGlow);

    // 5. Arena Track Floor & Stadium Border
    const arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    const trackWidth = gridSize.width + 1.6;
    const trackDepth = gridSize.height + 1.6;

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.6,
    });
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.4, trackDepth), baseMat);
    baseMesh.position.y = -0.2;
    baseMesh.receiveShadow = true;
    arenaGroup.add(baseMesh);

    // Glowing stadium border edge ring
    const edgeGeo = new THREE.BoxGeometry(trackWidth + 0.1, 0.06, trackDepth + 0.1);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
    });
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    edgeMesh.position.y = 0.02;
    arenaGroup.add(edgeMesh);

    // Grid Floor Tiles with Stadium Glow lines
    const tileGeo = new THREE.BoxGeometry(0.92, 0.08, 0.92);
    const tileMatA = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    const tileMatB = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 });

    for (let row = 0; row < gridSize.height; row++) {
      for (let col = 0; col < gridSize.width; col++) {
        const pos = gridToWorld(col, row);
        const tile = new THREE.Mesh(tileGeo, (col + row) % 2 === 0 ? tileMatA : tileMatB);
        tile.position.set(pos.x, -0.04, pos.z);
        tile.receiveShadow = true;
        arenaGroup.add(tile);
      }
    }

    // 6. Finish Line Archway at Goal
    const goalWorld = gridToWorld(goalPos.x, goalPos.y);
    const archGroup = new THREE.Group();
    archGroup.position.set(goalWorld.x, 0, goalWorld.z);

    const archPillarGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.8, 12);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      metalness: 0.8,
    });

    const pillarL = new THREE.Mesh(archPillarGeo, archMat);
    pillarL.position.set(-0.45, 0.9, 0);

    const pillarR = new THREE.Mesh(archPillarGeo, archMat);
    pillarR.position.set(0.45, 0.9, 0);

    const crossbarGeo = new THREE.BoxGeometry(1.05, 0.2, 0.15);
    const crossbar = new THREE.Mesh(crossbarGeo, archMat);
    crossbar.position.set(0, 1.75, 0);

    const finishLight = new THREE.PointLight(0xfbbf24, 2.5, 6);
    finishLight.position.set(0, 1.5, 0);

    archGroup.add(pillarL, pillarR, crossbar, finishLight);
    arenaGroup.add(archGroup);

    // 7. Obstacles (Walls / Water / Gates)
    obstacles.forEach((obs) => {
      const wPos = gridToWorld(obs.x, obs.y);
      if (obs.type === 'wall') {
        const barrierGeo = new THREE.BoxGeometry(0.88, 0.75, 0.88);
        const barrierMat = new THREE.MeshStandardMaterial({
          color: 0x475569,
          roughness: 0.3,
          metalness: 0.7,
        });
        const barrier = new THREE.Mesh(barrierGeo, barrierMat);
        barrier.position.set(wPos.x, 0.375, wPos.z);
        barrier.castShadow = true;
        arenaGroup.add(barrier);
      } else if (obs.type === 'gate') {
        const gateGroup = new THREE.Group();
        gateGroup.position.set(wPos.x, 0, wPos.z);

        const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 8);
        const postMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c });
        const post1 = new THREE.Mesh(postGeo, postMat);
        post1.position.set(-0.35, 0.6, 0);
        const post2 = new THREE.Mesh(postGeo, postMat);
        post2.position.set(0.35, 0.6, 0);

        const beamGeo = new THREE.BoxGeometry(0.7, 0.8, 0.08);
        const beamMat = new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          emissive: 0xf43f5e,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.6,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(0, 0.6, 0);

        gateGroup.add(post1, post2, beam);
        arenaGroup.add(gateGroup);
      } else if (obs.type === 'water') {
        const waterGeo = new THREE.BoxGeometry(0.9, 0.05, 0.9);
        const waterMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          roughness: 0.1,
          transparent: true,
          opacity: 0.85,
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.set(wPos.x, 0, wPos.z);
        arenaGroup.add(water);
      }
    });

    // 8. Switches
    switches.forEach((sw) => {
      const swPos = gridToWorld(sw.x, sw.y);
      const switchPadGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.08, 16);
      const switchPadMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.9,
      });
      const pad = new THREE.Mesh(switchPadGeo, switchPadMat);
      pad.position.set(swPos.x, 0.04, swPos.z);
      arenaGroup.add(pad);
    });

    // 9. Crystals
    const crystalMeshes: THREE.Mesh[] = [];
    crystals.forEach((c) => {
      const cPos = gridToWorld(c.x, c.y);
      const gemGeo = new THREE.OctahedronGeometry(0.22, 0);
      const gemMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.95,
        metalness: 0.6,
      });
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(cPos.x, 0.35, cPos.z);
      gem.name = `crystal_${c.x}_${c.y}`;
      arenaGroup.add(gem);
      crystalMeshes.push(gem);
    });

    // 10. Instantiate 3D Pets
    const playerModel = createPet3D(playerPetType, null, 0.85);
    const pInit = gridToWorld(playerPos.x, playerPos.y);
    playerModel.group.position.copy(pInit);
    playerTargetPos.current.copy(pInit);
    scene.add(playerModel.group);
    player3DRef.current = playerModel;

    const oppModel = createPet3D(opponentPetType, null, 0.85);
    const oInit = gridToWorld(opponentPos.x, opponentPos.y);
    oppModel.group.position.copy(oInit);
    oppTargetPos.current.copy(oInit);
    scene.add(oppModel.group);
    opp3DRef.current = oppModel;

    // 11. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Spin crystals gently
      crystalMeshes.forEach((gem) => {
        gem.rotation.y = time * 2;
        gem.position.y = 0.35 + Math.sin(time * 3) * 0.06;
      });

      // Smooth position interpolation
      if (player3DRef.current) {
        player3DRef.current.group.position.lerp(playerTargetPos.current, delta * 12);
        player3DRef.current.group.rotation.y = dirToAngle(playerDir);
        player3DRef.current.updateAnimation(delta, time, isRacing, winner === 'player', winner === 'opponent');
      }

      if (opp3DRef.current) {
        opp3DRef.current.group.position.lerp(oppTargetPos.current, delta * 12);
        opp3DRef.current.group.rotation.y = dirToAngle(opponentDir);
        opp3DRef.current.updateAnimation(delta, time, isRacing, winner === 'opponent', winner === 'player');
      }

      // Camera view positioning
      if (camMode === 'stadium') {
        camera.position.set(0, camHeight, camDist);
        camera.lookAt(0, 0, 0);
      } else if (camMode === 'follow_player' && player3DRef.current) {
        const p = player3DRef.current.group.position;
        camera.position.lerp(new THREE.Vector3(p.x, 3.5, p.z + 4.5), delta * 5);
        camera.lookAt(p.x, p.y + 0.4, p.z);
      } else if (camMode === 'cinematic') {
        const orbitRadius = Math.max(10, maxDim * 1.6);
        const angle = time * 0.35;
        camera.position.set(Math.sin(angle) * orbitRadius, camHeight * 0.85, Math.cos(angle) * orbitRadius);
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      try {
        playerModel.cleanup();
        oppModel.cleanup();
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
        console.warn('DuelArena3D cleanup caught error:', err);
      }
    };
  }, [
    gridSize.width,
    gridSize.height,
    playerPetType,
    opponentPetType,
    JSON.stringify(obstacles),
    JSON.stringify(crystals),
    JSON.stringify(switches),
    JSON.stringify(goalPos),
  ]);

  // Update target coordinates
  useEffect(() => {
    playerTargetPos.current.copy(gridToWorld(playerPos.x, playerPos.y));
  }, [playerPos, gridToWorld]);

  useEffect(() => {
    oppTargetPos.current.copy(gridToWorld(opponentPos.x, opponentPos.y));
  }, [opponentPos, gridToWorld]);

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden bg-[#dce8e0] border border-[#e2ece5] shadow-card select-none ${className}`}
      style={{ height }}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Duel Banner Overlay */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-black text-white">3D Duel Stadium: You VS {opponentName}</span>
        </div>

        {/* Camera Preset Selector */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700/80 pointer-events-auto">
          <button
            onClick={() => setCamMode('stadium')}
            className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              camMode === 'stadium' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            Stadium
          </button>
          <button
            onClick={() => setCamMode('follow_player')}
            className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              camMode === 'follow_player' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            Follow
          </button>
          <button
            onClick={() => setCamMode('cinematic')}
            className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              camMode === 'cinematic' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            Cinematic
          </button>
        </div>
      </div>
    </div>
  );
}
