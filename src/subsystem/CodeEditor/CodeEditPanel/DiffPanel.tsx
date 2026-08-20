import React from "react";
interface DiffPanelProps {
  /** Whether the diff panel is visible */
  isVisible: boolean;
  /** File name being diffed */
  fileName?: string;
  /** Original content (left side) */
  originalContent?: string;
  /** Modified content (right side) */
  modifiedContent?: string;
  /** Callback when Apply is clicked */
  onApply?: () => void;
  /** Callback when Discard is clicked */
  onDiscard?: () => void;
  /** Callback when panel is closed */
  onClose?: () => void;
}
/**
 * DiffPanel - Displays code differences in a single-column, line-by-line format
 * Similar to Git diff style with +/- indicators on the left
 * No horizontal scroll - text wraps automatically
 */
const DiffPanel: React.FC<DiffPanelProps> = ({ isVisible, fileName = "", originalContent = "", modifiedContent = "", onApply, onDiscard, onClose }) => {
  if (!isVisible) {
    return null;
  }
  // Empty state - no content to display
  if (!originalContent && !modifiedContent) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border-color)",
          overflow: "hidden",
          minWidth: "320px",
          maxWidth: "520px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 12px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-tertiary)",
            flexShrink: 0,
            minHeight: "36px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "var(--text-secondary)",
              minWidth: 0,
              flex: 1,
            }}
          >
            <span style={{ fontSize: "14px", flexShrink: 0 }}>📝</span>
            <span
              style={{
                fontWeight: 500,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fileName || "Diff Preview"}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              borderRadius: "4px",
              fontSize: "14px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: "13px",
            userSelect: "none",
          }}
        >
          No changes to display
        </div>
      </div>
    );
  }
  /**
   * Compute diff lines with status: added, removed, unchanged
   * Simple line-by-line comparison (not full diff algorithm)
   */
  const computeDiff = (original: string, modified: string) => {
    const originalLines = original.split("\n");
    const modifiedLines = modified.split("\n");
    const result: Array<{
      type: "added" | "removed" | "unchanged";
      content: string;
      lineNum?: number;
    }> = [];
    const maxLen = Math.max(originalLines.length, modifiedLines.length);
    for (let i = 0; i < maxLen; i++) {
      const orig = originalLines[i] ?? "";
      const mod = modifiedLines[i] ?? "";
      if (orig === mod) {
        result.push({ type: "unchanged", content: orig, lineNum: i + 1 });
      } else if (orig !== "" && mod === "") {
        result.push({ type: "removed", content: orig, lineNum: i + 1 });
      } else if (orig === "" && mod !== "") {
        result.push({ type: "added", content: mod, lineNum: i + 1 });
      } else {
        result.push({ type: "removed", content: orig, lineNum: i + 1 });
        result.push({ type: "added", content: mod, lineNum: i + 1 });
      }
    }
    return result;
  };
  const diffLines = computeDiff(originalContent, modifiedContent);
  const addedCount = diffLines.filter((l) => l.type === "added").length;
  const removedCount = diffLines.filter((l) => l.type === "removed").length;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border-color)",
        overflow: "hidden",
        minWidth: "320px",
        maxWidth: "520px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 12px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-tertiary)",
          flexShrink: 0,
          minHeight: "36px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: "var(--text-secondary)",
            minWidth: 0,
            flex: 1,
          }}
        >
          <span style={{ fontSize: "14px", flexShrink: 0 }}>📝</span>
          <span
            style={{
              fontWeight: 500,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {fileName}
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              display: "flex",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#4caf50" }}>+{addedCount}</span>
            <span style={{ color: "#ff4444" }}>-{removedCount}</span>
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onDiscard}
            style={{
              padding: "2px 12px",
              height: "24px",
              fontSize: "11px",
              background: "transparent",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            Discard
          </button>
          <button
            onClick={onApply}
            style={{
              padding: "2px 12px",
              height: "24px",
              fontSize: "11px",
              fontWeight: 500,
              background: "var(--accent-color)",
              border: "none",
              borderRadius: "4px",
              color: "#fff",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--accent-color)";
            }}
          >
            Apply ✓
          </button>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              borderRadius: "4px",
              fontSize: "14px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "4px 0",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: "12px",
          lineHeight: 1.8,
          background: "var(--bg-primary)",
          overflowX: "hidden",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      >
        {diffLines.map((line, index) => {
          const isAdded = line.type === "added";
          const isRemoved = line.type === "removed";
          const isUnchanged = line.type === "unchanged";
          const bgColor = isAdded ? "rgba(76, 175, 80, 0.12)" : isRemoved ? "rgba(255, 68, 68, 0.12)" : "transparent";
          const textColor = isAdded ? "#4caf50" : isRemoved ? "#ff4444" : "var(--text-secondary)";
          const sign = isAdded ? "+" : isRemoved ? "-" : " ";
          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                padding: "0 12px",
                background: bgColor,
                minHeight: "24px",
                borderLeft: isRemoved ? "3px solid #ff4444" : isAdded ? "3px solid #4caf50" : "3px solid transparent",
              }}
            >
              <span
                style={{
                  width: "20px",
                  textAlign: "center",
                  color: textColor,
                  fontWeight: isAdded || isRemoved ? 600 : 400,
                  flexShrink: 0,
                  userSelect: "none",
                  fontSize: "13px",
                }}
              >
                {sign}
              </span>
              <span
                style={{
                  width: "30px",
                  textAlign: "right",
                  color: "var(--text-muted)",
                  fontSize: "10px",
                  flexShrink: 0,
                  userSelect: "none",
                  paddingRight: "12px",
                  opacity: isUnchanged ? 0.4 : 0.7,
                }}
              >
                {line.lineNum || ""}
              </span>
              <span
                style={{
                  color: textColor,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  textDecoration: isRemoved ? "line-through" : "none",
                  opacity: isRemoved ? 0.7 : 1,
                  flex: 1,
                  paddingRight: "8px",
                }}
              >
                {line.content || " "}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default DiffPanel;
