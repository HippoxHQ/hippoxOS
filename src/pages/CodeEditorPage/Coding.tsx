import React, { useState, useRef, useEffect } from "react";
import CodeEditPanel from "./CodeEditPanel/CodeEditPanel";
import FileTreePanel from "./FileTreePanel";

interface CodingPageProps {
  t: (key: string) => string;
  onClose?: () => void;
}

const CodingPage: React.FC<CodingPageProps> = ({ t, onClose }) => {
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightHeight, setRightHeight] = useState(200);
  const [selectedFile, setSelectedFile] = useState<string | null>(
    "/src/App.tsx",
  );
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
  };

  const handleLeftResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingLeft.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = leftWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft.current) {
        const delta = e.clientX - dragStartX.current;
        const newWidth = Math.min(
          500,
          Math.max(120, dragStartWidth.current + delta),
        );
        setLeftWidth(newWidth);
      }
      if (isDraggingRight.current) {
        const containerHeight = containerRef.current?.clientHeight || 600;
        const delta = -(e.clientY - dragStartY.current);
        const newHeight = Math.min(
          containerHeight * 0.8,
          Math.max(80, dragStartHeight.current + delta),
        );
        setRightHeight(newHeight);
      }
    };

    const onMouseUp = () => {
      if (isDraggingLeft.current) {
        isDraggingLeft.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      if (isDraggingRight.current) {
        isDraggingRight.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [leftWidth]);

  const handleRightResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRight.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = rightHeight;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 12px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
          minHeight: "36px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
            }}
          >
            📝 {t("menu.codeEditor") || "Code Editor"}
          </span>
          {selectedFile && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                background: "var(--bg-tertiary)",
                padding: "2px 8px",
                borderRadius: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "200px",
              }}
              title={selectedFile}
            >
              {selectedFile.split("/").pop()}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            padding: "2px 6px",
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "16px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
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

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ width: leftWidth, minWidth: 0, flexShrink: 0 }}>
          <FileTreePanel
            t={t}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
        </div>

        <div
          style={{
            width: "4px",
            background: "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
          }}
          onMouseDown={handleLeftResizeMouseDown}
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
              width: "2px",
              height: "40px",
              background: "var(--text-muted)",
              borderRadius: "2px",
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <CodeEditPanel
            t={t}
            selectedFile={selectedFile}
            rightHeight={rightHeight}
            onRightResizeMouseDown={handleRightResizeMouseDown}
          />
        </div>
      </div>
    </div>
  );
};

export default CodingPage;
