import React from "react";
import CodeEdit from "./CodeEdit";
import Terminal from "./Terminal";

interface CodeEditPanelProps {
  t: (key: string) => string;
  selectedFile: string | null;
  rightHeight: number;
  onRightResizeMouseDown: (e: React.MouseEvent) => void;
}

const CodeEditPanel: React.FC<CodeEditPanelProps> = ({
  t,
  selectedFile,
  rightHeight,
  onRightResizeMouseDown,
}) => {
  const totalHeight = 400;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
        width: "100%",
        minWidth: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: "50%",
          overflow: "hidden",
          position: "relative",
          minWidth: 0,
        }}
      >
        <CodeEdit t={t} selectedFile={selectedFile} />
      </div>

      <div
        style={{
          height: "4px",
          background: "var(--border-color)",
          cursor: "row-resize",
          flexShrink: 0,
          position: "relative",
        }}
        onMouseDown={onRightResizeMouseDown}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--scrollbar-thumb)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--border-color)";
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "40px",
            height: "2px",
            background: "var(--text-muted)",
            borderRadius: "2px",
          }}
        />
      </div>

      <div
        style={{
          height: Math.max(80, rightHeight),
          minHeight: 0,
          overflow: "hidden",
          flexShrink: 0,
          minWidth: 0,
        }}
      >
        <Terminal t={t} />
      </div>
    </div>
  );
};

export default CodeEditPanel;
