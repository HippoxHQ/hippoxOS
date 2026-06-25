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
  const [isLeftHover, setIsLeftHover] = useState(false);
  const [isRightHover, setIsRightHover] = useState(false);

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
  const isLeftDragging = isDraggingLeft.current;
  const isRightDragging = isDraggingRight.current;
  const isLeftActive = isLeftDragging || isLeftHover;

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
      <style>{`
        .coding-left-resize-handle {
          position: relative;
          z-index: 1;
        }
        .coding-left-resize-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
        .coding-left-resize-handle:hover::after {
          cursor: col-resize;
        }
      `}</style>
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div style={{ width: leftWidth, minWidth: 0, flexShrink: 0 }}>
          <FileTreePanel
            t={t}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
        </div>
        <div
          className="coding-left-resize-handle"
          style={{
            width: isLeftActive ? "4px" : "1px",
            background: isLeftActive
              ? "var(--scrollbar-thumb)"
              : "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
            transition: "width 0.15s, background 0.15s",
          }}
          onMouseDown={handleLeftResizeMouseDown}
          onMouseEnter={() => setIsLeftHover(true)}
          onMouseLeave={() => setIsLeftHover(false)}
        >
          {isLeftActive && (
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
                opacity: 0.5,
                zIndex: 11,
              }}
            />
          )}
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
            isRightDragging={isRightDragging}
            isRightHover={isRightHover}
            setIsRightHover={setIsRightHover}
          />
        </div>
      </div>
    </div>
  );
};

export default CodingPage;
