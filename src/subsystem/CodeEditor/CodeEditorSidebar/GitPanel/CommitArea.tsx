import React from "react";
import { User, GitCommit, Check } from "lucide-react";
interface CommitAreaProps {
  isZh: boolean;
  minHeightPx: number;
  /** Exact height in pixels. Parent computes this from the top split
   *  ratio and clamps it to at least `minHeightPx`. */
  heightPx: number;
  stagedCount: number;
  profileName: string;
  profileEmail: string;
  profileAvatar: string;
  commitMessage: string;
  onCommitMessageChange: (value: string) => void;
  isCommitting: boolean;
  pushAfterCommit: boolean;
  onPushAfterCommitChange: (value: boolean) => void;
  remoteShortName: string;
  branch: string;
  canPush: boolean;
  onCommit: () => void;
}
const CommitArea: React.FC<CommitAreaProps> = ({ isZh, minHeightPx, heightPx, stagedCount, profileName, profileEmail, profileAvatar, commitMessage, onCommitMessageChange, isCommitting, pushAfterCommit, onPushAfterCommitChange, remoteShortName, branch, canPush, onCommit }) => {
  const commitDisabled = isCommitting || stagedCount === 0 || !commitMessage.trim();
  return (
    <div
      style={{
        // Use a fixed pixel height so this area never fights with its
        // own minHeight and can never overflow its content.
        flex: "0 0 auto",
        height: `${heightPx}px`,
        minHeight: `${minHeightPx}px`,
        borderTop: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Row 1: user info (fixed height, never shrinks) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "11px",
          color: "var(--text-secondary)",
          flexShrink: 0,
          flexGrow: 0,
          height: "18px",
        }}
      >
        {profileAvatar ? (
          <img src={profileAvatar} alt="" style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={11} />
          </span>
        )}
        <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{profileName || (isZh ? "未知用户" : "Unknown user")}</span>
        <span style={{ color: "var(--text-muted)" }}>{profileEmail ? `<${profileEmail}>` : ""}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>
          <GitCommit size={12} />
          {isZh ? "提交信息" : "Commit Message"}
          <span style={{ fontSize: "10px", fontWeight: 400, color: "var(--text-muted)" }}>
            {stagedCount} {isZh ? "个已暂存文件" : "staged file(s)"}
          </span>
        </span>
      </div>
      {/* Row 2: textarea (flexes to fill the remaining space) */}
      <textarea
        className="git-commit-textarea"
        value={commitMessage}
        onChange={(e) => onCommitMessageChange(e.target.value)}
        placeholder={isZh ? "输入提交信息..." : "Enter commit message..."}
        style={{
          // Allow the textarea to shrink so it never eats the button row
          flex: "1 1 auto",
          minHeight: "32px",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "4px",
          color: "var(--text-primary)",
          fontSize: "12px",
          padding: "6px 8px",
          outline: "none",
          resize: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />
      {/* Row 3: button row (fixed height, never shrinks) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          // The button row keeps its own height and is never compressed
          // or pushed out by the textarea.
          flexShrink: 0,
          flexGrow: 0,
          height: "28px",
          minHeight: "28px",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            color: canPush ? "var(--text-secondary)" : "var(--text-muted)",
            cursor: canPush ? "pointer" : "not-allowed",
            userSelect: "none",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={canPush ? (isZh ? `提交后推送到 ${remoteShortName}/${branch}` : `Push to ${remoteShortName}/${branch} after commit`) : isZh ? "未配置远程仓库" : "No remote configured"}
        >
          <input type="checkbox" checked={pushAfterCommit} disabled={!canPush} onChange={(e) => onPushAfterCommitChange(e.target.checked)} style={{ cursor: canPush ? "pointer" : "not-allowed", accentColor: "var(--accent-color)", flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {isZh ? "立即推送到" : "Push to"} {remoteShortName || "-"}/{branch || "-"}
          </span>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexDirection: "row-reverse", flexShrink: 0 }}>
          <button
            onClick={onCommit}
            disabled={commitDisabled}
            style={{
              padding: "4px 20px",
              height: "28px",
              minWidth: "100px",
              fontSize: "12px",
              fontWeight: 500,
              background: commitDisabled ? "var(--bg-tertiary)" : "var(--accent-color)",
              border: "none",
              borderRadius: "4px",
              color: commitDisabled ? "var(--text-muted)" : "#fff",
              cursor: commitDisabled ? "not-allowed" : "pointer",
              opacity: commitDisabled ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!commitDisabled) e.currentTarget.style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              if (!commitDisabled) e.currentTarget.style.background = "var(--accent-color)";
            }}
          >
            <Check size={13} />
            {isCommitting ? (isZh ? "提交中..." : "Committing...") : pushAfterCommit ? (isZh ? "提交并推送" : "Commit & Push") : isZh ? "提交" : "Commit"}
          </button>
        </div>
      </div>
    </div>
  );
};
export default CommitArea;
