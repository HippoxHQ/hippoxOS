import React from "react";
import { FileText, Plus, Minus, Check, Undo2, CheckCheck } from "lucide-react";
import type { GitFileEntry } from "./types";
interface FileListSectionProps {
  isZh: boolean;
  title: string;
  count: number;
  icon: "check" | "file";
  isStaged: boolean;
  files: GitFileEntry[];
  loading: boolean;
  selectedPaths: Set<string>;
  onSelectedAction: () => void;
  onAllAction: () => void;
  renderRow: (entry: GitFileEntry, isStaged: boolean) => React.ReactNode;
}
const FileListSection: React.FC<FileListSectionProps> = ({ isZh, title, count, icon, isStaged, files, loading, selectedPaths, onSelectedAction, onAllAction, renderRow }) => {
  const hasSelection = selectedPaths.size > 0;
  const renderIcon = () => {
    if (icon === "check") return <Check size={12} />;
    return <FileText size={12} />;
  };
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          background: "var(--bg-tertiary)",
          borderBottom: "1px solid var(--border-color)",
          flexShrink: 0,
        }}
      >
        {renderIcon()}
        {title}
        <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 400, color: "var(--text-muted)" }}>{count}</span>
        <button
          onClick={onSelectedAction}
          disabled={!hasSelection}
          title={isStaged ? (isZh ? "取消选定暂存" : "Unstage selected") : isZh ? "暂存所选" : "Stage selected"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            height: "20px",
            padding: "0 8px",
            background: hasSelection ? "var(--bg-tertiary)" : "transparent",
            border: "1px solid var(--border-color)",
            borderRadius: "3px",
            color: hasSelection ? "var(--text-primary)" : "var(--text-muted)",
            cursor: hasSelection ? "pointer" : "not-allowed",
            fontSize: "10px",
            whiteSpace: "nowrap",
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            if (hasSelection) {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.borderColor = "var(--accent-color)";
              e.currentTarget.style.color = "var(--accent-color)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = hasSelection ? "var(--bg-tertiary)" : "transparent";
            e.currentTarget.style.borderColor = "var(--border-color)";
            e.currentTarget.style.color = hasSelection ? "var(--text-primary)" : "var(--text-muted)";
          }}
        >
          {isStaged ? <Undo2 size={12} /> : <CheckCheck size={12} />}
          {isStaged ? (isZh ? "取消选定暂存" : "Unstage Selected") : isZh ? "暂存所选" : "Stage Selected"}
        </button>
        {files.length > 0 && (
          <button
            onClick={onAllAction}
            title={isStaged ? (isZh ? "取消所有暂存" : "Unstage all") : isZh ? "暂存所有" : "Stage all"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              height: "20px",
              padding: "0 8px",
              background: "transparent",
              border: "1px solid var(--border-color)",
              borderRadius: "3px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "10px",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.borderColor = "var(--accent-color)";
              e.currentTarget.style.color = "var(--accent-color)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {isStaged ? <Minus size={12} /> : <Plus size={12} />}
            {isStaged ? (isZh ? "取消所有暂存" : "Unstage All") : isZh ? "暂存所有" : "Stage All"}
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px" }}>
        {loading && files.length === 0 ? (
          <div style={{ padding: "12px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "加载中..." : "Loading..."}</div>
        ) : files.length === 0 ? (
          <div style={{ padding: "12px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>{isStaged ? (isZh ? "暂无已暂存文件" : "No staged files") : isZh ? "工作区干净" : "Working tree clean"}</div>
        ) : (
          files.map((entry) => renderRow(entry, isStaged))
        )}
      </div>
    </div>
  );
};
export default FileListSection;
