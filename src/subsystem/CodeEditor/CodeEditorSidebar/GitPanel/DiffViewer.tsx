import React from "react";
import { FileText, ExternalLink } from "lucide-react";
import type { DiffLine, GitFileEntry } from "./types";
interface DiffViewerProps {
  isZh: boolean;
  selectedFile: GitFileEntry | null;
  selectedIsStaged: boolean;
  parsedDiff: DiffLine[];
  loadingDiff: boolean;
  onFileSelect?: (path: string) => void;
}
const DiffViewer: React.FC<DiffViewerProps> = ({ isZh, selectedFile, selectedIsStaged, parsedDiff, loadingDiff, onFileSelect }) => {
  return (
    <div style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
          minHeight: "40px",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          <FileText size={13} />
          {selectedFile ? (
            <>
              <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{selectedFile.file}</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "8px",
                  background: selectedIsStaged ? "var(--accent-glow)" : "var(--bg-tertiary)",
                  color: selectedIsStaged ? "var(--accent-color)" : "var(--text-secondary)",
                  flexShrink: 0,
                }}
              >
                {selectedIsStaged ? (isZh ? "已暂存" : "Staged") : isZh ? "未暂存" : "Unstaged"}
              </span>
            </>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>{isZh ? "选择左侧文件查看差异" : "Select a file to view its diff"}</span>
          )}
        </span>
        {selectedFile && onFileSelect && (
          <button
            onClick={() => onFileSelect(selectedFile.file)}
            style={{
              padding: "2px 10px",
              height: "24px",
              fontSize: "11px",
              background: "transparent",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "4px",
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
            <ExternalLink size={12} />
            {isZh ? "在编辑器中打开" : "Open in Editor"}
          </button>
        )}
      </div>
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "4px 0",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: "12px",
          lineHeight: 1.7,
          background: "var(--bg-primary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {loadingDiff ? (
          <div style={{ padding: "20px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "加载差异中..." : "Loading diff..."}</div>
        ) : !selectedFile ? (
          <div style={{ padding: "20px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "点击左侧文件查看差异" : "Click a file on the left to view its diff"}</div>
        ) : parsedDiff.length === 0 ? (
          <div style={{ padding: "20px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "无差异内容" : "No diff content"}</div>
        ) : (
          parsedDiff.map((line, idx) => {
            const isAdd = line.type === "added";
            const isDel = line.type === "removed";
            const bg = isAdd ? "rgba(76, 175, 80, 0.12)" : isDel ? "rgba(255, 68, 68, 0.12)" : "transparent";
            const color = isAdd ? "#4caf50" : isDel ? "#ff4444" : "var(--text-secondary)";
            const isHeader = line.content.startsWith("diff --git") || line.content.startsWith("index ") || line.content.startsWith("--- ") || line.content.startsWith("+++ ") || line.content.startsWith("@@") || line.content.startsWith("new file") || line.content.startsWith("deleted file");
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  padding: "0 12px",
                  background: isHeader ? "var(--bg-tertiary)" : bg,
                  minHeight: "20px",
                  color: isHeader ? "var(--text-muted)" : color,
                  opacity: isHeader ? 0.75 : 1,
                }}
              >
                <span style={{ flex: 1 }}>{line.content || " "}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default DiffViewer;
