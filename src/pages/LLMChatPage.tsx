import React, { useState, useRef, useEffect } from "react";

interface LLMChatPageProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  layoutMode?: "horizontal" | "vertical";
  onLayoutModeChange?: (mode: "horizontal" | "vertical") => void;
}

const LLMChatPage: React.FC<LLMChatPageProps> = ({
  leftPanel,
  rightPanel,
  layoutMode = "vertical",
  onLayoutModeChange,
}) => {
  const [leftWidth, setLeftWidth] = useState<number>(50);
  const [topHeight, setTopHeight] = useState<number>(60);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragType = useRef<"horizontal" | "vertical">("horizontal");
  useEffect(() => {
    const savedLeftWidth = localStorage.getItem("hippox-left-width");
    const savedTopHeight = localStorage.getItem("hippox-top-height");
    if (savedLeftWidth) setLeftWidth(parseFloat(savedLeftWidth));
    if (savedTopHeight) setTopHeight(parseFloat(savedTopHeight));
  }, []);
  const saveLeftWidth = (width: number) => {
    localStorage.setItem("hippox-left-width", width.toString());
  };
  const saveTopHeight = (height: number) => {
    localStorage.setItem("hippox-top-height", height.toString());
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
  };
  const handleMouseUp = () => {
    isDragging.current = false;
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
            overflow: "hidden",
            minHeight: "100px",
          }}
        >
          {rightPanel}
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
          overflow: "hidden",
          minWidth: "150px",
        }}
      >
        {rightPanel}
      </div>
    </div>
  );
};

export default LLMChatPage;
