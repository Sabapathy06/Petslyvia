import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { PetType } from '@/types/database';
import type {
  GridPos,
  GridObstacle,
  GridCrystal,
  GridSwitch,
  SimulationStep,
  Direction,
  EquippedAccessories,
} from '@/types/game';
import { createPet3D, type Pet3DModel } from './PetMesh3D';
import {
  RotateCcw,
  Eye,
  Camera,
  Maximize2,
  Compass,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export type SceneTheme = 'forest' | 'dungeon' | 'city' | 'cyber' | 'sanctuary' | 'arena';

export interface GameScene3DProps {
  gridSize: { width: number; height: number };
  startPos: GridPos;
  goalPos: GridPos;
  obstacles: GridObstacle[];
  crystals: GridCrystal[];
  switches?: GridSwitch[];
  activeStep: SimulationStep;
  petType?: PetType;
  equipped?: EquippedAccessories | null;
  theme?: SceneTheme;
  interactive?: boolean;
  onTileClick?: (pos: GridPos) => void;
  opponentPet?: {
    type: PetType;
    pos: GridPos;
    dir: Direction;
    name?: string;
  } | null;
  cameraPreset?: 'iso' | 'perspective' | 'top' | 'follow';
  showControls?: boolean;
  height?: string | number;
  className?: string;
  emotion?: 'hearts' | 'stars' | 'tears' | 'zzz' | 'crumbs' | null;
}

export function GameScene3D({
  gridSize,
  startPos,
  goalPos,
  obstacles,
  crystals,
  switches = [],
  activeStep,
  petType = 'cat',
  equipped = null,
  theme = 'forest',
  interactive = false,
  onTileClick,
  opponentPet = null,
  cameraPreset: initialPreset = 'iso',
  showControls = true,
  height = '420px',
  className = '',
  emotion = null,
}: GameScene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraMode, setCameraMode] = useState<'iso' | 'perspective' | 'top' | 'follow'>(initialPreset);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pet3DRef = useRef<Pet3DModel | null>(null);
  const opponent3DRef = useRef<Pet3DModel | null>(null);
  const crystalsMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const gatesMeshesRef = useRef<Map<string, { group: THREE.Group; beam: THREE.Mesh }>>(new Map());
  const switchesMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const hoverMeshRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2(-999, -999));
  const planeMeshesRef = useRef<THREE.Mesh[]>([]);

  // Smooth Pet movement interpolation state
  const petCurrentPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const petTargetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const petCurrentAngleRef = useRef<number>(0);
  const petTargetAngleRef = useRef<number>(0);
  const isHopActiveRef = useRef<boolean>(false);
  const hopTimeRef = useRef<number>(0);

  // Opponent Pet movement state
  const oppCurrentPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const oppTargetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const oppCurrentAngleRef = useRef<number>(0);

  // Mouse orbit controls state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraOrbitRef = useRef({
    radius: 9,
    theta: 0.35, // Elevated front-facing isometric diorama angle
    phi: Math.PI / 4.2, // ~0.75 rad (elevated 47 degrees above horizontal)
    target: new THREE.Vector3(0, 0, 0),
  });

  // Calculate World Coordinate from Grid Coordinate
  const gridToWorld = useCallback(
    (x: number, y: number): THREE.Vector3 => {
      const offsetX = -(gridSize.width - 1) / 2;
      const offsetZ = -(gridSize.height - 1) / 2;
      return new THREE.Vector3(x + offsetX, 0, y + offsetZ);
    },
    [gridSize.width, gridSize.height]
  );

  // Direction to Euler Angle (Pet mesh faces +Z by default at 0 rad)
  const dirToAngle = (dir: Direction): number => {
    switch (dir) {
      case 'up':
        return Math.PI; // -Z (top of grid)
      case 'down':
        return 0; // +Z (bottom of grid)
      case 'left':
        return -Math.PI / 2; // -X (left of grid)
      case 'right':
        return Math.PI / 2; // +X (right of grid)
      default:
        return 0;
    }
  };

  // Switch Camera Presets
  const setCameraPreset = (mode: 'iso' | 'perspective' | 'top' | 'follow') => {
    setCameraMode(mode);
    const maxDim = Math.max(gridSize.width, gridSize.height);
    const orbit = cameraOrbitRef.current;

    if (mode === 'iso') {
      orbit.radius = maxDim * 1.5 + 3.0;
      orbit.theta = 0.35; // Clean front-isometric diorama angle
      orbit.phi = Math.PI / 4.2; // ~0.75 rad
      orbit.target.set(0, 0, 0);
    } else if (mode === 'perspective') {
      orbit.radius = maxDim * 1.35 + 2.5;
      orbit.theta = 0.15;
      orbit.phi = Math.PI / 3.2;
      orbit.target.set(0, 0.3, 0);
    } else if (mode === 'top') {
      orbit.radius = maxDim * 1.6 + 2.5;
      orbit.theta = 0.001;
      orbit.phi = 0.1; // Overhead top-down view looking down onto the board
      orbit.target.set(0, 0, 0);
    } else if (mode === 'follow') {
      orbit.radius = 4.5;
      orbit.phi = Math.PI / 3.5;
      // Target tracks the pet in update loop
    }
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    cameraOrbitRef.current.radius = THREE.MathUtils.clamp(
      cameraOrbitRef.current.radius + delta,
      3.5,
      25
    );
  };

  // -------------------------------------------------------------
  // PRIMARY THREE.JS INITIALIZATION & SCENE SETUP
  // -------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Background and Fog matching themes
    if (theme === 'forest') {
      scene.background = new THREE.Color(0x0f172a); // Deep twilight slate
      scene.fog = new THREE.FogExp2(0x0f172a, 0.035);
    } else if (theme === 'dungeon') {
      scene.background = new THREE.Color(0x180812); // Cyber dark obsidian
      scene.fog = new THREE.FogExp2(0x180812, 0.04);
    } else if (theme === 'city') {
      scene.background = new THREE.Color(0x030712); // Night cyber city
      scene.fog = new THREE.FogExp2(0x030712, 0.03);
    } else if (theme === 'cyber' || theme === 'arena') {
      scene.background = new THREE.Color(0x060919); // Cyber stadium arena
      scene.fog = new THREE.FogExp2(0x060919, 0.025);
    } else {
      scene.background = new THREE.Color(0x090d16);
      scene.fog = new THREE.FogExp2(0x090d16, 0.03);
    }

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;
    setCameraPreset(cameraMode);

    // 3. WebGL Renderer
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

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(
      theme === 'dungeon' ? 0xff0055 : theme === 'forest' ? 0xe0f2fe : theme === 'arena' ? 0x818cf8 : 0x38bdf8,
      theme === 'dungeon' ? 0.7 : 0.95
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    sunLight.position.set(8, 14, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 40;
    const shadowDist = Math.max(gridSize.width, gridSize.height) * 1.2;
    sunLight.shadow.camera.left = -shadowDist;
    sunLight.shadow.camera.right = shadowDist;
    sunLight.shadow.camera.top = shadowDist;
    sunLight.shadow.camera.bottom = -shadowDist;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);

    if (theme === 'arena') {
      const spot1 = new THREE.SpotLight(0x38bdf8, 2.5, 35, Math.PI / 3.5, 0.3);
      spot1.position.set(10, 14, 10);
      spot1.castShadow = true;
      scene.add(spot1);

      const spot2 = new THREE.SpotLight(0xf43f5e, 2.5, 35, Math.PI / 3.5, 0.3);
      spot2.position.set(-10, 14, -10);
      spot2.castShadow = true;
      scene.add(spot2);
    }

    // Secondary fill light
    const fillLight = new THREE.PointLight(
      theme === 'forest' ? 0x10b981 : theme === 'dungeon' ? 0xec4899 : 0x06b6d4,
      1.2,
      18
    );
    fillLight.position.set(-6, 8, -6);
    scene.add(fillLight);

    // 5. Environmental Props & Board Platform
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    // Base Floating Island Slab
    const slabWidth = gridSize.width + 1.2;
    const slabDepth = gridSize.height + 1.2;
    const slabHeight = 0.5;
    const slabGeo = new THREE.BoxGeometry(slabWidth, slabHeight, slabDepth);
    const slabMat = new THREE.MeshStandardMaterial({
      color:
        theme === 'forest'
          ? 0x1e293b
          : theme === 'dungeon'
          ? 0x1f1322
          : theme === 'city'
          ? 0x0f172a
          : 0x090d16,
      roughness: 0.8,
      metalness: 0.2,
    });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.y = -slabHeight / 2 - 0.05;
    slabMesh.receiveShadow = true;
    boardGroup.add(slabMesh);

    // Glowing Board Border Bevel
    const borderGeo = new THREE.BoxGeometry(slabWidth + 0.1, 0.08, slabDepth + 0.1);
    const borderMat = new THREE.MeshStandardMaterial({
      color:
        theme === 'forest'
          ? 0x10b981
          : theme === 'dungeon'
          ? 0xf43f5e
          : theme === 'city'
          ? 0x06b6d4
          : 0x6366f1,
      emissive:
        theme === 'forest'
          ? 0x059669
          : theme === 'dungeon'
          ? 0xe11d48
          : theme === 'city'
          ? 0x0891b2
          : 0x4f46e5,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.position.y = -0.04;
    boardGroup.add(borderMesh);

    // 6. Build Grid Tiles
    const planes: THREE.Mesh[] = [];
    const tileGeo = new THREE.BoxGeometry(0.92, 0.12, 0.92);

    // Materials per tile pattern
    const tileMatA = new THREE.MeshStandardMaterial({
      color:
        theme === 'forest'
          ? 0x22c55e // Green lush
          : theme === 'dungeon'
          ? 0x331b2c // Dark obsidian
          : theme === 'city'
          ? 0x1e293b // Dark asphalt
          : 0x1e1b4b,
      roughness: 0.6,
    });

    const tileMatB = new THREE.MeshStandardMaterial({
      color:
        theme === 'forest'
          ? 0x16a34a // Alternating green
          : theme === 'dungeon'
          ? 0x251421
          : theme === 'city'
          ? 0x334155
          : 0x1e293b,
      roughness: 0.65,
    });

    for (let row = 0; row < gridSize.height; row++) {
      for (let col = 0; col < gridSize.width; col++) {
        const pos = gridToWorld(col, row);
        const isPatternA = (col + row) % 2 === 0;
        const tileMesh = new THREE.Mesh(tileGeo, isPatternA ? tileMatA : tileMatB);
        tileMesh.position.set(pos.x, -0.06, pos.z);
        tileMesh.receiveShadow = true;
        tileMesh.userData = { gridX: col, gridY: row };
        boardGroup.add(tileMesh);
        planes.push(tileMesh);

        // Grid coordinate subtle glow line for Cyber / City / Arena
        if (theme === 'cyber' || theme === 'city' || theme === 'arena') {
          const wireGeo = new THREE.EdgesGeometry(tileGeo);
          const wireMat = new THREE.LineBasicMaterial({
            color: theme === 'arena' ? 0x818cf8 : theme === 'cyber' ? 0x38bdf8 : 0x06b6d4,
            transparent: true,
            opacity: 0.4,
          });
          const wire = new THREE.LineSegments(wireGeo, wireMat);
          wire.position.copy(tileMesh.position);
          boardGroup.add(wire);
        }
      }
    }
    planeMeshesRef.current = planes;

    // 7. Hover Raycast Indicator
    const hoverGeo = new THREE.BoxGeometry(0.96, 0.18, 0.96);
    const hoverMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.5,
    });
    const hoverMesh = new THREE.Mesh(hoverGeo, hoverMat);
    hoverMesh.visible = false;
    scene.add(hoverMesh);
    hoverMeshRef.current = hoverMesh;

    // 8. Add Environmental Perimeter Scenery (Trees / Sci-fi Towers / Stadium Masts)
    const sceneryGroup = new THREE.Group();
    scene.add(sceneryGroup);

    if (theme === 'forest') {
      // 3D Stylized Low-poly Pine Trees around edges
      const treeCount = Math.max(gridSize.width, gridSize.height) * 2;
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const foliageMatA = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.5 });
      const foliageMatB = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 });

      for (let i = 0; i < treeCount; i++) {
        const side = i % 4;
        let x = 0;
        let z = 0;
        const spreadX = gridSize.width / 2 + 1.2 + Math.random() * 2.5;
        const spreadZ = gridSize.height / 2 + 1.2 + Math.random() * 2.5;

        if (side === 0) {
          x = (Math.random() - 0.5) * (gridSize.width + 4);
          z = -spreadZ;
        } else if (side === 1) {
          x = (Math.random() - 0.5) * (gridSize.width + 4);
          z = spreadZ;
        } else if (side === 2) {
          x = -spreadX;
          z = (Math.random() - 0.5) * (gridSize.height + 4);
        } else {
          x = spreadX;
          z = (Math.random() - 0.5) * (gridSize.height + 4);
        }

        const tree = new THREE.Group();
        tree.position.set(x, 0, z);

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8), trunkMat);
        trunk.position.y = 0.3;
        trunk.castShadow = true;

        const cone1 = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.7, 8), foliageMatA);
        cone1.position.y = 0.75;
        cone1.castShadow = true;

        const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 8), foliageMatB);
        cone2.position.y = 1.15;
        cone2.castShadow = true;

        tree.add(trunk, cone1, cone2);
        const scale = 0.7 + Math.random() * 0.6;
        tree.scale.set(scale, scale, scale);
        sceneryGroup.add(tree);
      }
    } else if (theme === 'arena') {
      // 3D Stadium Light Floodlight Towers
      const towerCount = 6;
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
      const lampMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.4 });

      for (let i = 0; i < towerCount; i++) {
        const angle = (i / towerCount) * Math.PI * 2;
        const dist = Math.max(gridSize.width, gridSize.height) * 0.95 + 1.8;
        const tx = Math.sin(angle) * dist;
        const tz = Math.cos(angle) * dist;

        const tower = new THREE.Group();
        tower.position.set(tx, 0, tz);

        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 2.2, 8), mastMat);
        mast.position.y = 1.1;
        mast.castShadow = true;

        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.25), lampMat);
        lamp.position.set(0, 2.2, 0);

        tower.add(mast, lamp);
        sceneryGroup.add(tower);
      }
    } else if (theme === 'city' || theme === 'cyber') {
      // 3D Mini Skyscrapers / Data Towers
      const bldgMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.3,
        metalness: 0.8,
      });
      const windowMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
      });

      const bldgCount = 12;
      for (let i = 0; i < bldgCount; i++) {
        const angle = (i / bldgCount) * Math.PI * 2;
        const dist = Math.max(gridSize.width, gridSize.height) * 0.9 + 2.0 + (i % 2) * 1.5;
        const bx = Math.sin(angle) * dist;
        const bz = Math.cos(angle) * dist;
        const bHeight = 1.5 + Math.random() * 3.5;

        const bldg = new THREE.Mesh(new THREE.BoxGeometry(1.2, bHeight, 1.2), bldgMat);
        bldg.position.set(bx, bHeight / 2 - 0.2, bz);
        bldg.castShadow = true;

        // Glowing top beacon
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), windowMat);
        beacon.position.set(0, bHeight / 2 + 0.1, 0);
        bldg.add(beacon);

        sceneryGroup.add(bldg);
      }
    }

    // 9. Floating Ambient Magical Sparkle Particles
    const particleCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * (gridSize.width + 6);
      particlePositions[i + 1] = Math.random() * 4 + 0.2;
      particlePositions[i + 2] = (Math.random() - 0.5) * (gridSize.height + 6);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      color:
        theme === 'forest'
          ? 0x6ee7b7
          : theme === 'dungeon'
          ? 0xf472b6
          : theme === 'arena'
          ? 0xa855f7
          : 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particleSystemRef.current = particles;

    // 10. Instantiate 3D Pet
    const petModel = createPet3D(petType, equipped, 0.95);
    scene.add(petModel.group);
    pet3DRef.current = petModel;

    // Set initial Pet position
    const initPetWorld = gridToWorld(startPos.x, startPos.y);
    petModel.group.position.copy(initPetWorld);
    petCurrentPosRef.current.copy(initPetWorld);
    petTargetPosRef.current.copy(initPetWorld);

    const initPetAngle = dirToAngle(activeStep.petDir);
    petModel.group.rotation.y = initPetAngle;
    petCurrentAngleRef.current = initPetAngle;
    petTargetAngleRef.current = initPetAngle;

    // 11. Instantiate Opponent Pet if present (Multiplayer Duels)
    if (opponentPet) {
      const oppModel = createPet3D(opponentPet.type, null, 0.95);
      scene.add(oppModel.group);
      opponent3DRef.current = oppModel;

      const oppInitWorld = gridToWorld(opponentPet.pos.x, opponentPet.pos.y);
      oppModel.group.position.copy(oppInitWorld);
      oppCurrentPosRef.current.copy(oppInitWorld);
      oppTargetPosRef.current.copy(oppInitWorld);

      const oppInitAngle = dirToAngle(opponentPet.dir);
      oppModel.group.rotation.y = oppInitAngle;
      oppCurrentAngleRef.current = oppInitAngle;
    }

    // 12. Animation / Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Ambient particles floating float
      if (particleSystemRef.current) {
        const positions = particleSystemRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += Math.sin(time + positions[i]) * 0.003;
        }
        particleSystemRef.current.geometry.attributes.position.needsUpdate = true;
        particleSystemRef.current.rotation.y = time * 0.02;
      }

      // Smooth Pet Position Interpolation & Hop Arc
      if (pet3DRef.current) {
        const dist = petCurrentPosRef.current.distanceTo(petTargetPosRef.current);
        const isMoving = dist > 0.015;

        if (isMoving) {
          petCurrentPosRef.current.lerp(petTargetPosRef.current, Math.min(1.0, delta * 10));
          hopTimeRef.current = Math.min(1.0, hopTimeRef.current + delta * 3.2);
          pet3DRef.current.playHop(hopTimeRef.current);
        } else {
          petCurrentPosRef.current.copy(petTargetPosRef.current);
          hopTimeRef.current = 0;
          pet3DRef.current.resetHop();
        }

        // Smooth Rotation Interpolation
        let angleDiff = petTargetAngleRef.current - petCurrentAngleRef.current;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (Math.abs(angleDiff) > 0.01) {
          petCurrentAngleRef.current += angleDiff * Math.min(1.0, delta * 12);
        } else {
          petCurrentAngleRef.current = petTargetAngleRef.current;
        }

        // Apply lane separation when opponent is present
        const laneX = opponentPet ? -0.16 : 0;
        const laneZ = opponentPet ? 0.14 : 0;
        pet3DRef.current.group.position.x = petCurrentPosRef.current.x + laneX;
        pet3DRef.current.group.position.z = petCurrentPosRef.current.z + laneZ;
        pet3DRef.current.group.rotation.y = petCurrentAngleRef.current;

        const isVictory = activeStep.status === 'success';
        const isHurt = activeStep.status === 'failed' || activeStep.status === 'collision';
        pet3DRef.current.updateAnimation(delta, time, isMoving, isVictory, isHurt, emotion);

        if (isVictory) {
          pet3DRef.current.playVictoryDance(time);
        }
      }

      // Opponent Pet Interpolation
      if (opponent3DRef.current && opponentPet) {
        const oppDist = oppCurrentPosRef.current.distanceTo(oppTargetPosRef.current);
        const isOppMoving = oppDist > 0.015;
        if (isOppMoving) {
          oppCurrentPosRef.current.lerp(oppTargetPosRef.current, Math.min(1.0, delta * 10));
        } else {
          oppCurrentPosRef.current.copy(oppTargetPosRef.current);
        }
        const oppLaneX = 0.16;
        const oppLaneZ = -0.14;
        opponent3DRef.current.group.position.x = oppCurrentPosRef.current.x + oppLaneX;
        opponent3DRef.current.group.position.z = oppCurrentPosRef.current.z + oppLaneZ;
        opponent3DRef.current.group.rotation.y = oppCurrentAngleRef.current;
        opponent3DRef.current.updateAnimation(delta, time, isOppMoving, false, false);
      }

      // Floating Crystal Spin & Bob
      crystalsMeshesRef.current.forEach((gemGroup) => {
        gemGroup.rotation.y = time * 2.2;
        gemGroup.position.y = 0.35 + Math.sin(time * 3 + gemGroup.position.x) * 0.12;
      });

      // Animated Gate Lasers
      gatesMeshesRef.current.forEach(({ beam }) => {
        if (beam.visible) {
          (beam.material as THREE.MeshStandardMaterial).opacity = 0.55 + Math.sin(time * 8) * 0.25;
        }
      });

      // Camera Orbit Update
      if (cameraRef.current) {
        const orbit = cameraOrbitRef.current;

        // In follow mode, camera target smoothly tracks pet
        if (cameraMode === 'follow' && pet3DRef.current) {
          const petPos = pet3DRef.current.group.position;
          const lookBehindAngle = petCurrentAngleRef.current + Math.PI;
          const targetCamX = petPos.x + Math.sin(lookBehindAngle) * 3.2;
          const targetCamZ = petPos.z + Math.cos(lookBehindAngle) * 3.2;
          const targetCamY = 2.4;

          cameraRef.current.position.lerp(
            new THREE.Vector3(targetCamX, targetCamY, targetCamZ),
            delta * 6
          );
          cameraRef.current.lookAt(petPos.x, petPos.y + 0.4, petPos.z);
        } else {
          // Standard spherical orbit calculation
          const camX =
            orbit.target.x +
            orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
          const camY = orbit.target.y + orbit.radius * Math.cos(orbit.phi);
          const camZ =
            orbit.target.z +
            orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);

          cameraRef.current.position.set(camX, camY, camZ);
          cameraRef.current.lookAt(orbit.target);
        }
      }

      // Tile Hover Raycasting
      if (interactive && cameraRef.current && hoverMeshRef.current) {
        raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(planeMeshesRef.current);

        if (intersects.length > 0) {
          const hit = intersects[0].object as THREE.Mesh;
          const gx = hit.userData.gridX;
          const gy = hit.userData.gridY;
          if (gx !== undefined && gy !== undefined) {
            const worldPos = gridToWorld(gx, gy);
            hoverMeshRef.current.position.set(worldPos.x, 0.04, worldPos.z);
            hoverMeshRef.current.visible = true;
          }
        } else {
          hoverMeshRef.current.visible = false;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 13. Responsive Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    });
    resizeObserver.observe(container);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      if (pet3DRef.current) {
        pet3DRef.current.cleanup();
      }
      if (opponent3DRef.current) {
        opponent3DRef.current.cleanup();
      }

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [gridSize.width, gridSize.height, theme, petType]);

  // -------------------------------------------------------------
  // UPDATE DYNAMIC OBJECTS: OBSTACLES, CRYSTALS, GOAL, SWITCHES
  // -------------------------------------------------------------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove previous dynamic objects group if exists
    const existingDynamicGroup = scene.getObjectByName('DynamicLevelObjects');
    if (existingDynamicGroup) {
      scene.remove(existingDynamicGroup);
    }

    const dynamicGroup = new THREE.Group();
    dynamicGroup.name = 'DynamicLevelObjects';
    scene.add(dynamicGroup);

    crystalsMeshesRef.current.clear();
    gatesMeshesRef.current.clear();
    switchesMeshesRef.current.clear();

    // --- 1. GOAL PORTAL ---
    const goalWorld = gridToWorld(goalPos.x, goalPos.y);
    const portalGroup = new THREE.Group();
    portalGroup.position.set(goalWorld.x, 0, goalWorld.z);

    // Glowing base pedestal
    const pedestalGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.16, 16);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = 0.08;
    portalGroup.add(pedestal);

    // Glowing Vortex Rings
    const ringGeo = new THREE.TorusGeometry(0.36, 0.05, 8, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.position.y = 0.45;
    ring1.rotation.x = Math.PI / 2.5;

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.position.y = 0.55;
    ring2.rotation.x = -Math.PI / 2.5;
    ring2.scale.set(0.75, 0.75, 0.75);

    // Light Beam Pillar
    const beamGeo = new THREE.CylinderGeometry(0.24, 0.32, 2.2, 16, 1, true);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.1;

    // Portal PointLight
    const portalLight = new THREE.PointLight(0xf59e0b, 2.2, 4.5);
    portalLight.position.y = 0.6;

    portalGroup.add(ring1, ring2, beam, portalLight);
    dynamicGroup.add(portalGroup);

    // --- 2. CRYSTALS ---
    crystals.forEach((c) => {
      const isCollected = activeStep.crystalsCollected.some((cc) => cc.x === c.x && cc.y === c.y);
      if (isCollected) return; // Don't render collected crystals

      const key = `${c.x},${c.y}`;
      const cWorld = gridToWorld(c.x, c.y);
      const gemGroup = new THREE.Group();
      gemGroup.position.set(cWorld.x, 0.35, cWorld.z);

      // Faceted 3D Octahedron Gem
      const gemGeo = new THREE.OctahedronGeometry(0.24, 0);
      gemGeo.scale(0.85, 1.3, 0.85);
      const gemMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.0,
        metalness: 0.8,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9,
      });
      const gemMesh = new THREE.Mesh(gemGeo, gemMat);
      gemMesh.castShadow = true;

      // Glow PointLight
      const gemLight = new THREE.PointLight(0x38bdf8, 1.4, 2.5);
      gemGroup.add(gemMesh, gemLight);

      dynamicGroup.add(gemGroup);
      crystalsMeshesRef.current.set(key, gemGroup);
    });

    // --- 3. SWITCHES / PRESSURE PLATES ---
    switches.forEach((sw) => {
      const swKey = `${sw.x},${sw.y}`;
      const swWorld = gridToWorld(sw.x, sw.y);
      const isActive =
        sw.isActive ||
        (activeStep.petPos.x === sw.x && activeStep.petPos.y === sw.y) ||
        (sw.targetGateId && activeStep.openGates.includes(sw.targetGateId));

      const switchGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.08, 16);
      const switchMat = new THREE.MeshStandardMaterial({
        color: isActive ? 0x10b981 : 0x3b82f6,
        emissive: isActive ? 0x059669 : 0x1d4ed8,
        emissiveIntensity: isActive ? 1.0 : 0.4,
        roughness: 0.3,
      });
      const switchMesh = new THREE.Mesh(switchGeo, switchMat);
      switchMesh.position.set(swWorld.x, isActive ? 0.01 : 0.04, swWorld.z);
      switchMesh.receiveShadow = true;

      dynamicGroup.add(switchMesh);
      switchesMeshesRef.current.set(swKey, switchMesh);
    });

    // --- 4. OBSTACLES (WALLS, WATER, GATES, TRAPS) ---
    obstacles.forEach((obs) => {
      const obsWorld = gridToWorld(obs.x, obs.y);

      if (obs.type === 'wall') {
        // 3D Stone Monolith / Cyber Block
        const wallGroup = new THREE.Group();
        wallGroup.position.set(obsWorld.x, 0, obsWorld.z);

        const wallHeight = theme === 'city' ? 0.9 : 0.75;
        const wallGeo = new THREE.BoxGeometry(0.88, wallHeight, 0.88);
        const wallMat = new THREE.MeshStandardMaterial({
          color:
            theme === 'forest'
              ? 0x475569
              : theme === 'dungeon'
              ? 0x3b0764
              : theme === 'city'
              ? 0x1e293b
              : 0x312e81,
          roughness: 0.7,
          metalness: 0.2,
        });
        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.y = wallHeight / 2;
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;

        // Top cap / rune
        const capGeo = new THREE.BoxGeometry(0.72, 0.06, 0.72);
        const capMat = new THREE.MeshStandardMaterial({
          color:
            theme === 'forest'
              ? 0x10b981
              : theme === 'dungeon'
              ? 0xf43f5e
              : theme === 'city'
              ? 0x38bdf8
              : 0x818cf8,
          emissiveIntensity: 0.4,
        });
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.position.y = wallHeight + 0.02;

        wallGroup.add(wallMesh, capMesh);
        dynamicGroup.add(wallGroup);
      } else if (obs.type === 'water') {
        // Water / Lava Pool
        const waterGeo = new THREE.BoxGeometry(0.92, 0.06, 0.92);
        const isLava = theme === 'dungeon';
        const waterMat = new THREE.MeshStandardMaterial({
          color: isLava ? 0xef4444 : 0x0284c7,
          emissive: isLava ? 0xd97706 : 0x0369a1,
          emissiveIntensity: isLava ? 0.8 : 0.3,
          roughness: 0.1,
          metalness: 0.1,
          transparent: true,
          opacity: 0.85,
        });
        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.position.set(obsWorld.x, 0.01, obsWorld.z);
        waterMesh.receiveShadow = true;
        dynamicGroup.add(waterMesh);
      } else if (obs.type === 'gate') {
        // Laser Gate with Pylons
        const gateKey = obs.id || `${obs.x},${obs.y}`;
        const isGateOpen = activeStep.openGates.includes(gateKey);

        const gateGroup = new THREE.Group();
        gateGroup.position.set(obsWorld.x, 0, obsWorld.z);

        const pylonMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.7,
          roughness: 0.2,
        });

        // Left & Right pylons
        const pylonL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.1, 12), pylonMat);
        pylonL.position.set(-0.38, 0.55, 0);
        pylonL.castShadow = true;

        const pylonR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.1, 12), pylonMat);
        pylonR.position.set(0.38, 0.55, 0);
        pylonR.castShadow = true;

        // Laser Beam Curtain
        const beamGeo = new THREE.PlaneGeometry(0.72, 0.85);
        const beamMat = new THREE.MeshStandardMaterial({
          color: isGateOpen ? 0x10b981 : 0xf43f5e,
          emissive: isGateOpen ? 0x10b981 : 0xf43f5e,
          emissiveIntensity: isGateOpen ? 0.2 : 1.2,
          transparent: true,
          opacity: isGateOpen ? 0.15 : 0.75,
          side: THREE.DoubleSide,
        });
        const laserBeam = new THREE.Mesh(beamGeo, beamMat);
        laserBeam.position.y = 0.55;

        gateGroup.add(pylonL, pylonR, laserBeam);
        dynamicGroup.add(gateGroup);
        gatesMeshesRef.current.set(gateKey, { group: gateGroup, beam: laserBeam });
      }
    });
  }, [goalPos, obstacles, crystals, switches, activeStep.crystalsCollected, activeStep.openGates, theme]);

  // -------------------------------------------------------------
  // UPDATE PET TARGET POSITION & ROTATION ON STEP CHANGE
  // -------------------------------------------------------------
  useEffect(() => {
    const targetWorld = gridToWorld(activeStep.petPos.x, activeStep.petPos.y);
    petTargetPosRef.current.copy(targetWorld);
    petTargetAngleRef.current = dirToAngle(activeStep.petDir);
    hopTimeRef.current = 0;
  }, [activeStep.petPos, activeStep.petDir, gridToWorld]);

  // Update Opponent Pet if present
  useEffect(() => {
    if (opponentPet) {
      const oppWorld = gridToWorld(opponentPet.pos.x, opponentPet.pos.y);
      oppTargetPosRef.current.copy(oppWorld);
      oppCurrentAngleRef.current = dirToAngle(opponentPet.dir);
    }
  }, [opponentPet, gridToWorld]);

  // Trigger expressive 3D emotion bursts
  useEffect(() => {
    if (!pet3DRef.current) return;
    if (emotion) {
      pet3DRef.current.triggerEmotionEffect(emotion);
    } else if (activeStep.status === 'success') {
      pet3DRef.current.triggerEmotionEffect('stars');
    } else if (activeStep.status === 'failed') {
      pet3DRef.current.triggerEmotionEffect('tears');
    }
  }, [emotion, activeStep.status]);

  // -------------------------------------------------------------
  // MOUSE & TOUCH EVENT HANDLERS (ORBIT / PAN / ZOOM / TILE CLICK)
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    // Track normalized mouse coordinates for raycasting
    const rect = container.getBoundingClientRect();
    mousePosRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mousePosRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    // Rotate Camera Orbit
    cameraOrbitRef.current.theta -= deltaX * 0.007;
    cameraOrbitRef.current.phi = THREE.MathUtils.clamp(
      cameraOrbitRef.current.phi + deltaY * 0.007,
      0.05,
      Math.PI / 2.05
    );

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleZoom(e.deltaY * 0.005);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onTileClick || !cameraRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(planeMeshesRef.current);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const gx = hit.userData.gridX;
      const gy = hit.userData.gridY;
      if (gx !== undefined && gy !== undefined) {
        onTileClick({ x: gx, y: gy });
      }
    }
  };

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden select-none border border-slate-800 bg-slate-950 shadow-2xl ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      } ${className}`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Floating 3D Navigation & View Overlay Controls */}
      {showControls && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Camera View Angle Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700/80 pointer-events-auto shadow-lg">
            <button
              onClick={() => setCameraPreset('iso')}
              title="Isometric 3D View"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                cameraMode === 'iso'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers size={13} />
              <span className="hidden sm:inline">Iso 3D</span>
            </button>

            <button
              onClick={() => setCameraPreset('perspective')}
              title="Perspective Action View"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                cameraMode === 'perspective'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera size={13} />
              <span className="hidden sm:inline">Action 3D</span>
            </button>

            <button
              onClick={() => setCameraPreset('top')}
              title="Down View / Top-Down Tactical Board View"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                cameraMode === 'top'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Compass size={13} />
              <span>Down View</span>
            </button>

            <button
              onClick={() => setCameraPreset('follow')}
              title="Follow Pet View"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                cameraMode === 'follow'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline">Follow Pet</span>
            </button>
          </div>

          {/* Zoom & Reset & Fullscreen Utilities */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700/80 pointer-events-auto shadow-lg">
            <button
              onClick={() => handleZoom(-1.2)}
              title="Zoom In"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => handleZoom(1.2)}
              title="Zoom Out"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={() => setCameraPreset('iso')}
              title="Reset 3D Camera"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D'}
              className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Top 3D Indicator Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <div className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-full flex items-center gap-1.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">
            WebGL 3D Engine
          </span>
        </div>
      </div>
    </div>
  );
}
