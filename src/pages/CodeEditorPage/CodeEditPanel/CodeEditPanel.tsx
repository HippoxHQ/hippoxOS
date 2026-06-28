import React from "react";
import CodeEdit from "./CodeEdit";
import Terminal from "./Terminal";

interface CodeEditPanelProps {
  t: (key: string) => string;
  selectedFile: string | null;
  rightHeight: number;
  onRightResizeMouseDown: (e: React.MouseEvent) => void;
  isRightDragging: boolean;
  isRightHover: boolean;
  setIsRightHover: (value: boolean) => void;
  workspacePath?: string | null;
  onTabChange?: (filePath: string | null) => void;
}

const CodeEditPanel: React.FC<CodeEditPanelProps> = ({
  t,
  selectedFile,
  rightHeight,
  onRightResizeMouseDown,
  isRightDragging,
  isRightHover,
  setIsRightHover,
  workspacePath,
  onTabChange,
}) => {
  const isActive = isRightDragging || isRightHover;

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
      <style>{`
        .coding-right-resize-handle {
          position: relative;
          z-index: 1;
        }
        .coding-right-resize-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: row-resize;
          z-index: 10;
        }
        .coding-right-resize-handle:hover::after {
          cursor: row-resize;
        }
      `}</style>
      <div
        style={{
          flex: 1,
          minHeight: "50%",
          overflow: "hidden",
          position: "relative",
          minWidth: 0,
        }}
      >
        <CodeEdit
          t={t}
          selectedFile={selectedFile}
          workspacePath={workspacePath}
          onTabChange={onTabChange}
        />
      </div>

      <div
        className="coding-right-resize-handle"
        style={{
          height: isActive ? "4px" : "1px",
          background: isActive
            ? "var(--scrollbar-thumb)"
            : "var(--border-color)",
          cursor: "row-resize",
          flexShrink: 0,
          position: "relative",
        }}
        onMouseDown={onRightResizeMouseDown}
        onMouseEnter={() => setIsRightHover(true)}
        onMouseLeave={() => setIsRightHover(false)}
      >
        {isActive && (
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
              opacity: 0.5,
              zIndex: 11,
            }}
          />
        )}
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
