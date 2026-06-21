import React, { useState, useRef, useEffect } from "react";
interface LLMChatPageProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  layoutMode?: "horizontal" | "vertical";
  onLayoutModeChange?: (mode: "horizontal" | "vertical") => void;
  leftTitle?: string;
  rightTitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
const LLMChatPage: React.FC<LLMChatPageProps> = ({
  leftPanel,
  rightPanel,
  layoutMode = "vertical",
  onLayoutModeChange,
  leftTitle = "Chat",
  rightTitle = "Terminal",
  leftIcon = "💬",
  rightIcon = "🖥️",
}) => {
  const [leftWidth, setLeftWidth] = useState<number>(50);
  const [topHeight, setTopHeight] = useState<number>(60);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragType = useRef<"horizontal" | "vertical">("horizontal");
  useEffect(() => {
    const savedLeftWidth = localStorage.getItem("hippox-left-width");
    const savedTopHeight = localStorage.getItem("hippox-top-height");
    const savedLeftCollapsed = localStorage.getItem("hippox-left-collapsed");
    const savedRightCollapsed = localStorage.getItem("hippox-right-collapsed");
    if (savedLeftWidth) setLeftWidth(parseFloat(savedLeftWidth));
    if (savedTopHeight) setTopHeight(parseFloat(savedTopHeight));
    if (savedLeftCollapsed) setLeftCollapsed(savedLeftCollapsed === "true");
    if (savedRightCollapsed) setRightCollapsed(savedRightCollapsed === "true");
  }, []);
  const saveLeftWidth = (width: number) => {
    localStorage.setItem("hippox-left-width", width.toString());
  };
  const saveTopHeight = (height: number) => {
    localStorage.setItem("hippox-top-height", height.toString());
  };
  const saveLeftCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-left-collapsed", collapsed.toString());
  };
  const saveRightCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-right-collapsed", collapsed.toString());
  };
  const handleToggleLeft = () => {
    if (leftCollapsed) {
      setLeftCollapsed(false);
      saveLeftCollapsed(false);
      return;
    }
    if (rightCollapsed) {
      setRightCollapsed(false);
      saveRightCollapsed(false);
    }
    setLeftCollapsed(true);
    saveLeftCollapsed(true);
  };
  const handleToggleRight = () => {
    if (rightCollapsed) {
      setRightCollapsed(false);
      saveRightCollapsed(false);
      return;
    }
    if (leftCollapsed) {
      setLeftCollapsed(false);
      saveLeftCollapsed(false);
    }
    setRightCollapsed(true);
    saveRightCollapsed(true);
  };
  const handleMouseDown = (
    e: React.MouseEvent,
    type: "horizontal" | "vertical",
  ) => {
    if (leftCollapsed || rightCollapsed) return;
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
  const renderCollapsedSidebar = (
    isLeft: boolean,
    title: string,
    icon: React.ReactNode,
    onToggle: () => void,
    children?: React.ReactNode,
  ) => {
    const isCollapsed = isLeft ? leftCollapsed : rightCollapsed;
    if (!isCollapsed) return null;
    return (
      <div
        className="collapsed-sidebar"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "48px",
          minWidth: "48px",
          background: "var(--bg-secondary)",
          borderRight: isLeft ? "1px solid var(--border-color)" : "none",
          borderLeft: !isLeft ? "1px solid var(--border-color)" : "none",
          padding: "8px 0",
          gap: "12px",
          overflow: "hidden",
          flexShrink: 0,
          height: "100%",
        }}
      >
        <button
          className="collapse-toggle-btn"
          onClick={onToggle}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "18px",
            padding: "6px",
            borderRadius: "6px",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title={`Expand ${title}`}
        >
          {isLeft ? "▶" : "◀"}
        </button>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            fontSize: "10px",
            color: "var(--text-tertiary)",
          }}
        >
          <span style={{ fontSize: "16px" }}>{icon}</span>
          <span
            style={{
              writingMode: "vertical-rl",
              letterSpacing: "2px",
              fontSize: "10px",
              opacity: 0.6,
            }}
          >
            {title}
          </span>
        </div>
        <div
          style={{
            flex: 1,
            width: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            paddingTop: "8px",
          }}
        >
          {children}
        </div>
      </div>
    );
  };
  const getLeftPanelContent = () => {
    if (leftCollapsed) {
      return renderCollapsedSidebar(
        true,
        leftTitle,
        leftIcon,
        handleToggleLeft,
        (leftPanel as any)?.props?.navigationContent || null,
      );
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          flex: 1,
        }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>{leftPanel}</div>
      </div>
    );
  };
  const getRightPanelContent = () => {
    if (rightCollapsed) {
      const sidebar = renderCollapsedSidebar(
        false,
        rightTitle,
        rightIcon,
        handleToggleRight,
        (rightPanel as any)?.props?.navigationContent || null,
      );
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            height: "100%",
            width: "100%",
            overflow: "hidden",
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          {sidebar}
        </div>
      );
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          flex: 1,
        }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>{rightPanel}</div>
      </div>
    );
  };
  const contextValue = {
    leftCollapsed,
    rightCollapsed,
    toggleLeft: handleToggleLeft,
    toggleRight: handleToggleRight,
  };
  if (layoutMode === "vertical") {
    const topPanel = getLeftPanelContent();
    const bottomPanel = getRightPanelContent();
    return (
      <LLMChatPageProvider value={contextValue}>
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
              height: leftCollapsed ? "auto" : `${topHeight}%`,
              overflow: "hidden",
              minHeight: leftCollapsed ? "auto" : "100px",
              display: "flex",
              flexDirection: "row",
            }}
          >
            {topPanel}
          </div>
          {!leftCollapsed && !rightCollapsed && (
            <div
              className="resize-handle resize-handle-horizontal"
              onMouseDown={(e) => handleMouseDown(e, "vertical")}
              style={{ height: "4px", cursor: "row-resize", flexShrink: 0 }}
            >
              <div className="handle-line"></div>
            </div>
          )}
          <div
            style={{
              flex: leftCollapsed || rightCollapsed ? 1 : undefined,
              height:
                leftCollapsed || rightCollapsed
                  ? "100%"
                  : `${100 - topHeight}%`,
              overflow: "hidden",
              minHeight: rightCollapsed ? "auto" : "100px",
              display: "flex",
              flexDirection: "row",
            }}
          >
            {bottomPanel}
          </div>
        </div>
      </LLMChatPageProvider>
    );
  }
  const leftPanelContent = getLeftPanelContent();
  const rightPanelContent = getRightPanelContent();
  return (
    <LLMChatPageProvider value={contextValue}>
      <div
        className="panels-container horizontal-layout"
        ref={containerRef}
        style={{ display: "flex", flex: 1, overflow: "hidden" }}
      >
        <div
          className="panel-left"
          style={{
            flex: leftCollapsed ? "0 0 48px" : rightCollapsed ? 1 : "0 0 auto",
            width: leftCollapsed
              ? "48px"
              : rightCollapsed
                ? "auto"
                : `${leftWidth}%`,
            overflow: "hidden",
            minWidth: leftCollapsed ? "48px" : "150px",
            display: "flex",
            flexDirection: "row",
          }}
        >
          {leftPanelContent}
        </div>
        {!leftCollapsed && !rightCollapsed && (
          <div
            className="resize-handle resize-handle-vertical"
            onMouseDown={(e) => handleMouseDown(e, "horizontal")}
            style={{ width: "4px", cursor: "col-resize", flexShrink: 0 }}
          >
            <div className="handle-line"></div>
          </div>
        )}
        <div
          style={{
            flex: rightCollapsed ? "0 0 48px" : leftCollapsed ? 1 : 1,
            width: rightCollapsed ? "48px" : "auto",
            overflow: "hidden",
            minWidth: rightCollapsed ? "48px" : "150px",
            display: "flex",
            flexDirection: "row",
            justifyContent: rightCollapsed ? "flex-end" : "flex-start",
            marginLeft: rightCollapsed ? "auto" : 0,
          }}
        >
          {rightPanelContent}
        </div>
      </div>
    </LLMChatPageProvider>
  );
};
const LLMChatPageContext = React.createContext<{
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
} | null>(null);
export const useLLMChatPage = () => {
  const ctx = React.useContext(LLMChatPageContext);
  if (!ctx) {
    throw new Error("useLLMChatPage must be used within LLMChatPage");
  }
  return ctx;
};
const LLMChatPageProvider = LLMChatPageContext.Provider;
export default LLMChatPage;
