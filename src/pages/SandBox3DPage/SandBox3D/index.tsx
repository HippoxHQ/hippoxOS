import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface SandBox3DProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
}

const ATOM_COLORS: Record<string, string> = {
  H: "#ffffff",
  C: "#404040",
  N: "#3050f8",
  O: "#ff0d0d",
  F: "#90e050",
  Cl: "#1ff01f",
  Br: "#a62929",
  I: "#940094",
  P: "#ff8000",
  S: "#ffff30",
  B: "#ffbfff",
  Na: "#ab70d0",
  Mg: "#8aff00",
  Al: "#bfa6a6",
  Si: "#f0c8a0",
  Ca: "#3dff00",
  Fe: "#e06633",
  Cu: "#c88033",
  Zn: "#7d80b0",
  Pt: "#e5e5e5",
  Au: "#ffd123",
  Ag: "#c0c0c0",
  default: "#ff66cc",
};

const MOLECULES = {
  water: {
    atoms: [
      { element: "O", x: 0, y: 0, z: 0 },
      { element: "H", x: 0.8, y: 0.6, z: 0 },
      { element: "H", x: -0.8, y: 0.6, z: 0 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ],
  },
  methane: {
    atoms: [
      { element: "C", x: 0, y: 0, z: 0 },
      { element: "H", x: 0.75, y: 0.75, z: 0.75 },
      { element: "H", x: -0.75, y: -0.75, z: 0.75 },
      { element: "H", x: -0.75, y: 0.75, z: -0.75 },
      { element: "H", x: 0.75, y: -0.75, z: -0.75 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
  },
  co2: {
    atoms: [
      { element: "C", x: 0, y: 0, z: 0 },
      { element: "O", x: 1.2, y: 0, z: 0 },
      { element: "O", x: -1.2, y: 0, z: 0 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ],
  },
  benzene: {
    atoms: [
      { element: "C", x: 1.0, y: 0, z: 0 },
      { element: "C", x: 0.5, y: 0.866, z: 0 },
      { element: "C", x: -0.5, y: 0.866, z: 0 },
      { element: "C", x: -1.0, y: 0, z: 0 },
      { element: "C", x: -0.5, y: -0.866, z: 0 },
      { element: "C", x: 0.5, y: -0.866, z: 0 },
      { element: "H", x: 1.7, y: 0, z: 0 },
      { element: "H", x: 0.85, y: 1.472, z: 0 },
      { element: "H", x: -0.85, y: 1.472, z: 0 },
      { element: "H", x: -1.7, y: 0, z: 0 },
      { element: "H", x: -0.85, y: -1.472, z: 0 },
      { element: "H", x: 0.85, y: -1.472, z: 0 },
    ],
    bonds: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [0, 6],
      [1, 7],
      [2, 8],
      [3, 9],
      [4, 10],
      [5, 11],
    ],
  },
};

type MoleculeKey = keyof typeof MOLECULES;

interface PhysicsSphere {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  radius: number;
  grounded: boolean;
  life?: number;
  isExplosion?: boolean;
}

const SandBox3D: React.FC<SandBox3DProps> = ({
  theme,
  i18n,
  t,
  currentSessionId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isZh = i18n === "zh-cn";

  const physicsSpheresRef = useRef<PhysicsSphere[]>([]);
  const explosionParticlesRef = useRef<
    {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      life: number;
      maxLife: number;
    }[]
  >([]);

  const getAtomRadius = (element: string): number => {
    const radii: Record<string, number> = {
      H: 0.25,
      C: 0.4,
      N: 0.38,
      O: 0.35,
      F: 0.32,
      Cl: 0.45,
      Br: 0.5,
      I: 0.55,
      P: 0.5,
      S: 0.45,
      default: 0.35,
    };
    return radii[element] || radii.default;
  };

  const createExplosion = (
    scene: THREE.Scene,
    position: THREE.Vector3,
    color: THREE.Color,
    count: number = 80,
  ) => {
    const colors = [0xff4444, 0xff8844, 0xffcc44, 0x44ff88, 0x4488ff, 0xcc44ff];
    for (let i = 0; i < count; i++) {
      const size = 0.05 + Math.random() * 0.15;
      const geo = new THREE.SphereGeometry(size, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      mesh.position.x += (Math.random() - 0.5) * 0.2;
      mesh.position.y += (Math.random() - 0.5) * 0.2;
      mesh.position.z += (Math.random() - 0.5) * 0.2;

      const speed = 2 + Math.random() * 4;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ).normalize();

      scene.add(mesh);
      explosionParticlesRef.current.push({
        mesh,
        velocity: dir.multiplyScalar(speed),
        life: 1,
        maxLife: 1 + Math.random() * 0.5,
      });
    }
  };

  const fireSphere = (
    scene: THREE.Scene,
    position: THREE.Vector3,
    color: number | string,
    radius: number = 0.2,
    velocity: THREE.Vector3 = new THREE.Vector3(0, 5, 0),
  ) => {
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const mat = new THREE.MeshPhysicalMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.castShadow = true;
    scene.add(mesh);

    physicsSpheresRef.current.push({
      mesh,
      velocity: velocity.clone(),
      radius,
      grounded: false,
    });
  };

  const fireBurst = (scene: THREE.Scene, position: THREE.Vector3) => {
    const colors = [0xff4444, 0xff8844, 0x44ff88, 0x4488ff, 0xcc44ff, 0xff44cc];
    for (let i = 0; i < 30; i++) {
      const radius = 0.08 + Math.random() * 0.15;
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      const vel = new THREE.Vector3(
        Math.cos(angle1) * Math.sin(angle2) * speed,
        Math.sin(angle1) * speed * 0.8 + 2,
        Math.cos(angle2) * Math.sin(angle1) * speed,
      );
      const color = colors[Math.floor(Math.random() * colors.length)];
      fireSphere(scene, position, color, radius, vel);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme === "dark" ? 0x0a0a1a : 0xf0f0f8);
    scene.fog = new THREE.Fog(theme === "dark" ? 0x0a0a1a : 0xf0f0f8, 15, 30);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(8, 6, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = false;
    controls.minDistance = 3;
    controls.maxDistance = 25;
    controls.target.set(0, 0.5, 0);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5);
    fillLight.position.set(-5, 0, 5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8844, 0.3);
    rimLight.position.set(0, -3, -8);
    scene.add(rimLight);

    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshPhysicalMaterial({
      color: theme === "dark" ? 0x1a1a3a : 0xddddee,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(16, 20, 0x6666aa, 0x333366);
    gridHelper.position.y = -1.98;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);

    const dnaGroup = new THREE.Group();
    scene.add(dnaGroup);

    const dnaRadius = 1.8;
    const dnaHeight = 5;
    const dnaTurns = 2.5;
    const dnaSteps = 50;

    const chain1Positions: THREE.Vector3[] = [];
    const chain2Positions: THREE.Vector3[] = [];

    for (let i = 0; i <= dnaSteps; i++) {
      const t = i / dnaSteps;
      const y = -dnaHeight / 2 + t * dnaHeight;
      const angle = t * dnaTurns * Math.PI * 2;

      const x1 = dnaRadius * Math.cos(angle);
      const z1 = dnaRadius * Math.sin(angle);
      const x2 = dnaRadius * Math.cos(angle + Math.PI);
      const z2 = dnaRadius * Math.sin(angle + Math.PI);

      const pos1 = new THREE.Vector3(x1, y, z1);
      const pos2 = new THREE.Vector3(x2, y, z2);
      chain1Positions.push(pos1);
      chain2Positions.push(pos2);

      const sphere1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshPhysicalMaterial({
          color: 0x4488ff,
          emissive: 0x2244aa,
          emissiveIntensity: 0.3,
          metalness: 0.3,
          roughness: 0.2,
        }),
      );
      sphere1.position.copy(pos1);
      dnaGroup.add(sphere1);

      const sphere2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshPhysicalMaterial({
          color: 0xff4488,
          emissive: 0xaa2244,
          emissiveIntensity: 0.3,
          metalness: 0.3,
          roughness: 0.2,
        }),
      );
      sphere2.position.copy(pos2);
      dnaGroup.add(sphere2);

      if (i % 2 === 0 && i < dnaSteps) {
        const midPoint = new THREE.Vector3()
          .addVectors(pos1, pos2)
          .multiplyScalar(0.5);
        const dist = pos1.distanceTo(pos2);
        const isAT = i % 4 === 0;

        const bondGeo = new THREE.CylinderGeometry(0.035, 0.035, dist, 6);
        const bondMat = new THREE.MeshPhysicalMaterial({
          color: isAT ? 0x66dd88 : 0xffaa44,
          emissive: isAT ? 0x227744 : 0x884422,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.7,
        });
        const bond = new THREE.Mesh(bondGeo, bondMat);
        bond.position.copy(midPoint);
        bond.lookAt(pos2);
        bond.rotateX(Math.PI / 2);
        dnaGroup.add(bond);

        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 8, 8),
          new THREE.MeshBasicMaterial({
            color: isAT ? 0x66dd88 : 0xffaa44,
          }),
        );
        dot.position.copy(midPoint);
        dnaGroup.add(dot);
      }
    }

    const createChainTube = (points: THREE.Vector3[], color: number) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 50, 0.04, 8, false);
      const tubeMat = new THREE.MeshPhysicalMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.15,
        metalness: 0.4,
        roughness: 0.3,
        transparent: true,
        opacity: 0.6,
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      dnaGroup.add(tube);
    };

    createChainTube(chain1Positions, 0x4488ff);
    createChainTube(chain2Positions, 0xff4488);

    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      const y = -dnaHeight / 2 + t * dnaHeight;
      const angle = t * dnaTurns * Math.PI * 2 + Math.PI / 2;
      const r = dnaRadius + 0.5;

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 6, 6),
        new THREE.MeshBasicMaterial({
          color: 0x66ddff,
          transparent: true,
          opacity: 0.3 + Math.random() * 0.3,
        }),
      );
      glow.position.set(r * Math.cos(angle), y, r * Math.sin(angle));
      dnaGroup.add(glow);
    }

    const moleculeGroup = new THREE.Group();
    scene.add(moleculeGroup);

    const moleculeNames: MoleculeKey[] = ["water", "methane", "co2", "benzene"];
    const moleculePositions = [
      { x: -4.5, y: 2.5, z: 3 },
      { x: 4.5, y: 2.5, z: 3 },
      { x: -4.5, y: -0.5, z: 3 },
      { x: 4.5, y: -0.5, z: 3 },
    ];

    moleculeNames.forEach((name, idx) => {
      const mol = MOLECULES[name];
      const pos = moleculePositions[idx];
      const group = new THREE.Group();
      group.position.set(pos.x, pos.y, pos.z);

      const labelColor = new THREE.Color().setHSL(
        idx / moleculeNames.length,
        0.8,
        0.6,
      );

      mol.atoms.forEach((atom) => {
        const color = ATOM_COLORS[atom.element] || ATOM_COLORS.default;
        const radius = getAtomRadius(atom.element);
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 24, 24),
          new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.2,
            roughness: 0.3,
            emissive: color,
            emissiveIntensity: 0.05,
            clearcoat: 0.2,
          }),
        );
        sphere.position.set(atom.x, atom.y, atom.z);
        sphere.castShadow = true;
        group.add(sphere);
      });

      mol.bonds.forEach(([i, j]) => {
        const p1 = new THREE.Vector3(
          mol.atoms[i].x,
          mol.atoms[i].y,
          mol.atoms[i].z,
        );
        const p2 = new THREE.Vector3(
          mol.atoms[j].x,
          mol.atoms[j].y,
          mol.atoms[j].z,
        );
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dist = p1.distanceTo(p2);

        const bond = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, dist, 8),
          new THREE.MeshPhysicalMaterial({
            color: 0x888899,
            metalness: 0.3,
            roughness: 0.4,
            transparent: true,
            opacity: 0.7,
          }),
        );
        bond.position.copy(mid);
        bond.lookAt(p2);
        bond.rotateX(Math.PI / 2);
        group.add(bond);
      });

      const glowRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.8, 0.02, 16, 32),
        new THREE.MeshBasicMaterial({
          color: labelColor,
          transparent: true,
          opacity: 0.3,
        }),
      );
      glowRing.rotation.x = Math.PI / 2;
      glowRing.position.y = -0.9;
      group.add(glowRing);

      moleculeGroup.add(group);
    });

    const starCount = 1500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 20 + Math.random() * 40;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const gravity = -9.8;
    const bounceFactor = 0.6;
    const friction = 0.98;
    const groundY = -2 + 0.1;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isPointerDown = false;
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = "clientX" in e ? e.clientX : e.touches[0].clientX;
      const clientY = "clientY" in e ? e.clientY : e.touches[0].clientY;
      pointerDownPos = { x: clientX, y: clientY };
      isPointerDown = true;
    };

    const onPointerUp = (e: MouseEvent | TouchEvent) => {
      if (!isPointerDown) return;
      isPointerDown = false;

      const clientX = "clientX" in e ? e.clientX : e.changedTouches[0].clientX;
      const clientY = "clientY" in e ? e.clientY : e.changedTouches[0].clientY;

      const dx = clientX - pointerDownPos.x;
      const dy = clientY - pointerDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(ground);

        if (intersects.length > 0) {
          const hitPoint = intersects[0].point;
          hitPoint.y += 0.5;

          createExplosion(scene, hitPoint, new THREE.Color(0x4488ff), 60);

          fireBurst(scene, hitPoint);

          dnaGroup.scale.set(1.05, 1.05, 1.05);
          setTimeout(() => {
            dnaGroup.scale.set(1, 1, 1);
          }, 200);
        }
      }
    };

    renderer.domElement.addEventListener("mousedown", onPointerDown);
    renderer.domElement.addEventListener("mouseup", onPointerUp);
    renderer.domElement.addEventListener("touchstart", onPointerDown);
    renderer.domElement.addEventListener("touchend", onPointerUp);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Space") {
        e.preventDefault();
        const pos = new THREE.Vector3(0, 2, 5);
        createExplosion(scene, pos, new THREE.Color(0xff8844), 80);
        fireBurst(scene, pos);
      }
      if (e.key === "r" || e.key === "R") {
        physicsSpheresRef.current.forEach((s) => {
          scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          (s.mesh.material as THREE.Material).dispose();
        });
        physicsSpheresRef.current = [];
        explosionParticlesRef.current.forEach((p) => {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.MeshBasicMaterial).dispose();
        });
        explosionParticlesRef.current = [];
      }
    };

    window.addEventListener("keydown", onKeyDown);

    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const delta = Math.min(clock.getDelta(), 0.05);

      const breathe = 1 + Math.sin(time * 0.3) * 0.02;
      dnaGroup.scale.set(breathe, 1, breathe);

      moleculeGroup.rotation.y = time * 0.05;

      stars.rotation.y = time * 0.005;

      const spheres = physicsSpheresRef.current;
      for (let i = spheres.length - 1; i >= 0; i--) {
        const s = spheres[i];

        s.velocity.y += gravity * delta;

        s.velocity.multiplyScalar(1 - (1 - friction) * delta * 10);

        s.mesh.position.x += s.velocity.x * delta;
        s.mesh.position.y += s.velocity.y * delta;
        s.mesh.position.z += s.velocity.z * delta;

        s.mesh.rotation.x += s.velocity.z * delta * 2;
        s.mesh.rotation.z -= s.velocity.x * delta * 2;

        if (s.mesh.position.y - s.radius < groundY) {
          s.mesh.position.y = groundY + s.radius;
          s.velocity.y = -s.velocity.y * bounceFactor;

          s.velocity.x *= 0.9;
          s.velocity.z *= 0.9;

          if (Math.abs(s.velocity.y) < 0.3) {
            s.velocity.y = 0;
            s.grounded = true;
          }
        }

        const wallSize = 8;
        if (Math.abs(s.mesh.position.x) > wallSize) {
          s.mesh.position.x = Math.sign(s.mesh.position.x) * wallSize;
          s.velocity.x *= -bounceFactor * 0.8;
        }
        if (Math.abs(s.mesh.position.z) > wallSize) {
          s.mesh.position.z = Math.sign(s.mesh.position.z) * wallSize;
          s.velocity.z *= -bounceFactor * 0.8;
        }

        for (let j = i + 1; j < spheres.length; j++) {
          const other = spheres[j];
          const diff = new THREE.Vector3()
            .copy(s.mesh.position)
            .sub(other.mesh.position);
          const dist = diff.length();
          const minDist = s.radius + other.radius;

          if (dist < minDist && dist > 0.001) {
            const overlap = (minDist - dist) / 2;
            const dir = diff.clone().normalize();

            s.mesh.position.add(dir.clone().multiplyScalar(overlap));
            other.mesh.position.sub(dir.clone().multiplyScalar(overlap));

            const v1 = s.velocity.clone();
            const v2 = other.velocity.clone();
            const mass1 = s.radius * s.radius * s.radius;
            const mass2 = other.radius * other.radius * other.radius;
            const totalMass = mass1 + mass2;

            const v1New = v1.clone().add(
              v2
                .clone()
                .sub(v1)
                .multiplyScalar((2 * mass2) / totalMass),
            );
            const v2New = v2.clone().add(
              v1
                .clone()
                .sub(v2)
                .multiplyScalar((2 * mass1) / totalMass),
            );

            s.velocity.copy(v1New.multiplyScalar(0.8));
            other.velocity.copy(v2New.multiplyScalar(0.8));
          }
        }

        if (
          s.grounded &&
          Math.abs(s.velocity.x) < 0.01 &&
          Math.abs(s.velocity.z) < 0.01
        ) {
        }

        if (s.mesh.position.y < -10) {
          scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          (s.mesh.material as THREE.Material).dispose();
          spheres.splice(i, 1);
        }
      }

      const particles = explosionParticlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.x += p.velocity.x * delta;
        p.mesh.position.y += p.velocity.y * delta;
        p.mesh.position.z += p.velocity.z * delta;

        p.velocity.y += gravity * delta * 0.5;

        p.velocity.multiplyScalar(1 - delta * 2);

        if (p.mesh.position.y < groundY + 0.05) {
          p.mesh.position.y = groundY + 0.05;
          p.velocity.y *= -0.3;
          p.velocity.x *= 0.8;
          p.velocity.z *= 0.8;
        }

        p.life -= delta / p.maxLife;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          p.life,
        );

        if (p.life <= 0 || p.mesh.position.y < -5) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.MeshBasicMaterial).dispose();
          particles.splice(i, 1);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("mousedown", onPointerDown);
      renderer.domElement.removeEventListener("mouseup", onPointerUp);
      renderer.domElement.removeEventListener("touchstart", onPointerDown);
      renderer.domElement.removeEventListener("touchend", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      physicsSpheresRef.current.forEach((s) => {
        scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
      });
      physicsSpheresRef.current = [];
      explosionParticlesRef.current.forEach((p) => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.MeshBasicMaterial).dispose();
      });
      explosionParticlesRef.current = [];
    };
  }, [theme, i18n]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        userSelect: "none",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "20px",
          zIndex: 10,
          fontSize: "12px",
          color: "var(--text-tertiary)",
          opacity: 0.6,
          pointerEvents: "none",
          fontFamily: "monospace",
          lineHeight: 1.8,
        }}
      >
        <div>
          💥{" "}
          {isZh ? "点击地面 → 爆炸 + 散弹" : "Click ground → Explosion + Burst"}
        </div>
        <div>⌨️ {isZh ? "空格键 → 发射球体" : "Space → Fire spheres"}</div>
        <div>⌨️ {isZh ? "R 键 → 重置所有球体" : "R → Reset all spheres"}</div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "20px",
          zIndex: 10,
          fontSize: "12px",
          color: "var(--text-tertiary)",
          opacity: 0.5,
          pointerEvents: "none",
          fontFamily: "monospace",
          textAlign: "right",
          lineHeight: 1.6,
        }}
      >
        <div>🧬 {isZh ? "DNA 双螺旋" : "DNA Double Helix"}</div>
        <div>⚛️ {isZh ? "分子结构" : "Molecular Structures"}</div>
        <div>💥 {isZh ? "物理特效" : "Physics Effects"}</div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          zIndex: 10,
          display: "flex",
          gap: "12px",
          padding: "8px 16px",
          background: "var(--bg-secondary)",
          borderRadius: "6px",
          border: "1px solid var(--border-color)",
          fontSize: "11px",
          color: "var(--text-tertiary)",
          fontFamily: "monospace",
          opacity: 0.6,
          pointerEvents: "none",
        }}
      >
        <span>🧬 DNA</span>
        <span style={{ color: "var(--accent-color)" }}>●</span>
        <span>{isZh ? "运行中" : "Running"}</span>
        <span style={{ color: "var(--text-tertiary)", opacity: 0.5 }}>|</span>
        <span>⚛️ {isZh ? "4 种分子" : "4 Molecules"}</span>
        <span style={{ color: "var(--text-tertiary)", opacity: 0.5 }}>|</span>
        <span>💥 {isZh ? "物理已开启" : "Physics ON"}</span>
      </div>
    </div>
  );
};

export default SandBox3D;
