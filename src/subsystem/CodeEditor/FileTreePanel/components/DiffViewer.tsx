import React, { useState, useEffect } from "react";
interface DiffViewerProps {
  diff: string;
  fileName: string;
  additions?: number;
  deletions?: number;
  type: "diff" | "new_file" | "no_diff";
  content?: string;
  onClose: () => void;
}
export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, fileName, additions, deletions, type, content, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  if (type === "no_diff") {
    return (
      <div
        style={{
          padding: "12px",
          fontSize: "12px",
          color: "var(--text-muted)",
          textAlign: "center",
          background: "var(--bg-tertiary)",
          borderRadius: "4px",
          margin: "4px 0",
        }}
      >
        该文件无变更
      </div>
    );
  }
  const renderDiffLines = () => {
    if (type === "new_file" && content) {
      return (
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              padding: "4px 8px",
              background: "var(--bg-tertiary)",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ color: "#4caf50" }}>+ 新文件</span>
            <span>{fileName}</span>
          </div>
          <div
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: "400px",
              overflow: "auto",
              background: "var(--bg-primary)",
            }}
          >
            {content.split("\n").map((line, idx) => (
              <div key={idx} style={{ display: "flex" }}>
                <span
                  style={{
                    color: "var(--text-muted)",
                    width: "30px",
                    textAlign: "right",
                    paddingRight: "12px",
                    userSelect: "none",
                    fontSize: "11px",
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ flex: 1 }}>{line}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (diff) {
      const lines = diff.split("\n");
      const chunks: {
        type: "header" | "context" | "add" | "del";
        content: string;
      }[] = [];
      let currentChunk: {
        type: "header" | "context" | "add" | "del";
        content: string;
      } | null = null;
      for (const line of lines) {
        if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = null;
          }
          chunks.push({ type: "header", content: line });
          continue;
        }
        if (line.startsWith("@@")) {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = null;
          }
          chunks.push({ type: "header", content: line });
          continue;
        }
        if (line.startsWith("+") && !line.startsWith("+++")) {
          if (!currentChunk || currentChunk.type !== "add") {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = { type: "add", content: line };
          } else {
            currentChunk.content += "\n" + line;
          }
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          if (!currentChunk || currentChunk.type !== "del") {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = { type: "del", content: line };
          } else {
            currentChunk.content += "\n" + line;
          }
        } else {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = null;
          }
          chunks.push({ type: "context", content: line });
        }
      }
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      return (
        <div>
          {/* 统计信息 */}
          <div
            style={{
              fontSize: "11px",
              padding: "4px 8px",
              background: "var(--bg-tertiary)",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{fileName}</span>
            {additions !== undefined && additions > 0 && <span style={{ color: "#4caf50" }}>+{additions}</span>}
            {deletions !== undefined && deletions > 0 && <span style={{ color: "#ff4444" }}>-{deletions}</span>}
          </div>
          <div
            style={{
              padding: "4px 0",
              fontSize: "12px",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              maxHeight: "400px",
              overflow: "auto",
              background: "var(--bg-primary)",
            }}
          >
            {chunks.map((chunk, idx) => {
              const getBgColor = () => {
                if (chunk.type === "add") return "rgba(76, 175, 80, 0.15)";
                if (chunk.type === "del") return "rgba(255, 68, 68, 0.15)";
                if (chunk.type === "header") return "transparent";
                return "transparent";
              };
              const getTextColor = () => {
                if (chunk.type === "add") return "#4caf50";
                if (chunk.type === "del") return "#ff4444";
                if (chunk.type === "header") return "var(--text-muted)";
                return "var(--text-secondary)";
              };
              const getPrefix = () => {
                if (chunk.type === "add") return "+";
                if (chunk.type === "del") return "-";
                return " ";
              };
              if (chunk.type === "header") {
                return (
                  <div
                    key={idx}
                    style={{
                      color: "var(--text-muted)",
                      padding: "0 8px",
                      fontSize: "11px",
                      background: "var(--bg-tertiary)",
                      opacity: 0.7,
                    }}
                  >
                    {chunk.content}
                  </div>
                );
              }
              return (
                <div
                  key={idx}
                  style={{
                    background: getBgColor(),
                    color: getTextColor(),
                    padding: "1px 8px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  <span
                    style={{
                      userSelect: "none",
                      opacity: 0.5,
                      marginRight: "4px",
                    }}
                  >
                    {getPrefix()}
                  </span>
                  {chunk.content}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <div
        style={{
          padding: "12px",
          fontSize: "12px",
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        无差异内容
      </div>
    );
  };
  return (
    <div
      style={{
        border: "1px solid var(--border-color)",
        borderRadius: "4px",
        overflow: "hidden",
        margin: "4px 0",
        background: "var(--bg-secondary)",
      }}
    >
      {renderDiffLines()}
    </div>
  );
};
