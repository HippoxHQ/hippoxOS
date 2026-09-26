import React, { useEffect, useRef } from "react";
import { GitBranch, GitMerge, GitPullRequest, RotateCcw, Undo2 } from "lucide-react";
interface CommitContextMenuProps {
  x: number;
  y: number;
  isZh: boolean;
  onClose: () => void;
  onCheckout: () => void;
  onMerge: () => void;
  onRebase: () => void;
  onReset: () => void;
  onRevert: () => void;
}
const CommitContextMenu: React.FC<CommitContextMenuProps> = ({ x, y, isZh, onClose, onCheckout, onMerge, onRebase, onReset, onRevert }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuWidth = 240;
  // Height is an upper bound; keeping it generous avoids clipping.
  const menuHeight = 220;
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
      <Row icon={<GitBranch size={14} />} label={isZh ? "检出" : "Checkout"} onClick={onCheckout} />
      <Row icon={<GitMerge size={14} />} label={isZh ? "合并" : "Merge"} onClick={onMerge} />
      <Row icon={<GitPullRequest size={14} />} label={isZh ? "变基" : "Rebase"} onClick={onRebase} />
      <div style={{ height: "1px", background: "var(--border-color)", margin: "4px 0" }} />
      <Row icon={<RotateCcw size={14} />} label={isZh ? "重置当前分支到此次提交" : "Reset Current Branch to Here"} onClick={onReset} danger />
      <Row icon={<Undo2 size={14} />} label={isZh ? "回滚提交" : "Revert Commit"} onClick={onRevert} danger />
    </div>
  );
};
export default CommitContextMenu;
