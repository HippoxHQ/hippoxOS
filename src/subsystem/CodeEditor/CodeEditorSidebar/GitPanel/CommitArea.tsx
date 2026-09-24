import React, { useMemo, useState } from "react";
import { User, GitCommit, Check, AlertCircle } from "lucide-react";
import { buildGlobalEmailAvatarUrl } from "../../common";
interface CommitAreaProps {
  isZh: boolean;
  minHeightPx: number;
  heightPx: number;
  stagedCount: number;
  profileName: string;
  profileEmail: string;
  profileAvatar: string;
  commitMessage: string;
  onCommitMessageChange: (value: string) => void;
  isCommitting: boolean;
  isPushing: boolean;
  pushAfterCommit: boolean;
  onPushAfterCommitChange: (value: boolean) => void;
  remoteShortName: string;
  branch: string;
  canPush: boolean;
  commitError: string | null;
  onCommit: () => void;
}
/**
 * Avatar with a three-stage fallback:
 *   1. Global Email Avatar (Gravatar-style, based on the user's email)
 *   2. profileAvatar (local profile image)
 *   3. Built-in User icon
 */
const AvatarWithFallback: React.FC<{ email: string; profileAvatar: string; size?: number }> = ({ email, profileAvatar, size = 18 }) => {
  // 1 = global email avatar, 2 = profile avatar, 3 = icon
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const globalUrl = useMemo(() => buildGlobalEmailAvatarUrl(email), [email]);
  // If we are on stage 1 but there is no global URL, skip straight to stage 2.
  const effectiveStage: 1 | 2 | 3 = stage === 1 && !globalUrl ? (profileAvatar ? 2 : 3) : stage;
  const handleError = () => {
    setStage((prev) => {
      if (prev === 1) return profileAvatar ? 2 : 3;
      if (prev === 2) return 3;
      return 3;
    });
  };
  if (effectiveStage === 1 && globalUrl) {
    return <img src={globalUrl} alt="" onError={handleError} style={{ width: size, height: size, borderRadius: "5px", objectFit: "cover", flexShrink: 0 }} />;
  }
  if (effectiveStage === 2 && profileAvatar) {
    return <img src={profileAvatar} alt="" onError={handleError} style={{ width: size, height: size, borderRadius: "5px", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--bg-tertiary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <User size={size - 7} />
    </span>
  );
};
/**
 * Inline keyframes for the "shimmer" progress bar. Injected once per mount
 * via a <style> tag so we don't need an external stylesheet.
 */
const ShimmerStyle: React.FC = () => (
  <style>{`
    @keyframes hippox-shimmer {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `}</style>
);
/**
 * A thin, indeterminate progress bar with a moving highlight.
 * Used while a commit or push is in flight.
 */
const ShimmerBar: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "2px",
        overflow: "hidden",
        background: "var(--bg-tertiary)",
        borderRadius: "1px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(90deg, transparent 0%, var(--accent-color) 50%, transparent 100%)",
          animation: "hippox-shimmer 1.2s ease-in-out infinite",
        }}
      />
    </div>
  );
};
const CommitArea: React.FC<CommitAreaProps> = ({
  isZh,
  minHeightPx,
  heightPx,
  stagedCount,
  profileName,
  profileEmail,
  profileAvatar,
  commitMessage,
  onCommitMessageChange,
  isCommitting,
  isPushing,
  pushAfterCommit,
  onPushAfterCommitChange,
  remoteShortName,
  branch,
  canPush,
  commitError,
  onCommit,
}) => {
  const commitDisabled = isCommitting || isPushing || stagedCount === 0 || !commitMessage.trim();
  const busy = isCommitting || isPushing;
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
        padding: "5px 10px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        overflow: "hidden",
        boxSizing: "border-box",
        paddingTop: "5px",
      }}
    >
      <ShimmerStyle />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
          color: "var(--text-secondary)",
          flexShrink: 0,
          flexGrow: 0,
          height: "30px",
        }}
      >
        <AvatarWithFallback email={profileEmail} profileAvatar={profileAvatar} size={30} />
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
        disabled={busy}
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
          opacity: busy ? 0.7 : 1,
        }}
      />
      {/* Error banner (only when the last commit/push failed) */}
      {commitError && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
            padding: "4px 8px",
            fontSize: "11px",
            color: "#ef4444",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: "4px",
            flexShrink: 0,
            maxHeight: "44px",
            overflowY: "auto",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
          title={commitError}
        >
          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: "1px" }} />
          <span style={{ flex: 1, minWidth: 0 }}>{commitError}</span>
        </div>
      )}
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
            color: canPush && !busy ? "var(--text-secondary)" : "var(--text-muted)",
            cursor: canPush && !busy ? "pointer" : "not-allowed",
            userSelect: "none",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={canPush ? (isZh ? `提交后推送到 ${remoteShortName}/${branch}` : `Push to ${remoteShortName}/${branch} after commit`) : isZh ? "未配置远程仓库" : "No remote configured"}
        >
          <input type="checkbox" checked={pushAfterCommit} disabled={!canPush || busy} onChange={(e) => onPushAfterCommitChange(e.target.checked)} style={{ cursor: canPush && !busy ? "pointer" : "not-allowed", accentColor: "var(--accent-color)", flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {isZh ? "立即推送到" : "Push to"} {remoteShortName || "-"}/{branch || "-"}
          </span>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexDirection: "row-reverse", flexShrink: 0 }}>
          <button
            onClick={onCommit}
            disabled={commitDisabled}
            style={{
              position: "relative",
              overflow: "hidden",
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
            {isCommitting ? (isZh ? "提交中..." : "Committing...") : isPushing ? (isZh ? "推送中..." : "Pushing...") : pushAfterCommit ? (isZh ? "提交并推送" : "Commit & Push") : isZh ? "提交" : "Commit"}
          </button>
        </div>
      </div>
      {/* Shimmer progress bar at the very bottom, visible while busy. */}
      <ShimmerBar visible={busy} />
    </div>
  );
};
export default CommitArea;
