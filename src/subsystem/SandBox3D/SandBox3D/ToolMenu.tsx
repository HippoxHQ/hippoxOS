import React, { useState, useRef, useEffect, useCallback } from "react";
import { Settings, X, Video, Download, FolderOpen, Upload, Trash2 } from "lucide-react";
import { showToast, ToastType } from "../../../components/Toast";
import { sandbox3dExportCommands } from "../../../command/SandBox3D";
import { generalCommands } from "../../../command/General";
export interface ToolMenuProps {
  onRefresh: () => void;
  onExportGif: (duration: number, fps: number, quality: number) => Promise<Uint8Array | null>;
  onClearScene: () => void;
  onResetCamera: () => void;
  onToggleFullscreen: () => void;
  isZh: boolean;
  theme: "light" | "dark";
  currentSessionId?: string;
  currentTaskId?: string | null;
  gifPath?: string | null;
  onGifUploaded?: (path: string) => void;
  onDeleteGif?: () => void;
}
export const ToolMenu: React.FC<ToolMenuProps> = ({ onRefresh, onExportGif, onClearScene, onResetCamera, onToggleFullscreen, isZh, theme, currentSessionId, currentTaskId, gifPath, onGifUploaded, onDeleteGif }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(3);
  const [fps, setFps] = useState(15);
  const [quality, setQuality] = useState(80);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);
  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (menuRef.current && !menuRef.current.contains(target) && buttonRef.current && !buttonRef.current.contains(target)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeMenu]);
  const handleRevealInFileManager = useCallback(async () => {
    if (!gifPath) return;
    try {
      await generalCommands.openInExplorer(gifPath);
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "无法打开文件管理器" : "Cannot open file manager");
    }
  }, [gifPath, isZh]);
  const handleImportAsset = useCallback(async () => {
    if (!currentSessionId || !currentTaskId) {
      showToast(ToastType.WARNING, isZh ? "请先选择任务" : "Please select a task first");
      return;
    }
    try {
      const result = await sandbox3dExportCommands.register3dMaterial(currentSessionId, currentTaskId);
      if (result.success) {
        showToast(ToastType.SUCCESS, isZh ? "素材导入成功" : "Asset imported successfully");
      } else {
        showToast(ToastType.ERROR, result.message || (isZh ? "素材导入失败" : "Asset import failed"));
      }
      closeMenu();
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "素材导入失败" : "Asset import failed");
      console.error("Import asset error:", error);
    }
  }, [currentSessionId, currentTaskId, isZh, closeMenu]);
  const handleDeleteGif = useCallback(async () => {
    if (!currentSessionId || !currentTaskId) {
      showToast(ToastType.WARNING, isZh ? "请先选择任务" : "Please select a task first");
      return;
    }
    try {
      const result = await sandbox3dExportCommands.deleteSandbox3dGif(currentSessionId, currentTaskId);
      if (result.success) {
        showToast(ToastType.SUCCESS, isZh ? "GIF 已删除" : "GIF deleted");
        if (onDeleteGif) {
          onDeleteGif();
        }
        closeMenu();
      } else {
        showToast(ToastType.ERROR, result.message || (isZh ? "删除失败" : "Delete failed"));
      }
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "删除失败" : "Delete failed");
    }
  }, [currentSessionId, currentTaskId, isZh, onDeleteGif, closeMenu]);
  const handleExport = useCallback(async () => {
    if (!currentSessionId || !currentTaskId) {
      showToast(ToastType.WARNING, isZh ? "请先发送消息生成3D场景" : "Please send a message to generate a 3D scene first");
      return;
    }
    setIsExporting(true);
    try {
      const gifData = await onExportGif(duration, fps, quality);
      if (!gifData || gifData.length === 0) {
        throw new Error("No GIF data generated");
      }
      const result = await sandbox3dExportCommands.uploadSandbox3dGif(currentSessionId, currentTaskId, gifData);
      if (result.success && result.path) {
        showToast(ToastType.SUCCESS, isZh ? "GIF 导出成功" : "GIF exported successfully");
        if (onGifUploaded) {
          onGifUploaded(result.path);
        }
      } else {
        showToast(ToastType.ERROR, result.message || (isZh ? "GIF 上传失败" : "GIF upload failed"));
      }
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "GIF 导出失败" : "GIF export failed");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
      closeMenu();
    }
  }, [currentSessionId, currentTaskId, duration, fps, quality, isZh, onExportGif, onGifUploaded, closeMenu]);
  const isDark = theme === "dark";
  const bgColor = isDark ? "var(--bg-secondary)" : "var(--bg-secondary)";
  const borderColor = "var(--border-color)";
  const hoverBg = "var(--hover-bg)";
  const textColor = "var(--text-primary)";
  const textSecondary = "var(--text-secondary)";
  const textMuted = "var(--text-tertiary)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const accentColor = "var(--accent-color, #6366f1)";
  const dangerColor = "var(--error-color, #dc2626)";
  const dangerBg = "var(--error-bg, rgba(220,38,38,0.1))";
  return (
    <div
      style={{
        position: "absolute",
        top: "16px",
        right: "16px",
        zIndex: 30,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "5px",
          border: `1px solid ${borderColor}`,
          background: isOpen ? accentColor : bgColor,
          color: isOpen ? "#fff" : textSecondary,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          boxShadow: isOpen ? "0 4px 20px rgba(99, 102, 241, 0.25)" : "0 2px 12px rgba(0,0,0,0.06)",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = hoverBg;
            e.currentTarget.style.borderColor = accentColor;
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = bgColor;
            e.currentTarget.style.borderColor = borderColor;
          }
        }}
        title={isZh ? "工具" : "Tools"}
      >
        {isOpen ? <X size={16} strokeWidth={1.8} /> : <Settings size={16} strokeWidth={1.8} />}
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: "44px",
            right: 0,
            width: "260px",
            background: "var(--bg-secondary)",
            borderRadius: "5px",
            border: `1px solid var(--border-color)`,
            boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
            overflow: "hidden",
            animation: "toolMenuSlideDown 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 16px 8px",
              borderBottom: `1px solid var(--border-color)`,
              position: "relative",
            }}
          >
            <Video size={14} style={{ color: accentColor, marginRight: "6px" }} />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: accentColor,
                letterSpacing: "0.3px",
                position: "relative",
              }}
            >
              {isZh ? "导出" : "Export"}
            </span>
            <div
              style={{
                position: "absolute",
                bottom: "-1px",
                left: "16px",
                width: "52px",
                height: "2px",
                background: accentColor,
                borderRadius: "5px",
                transition: "all 0.2s ease",
              }}
            />
          </div>
          <div style={{ padding: "14px 16px 16px" }}>
            {/* GIF file path with action buttons */}
            {gifPath && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "8px 10px",
                  background: "var(--bg-tertiary)",
                  borderRadius: "5px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: textMuted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      fontFamily: "monospace",
                    }}
                    title={gifPath}
                  >
                    📁 {gifPath.split(/[\\/]/).pop()}
                  </span>
                  <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                    {/* Open in file manager button */}
                    <button
                      onClick={handleRevealInFileManager}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "3px 6px",
                        borderRadius: "4px",
                        border: `1px solid ${borderColor}`,
                        background: "transparent",
                        color: textSecondary,
                        fontSize: "10px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = hoverBg;
                        e.currentTarget.style.color = textColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = textSecondary;
                      }}
                      title={isZh ? "在文件管理器中打开" : "Open in file manager"}
                    >
                      <FolderOpen size={12} />
                    </button>
                    {/* Import asset button */}
                    <button
                      onClick={handleImportAsset}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "3px 6px",
                        borderRadius: "4px",
                        border: `1px solid ${borderColor}`,
                        background: "transparent",
                        color: textSecondary,
                        fontSize: "10px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = hoverBg;
                        e.currentTarget.style.color = textColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = textSecondary;
                      }}
                      title={isZh ? "导入素材" : "Import asset"}
                    >
                      <Upload size={12} />
                    </button>
                    {/* Delete GIF button */}
                    <button
                      onClick={handleDeleteGif}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "3px 6px",
                        borderRadius: "4px",
                        border: `1px solid ${borderColor}`,
                        background: "transparent",
                        color: textSecondary,
                        fontSize: "10px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = dangerBg;
                        e.currentTarget.style.color = dangerColor;
                        e.currentTarget.style.borderColor = dangerColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = textSecondary;
                        e.currentTarget.style.borderColor = borderColor;
                      }}
                      title={isZh ? "删除 GIF" : "Delete GIF"}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Duration */}
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "3px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 500, color: textSecondary }}>{isZh ? "时长" : "Duration"}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: textColor }}>{duration}s</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
                style={{
                  width: "100%",
                  height: "3px",
                  borderRadius: "5px",
                  background: `linear-gradient(to right, ${accentColor} ${((duration - 1) / 9) * 100}%, ${inputBg} 0%)`,
                  outline: "none",
                  appearance: "none",
                  WebkitAppearance: "none",
                  transition: "background 0.15s",
                  cursor: "pointer",
                }}
              />
              <style>{`
                input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  background: ${accentColor};
                  cursor: pointer;
                  box-shadow: 0 1px 6px rgba(99, 102, 241, 0.3);
                  transition: all 0.15s;
                  border: 2px solid var(--bg-secondary);
                }
                input[type="range"]::-webkit-slider-thumb:hover {
                  transform: scale(1.15);
                }
                input[type="range"]::-moz-range-thumb {
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  background: ${accentColor};
                  cursor: pointer;
                  border: 2px solid var(--bg-secondary);
                }
              `}</style>
            </div>
            {/* FPS */}
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "3px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 500, color: textSecondary }}>{isZh ? "帧率" : "FPS"}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: textColor }}>{fps} fps</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value))}
                style={{
                  width: "100%",
                  height: "3px",
                  borderRadius: "5px",
                  background: `linear-gradient(to right, ${accentColor} ${((fps - 5) / 25) * 100}%, ${inputBg} 0%)`,
                  outline: "none",
                  appearance: "none",
                  WebkitAppearance: "none",
                  transition: "background 0.15s",
                  cursor: "pointer",
                }}
              />
            </div>
            {/* Quality */}
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "3px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 500, color: textSecondary }}>{isZh ? "画质" : "Quality"}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: textColor }}>{quality}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                style={{
                  width: "100%",
                  height: "3px",
                  borderRadius: "5px",
                  background: `linear-gradient(to right, ${accentColor} ${((quality - 30) / 70) * 100}%, ${inputBg} 0%)`,
                  outline: "none",
                  appearance: "none",
                  WebkitAppearance: "none",
                  transition: "background 0.15s",
                  cursor: "pointer",
                }}
              />
            </div>
            {/* Export Button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                paddingTop: "10px",
                borderTop: `1px solid var(--border-color)`,
              }}
            >
              <button
                onClick={handleExport}
                disabled={isExporting || !currentSessionId || !currentTaskId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "5px",
                  border: "none",
                  background: isExporting || !currentSessionId || !currentTaskId ? textMuted : accentColor,
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: isExporting || !currentSessionId || !currentTaskId ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  flexShrink: 0,
                  opacity: isExporting || !currentSessionId || !currentTaskId ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isExporting && currentSessionId && currentTaskId) {
                    e.currentTarget.style.opacity = "0.85";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = isExporting || !currentSessionId || !currentTaskId ? "0.5" : "1";
                }}
              >
                {isExporting ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="spinner" style={{ width: "14px", height: "14px", border: "2px solid #fff", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    {isZh ? "导出中..." : "Exporting..."}
                  </span>
                ) : (
                  <>
                    <Download size={14} />
                    {isZh ? "导出 GIF" : "Export GIF"}
                  </>
                )}
              </button>
              <span style={{ fontSize: "10px", color: textMuted }}>
                ~{Math.round(((duration * fps * quality) / 100) * 0.6)}KB · {Math.round(duration * fps)}帧
              </span>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes toolMenuSlideDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
