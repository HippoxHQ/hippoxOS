import React from "react";
import { Plus, Minus } from "lucide-react";
import type { GitFileEntry } from "./types";
import { getFileIconComponent, getStatusColor, getStatusLabel } from "../../fileUtils";
interface FileRowProps {
  entry: GitFileEntry;
  isStaged: boolean;
  isZh: boolean;
  isPreviewSelected: boolean;
  isMultiSelected: boolean;
  onRowClick: (e: React.MouseEvent) => void;
  onRowContextMenu: (e: React.MouseEvent) => void;
  onToggleStage: (e: React.MouseEvent) => void;
}
const FileRow: React.FC<FileRowProps> = ({ entry, isStaged, isZh, isPreviewSelected, isMultiSelected, onRowClick, onRowContextMenu, onToggleStage }) => {
  const isRowHighlighted = isMultiSelected || isPreviewSelected;
  return (
    <div
      onClick={onRowClick}
      onContextMenu={onRowContextMenu}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 6px",
        borderRadius: "3px",
        fontSize: "12px",
        cursor: "pointer",
        background: isRowHighlighted ? "var(--accent-glow)" : "transparent",
        color: isRowHighlighted ? "var(--accent-color)" : "var(--text-primary)",
        borderLeft: isRowHighlighted ? "2px solid var(--accent-color)" : "2px solid transparent",
        marginBottom: "1px",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!isRowHighlighted) e.currentTarget.style.background = "var(--hover-bg)";
      }}
      onMouseLeave={(e) => {
        if (!isRowHighlighted) e.currentTarget.style.background = "transparent";
      }}
      title={entry.file}
    >
      <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{getFileIconComponent(entry.file, 14)}</span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "11px" }}>{entry.file}</span>
      <span style={{ fontSize: "9px", flexShrink: 0, color: getStatusColor(entry.status) }}>{getStatusLabel(entry.statusDesc)}</span>
      <button
        onClick={onToggleStage}
        title={isStaged ? (isZh ? "取消暂存" : "Unstage") : isZh ? "暂存" : "Stage"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "18px",
          height: "18px",
          background: "transparent",
          border: "1px solid var(--border-color)",
          borderRadius: "3px",
          color: "var(--text-secondary)",
          cursor: "pointer",
          flexShrink: 0,
          padding: 0,
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
        {isStaged ? <Minus size={11} /> : <Plus size={11} />}
      </button>
    </div>
  );
};
export default FileRow;
