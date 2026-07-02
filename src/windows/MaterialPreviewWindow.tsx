import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from "lucide-react";
import { configCommands } from "../command/config";
import { windowsCommands } from "../command/windows";
import { zh, en } from "../i18n";
import * as monaco from "monaco-editor";
import { materialsCommands } from "../command/VideoEditor/Materials";
import { convertFileSrc } from "@tauri-apps/api/core";

interface MaterialPreviewWindowProps {
  material?: {
    id: string;
    name: string;
    file_path: string;
    type: "video" | "audio" | "image" | "text";
    duration?: number;
    width?: number;
    height?: number;
    thumbnail?: string;
    waveform?: string;
    content_preview?: string;
    line_count?: number;
    file_size?: number;
    codec?: string;
    fps?: number;
    sample_rate?: number;
    channels?: number;
  };
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
  const [material, setMaterial] = useState<
    MaterialPreviewWindowProps["material"] | null
  >(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<"zh" | "en">("en");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [assetPath, setAssetPath] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTheme, savedLanguage] = await Promise.all([
          configCommands.getSettingsTheme(),
          configCommands.getSettingsLanguage(),
        ]);
        setTheme(savedTheme as "dark" | "light");
        setLanguage(savedLanguage as "zh" | "en");
      } catch (error) {
        console.error("Failed to load config:", error);
      }
      try {
        const data = await materialsCommands.getMaterialPreviewData();
        if (data) {
          console.log("Got material data from backend:", data);
          setMaterial(data);
          if (data.file_path) {
            const converted = convertFileSrc(data.file_path);
            setAssetPath(converted);
            console.log("Converted asset path:", converted);
          }
          setImageScale(1);
          setImageRotation(0);
          setImagePosition({ x: 0, y: 0 });
          setImageLoaded(false);
        }
      } catch (error) {
        console.error("Failed to get material preview data:", error);
      }
      const checkMaximized = async () => {
        try {
          const maximized = await windowsCommands.windowIsMaximized(
            "material-preview-window",
          );
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
      const content = material.content_preview || "暂无内容预览";
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
      const isMax = await windowsCommands.windowIsMaximized(
        "material-preview-window",
      );
      if (isMax) {
        await windowsCommands.windowUnmaximize("material-preview-window");
      } else {
        await windowsCommands.windowMaximize("material-preview-window");
      }
      const maximized = await windowsCommands.windowIsMaximized(
        "material-preview-window",
      );
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
    } else if (material?.type === "audio" && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  const handleTimeUpdate = () => {
    if (material?.type === "video" && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    } else if (material?.type === "audio" && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds === 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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
  const isZh = language === "zh";
  const styles = {
    container: {
      backgroundColor: isDark ? "#1a1d26" : "#ffffff",
      border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      boxShadow: isDark
        ? "0 4px 12px rgba(0,0,0,0.4)"
        : "0 4px 12px rgba(0,0,0,0.15)",
      overflow: "hidden" as const,
      width: "100%",
      height: "100%",
      display: "flex" as const,
      flexDirection: "column" as const,
    },
    topBar: {
      height: "35px",
      background: isDark ? "#22252f" : "#f9fafb",
      borderBottom: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      padding: "0 12px",
      flexShrink: 0 as const,
      WebkitAppRegion: "drag" as const,
      appRegion: "drag" as const,
    },
    topBarLeft: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "6px",
      flexShrink: 0 as const,
      WebkitAppRegion: "drag" as const,
      appRegion: "drag" as const,
    },
    topBarCenter: {
      flex: 1,
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      WebkitAppRegion: "drag" as const,
      appRegion: "drag" as const,
      overflow: "hidden" as const,
      padding: "0 8px",
    },
    topBarTitle: {
      fontSize: "13px",
      fontWeight: 500,
      color: isDark ? "#e8edf2" : "#111827",
      overflow: "hidden" as const,
      textOverflow: "ellipsis" as const,
      whiteSpace: "nowrap" as const,
      WebkitAppRegion: "drag" as const,
      appRegion: "drag" as const,
      maxWidth: "300px",
    },
    topBarRight: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "2px",
      WebkitAppRegion: "no-drag" as const,
      appRegion: "no-drag" as const,
      flexShrink: 0 as const,
    },
    windowBtn: {
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      width: "32px",
      height: "32px",
      background: "transparent" as const,
      border: "none" as const,
      cursor: "pointer" as const,
      color: isDark ? "#9ca3af" : "#6b7280",
      fontSize: "15px",
      borderRadius: "0",
      flexShrink: 0 as const,
      WebkitAppRegion: "no-drag" as const,
      appRegion: "no-drag" as const,
    },
    content: {
      flex: 1,
      display: "flex" as const,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: "8px",
      overflow: "hidden" as const,
      minHeight: 0,
      position: "relative" as const,
    },
    previewContainer: {
      width: "100%",
      height: "100%",
      display: "flex" as const,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      overflow: "hidden" as const,
    },
    video: {
      width: "100%",
      height: "100%",
      maxHeight: "100%",
      borderRadius: "4px",
      backgroundColor: "#000",
      objectFit: "contain" as const,
    },
    imageContainer: {
      width: "100%",
      height: "100%",
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      overflow: "hidden" as const,
      cursor: imageScale > 1 ? "grab" : "default",
      position: "relative" as const,
      backgroundColor: isDark ? "#0d0d0d" : "#f0f0f0",
    },
    imageWrapper: {
      transform: `scale(${imageScale}) rotate(${imageRotation}deg) translate(${imagePosition.x / imageScale}px, ${imagePosition.y / imageScale}px)`,
      transition: isDragging ? "none" : "transform 0.1s ease",
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      width: "100%",
      height: "100%",
    },
    image: {
      maxWidth: "100%",
      maxHeight: "100%",
      objectFit: "contain" as const,
      borderRadius: "4px",
      userSelect: "none" as const,
      WebkitUserSelect: "none" as const,
    },
    imageControls: {
      position: "absolute" as const,
      bottom: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "6px",
      padding: "6px 12px",
      backgroundColor: isDark ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)",
      borderRadius: "8px",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
      backdropFilter: "blur(8px)",
      zIndex: 10,
    },
    imageControlBtn: {
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      width: "28px",
      height: "28px",
      background: "transparent" as const,
      border: "none" as const,
      borderRadius: "4px",
      cursor: "pointer" as const,
      color: isDark ? "#e8edf2" : "#111827",
      transition: "background 0.15s",
    },
    imageControlText: {
      fontSize: "11px",
      color: isDark ? "#9ca3af" : "#6b7280",
      padding: "0 6px",
      minWidth: "40px",
      textAlign: "center" as const,
      fontFamily: "monospace",
    },
    textPreview: {
      width: "100%",
      height: "100%",
      flex: 1,
      borderRadius: "4px",
      overflow: "hidden" as const,
      backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
      position: "relative" as const,
    },
    editorContainer: {
      width: "100%",
      height: "100%",
      position: "relative" as const,
    },
    waveformContainer: {
      width: "100%",
      display: "flex" as const,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: "16px",
      backgroundColor: isDark ? "#22252f" : "#f3f4f6",
      borderRadius: "4px",
      minHeight: "120px",
      flex: 1,
    },
    waveformImage: {
      width: "100%",
      maxWidth: "600px",
      height: "80px",
      objectFit: "contain" as const,
      borderRadius: "4px",
    },
    audioPlaceholder: {
      fontSize: "48px",
      color: isDark ? "#4a4f5a" : "#d1d5db",
    },
    controls: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "12px",
      padding: "8px 16px",
      borderTop: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      backgroundColor: isDark ? "#22252f" : "#f9fafb",
      flexShrink: 0 as const,
    },
    playBtn: {
      background: "none" as const,
      border: "none" as const,
      cursor: "pointer" as const,
      fontSize: "20px",
      color: isDark ? "#e8edf2" : "#111827",
      padding: "4px 8px",
      borderRadius: "4px",
      transition: "background 0.15s",
    },
    timeDisplay: {
      fontSize: "12px",
      color: isDark ? "#9ca3af" : "#6b7280",
      fontFamily: "monospace",
      minWidth: "80px",
    },
    progressBar: {
      flex: 1,
      height: "4px",
      backgroundColor: isDark ? "#3a3f4a" : "#e5e7eb",
      borderRadius: "2px",
      cursor: "pointer" as const,
      position: "relative" as const,
      overflow: "hidden" as const,
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#4ec9b0",
      borderRadius: "2px",
      transition: "width 0.1s",
    },
    info: {
      display: "grid" as const,
      gridTemplateColumns: "1fr 1fr",
      gap: "4px 16px",
      padding: "6px 16px",
      fontSize: "11px",
      color: isDark ? "#9ca3af" : "#6b7280",
      width: "100%",
      borderTop: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      flexShrink: 0 as const,
    },
    infoLabel: {
      color: isDark ? "#6b7280" : "#9ca3af",
    },
    infoValue: {
      color: isDark ? "#e8edf2" : "#111827",
      textAlign: "right" as const,
    },
    emptyState: {
      display: "flex" as const,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: "12px",
      color: isDark ? "#6b7280" : "#9ca3af",
      fontSize: "14px",
    },
  };

  if (!material) {
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: isDark ? "#e8edf2" : "#111827",
              }}
            >
              HippoxOS
            </span>
          </div>
          <div style={styles.topBarCenter}>
            <span style={styles.topBarTitle}>素材预览</span>
          </div>
          <div style={styles.topBarRight}>
            <button
              style={styles.windowBtn}
              onClick={handleMinimize}
              title={isZh ? "最小化" : "Minimize"}
            >
              <span
                style={{ fontSize: "20px", lineHeight: 1, fontWeight: 300 }}
              >
                ─
              </span>
            </button>
            <button
              style={styles.windowBtn}
              onClick={handleMaximize}
              title={
                isZh
                  ? isMaximized
                    ? "还原"
                    : "最大化"
                  : isMaximized
                    ? "Restore"
                    : "Maximize"
              }
            >
              {isMaximized ? (
                <span
                  style={{
                    fontSize: "20px",
                    lineHeight: 1,
                    fontWeight: 400,
                    marginTop: "2px",
                  }}
                >
                  ❐
                </span>
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
               ✕
            </button>
          </div>
        </div>
        <div style={styles.content}>
          <div style={styles.emptyState}>
            <span style={{ fontSize: "32px" }}>🎬</span>
            <span>等待素材加载...</span>
          </div>
        </div>
      </div>
    );
  }

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
              controls={false}
            />
          </div>
        );

      case "audio":
        return (
          <div style={styles.previewContainer}>
            <div style={styles.waveformContainer}>
              {material.waveform ? (
                <img
                  src={material.waveform}
                  alt="Waveform"
                  style={styles.waveformImage}
                />
              ) : (
                <span style={styles.audioPlaceholder}>🎵</span>
              )}
            </div>
            <audio
              ref={audioRef}
              src={assetPath}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
            />
          </div>
        );

      case "image":
        return (
          <div style={styles.previewContainer}>
            <div
              ref={imageContainerRef}
              style={styles.imageContainer}
              onMouseDown={handleImageMouseDown}
              onMouseMove={handleImageMouseMove}
              onMouseUp={handleImageMouseUp}
              onMouseLeave={() => setIsDragging(false)}
              onWheel={handleImageWheel}
            >
              <div style={styles.imageWrapper}>
                <img
                  src={material.thumbnail || assetPath}
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
                    e.currentTarget.style.background = isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <ZoomOut size={16} />
                </button>
                <span style={styles.imageControlText}>
                  {Math.round(imageScale * 100)}%
                </span>
                <button
                  style={styles.imageControlBtn}
                  onClick={handleImageZoomIn}
                  title={isZh ? "放大" : "Zoom In"}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)";
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
                    e.currentTarget.style.background = isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)";
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
                    e.currentTarget.style.background = isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            )}
          </div>
        );

      case "text":
        return (
          <div style={styles.previewContainer}>
            <div style={styles.textPreview}>
              <div
                ref={editorContainerRef}
                style={styles.editorContainer}
                className="preview-editor-container"
              />
            </div>
          </div>
        );

      default:
        return (
          <div style={styles.emptyState}>
            <span style={{ fontSize: "32px" }}>📄</span>
            <span>不支持的素材类型</span>
          </div>
        );
    }
  };

  const hasPlayback = material.type === "video" || material.type === "audio";

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: isDark ? "#e8edf2" : "#111827",
            }}
          >
            HippoxOS
          </span>
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
          <button
            style={styles.windowBtn}
            onClick={handleMinimize}
            title={isZh ? "最小化" : "Minimize"}
          >
            <span style={{ fontSize: "20px", lineHeight: 1, fontWeight: 300 }}>
              ─
            </span>
          </button>
          <button
            style={styles.windowBtn}
            onClick={handleMaximize}
            title={
              isZh
                ? isMaximized
                  ? "还原"
                  : "最大化"
                : isMaximized
                  ? "Restore"
                  : "Maximize"
            }
          >
            {isMaximized ? (
              <span
                style={{
                  fontSize: "20px",
                  lineHeight: 1,
                  fontWeight: 400,
                  marginTop: "2px",
                }}
              >
                ❐
              </span>
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
            ✕
          </button>
        </div>
      </div>

      <div style={styles.content}>{renderContent()}</div>

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
            {isPlaying ? "⏸" : "▶"}
          </button>
          <span style={styles.timeDisplay}>{formatDuration(currentTime)}</span>
          <div
            style={styles.progressBar}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              const duration = material.duration || 0;
              const seekTime = percent * duration;
              if (material.type === "video" && videoRef.current) {
                videoRef.current.currentTime = seekTime;
              } else if (material.type === "audio" && audioRef.current) {
                audioRef.current.currentTime = seekTime;
              }
            }}
          >
            <div
              style={{
                ...styles.progressFill,
                width: `${(currentTime / (material.duration || 1)) * 100}%`,
              }}
            />
          </div>
          <span style={styles.timeDisplay}>
            {formatDuration(material.duration || 0)}
          </span>
        </div>
      )}

      <div style={styles.info}>
        <span style={styles.infoLabel}>{t("videoEditor.type") || "类型"}</span>
        <span style={styles.infoValue}>
          {material.type === "video" && "🎬 视频"}
          {material.type === "audio" && "🎵 音频"}
          {material.type === "image" && "🖼️ 图片"}
          {material.type === "text" && "📄 文本"}
        </span>
        {material.duration !== undefined && material.duration > 0 && (
          <>
            <span style={styles.infoLabel}>
              {t("videoEditor.duration") || "时长"}
            </span>
            <span style={styles.infoValue}>
              {formatDuration(material.duration)}
            </span>
          </>
        )}
        {material.width && material.height && (
          <>
            <span style={styles.infoLabel}>分辨率</span>
            <span style={styles.infoValue}>
              {material.width}×{material.height}
            </span>
          </>
        )}
        {material.file_size && (
          <>
            <span style={styles.infoLabel}>文件大小</span>
            <span style={styles.infoValue}>
              {(material.file_size / 1024 / 1024).toFixed(2)} MB
            </span>
          </>
        )}
        {material.line_count && (
          <>
            <span style={styles.infoLabel}>行数</span>
            <span style={styles.infoValue}>{material.line_count}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default MaterialPreviewWindow;
