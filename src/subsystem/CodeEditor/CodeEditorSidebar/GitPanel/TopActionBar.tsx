import React from "react";
import { RefreshCw, GitCommit, GitBranch, ArrowUp, ArrowDown } from "lucide-react";
interface TopActionBarProps {
  isZh: boolean;
  branch: string;
  hasRemote: boolean;
  totalChangedCount: number;
  isPulling: boolean;
  isPushing: boolean;
  onCommitClick: () => void;
  onPull: () => void;
  onPush: () => void;
  onRefresh: () => void;
  /** Single entry point for all branch operations.
   *  The parent opens the branch management dialog here. */
  onOpenBranchDialog: () => void;
}
const TopActionBar: React.FC<TopActionBarProps> = ({ isZh, branch, hasRemote, totalChangedCount, isPulling, isPushing, onCommitClick, onPull, onPush, onRefresh, onOpenBranchDialog }) => {
  const tileStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    width: "60px",
    height: "50px",
    background: "transparent",
    border: "1px solid var(--border-color)",
    borderRadius: "4px",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "10px",
    boxSizing: "border-box",
  };
  const hoverOn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "var(--hover-bg)";
    e.currentTarget.style.color = "var(--text-primary)";
    e.currentTarget.style.borderColor = "var(--accent-color)";
  };
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>, disabled: boolean) => {
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.color = disabled ? "var(--text-muted)" : "var(--text-secondary)";
    e.currentTarget.style.borderColor = "var(--border-color)";
  };
  const pullDisabled = isPulling || !hasRemote || !branch;
  const pushDisabled = isPushing || !hasRemote || !branch;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        padding: "6px 12px",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
        flexShrink: 0,
        minHeight: "64px",
      }}
    >
      {/* Left group: Commit / Pull / Push */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button onClick={onCommitClick} title={isZh ? "提交" : "Commit"} style={{ ...tileStyle, position: "relative" }} onMouseEnter={hoverOn} onMouseLeave={(e) => hoverOff(e, false)}>
          <GitCommit size={18} />
          <span>{isZh ? "提交" : "Commit"}</span>
          {totalChangedCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                minWidth: "18px",
                height: "16px",
                padding: "0 5px",
                background: "var(--accent-color)",
                color: "#fff",
                borderRadius: "8px",
                fontSize: "10px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
            >
              {totalChangedCount > 99 ? "99+" : totalChangedCount}
            </span>
          )}
        </button>
        <button
          onClick={onPull}
          disabled={pullDisabled}
          title={isZh ? "拉取" : "Pull"}
          style={{ ...tileStyle, color: pullDisabled ? "var(--text-muted)" : "var(--text-secondary)", cursor: pullDisabled ? "not-allowed" : "pointer", opacity: pullDisabled ? 0.5 : 1 }}
          onMouseEnter={(e) => {
            if (!pullDisabled) hoverOn(e);
          }}
          onMouseLeave={(e) => hoverOff(e, pullDisabled)}
        >
          <ArrowDown size={18} />
          <span>{isPulling ? (isZh ? "拉取中" : "Pulling") : isZh ? "拉取" : "Pull"}</span>
        </button>
        <button
          onClick={onPush}
          disabled={pushDisabled}
          title={isZh ? "推送" : "Push"}
          style={{ ...tileStyle, color: pushDisabled ? "var(--text-muted)" : "var(--text-secondary)", cursor: pushDisabled ? "not-allowed" : "pointer", opacity: pushDisabled ? 0.5 : 1 }}
          onMouseEnter={(e) => {
            if (!pushDisabled) hoverOn(e);
          }}
          onMouseLeave={(e) => hoverOff(e, pushDisabled)}
        >
          <ArrowUp size={18} />
          <span>{isPushing ? (isZh ? "推送中" : "Pushing") : isZh ? "推送" : "Push"}</span>
        </button>
      </div>
      {/* Right group: Refresh + single Branch button.
          The Branch button keeps the exact same size as the others
          and only shows the label (no branch name). */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button onClick={onRefresh} title={isZh ? "刷新" : "Refresh"} style={tileStyle} onMouseEnter={hoverOn} onMouseLeave={(e) => hoverOff(e, false)}>
          <RefreshCw size={18} />
          <span>{isZh ? "刷新" : "Refresh"}</span>
        </button>
        <button onClick={onOpenBranchDialog} title={branch || (isZh ? "分支" : "Branch")} style={tileStyle} onMouseEnter={hoverOn} onMouseLeave={(e) => hoverOff(e, false)}>
          <GitBranch size={18} />
          <span>{isZh ? "分支" : "Branch"}</span>
        </button>
      </div>
    </div>
  );
};
export default TopActionBar;
