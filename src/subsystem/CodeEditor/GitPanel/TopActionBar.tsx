import React from "react";
import { RefreshCw, GitCommit, GitBranch, ArrowUp, ArrowDown, History, Tag } from "lucide-react";
export type PanelTab = "commit" | "history";
interface TopActionBarProps {
  isZh: boolean;
  branch: string;
  hasRemote: boolean;
  totalChangedCount: number;
  aheadCount: number;
  isPulling: boolean;
  isPushing: boolean;
  activeTab: PanelTab;
  onCommitClick: () => void;
  onHistoryClick: () => void;
  onPull: () => void;
  onPushClick: () => void;
  onRefresh: () => void;
  onOpenBranchDialog: () => void;
  onOpenTagDialog: () => void;
}
const TopActionBar: React.FC<TopActionBarProps> = ({ isZh, branch, hasRemote, totalChangedCount, aheadCount, isPulling, isPushing, activeTab, onCommitClick, onHistoryClick, onPull, onPushClick, onRefresh, onOpenBranchDialog, onOpenTagDialog }) => {
  const tileStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    width: "60px",
    height: "50px",
    background: "transparent",
    // Use separate border properties so we never mix shorthand and
    // non-shorthand `border` / `borderColor` styles on the same element.
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
    borderRadius: "4px",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "10px",
    boxSizing: "border-box",
    position: "relative",
  };
  /**
   * Hover-in style. `active` decides the border color so an active tab
   * keeps its accent border while hovered.
   */
  const hoverOn = (e: React.MouseEvent<HTMLButtonElement>, active: boolean) => {
    e.currentTarget.style.background = active ? "var(--accent-glow)" : "var(--hover-bg)";
    e.currentTarget.style.color = active ? "var(--accent-color)" : "var(--text-primary)";
    e.currentTarget.style.borderColor = "var(--accent-color)";
  };
  /**
   * Hover-out style. `active` decides the border color so an active tab
   * returns to its accent border instead of the plain default border.
   */
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>, disabled: boolean, active: boolean) => {
    e.currentTarget.style.background = active ? "var(--accent-glow)" : "transparent";
    e.currentTarget.style.color = active ? "var(--accent-color)" : disabled ? "var(--text-muted)" : "var(--text-secondary)";
    e.currentTarget.style.borderColor = active ? "var(--accent-color)" : "var(--border-color)";
  };
  /** Highlight style for the currently active top-level tab. */
  const tabActiveStyle: React.CSSProperties = {
    background: "var(--accent-glow)",
    color: "var(--accent-color)",
    borderColor: "var(--accent-color)",
  };
  const pullDisabled = isPulling || !hasRemote || !branch;
  const pushDisabled = isPushing || !hasRemote || !branch;
  const badgeStyle: React.CSSProperties = {
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
    pointerEvents: "none",
  };
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
      {/* Left group: Commit / History / Pull / Push */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button onClick={onCommitClick} title={isZh ? "提交" : "Commit"} style={{ ...tileStyle, ...(activeTab === "commit" ? tabActiveStyle : {}) }} onMouseEnter={(e) => hoverOn(e, activeTab === "commit")} onMouseLeave={(e) => hoverOff(e, false, activeTab === "commit")}>
          <GitCommit size={18} />
          <span>{isZh ? "提交" : "Commit"}</span>
          {totalChangedCount > 0 && <span style={badgeStyle}>{totalChangedCount > 99 ? "99+" : totalChangedCount}</span>}
        </button>
        <button onClick={onHistoryClick} title={isZh ? "历史" : "History"} style={{ ...tileStyle, ...(activeTab === "history" ? tabActiveStyle : {}) }} onMouseEnter={(e) => hoverOn(e, activeTab === "history")} onMouseLeave={(e) => hoverOff(e, false, activeTab === "history")}>
          <History size={18} />
          <span>{isZh ? "历史" : "History"}</span>
        </button>
        <button
          onClick={onPull}
          disabled={pullDisabled}
          title={isZh ? "拉取" : "Pull"}
          style={{ ...tileStyle, color: pullDisabled ? "var(--text-muted)" : "var(--text-secondary)", cursor: pullDisabled ? "not-allowed" : "pointer", opacity: pullDisabled ? 0.5 : 1 }}
          onMouseEnter={(e) => {
            if (!pullDisabled) hoverOn(e, false);
          }}
          onMouseLeave={(e) => hoverOff(e, pullDisabled, false)}
        >
          <ArrowDown size={18} />
          <span>{isPulling ? (isZh ? "拉取中" : "Pulling") : isZh ? "拉取" : "Pull"}</span>
        </button>
        <button
          onClick={onPushClick}
          disabled={pushDisabled}
          title={isZh ? "推送到远程" : "Push to remote"}
          style={{ ...tileStyle, color: pushDisabled ? "var(--text-muted)" : "var(--text-secondary)", cursor: pushDisabled ? "not-allowed" : "pointer", opacity: pushDisabled ? 0.5 : 1 }}
          onMouseEnter={(e) => {
            if (!pushDisabled) hoverOn(e, false);
          }}
          onMouseLeave={(e) => hoverOff(e, pushDisabled, false)}
        >
          <ArrowUp size={18} />
          <span>{isPushing ? (isZh ? "推送中" : "Pushing") : isZh ? "推送" : "Push"}</span>
          {aheadCount > 0 && <span style={badgeStyle}>{aheadCount > 99 ? "99+" : aheadCount}</span>}
        </button>
      </div>
      {/* Right group: Refresh + Branch + Tag */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button onClick={onRefresh} title={isZh ? "刷新" : "Refresh"} style={tileStyle} onMouseEnter={(e) => hoverOn(e, false)} onMouseLeave={(e) => hoverOff(e, false, false)}>
          <RefreshCw size={18} />
          <span>{isZh ? "刷新" : "Refresh"}</span>
        </button>
        <button onClick={onOpenBranchDialog} title={branch || (isZh ? "分支" : "Branch")} style={tileStyle} onMouseEnter={(e) => hoverOn(e, false)} onMouseLeave={(e) => hoverOff(e, false, false)}>
          <GitBranch size={18} />
          <span>{isZh ? "分支" : "Branch"}</span>
        </button>
        <button onClick={onOpenTagDialog} title={isZh ? "标签" : "Tag"} style={tileStyle} onMouseEnter={(e) => hoverOn(e, false)} onMouseLeave={(e) => hoverOff(e, false, false)}>
          <Tag size={18} />
          <span>{isZh ? "标签" : "Tag"}</span>
        </button>
      </div>
    </div>
  );
};
export default TopActionBar;
