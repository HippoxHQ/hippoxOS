import React, { useState, useRef, useEffect } from "react";

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  rightExtraPanel?: React.ReactNode;
  isRightExtraOpen?: boolean;
  layoutMode?: "horizontal" | "vertical";
  onLayoutModeChange?: (mode: "horizontal" | "vertical") => void;
}

const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  leftPanel,
  rightPanel,
  rightExtraPanel,
  isRightExtraOpen = false,
  layoutMode = "vertical",
  onLayoutModeChange,
}) => {
  const [leftWidth, setLeftWidth] = useState<number>(50);
  const [topHeight, setTopHeight] = useState<number>(60);
  const [rightExtraWidth, setRightExtraWidth] = useState<number>(320);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isDraggingRightExtra = useRef(false);
  const dragType = useRef<"horizontal" | "vertical">("horizontal");
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    const savedLeftWidth = localStorage.getItem("hippox-left-width");
    const savedTopHeight = localStorage.getItem("hippox-top-height");
    const savedRightExtraWidth = localStorage.getItem(
      "hippox-right-extra-width",
    );
    if (savedLeftWidth) setLeftWidth(parseFloat(savedLeftWidth));
    if (savedTopHeight) setTopHeight(parseFloat(savedTopHeight));
    if (savedRightExtraWidth)
      setRightExtraWidth(parseFloat(savedRightExtraWidth));
  }, []);

  const saveLeftWidth = (width: number) => {
    localStorage.setItem("hippox-left-width", width.toString());
  };
  const saveTopHeight = (height: number) => {
    localStorage.setItem("hippox-top-height", height.toString());
  };
  const saveRightExtraWidth = (width: number) => {
    localStorage.setItem("hippox-right-extra-width", width.toString());
  };
  const handleMouseDown = (
    e: React.MouseEvent,
    type: "horizontal" | "vertical",
  ) => {
    isDragging.current = true;
    dragType.current = type;
    document.body.style.cursor =
      type === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };
  const handleRightExtraMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRightExtra.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = rightExtraWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      if (dragType.current === "horizontal") {
        const newWidthPercent =
          ((e.clientX - containerRect.left) / containerRect.width) * 100;
        const clamped = Math.min(70, Math.max(30, newWidthPercent));
        setLeftWidth(clamped);
        saveLeftWidth(clamped);
      } else {
        const newHeightPercent =
          ((e.clientY - containerRect.top) / containerRect.height) * 100;
        const clamped = Math.min(80, Math.max(20, newHeightPercent));
        setTopHeight(clamped);
        saveTopHeight(clamped);
      }
    }
    if (isDraggingRightExtra.current) {
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(
        600,
        Math.max(250, startWidthRef.current + delta),
      );
      if (newWidth !== rightExtraWidth) {
        setRightExtraWidth(newWidth);
        saveRightExtraWidth(newWidth);
      }
    }
  };
  const handleMouseUp = () => {
    isDragging.current = false;
    isDraggingRightExtra.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);
  if (layoutMode === "vertical") {
    return (
      <div
        className="panels-container vertical-layout"
        ref={containerRef}
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <div
          className="panel-top"
          style={{
            height: `${topHeight}%`,
            overflow: "hidden",
            minHeight: "100px",
          }}
        >
          {leftPanel}
        </div>
        <div
          className="resize-handle resize-handle-horizontal"
          onMouseDown={(e) => handleMouseDown(e, "vertical")}
          style={{ height: "4px", cursor: "row-resize", flexShrink: 0 }}
        >
          <div className="handle-line"></div>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            overflow: "hidden",
            minHeight: "100px",
          }}
        >
          <div style={{ flex: 1, overflow: "hidden" }}>{rightPanel}</div>
          {rightExtraPanel && isRightExtraOpen && (
            <>
              <div
                className="resize-handle resize-handle-vertical"
                onMouseDown={handleRightExtraMouseDown}
                style={{ width: "4px", cursor: "col-resize", flexShrink: 0 }}
              >
                <div className="handle-line"></div>
              </div>
              <div
                className="panel-right-extra"
                style={{
                  width: `${rightExtraWidth}px`,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {rightExtraPanel}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  return (
    <div
      className="panels-container horizontal-layout"
      ref={containerRef}
      style={{ display: "flex", flex: 1, overflow: "hidden" }}
    >
      <div
        className="panel-left"
        style={{
          width: `${leftWidth}%`,
          overflow: "hidden",
          minWidth: "150px",
        }}
      >
        {leftPanel}
      </div>
      <div
        className="resize-handle resize-handle-vertical"
        onMouseDown={(e) => handleMouseDown(e, "horizontal")}
        style={{ width: "4px", cursor: "col-resize", flexShrink: 0 }}
      >
        <div className="handle-line"></div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          minWidth: "150px",
        }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>{rightPanel}</div>
        {rightExtraPanel && isRightExtraOpen && (
          <>
            <div
              className="resize-handle resize-handle-vertical"
              onMouseDown={handleRightExtraMouseDown}
              style={{ width: "4px", cursor: "col-resize", flexShrink: 0 }}
            >
              <div className="handle-line"></div>
            </div>
            <div
              className="panel-right-extra"
              style={{
                width: `${rightExtraWidth}px`,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {rightExtraPanel}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResizablePanels;
