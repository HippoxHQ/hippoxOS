import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Maximize2, Minimize2, RotateCw, ZoomIn, ZoomOut, RefreshCw, Play, Pause, Music, File, Video, Image, FileText, Info, Box } from "lucide-react";
import * as monaco from "monaco-editor";
import { convertFileSrc } from "@tauri-apps/api/core";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import logo from "../../assets/logo.png";
import AudioVisualizer from "./AudioVisualizer";
import { Material } from "./types";
import { configCommands } from "../../command/config";
import { materialsCommands } from "../../command/VideoEditor/Materials";
import { windowsCommands } from "../../command/windows";
import { zh, en } from "../../i18n";
import { getStyles } from "./styles";
interface MaterialPreviewWindowProps {
  material?: Material;
}
const getTranslation = (language: "zh" | "en", key: string): string => {
  const translations = language === "zh" ? zh : en;
  const keys = key.split(".");
  let value: any = translations;
  for (const k of keys) {
    if (value === undefined) return key;
    value = value[k];
  }
  return value || key;
};
const MaterialPreviewWindow: React.FC = () => {
  const [material, setMaterial] = useState<Material | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<"zh" | "en">("en");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [assetPath, setAssetPath] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [remoteDuration, setRemoteDuration] = useState<number | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioVisualizerRef = useRef<{ seek: (time: number) => void }>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const threeCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeControlsRef = useRef<OrbitControls | null>(null);
  const threeAnimationIdRef = useRef<number | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const isZh = language === "zh";
  // Initialize 3D preview
  const initThreePreview = useCallback(() => {
    const container = threeContainerRef.current;
    if (!container || !material?.code) return;
    // Clean up previous renderer
    if (threeRendererRef.current) {
      threeRendererRef.current.dispose();
      threeRendererRef.current = null;
    }
    if (threeAnimationIdRef.current) {
      cancelAnimationFrame(threeAnimationIdRef.current);
      threeAnimationIdRef.current = null;
    }
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    threeSceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(5, 4, 6);
    camera.lookAt(0, 0, 0);
    threeCameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    threeRendererRef.current = renderer;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.target.set(0, 0, 0);
    threeControlsRef.current = controls;
    // Default lights
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
    // Ground
    const groundGeo = new THREE.PlaneGeometry(12, 12);
    const groundMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a3a,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    ground.receiveShadow = true;
    ground.userData.persistent = true;
    scene.add(ground);
    const gridHelper = new THREE.GridHelper(10, 20, 0x6666aa, 0x333366);
    gridHelper.position.y = -1.48;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    gridHelper.userData.persistent = true;
    scene.add(gridHelper);
    // Execute the Three.js code
    try {
      const fn = new Function(
        "THREE",
        "scene",
        "camera",
        "renderer",
        "controls",
        `
          try {
            ${material.code}
          } catch (error) {
            console.error('[MaterialPreview] 3D code error:', error);
          }
        `,
      );
      fn(THREE, scene, camera, renderer, controls);
    } catch (error) {
      console.error("[MaterialPreview] Failed to execute 3D code:", error);
    }
    // Animation loop
    const animate = () => {
      threeAnimationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(rect.width, rect.height);
      }
    });
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      if (threeAnimationIdRef.current) {
        cancelAnimationFrame(threeAnimationIdRef.current);
        threeAnimationIdRef.current = null;
      }
      if (threeRendererRef.current) {
        threeRendererRef.current.dispose();
        threeRendererRef.current = null;
      }
      if (threeControlsRef.current) {
        threeControlsRef.current.dispose();
        threeControlsRef.current = null;
      }
      threeSceneRef.current = null;
      threeCameraRef.current = null;
      const canvas = container.querySelector("canvas");
      if (canvas) {
        container.removeChild(canvas);
      }
    };
  }, [material]);
  // Initialize/cleanup 3D preview when material changes
  useEffect(() => {
    if (material?.type === "3d" && material.code) {
      const cleanup = initThreePreview();
      return cleanup;
    }
  }, [material, initThreePreview]);
  // Handle video metadata loaded
  const handleVideoMetadataLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      if (duration && !isNaN(duration)) {
        setRemoteDuration(duration);
        setMaterial((prev) => (prev ? { ...prev, duration } : prev));
      }
    }
  };
  const handleAudioDuration = (duration: number) => {
    if (duration && !isNaN(duration)) {
      setAudioDuration(duration);
      setMaterial((prev) => (prev ? { ...prev, duration } : prev));
    }
  };
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTheme, savedLanguage] = await Promise.all([configCommands.getSettingsTheme(), configCommands.getSettingsLanguage()]);
        setTheme(savedTheme as "dark" | "light");
        setLanguage(savedLanguage as "zh" | "en");
      } catch (error) {
        console.error("Failed to load config:", error);
      }
      try {
        const data = await materialsCommands.getMaterialPreviewData();
        if (data) {
          setMaterial(data);
          if (data.file_path) {
            if (data.file_path.startsWith("http://") || data.file_path.startsWith("https://")) {
              setAssetPath(data.file_path);
            } else {
              const converted = convertFileSrc(data.file_path);
              setAssetPath(converted);
            }
          }
          setImageScale(1);
          setImageRotation(0);
          setImagePosition({ x: 0, y: 0 });
          setImageLoaded(false);
          setIsLoaded(false);
          setRemoteDuration(null);
          setAudioDuration(null);
          // If it's a 3D type with code, initialize preview after render
          if (data.type === "3d" && data.code) {
            setTimeout(() => {
              const cleanup = initThreePreview();
              // Store cleanup for unmount
            }, 100);
          }
        }
      } catch (error) {
        console.error("Failed to get material preview data:", error);
      }
      const checkMaximized = async () => {
        try {
          const maximized = await windowsCommands.windowIsMaximized("material-preview-window");
          setIsMaximized(maximized);
        } catch (error) {
          console.error("Failed to check window state:", error);
        }
      };
      checkMaximized();
      const interval = setInterval(checkMaximized, 500);
      return () => {
        clearInterval(interval);
        if (editorRef.current) {
          editorRef.current.dispose();
          editorRef.current = null;
        }
        if (threeRendererRef.current) {
          threeRendererRef.current.dispose();
          threeRendererRef.current = null;
        }
        if (threeAnimationIdRef.current) {
          cancelAnimationFrame(threeAnimationIdRef.current);
          threeAnimationIdRef.current = null;
        }
      };
    };
    loadData();
  }, []);
  useEffect(() => {
    if (material?.type === "text" && editorContainerRef.current) {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
      const isDark = theme === "dark";
      const content = material.content_preview || (isZh ? "暂无内容预览" : "No content preview");
      const fileExt = material.name.split(".").pop()?.toLowerCase() || "";
      const extMap: Record<string, string> = {
        js: "javascript",
        jsx: "javascript",
        ts: "typescript",
        tsx: "typescript",
        py: "python",
        html: "html",
        css: "css",
        json: "json",
        md: "markdown",
        rs: "rust",
        go: "go",
        java: "java",
        cpp: "cpp",
        c: "c",
        h: "cpp",
        hpp: "cpp",
        php: "php",
        rb: "ruby",
        swift: "swift",
        kt: "kotlin",
        sql: "sql",
        sh: "shell",
        bash: "shell",
        yaml: "yaml",
        yml: "yaml",
        toml: "toml",
        xml: "xml",
        vue: "vue",
        svelte: "svelte",
        zig: "zig",
        txt: "plaintext",
        log: "plaintext",
      };
      const fileLang = extMap[fileExt] || "plaintext";
      const editor = monaco.editor.create(editorContainerRef.current, {
        value: content,
        language: fileLang,
        theme: isDark ? "vs-dark" : "light",
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        lineNumbers: "on",
        automaticLayout: true,
        wordWrap: "on",
        readOnly: true,
        scrollbar: {
          vertical: "visible",
          horizontal: "visible",
        },
      });
      editorRef.current = editor;
      const styleElement = document.createElement("style");
      styleElement.id = "preview-editor-style";
      styleElement.textContent = `
        .preview-editor-container .monaco-editor .margin {
          background: transparent !important;
        }
      `;
      document.head.appendChild(styleElement);
      return () => {
        if (editorRef.current) {
          editorRef.current.dispose();
          editorRef.current = null;
        }
        const styleEl = document.getElementById("preview-editor-style");
        if (styleEl) {
          styleEl.remove();
        }
      };
    }
  }, [material, theme]);
  const isDark = theme === "dark";
  const t = (key: string) => getTranslation(language, key);
  const handleMinimize = async () => {
    try {
      await windowsCommands.windowMinimize("material-preview-window");
    } catch (error) {
      console.error("Failed to minimize:", error);
    }
  };
  const handleMaximize = async () => {
    try {
      const isMax = await windowsCommands.windowIsMaximized("material-preview-window");
      if (isMax) {
        await windowsCommands.windowUnmaximize("material-preview-window");
      } else {
        await windowsCommands.windowMaximize("material-preview-window");
      }
      const maximized = await windowsCommands.windowIsMaximized("material-preview-window");
      setIsMaximized(maximized);
    } catch (error) {
      console.error("Failed to toggle maximize:", error);
    }
  };
  const handleClose = async () => {
    try {
      await windowsCommands.windowClose("material-preview-window");
    } catch (error) {
      console.error("Failed to close:", error);
      window.close();
    }
  };
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };
  const handlePlayPause = () => {
    if (material?.type === "video" && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (material?.type === "audio") {
      setIsPlaying(!isPlaying);
    }
  };
  const handleTimeUpdate = () => {
    if (material?.type === "video" && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const duration = material?.duration || 0;
    const seekTime = percent * duration;
    if (material?.type === "video" && videoRef.current) {
      videoRef.current.currentTime = seekTime;
    } else if (material?.type === "audio" && audioVisualizerRef.current) {
      audioVisualizerRef.current.seek(seekTime);
    }
  };
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds === 0 || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };
  const getDisplayDuration = (): number => {
    if (material?.duration && material.duration > 0) {
      return material.duration;
    }
    if (remoteDuration && remoteDuration > 0) {
      return remoteDuration;
    }
    if (audioDuration && audioDuration > 0) {
      return audioDuration;
    }
    return 0;
  };
  const handleImageZoomIn = () => {
    setImageScale((prev) => Math.min(prev + 0.25, 5));
  };
  const handleImageZoomOut = () => {
    setImageScale((prev) => Math.max(prev - 0.25, 0.25));
  };
  const handleImageRotate = () => {
    setImageRotation((prev) => prev + 90);
  };
  const handleImageReset = () => {
    setImageScale(1);
    setImageRotation(0);
    setImagePosition({ x: 0, y: 0 });
  };
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (imageScale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y,
      });
      e.preventDefault();
    }
  };
  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };
  const handleImageMouseUp = () => {
    setIsDragging(false);
  };
  const handleImageWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale((prev) => Math.min(Math.max(prev + delta, 0.25), 5));
  };
  const styles = getStyles(isDark, imageScale, isDragging, imageRotation, imagePosition);
  // Get icon for material type
  const getTypeIcon = () => {
    switch (material?.type) {
      case "video":
        return <Video size={12} style={{ display: "inline", marginRight: "4px" }} />;
      case "audio":
        return <Music size={12} style={{ display: "inline", marginRight: "4px" }} />;
      case "image":
        return <Image size={12} style={{ display: "inline", marginRight: "4px" }} />;
      case "text":
        return <FileText size={12} style={{ display: "inline", marginRight: "4px" }} />;
      case "3d":
        return <Box size={12} style={{ display: "inline", marginRight: "4px" }} />;
      default:
        return <File size={12} style={{ display: "inline", marginRight: "4px" }} />;
    }
  };
  const getTypeLabel = () => {
    switch (material?.type) {
      case "video":
        return isZh ? "视频" : "Video";
      case "audio":
        return isZh ? "音频" : "Audio";
      case "image":
        return isZh ? "图片" : "Image";
      case "text":
        return isZh ? "文本" : "Text";
      case "3d":
        return isZh ? "3D场景" : "3D Scene";
      default:
        return isZh ? "未知" : "Unknown";
    }
  };
  if (!material) {
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <img src={logo} alt="logo" style={{ width: 22, height: 22, borderRadius: 5 }} />
          </div>
          <div style={styles.topBarCenter}>
            <span style={styles.topBarTitle}>{isZh ? "素材预览" : "Material Preview"}</span>
          </div>
          <div style={styles.topBarRight}>
            <button style={styles.windowBtn} onClick={handleMinimize} title={isZh ? "最小化" : "Minimize"}>
              <span style={{ fontSize: "20px", lineHeight: 1, fontWeight: 300 }}>─</span>
            </button>
            <button style={styles.windowBtn} onClick={handleMaximize} title={isZh ? (isMaximized ? "还原" : "最大化") : isMaximized ? "Restore" : "Maximize"}>
              {isMaximized ? (
                <span style={{ fontSize: "20px", lineHeight: 1, fontWeight: 400, marginTop: "2px" }}>❐</span>
              ) : (
                <span
                  style={{
                    fontSize: "30px",
                    fontWeight: 300,
                    lineHeight: 1,
                    display: "flex",
                    alignItems: "center",
                    marginTop: "-4px",
                  }}
                >
                  □
                </span>
              )}
            </button>
            <button
              style={styles.windowBtn}
              onClick={handleClose}
              title={isZh ? "关闭" : "Close"}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(220,38,38,0.12)";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = isDark ? "#9ca3af" : "#6b7280";
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div style={styles.content}>
          <div style={styles.emptyState}>
            <File size={32} style={{ opacity: 0.3 }} />
            <span>{isZh ? "等待素材加载..." : "Waiting for material to load..."}</span>
          </div>
        </div>
      </div>
    );
  }
  // Check if the material is a GIF image
  const isGif = material.type === "image" && material.file_path?.toLowerCase().endsWith(".gif");
  const renderContent = () => {
    switch (material.type) {
      case "video":
        return (
          <div style={styles.previewContainer}>
            <video
              ref={videoRef}
              src={assetPath}
              style={styles.video}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              onLoadedMetadata={handleVideoMetadataLoaded}
              controls={false}
              crossOrigin="anonymous"
            />
          </div>
        );
      case "audio":
        return (
          <div style={styles.previewContainer}>
            <div style={styles.waveformContainer}>
              {assetPath ? (
                <AudioVisualizer
                  ref={audioVisualizerRef}
                  audioUrl={assetPath}
                  isDark={isDark}
                  isPlaying={isPlaying}
                  onPlayStateChange={(playing) => {
                    setIsPlaying(playing);
                  }}
                  onTimeUpdate={(time: number) => {
                    setCurrentTime(time);
                  }}
                  onLoaded={() => {
                    setIsLoaded(true);
                    if (!isPlaying) {
                      setIsPlaying(true);
                    }
                  }}
                  onDuration={handleAudioDuration}
                />
              ) : (
                <Music size={48} style={{ opacity: 0.3 }} />
              )}
            </div>
          </div>
        );
      // Handle both regular images and GIFs
      case "image": {
        const imageSrc = assetPath || material.thumbnail || "";
        return (
          <div style={styles.previewContainer}>
            <div ref={imageContainerRef} style={styles.imageContainer} onMouseDown={handleImageMouseDown} onMouseMove={handleImageMouseMove} onMouseUp={handleImageMouseUp} onMouseLeave={() => setIsDragging(false)} onWheel={handleImageWheel}>
              <div style={styles.imageWrapper}>
                <img
                  src={imageSrc}
                  alt={material.name}
                  style={styles.image}
                  draggable={false}
                  onLoad={() => setImageLoaded(true)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (assetPath && !target.src.includes("asset")) {
                      target.src = assetPath;
                    }
                  }}
                />
              </div>
            </div>
            {imageLoaded && (
              <div style={styles.imageControls}>
                <button
                  style={styles.imageControlBtn}
                  onClick={handleImageZoomOut}
                  title={isZh ? "缩小" : "Zoom Out"}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <ZoomOut size={16} />
                </button>
                <span style={styles.imageControlText}>{Math.round(imageScale * 100)}%</span>
                <button
                  style={styles.imageControlBtn}
                  onClick={handleImageZoomIn}
                  title={isZh ? "放大" : "Zoom In"}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  style={styles.imageControlBtn}
                  onClick={handleImageRotate}
                  title={isZh ? "旋转" : "Rotate"}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <RotateCw size={16} />
                </button>
                <button
                  style={styles.imageControlBtn}
                  onClick={handleImageReset}
                  title={isZh ? "重置" : "Reset"}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            )}
            {/* Show GIF badge if this is a GIF image */}
            {isGif && (
              <div
                style={{
                  position: "absolute" as const,
                  top: "8px",
                  right: "8px",
                  background: "rgba(0,0,0,0.7)",
                  color: "#fff",
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "3px",
                  fontWeight: 600,
                  letterSpacing: "0.3px",
                  zIndex: 5,
                }}
              >
                GIF
              </div>
            )}
          </div>
        );
      }
      case "text":
        return (
          <div style={styles.previewContainer}>
            <div style={styles.textPreview}>
              <div ref={editorContainerRef} style={styles.editorContainer} className="preview-editor-container" />
            </div>
          </div>
        );
      case "3d":
        return (
          <div style={styles.previewContainer}>
            <div ref={threeContainerRef} style={{ width: "100%", height: "100%", minHeight: "300px" }} />
          </div>
        );
      default:
        return (
          <div style={styles.emptyState}>
            <File size={32} style={{ opacity: 0.3 }} />
            <span>{isZh ? "不支持的素材类型" : "Unsupported material type"}</span>
          </div>
        );
    }
  };
  const hasPlayback = material.type === "video" || material.type === "audio";
  const displayDuration = getDisplayDuration();
  return (
    <div style={styles.container}>
      {/* Title Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <img src={logo} alt="logo" style={{ width: 22, height: 22, borderRadius: 5 }} />
        </div>
        <div style={styles.topBarCenter}>
          <span style={styles.topBarTitle} title={material.name}>
            {material.name}
          </span>
        </div>
        <div style={styles.topBarRight}>
          <button
            style={styles.windowBtn}
            onClick={handleToggleFullscreen}
            title={isZh ? "全屏" : "Fullscreen"}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "#3a3f4a" : "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button style={styles.windowBtn} onClick={handleMinimize} title={isZh ? "最小化" : "Minimize"}>
            <span style={{ fontSize: "20px", lineHeight: 1, fontWeight: 300 }}>─</span>
          </button>
          <button style={styles.windowBtn} onClick={handleMaximize} title={isZh ? (isMaximized ? "还原" : "最大化") : isMaximized ? "Restore" : "Maximize"}>
            {isMaximized ? (
              <span style={{ fontSize: "20px", lineHeight: 1, fontWeight: 400, marginTop: "2px" }}>❐</span>
            ) : (
              <span
                style={{
                  fontSize: "30px",
                  fontWeight: 300,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  marginTop: "-4px",
                }}
              >
                □
              </span>
            )}
          </button>
          <button
            style={styles.windowBtn}
            onClick={handleClose}
            title={isZh ? "关闭" : "Close"}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(220,38,38,0.12)";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isDark ? "#9ca3af" : "#6b7280";
            }}
          >
            <X />
          </button>
        </div>
      </div>
      {/* Main Content */}
      <div style={styles.content}>{renderContent()}</div>
      {/* Playback Controls - for video and audio */}
      {hasPlayback && (
        <div style={styles.controls}>
          <button
            style={styles.playBtn}
            onClick={handlePlayPause}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "#3a3f4a" : "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <span style={styles.timeDisplay}>{formatDuration(currentTime)}</span>
          <div style={styles.progressBar} onClick={handleProgressClick}>
            <div
              style={{
                ...styles.progressFill,
                width: `${(currentTime / (displayDuration || 1)) * 100}%`,
              }}
            />
          </div>
          <span style={styles.timeDisplay}>{formatDuration(displayDuration)}</span>
        </div>
      )}
      {/* Material Info Footer */}
      <div style={styles.info}>
        <span style={styles.infoLabel}>{isZh ? "类型" : "Type"}</span>
        <span style={styles.infoValue}>
          {getTypeIcon()} {getTypeLabel()}
          {isGif && " GIF"}
        </span>
        {displayDuration > 0 && (
          <>
            <span style={styles.infoLabel}>{isZh ? "时长" : "Duration"}</span>
            <span style={styles.infoValue}>{formatDuration(displayDuration)}</span>
          </>
        )}
        {material.width && material.height && (
          <>
            <span style={styles.infoLabel}>{isZh ? "分辨率" : "Resolution"}</span>
            <span style={styles.infoValue}>
              {material.width}×{material.height}
            </span>
          </>
        )}
        {material.file_size && (
          <>
            <span style={styles.infoLabel}>{isZh ? "文件大小" : "File Size"}</span>
            <span style={styles.infoValue}>{(material.file_size / 1024 / 1024).toFixed(2)} MB</span>
          </>
        )}
        {material.line_count && (
          <>
            <span style={styles.infoLabel}>{isZh ? "行数" : "Lines"}</span>
            <span style={styles.infoValue}>{material.line_count}</span>
          </>
        )}
      </div>
    </div>
  );
};
export default MaterialPreviewWindow;
