import React, { useEffect, useRef } from "react";
import { FolderOpen, Copy, Trash2, RotateCcw, EyeOff, GitCommit } from "lucide-react";
interface FileContextMenuProps {
  x: number;
  y: number;
  isZh: boolean;
  onClose: () => void;
  onOpenInExplorer: () => void;
  onCopyPath: () => void;
  onDelete: () => void;
  onRestoreChanges: () => void;
  onStopTracking: () => void;
  onCommit: () => void;
}
const FileContextMenu: React.FC<FileContextMenuProps> = ({ x, y, isZh, onClose, onOpenInExplorer, onCopyPath, onDelete, onRestoreChanges, onStopTracking, onCommit }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuWidth = 240;
  const menuHeight = 300;
  const padding = 8;
  let left = x;
  let top = y;
  if (left + menuWidth > window.innerWidth - padding) left = window.innerWidth - menuWidth - padding;
  if (top + menuHeight > window.innerHeight - padding) top = window.innerHeight - menuHeight - padding;
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    fontSize: "12px",
    color: "var(--text-primary)",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };
  const fire = (action?: () => void) => {
    onClose();
    action?.();
  };
  const Row: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void; danger?: boolean }> = ({ icon, label, onClick, danger }) => (
    <div
      style={{ ...rowStyle, color: danger ? "#ef4444" : "var(--text-primary)" }}
      onClick={() => fire(onClick)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "rgba(239, 68, 68, 0.1)" : "var(--hover-bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
  return (
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        width: `${menuWidth}px`,
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "6px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
        padding: "4px 0",
        zIndex: 9999,
      }}
    >
      <Row icon={<FolderOpen size={14} />} label={isZh ? "在资源管理器打开" : "Open in File Explorer"} onClick={onOpenInExplorer} />
      <Row icon={<Copy size={14} />} label={isZh ? "复制路径到剪贴板" : "Copy path to clipboard"} onClick={onCopyPath} />
      <div style={{ height: "1px", background: "var(--border-color)", margin: "4px 0" }} />
      <Row icon={<Trash2 size={14} />} label={isZh ? "移出 (删除文件)" : "Remove (Delete File)"} onClick={onDelete} danger />
      <Row icon={<RotateCcw size={14} />} label={isZh ? "恢复文件改动" : "Restore Changes"} onClick={onRestoreChanges} />
      <Row icon={<EyeOff size={14} />} label={isZh ? "停止追踪" : "Stop Tracking"} onClick={onStopTracking} />
      <div style={{ height: "1px", background: "var(--border-color)", margin: "1px 0" }} />
      <Row icon={<GitCommit size={14} />} label={isZh ? "提交" : "Commit"} onClick={onCommit} />
    </div>
  );
};
export default FileContextMenu;
