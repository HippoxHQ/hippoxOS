import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { showDialog, DialogType } from "../../../components/Dialog";
import { ToolMenu } from "./ToolMenu";
import { sandbox3dExportCommands } from "../../../command/SandBox3D";
const gifshot = require("gifshot");
export interface ThreeSceneSnapshot {
  id: string;
  taskId: string;
  code: string;
  title: string;
  thumbnail: string | null;
  createdAt: string;
  isActive: boolean;
}
export interface SandBox3DRef {
  executeThreeCode: (code: string, clearBeforeExecute?: boolean) => void;
  clearScene: () => void;
  updateHistorySnapshots: (tasks: Array<{ taskId: string; code: string; title: string; createdAt: string }>) => void;
  switchToSnapshot: (snapshotId: string) => void;
  getActiveSnapshotId: () => string | null;
  captureThumbnail: () => string | null;
  generateThumbnailOffscreen: (code: string) => string | null;
  getSnapshots: () => ThreeSceneSnapshot[];
  setActiveSnapshot: (snapshotId: string) => void;
  updateSnapshotThumbnail: (snapshotId: string, thumbnail: string | null) => void;
  refreshScene: () => void;
  exportGif: (duration: number, fps: number, quality: number) => Promise<Uint8Array | null>;
}
interface SandBox3DProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
}
const SandBox3D = forwardRef<SandBox3DRef, SandBox3DProps>(({ theme, i18n, t, currentSessionId }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isZh = i18n === "zh-cn";
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const offscreenRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snapshots, setSnapshots] = useState<ThreeSceneSnapshot[]>([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  // GIF state
  const [gifPath, setGifPath] = useState<string | null>(null);
  const isSwitchingRef = useRef(false);
  const initOffscreenRenderer = useCallback(() => {
    if (offscreenRendererRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 150;
      canvas.style.display = "none";
      document.body.appendChild(canvas);
      offscreenCanvasRef.current = canvas;
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        canvas: canvas,
      });
      renderer.setSize(200, 150);
      renderer.setPixelRatio(1);
      offscreenRendererRef.current = renderer;
    } catch (error) {
      console.warn("[SandBox3D] Failed to initialize offscreen renderer:", error);
    }
  }, []);
  const clearScene = useCallback(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const objectsToRemove: THREE.Object3D[] = [];
    scene.children.forEach((child) => {
      if (child.userData?.persistent) return;
      if (child instanceof THREE.Light) return;
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry) {
        const mat = child.material as THREE.MeshPhysicalMaterial;
        if (mat.color && mat.color.getHex() === (theme === "dark" ? 0x1a1a3a : 0xddddee)) {
          return;
        }
      }
      if (child instanceof THREE.GridHelper) return;
      objectsToRemove.push(child);
    });
    objectsToRemove.forEach((obj) => {
      scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
    if (rendererRef.current && cameraRef.current) {
      rendererRef.current.render(scene, cameraRef.current);
    }
  }, [theme]);
  const captureThumbnail = useCallback((): string | null => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return null;
    }
    try {
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 150;
      const thumbRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        canvas: canvas,
      });
      thumbRenderer.setSize(200, 150);
      thumbRenderer.setPixelRatio(1);
      thumbRenderer.render(scene, camera);
      const dataUrl = canvas.toDataURL("image/png", 0.8);
      thumbRenderer.dispose();
      return dataUrl;
    } catch (error) {
      console.warn("[SandBox3D] Failed to capture thumbnail:", error);
      return null;
    }
  }, []);
  const generateThumbnailOffscreen = useCallback(
    (code: string): string | null => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
        return null;
      }
      const mainRenderer = rendererRef.current;
      const mainScene = sceneRef.current;
      const mainCamera = cameraRef.current;
      if (!offscreenRendererRef.current) {
        initOffscreenRenderer();
        if (!offscreenRendererRef.current) return null;
      }
      const offscreenRenderer = offscreenRendererRef.current;
      try {
        const tempScene = new THREE.Scene();
        tempScene.background = new THREE.Color(theme === "dark" ? 0x0a0a1a : 0xf0f0f8);
        tempScene.fog = new THREE.Fog(theme === "dark" ? 0x0a0a1a : 0xf0f0f8, 15, 30);
        const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
        tempScene.add(ambientLight);
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
        mainLight.position.set(5, 10, 7);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        tempScene.add(mainLight);
        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5);
        fillLight.position.set(-5, 0, 5);
        tempScene.add(fillLight);
        const rimLight = new THREE.DirectionalLight(0xff8844, 0.3);
        rimLight.position.set(0, -3, -8);
        tempScene.add(rimLight);
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
        tempScene.add(ground);
        const gridHelper = new THREE.GridHelper(16, 20, 0x6666aa, 0x333366);
        gridHelper.position.y = -1.98;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.3;
        tempScene.add(gridHelper);
        const tempCamera = new THREE.PerspectiveCamera(50, 200 / 150, 0.1, 1000);
        tempCamera.position.set(8, 6, 10);
        tempCamera.lookAt(0, 0, 0);
        const dummyControls = {
          target: new THREE.Vector3(0, 0.5, 0),
          update: () => {},
          enableDamping: true,
          dampingFactor: 0.08,
          minDistance: 3,
          maxDistance: 25,
          autoRotate: false,
        };
        const fn = new Function(
          "THREE",
          "scene",
          "camera",
          "renderer",
          "controls",
          `
          try {
            ${code}
          } catch (error) {
            console.error('[SandBox3D] Error generating offscreen thumbnail:', error);
          }
        `,
        );
        fn(THREE, tempScene, tempCamera, offscreenRenderer, dummyControls);
        offscreenRenderer.render(tempScene, tempCamera);
        const dataUrl = offscreenRenderer.domElement.toDataURL("image/png", 0.8);
        mainRenderer.setRenderTarget(null);
        mainRenderer.render(mainScene, mainCamera);
        return dataUrl;
      } catch (error) {
        console.warn("[SandBox3D] Failed to generate offscreen thumbnail:", error);
        try {
          mainRenderer.setRenderTarget(null);
          mainRenderer.render(mainScene, mainCamera);
        } catch (_) {
          // Ignore restore errors
        }
        return null;
      }
    },
    [theme, initOffscreenRenderer],
  );
  const executeThreeCode = useCallback(
    (code: string, clearBeforeExecute: boolean = true): void => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
        console.warn("[SandBox3D] Cannot execute code: scene not initialized");
        return;
      }
      try {
        if (clearBeforeExecute) {
          clearScene();
        }
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const renderer = rendererRef.current;
        const controls = controlsRef.current;
        const fn = new Function(
          "THREE",
          "scene",
          "camera",
          "renderer",
          "controls",
          `
          try {
            ${code}
          } catch (error) {
            console.error('[SandBox3D] Error executing Three.js code:', error);
          }
        `,
        );
        fn(THREE, scene, camera, renderer, controls);
        renderer.render(scene, camera);
      } catch (error) {
        console.error("[SandBox3D] Failed to execute Three.js code:", error);
      }
    },
    [clearScene],
  );
  const refreshScene = useCallback(() => {
    const activeSnapshot = snapshots.find((s) => s.isActive);
    if (activeSnapshot && activeSnapshot.code) {
      clearScene();
      executeThreeCode(activeSnapshot.code, false);
    }
  }, [snapshots, clearScene, executeThreeCode]);
  const updateHistorySnapshots = useCallback((tasks: Array<{ taskId: string; code: string; title: string; createdAt: string }>) => {
    if (!tasks || tasks.length === 0) {
      setSnapshots([]);
      setActiveSnapshotId(null);
      return;
    }
    setSnapshots((prev) => {
      const existingByTaskId = new Map<string, ThreeSceneSnapshot>();
      prev.forEach((s) => {
        existingByTaskId.set(s.taskId, s);
      });
      const mergedSnapshots: ThreeSceneSnapshot[] = tasks.map((task) => {
        const existing = existingByTaskId.get(task.taskId);
        if (existing) {
          return {
            ...existing,
            title: task.title || existing.title,
            createdAt: task.createdAt || existing.createdAt,
            isActive: false,
          };
        }
        return {
          id: `snapshot_${task.taskId}`,
          taskId: task.taskId,
          code: task.code,
          title: task.title || "3D Scene",
          thumbnail: null,
          createdAt: task.createdAt || new Date().toISOString(),
          isActive: false,
        };
      });
      mergedSnapshots.sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      if (mergedSnapshots.length > 0) {
        const lastIndex = mergedSnapshots.length - 1;
        mergedSnapshots[lastIndex] = {
          ...mergedSnapshots[lastIndex],
          isActive: true,
        };
      }
      return mergedSnapshots;
    });
    const lastTask = tasks[tasks.length - 1];
    if (lastTask) {
      setActiveSnapshotId(`snapshot_${lastTask.taskId}`);
    }
  }, []);
  const updateSnapshotThumbnail = useCallback((snapshotId: string, thumbnail: string | null) => {
    setSnapshots((prev) => prev.map((s) => (s.id === snapshotId ? { ...s, thumbnail } : s)));
  }, []);
  const setActiveSnapshot = useCallback((snapshotId: string) => {
    setSnapshots((prev) =>
      prev.map((s) => ({
        ...s,
        isActive: s.id === snapshotId,
      })),
    );
    setActiveSnapshotId(snapshotId);
  }, []);
  const switchToSnapshot = useCallback(
    (snapshotId: string) => {
      const snapshot = snapshots.find((s) => s.id === snapshotId);
      if (!snapshot) {
        console.warn(`[SandBox3D] Snapshot ${snapshotId} not found`);
        return;
      }
      isSwitchingRef.current = true;
      executeThreeCode(snapshot.code, true);
      setSnapshots((prev) =>
        prev.map((s) => ({
          ...s,
          isActive: s.id === snapshotId,
        })),
      );
      setActiveSnapshotId(snapshotId);
      setTimeout(() => {
        isSwitchingRef.current = false;
      }, 500);
    },
    [snapshots, executeThreeCode],
  );
  const getSnapshots = useCallback((): ThreeSceneSnapshot[] => {
    return snapshots;
  }, [snapshots]);
  const getActiveSnapshotId = useCallback((): string | null => {
    return activeSnapshotId;
  }, [activeSnapshotId]);
  // Check if GIF exists for current session and task
  const checkGifExists = useCallback(async (sessionId: string, taskId: string) => {
    if (!sessionId || !taskId) return;
    try {
      const exists = await sandbox3dExportCommands.checkSandbox3dGifExists(sessionId, taskId);
      if (exists) {
        const storedPath = localStorage.getItem(`sandbox3d_gif_${sessionId}_${taskId}`);
        if (storedPath) {
          setGifPath(storedPath);
        }
      } else {
        setGifPath(null);
      }
    } catch (error) {
      console.error("Failed to check GIF existence:", error);
    }
  }, []);
  // Check GIF when session or active snapshot changes
  useEffect(() => {
    if (currentSessionId) {
      const activeSnapshot = snapshots.find((s) => s.isActive);
      if (activeSnapshot) {
        checkGifExists(currentSessionId, activeSnapshot.taskId);
      }
    }
  }, [currentSessionId, snapshots, checkGifExists]);
  // Handle GIF upload completion
  const handleGifUploaded = useCallback(
    (path: string) => {
      setGifPath(path);
      const activeSnapshot = snapshots.find((s) => s.isActive);
      if (activeSnapshot && currentSessionId) {
        localStorage.setItem(`sandbox3d_gif_${currentSessionId}_${activeSnapshot.taskId}`, path);
      }
    },
    [snapshots, currentSessionId],
  );
  const exportGif = useCallback(async (duration: number, fps: number, quality: number): Promise<Uint8Array | null> => {
    return new Promise((resolve) => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
        console.warn("[SandBox3D] Cannot export GIF: scene not initialized");
        resolve(null);
        return;
      }
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const totalFrames = Math.floor(duration * fps);
      const frameDelay = 1000 / fps;
      const images: string[] = [];
      const autoRotate = controls?.autoRotate || false;
      if (controls) controls.autoRotate = false;
      let currentFrame = 0;
      let startTime = performance.now();
      const captureFrame = () => {
        renderer.render(scene, camera);
        images.push(renderer.domElement.toDataURL("image/png"));
        currentFrame++;
        if (currentFrame >= totalFrames) {
          gifshot.createGIF(
            {
              images: images,
              gifWidth: renderer.domElement.width,
              gifHeight: renderer.domElement.height,
              frameDuration: frameDelay / 1000,
              numFrames: images.length,
              interval: frameDelay / 1000,
            },
            (obj: any) => {
              if (obj.error) {
                console.error("GIF creation error:", obj.error);
                if (controls) controls.autoRotate = autoRotate;
                resolve(null);
                return;
              }
              try {
                const base64 = obj.image.split(",")[1];
                const binary = atob(base64);
                const gifData = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                  gifData[i] = binary.charCodeAt(i);
                }
                if (controls) controls.autoRotate = autoRotate;
                resolve(gifData);
              } catch (err) {
                console.error("Failed to decode GIF:", err);
                if (controls) controls.autoRotate = autoRotate;
                resolve(null);
              }
            },
          );
          return;
        }
        const elapsed = performance.now() - startTime;
        const expectedTime = currentFrame * frameDelay;
        const delay = Math.max(0, expectedTime - elapsed);
        setTimeout(captureFrame, delay);
      };
      setTimeout(captureFrame, 100);
    });
  }, []);
  useImperativeHandle(ref, () => ({
    executeThreeCode: (code: string, clearBeforeExecute: boolean = true) => {
      executeThreeCode(code, clearBeforeExecute);
    },
    clearScene: () => {
      clearScene();
    },
    updateHistorySnapshots: (tasks: Array<{ taskId: string; code: string; title: string; createdAt: string }>) => {
      updateHistorySnapshots(tasks);
    },
    switchToSnapshot: (snapshotId: string) => {
      switchToSnapshot(snapshotId);
    },
    getActiveSnapshotId: () => {
      return getActiveSnapshotId();
    },
    captureThumbnail,
    generateThumbnailOffscreen,
    getSnapshots,
    setActiveSnapshot,
    updateSnapshotThumbnail,
    refreshScene,
    exportGif,
  }));
  // Initialize Three.js scene on component mount
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme === "dark" ? 0x0a0a1a : 0xf0f0f8);
    scene.fog = new THREE.Fog(theme === "dark" ? 0x0a0a1a : 0xf0f0f8, 15, 30);
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(8, 6, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
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
    controlsRef.current = controls;
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    ambientLight.userData.persistent = true;
    scene.add(ambientLight);
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.userData.persistent = true;
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5);
    fillLight.position.set(-5, 0, 5);
    fillLight.userData.persistent = true;
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xff8844, 0.3);
    rimLight.position.set(0, -3, -8);
    rimLight.userData.persistent = true;
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
    ground.userData.persistent = true;
    scene.add(ground);
    const gridHelper = new THREE.GridHelper(16, 20, 0x6666aa, 0x333366);
    gridHelper.position.y = -1.98;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    gridHelper.userData.persistent = true;
    scene.add(gridHelper);
    initOffscreenRenderer();
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (offscreenRendererRef.current) {
        offscreenRendererRef.current.dispose();
        offscreenRendererRef.current = null;
      }
      if (offscreenCanvasRef.current && offscreenCanvasRef.current.parentNode) {
        offscreenCanvasRef.current.parentNode.removeChild(offscreenCanvasRef.current);
        offscreenCanvasRef.current = null;
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, [theme, initOffscreenRenderer]);
  const toggleHistory = useCallback(() => {
    setIsHistoryExpanded((prev) => !prev);
  }, []);
  const closeHistory = useCallback(() => {
    setIsHistoryExpanded(false);
  }, []);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isHistoryExpanded) return;
      const target = event.target as HTMLElement;
      const historyPanel = document.querySelector(".sandbox3d-history-panel");
      const thumbnailTrigger = document.querySelector(".sandbox3d-thumbnail-trigger");
      if (historyPanel && !historyPanel.contains(target) && thumbnailTrigger && !thumbnailTrigger.contains(target)) {
        closeHistory();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isHistoryExpanded, closeHistory]);
  useEffect(() => {
    if (!currentSessionId) return;
    clearScene();
  }, [currentSessionId, clearScene]);
  const getActiveThumbnail = useCallback((): string | null => {
    const active = snapshots.find((s) => s.isActive);
    return active?.thumbnail || null;
  }, [snapshots]);
  const getActiveTitle = useCallback((): string => {
    const active = snapshots.find((s) => s.isActive);
    return active?.title || (isZh ? "空场景" : "Empty Scene");
  }, [snapshots, isZh]);
  const handleSnapshotClick = useCallback(
    (snapshotId: string) => {
      switchToSnapshot(snapshotId);
    },
    [switchToSnapshot],
  );
  const activeThumbnail = getActiveThumbnail();
  const activeTitle = getActiveTitle();
  const activeSnapshot = snapshots.find((s) => s.isActive);
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
      <ToolMenu
        onRefresh={() => {
          if (containerRef.current) {
            refreshScene();
          }
        }}
        onExportGif={exportGif}
        onClearScene={() => {
          clearScene();
        }}
        onResetCamera={() => {
          if (cameraRef.current && controlsRef.current) {
            cameraRef.current.position.set(8, 6, 10);
            controlsRef.current.target.set(0, 0.5, 0);
            controlsRef.current.update();
          }
        }}
        onToggleFullscreen={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        }}
        isZh={isZh}
        theme={theme}
        currentSessionId={currentSessionId}
        currentTaskId={activeSnapshot?.taskId}
        gifPath={gifPath}
        onGifUploaded={handleGifUploaded}
      />
      {snapshots.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "4px",
          }}
        >
          {!isHistoryExpanded && (
            <div
              className="sandbox3d-thumbnail-trigger"
              onClick={toggleHistory}
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "8px",
                overflow: "hidden",
                border: "2px solid var(--border-color)",
                cursor: "pointer",
                background: "var(--bg-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "border-color 0.2s ease",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-color)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
              title={isZh ? "点击展开历史场景" : "Click to expand history"}
            >
              {activeThumbnail ? (
                <img
                  src={activeThumbnail}
                  alt={activeTitle}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: "24px",
                    color: "var(--text-tertiary)",
                  }}
                >
                  🧊
                </span>
              )}
              <div
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "var(--accent-color)",
                  color: "white",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                {snapshots.length}
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: "4px",
                  right: "4px",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.8)",
                  background: "rgba(0,0,0,0.5)",
                  borderRadius: "4px",
                  padding: "2px 6px",
                }}
              >
                ▲
              </div>
            </div>
          )}
          {isHistoryExpanded && (
            <div
              className="sandbox3d-history-panel"
              style={{
                display: "flex",
                flexDirection: "column",
                width: "180px",
                height: "calc(100vh - 120px)",
                maxHeight: "calc(100% - 40px)",
                minHeight: "200px",
                background: "var(--bg-secondary)",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                animation: "slideUp 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--border-color)",
                  flexShrink: 0,
                  background: "var(--bg-tertiary)",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {isZh ? `历史场景 (${snapshots.length})` : `History (${snapshots.length})`}
                </span>
                <button
                  onClick={toggleHistory}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                  title={isZh ? "收起" : "Collapse"}
                >
                  ▼
                </button>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {snapshots.map((snapshot) => {
                  const isActive = snapshot.isActive;
                  return (
                    <div
                      key={snapshot.id}
                      onClick={() => handleSnapshotClick(snapshot.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "4px 6px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        background: isActive ? "var(--accent-glow)" : "transparent",
                        border: isActive ? "1px solid var(--accent-color)" : "1px solid transparent",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "var(--hover-bg)";
                          e.currentTarget.style.borderColor = "var(--border-color)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderColor = "transparent";
                        }
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "30px",
                          borderRadius: "4px",
                          overflow: "hidden",
                          flexShrink: 0,
                          background: "var(--bg-tertiary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {snapshot.thumbnail ? (
                          <img
                            src={snapshot.thumbnail}
                            alt={snapshot.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "14px" }}>🧊</span>
                        )}
                      </div>
                      <span
                        style={{
                          flex: 1,
                          fontSize: "11px",
                          color: isActive ? "var(--accent-color)" : "var(--text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: isActive ? 500 : 400,
                        }}
                        title={snapshot.title}
                      >
                        {snapshot.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {snapshots.length === 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            zIndex: 10,
            fontSize: "11px",
            color: "var(--text-tertiary)",
            opacity: 0.4,
            pointerEvents: "none",
            fontFamily: "monospace",
          }}
        >
          {isZh ? "💡 开始对话，生成3D场景" : "💡 Start chatting to generate 3D scenes"}
        </div>
      )}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
});
SandBox3D.displayName = "SandBox3D";
export default SandBox3D;
