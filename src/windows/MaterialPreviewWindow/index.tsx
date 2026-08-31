import React, { useState, useEffect, useRef } from "react";
import { X, Maximize2, Minimize2, RotateCw, ZoomIn, ZoomOut, RefreshCw, Play, Pause, Music, File, Video, Image, FileText, Info } from "lucide-react";
import * as monaco from "monaco-editor";
import { convertFileSrc } from "@tauri-apps/api/core";
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
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const isZh = language === "zh";
  // Handle video metadata loaded - gets duration from browser
  const handleVideoMetadataLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      if (duration && !isNaN(duration)) {
        setRemoteDuration(duration);
        // Update material duration for progress bar
        setMaterial((prev) => (prev ? { ...prev, duration } : prev));
      }
    }
  };
  // Handle audio duration from AudioVisualizer
  const handleAudioDuration = (duration: number) => {
    if (duration && !isNaN(duration)) {
      setAudioDuration(duration);
      // Update material duration for progress bar
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
            // Check if it's a remote URL
            if (data.file_path.startsWith("http://") || data.file_path.startsWith("https://")) {
              // For remote URLs, use directly without convertFileSrc
              setAssetPath(data.file_path);
            } else {
              // For local files, use convertFileSrc
              const converted = convertFileSrc(data.file_path);
              setAssetPath(converted);
            }
          }
          setImageScale(1);
          setImageRotation(0);
          setImagePosition({ x: 0, y: 0 });
          setImageLoaded(false);
          setIsLoaded(false);
          // Reset remote duration when loading new material
          setRemoteDuration(null);
          setAudioDuration(null);
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
  // Get display duration - use material.duration, remoteDuration, or audioDuration
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
      case "image":
        return (
          <div style={styles.previewContainer}>
            <div ref={imageContainerRef} style={styles.imageContainer} onMouseDown={handleImageMouseDown} onMouseMove={handleImageMouseMove} onMouseUp={handleImageMouseUp} onMouseLeave={() => setIsDragging(false)} onWheel={handleImageWheel}>
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
          </div>
        );
      case "text":
        return (
          <div style={styles.previewContainer}>
            <div style={styles.textPreview}>
              <div ref={editorContainerRef} style={styles.editorContainer} className="preview-editor-container" />
            </div>
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
        {/* Type */}
        <span style={styles.infoLabel}>{t("videoEditor.type") || (isZh ? "类型" : "Type")}</span>
        <span style={styles.infoValue}>
          {material.type === "video" && (
            <>
              <Video size={12} style={{ display: "inline", marginRight: "4px" }} /> {isZh ? "视频" : "Video"}
            </>
          )}
          {material.type === "audio" && (
            <>
              <Music size={12} style={{ display: "inline", marginRight: "4px" }} /> {isZh ? "音频" : "Audio"}
            </>
          )}
          {material.type === "image" && (
            <>
              <Image size={12} style={{ display: "inline", marginRight: "4px" }} /> {isZh ? "图片" : "Image"}
            </>
          )}
          {material.type === "text" && (
            <>
              <FileText size={12} style={{ display: "inline", marginRight: "4px" }} /> {isZh ? "文本" : "Text"}
            </>
          )}
        </span>
        {/* Duration */}
        {displayDuration > 0 && (
          <>
            <span style={styles.infoLabel}>{t("videoEditor.duration") || (isZh ? "时长" : "Duration")}</span>
            <span style={styles.infoValue}>{formatDuration(displayDuration)}</span>
          </>
        )}
        {/* Resolution */}
        {material.width && material.height && (
          <>
            <span style={styles.infoLabel}>{isZh ? "分辨率" : "Resolution"}</span>
            <span style={styles.infoValue}>
              {material.width}×{material.height}
            </span>
          </>
        )}
        {/* File Size */}
        {material.file_size && (
          <>
            <span style={styles.infoLabel}>{isZh ? "文件大小" : "File Size"}</span>
            <span style={styles.infoValue}>{(material.file_size / 1024 / 1024).toFixed(2)} MB</span>
          </>
        )}
        {/* Line Count */}
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
