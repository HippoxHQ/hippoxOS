import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import OfficeConversationOverview from "./components/OfficeConversationOverview";
import OfficeFileTabs from "./components/OfficeFileTabs";
/**
 * Props for the OfficePanel component.
 */
export interface OfficePanelProps {
  /** Translation function */
  t?: (key: string, params?: any) => string;
  /** Current session ID */
  currentSessionId?: string;
  /** Language code */
  language?: "zh" | "en";
  /** Callback to navigate back to welcome page */
  onBackToWelcome?: () => void;
  /** Optional className for the outer container */
  className?: string;
  /** Optional style override for the outer container */
  style?: React.CSSProperties;
}
/**
 * Ref handle exposed by OfficePanel.
 */
export interface OfficePanelRef {
  /** Get the currently active tool (placeholder) */
  getActiveTool?: () => string;
  /** Programmatically set the active tool (placeholder) */
  setActiveTool?: (tool: string) => void;
}
/** Left panel min width as a fraction of the container width (2:8 split). */
const LEFT_PANEL_MIN_RATIO = 0.2;
/** Left panel max width as a fraction of the container width (4:6 split). */
const LEFT_PANEL_MAX_RATIO = 0.4;
/** Default left panel width fraction (2:8 split). */
const LEFT_PANEL_DEFAULT_RATIO = 0.2;
/** Absolute minimum width of the left panel in pixels. */
const LEFT_PANEL_MIN_WIDTH_PX = 240;
/**
 * LLM office assistant main panel.
 */
const OfficePanel = forwardRef<OfficePanelRef, OfficePanelProps>(({ t = (key: string) => key, language = "en", currentSessionId = "", className, style }, ref) => {
  // Exposed ref API (kept as placeholders to preserve the original interface).
  React.useImperativeHandle(ref, () => ({
    getActiveTool: () => "",
    setActiveTool: () => {},
  }));
  const containerRef = useRef<HTMLDivElement>(null);
  // Horizontal split (left overview / right tabs)
  const [leftRatio, setLeftRatio] = useState<number>(LEFT_PANEL_DEFAULT_RATIO);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isResizeHover, setIsResizeHover] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartRatioRef = useRef<number>(LEFT_PANEL_DEFAULT_RATIO);
  /**
   * Clamp the left panel ratio, honoring the absolute minimum width in pixels.
   */
  const clampRatio = useCallback((ratio: number, containerWidth: number): number => {
    let clamped = Math.max(LEFT_PANEL_MIN_RATIO, Math.min(LEFT_PANEL_MAX_RATIO, ratio));
    if (containerWidth > 0) {
      const minByPx = LEFT_PANEL_MIN_WIDTH_PX / containerWidth;
      if (clamped < minByPx && minByPx <= LEFT_PANEL_MAX_RATIO) {
        clamped = minByPx;
      }
    }
    return clamped;
  }, []);
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      setIsResizing(true);
      dragStartXRef.current = e.clientX;
      dragStartRatioRef.current = leftRatio;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [leftRatio],
  );
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      if (containerWidth <= 0) return;
      const deltaX = e.clientX - dragStartXRef.current;
      const deltaRatio = deltaX / containerWidth;
      const newRatio = clampRatio(dragStartRatioRef.current + deltaRatio, containerWidth);
      setLeftRatio(newRatio);
    },
    [clampRatio],
  );
  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsResizing(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);
  // Attach global listeners for the drag interaction.
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, [handleMouseMove, handleMouseUp]);
  // Clamp the stored ratio when the container resizes.
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        setLeftRatio((prev) => clampRatio(prev, w));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [clampRatio]);
  const leftWidthPercent = `${leftRatio * 100}%`;
  const rightWidthPercent = `${(1 - leftRatio) * 100}%`;
  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-primary)",
        ...style,
      }}
    >
      <div
        style={{
          flex: `0 0 ${leftWidthPercent}`,
          width: leftWidthPercent,
          minWidth: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        <OfficeConversationOverview t={t} language={language} sessionId={currentSessionId} style={{ width: "100%", height: "100%" }} />
      </div>
      <div
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsResizeHover(true)}
        onMouseLeave={() => setIsResizeHover(false)}
        style={{
          width: "0px",
          flexShrink: 0,
          position: "relative",
          cursor: "col-resize",
          background: isResizeHover || isResizing ? "var(--scrollbar-thumb, var(--accent-color))" : "var(--border-color)",
          transition: "background 0.15s ease",
          zIndex: 5,
        }}
      >
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "-4px", right: "-4px" }} />
      </div>
      <div
        style={{
          flex: `0 0 ${rightWidthPercent}`,
          width: rightWidthPercent,
          minWidth: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        <OfficeFileTabs t={t} language={language} sessionId={currentSessionId} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
});
OfficePanel.displayName = "OfficePanel";
export default OfficePanel;
