import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import ApiClientSidebar, { ApiClientSidebarView } from "./components/ApiClientSidebar";
import ApiClientSecondaryPanel from "./components/ApiClientSecondaryPanel";
import ApiClientRequestPanel from "./components/ApiClientRequestPanel";
interface ApiClientDashboardProps {
  theme?: "light" | "dark";
  i18n?: "en" | "zh-cn";
  /** Toggle the history sessions drawer (forwarded to the sidebar's bottom button) */
  onToggleHistory?: () => void;
  /** Whether the history sessions drawer is currently open */
  isHistoryOpen?: boolean;
  /** Translation function, forwarded to child components that need i18n. */
  t: (key: string, params?: any) => string;
}
/** Minimum width of the secondary menu panel (px). */
const SECONDARY_PANEL_MIN_WIDTH = 160;
/** Minimum width of the content area (px). */
const CONTENT_MIN_WIDTH = 240;
/**
 * Width ratio limits between the secondary panel and the content area.
 */
const RATIO_MAX = 0.4;
const RATIO_MIN = 0.2;
/** Default ratio used on first render. */
const RATIO_DEFAULT = 0.28;
/**
 * ApiClientDashboard.
 */
export const ApiClientDashboard: React.FC<ApiClientDashboardProps> = ({ theme = "dark", i18n = "en", onToggleHistory, isHistoryOpen = false, t }) => {
  const isZh = i18n === "zh-cn";
  // Active sidebar view — one of the three top-level categories.
  const [activeView, setActiveView] = useState<ApiClientSidebarView>("collections");
  // Root ref, used to measure the row width for ratio-based resizing.
  const containerRef = useRef<HTMLDivElement>(null);
  // Measured width of the row that contains the panel + content area.
  const [rowWidth, setRowWidth] = useState<number>(0);
  // Current width of the secondary panel in pixels.
  const [secondaryPanelWidth, setSecondaryPanelWidth] = useState<number>(0);
  // Hover state for the split handle, used to match the chat split style.
  const [isResizeHover, setIsResizeHover] = useState(false);
  // Drag state for the split handle.
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartPanelWidthRef = useRef(0);
  const dragStartContainerRectRef = useRef<DOMRect | null>(null);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.max(0, rect.width);
      setRowWidth(width);
      setSecondaryPanelWidth((prev) => {
        if (prev > 0) return prev;
        return Math.max(SECONDARY_PANEL_MIN_WIDTH, Math.floor(width * RATIO_DEFAULT));
      });
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => update());
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const computePanelRange = useCallback((width: number): { min: number; max: number } => {
    if (width <= 0) {
      return { min: SECONDARY_PANEL_MIN_WIDTH, max: SECONDARY_PANEL_MIN_WIDTH };
    }
    const ratioMin = Math.floor(width * RATIO_MIN);
    const ratioMax = Math.floor(width * RATIO_MAX);
    const min = Math.max(SECONDARY_PANEL_MIN_WIDTH, ratioMin);
    const max = Math.max(min, Math.min(ratioMax, width - CONTENT_MIN_WIDTH));
    return { min, max };
  }, []);
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartPanelWidthRef.current = secondaryPanelWidth;
    dragStartContainerRectRef.current = containerRef.current?.getBoundingClientRect() || null;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };
  const handleSplitMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - dragStartXRef.current;
      const next = dragStartPanelWidthRef.current + deltaX;
      const { min, max } = computePanelRange(rowWidth);
      setSecondaryPanelWidth(Math.max(min, Math.min(max, next)));
    },
    [rowWidth, computePanelRange],
  );
  const handleSplitMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);
  React.useEffect(() => {
    window.addEventListener("mousemove", handleSplitMouseMove);
    window.addEventListener("mouseup", handleSplitMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleSplitMouseMove);
      window.removeEventListener("mouseup", handleSplitMouseUp);
    };
  }, [handleSplitMouseMove, handleSplitMouseUp]);
  React.useEffect(() => {
    if (rowWidth <= 0) return;
    const { min, max } = computePanelRange(rowWidth);
    setSecondaryPanelWidth((prev) => Math.max(min, Math.min(max, prev)));
  }, [rowWidth, computePanelRange]);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
        background: "var(--bg-primary, #0d1117)",
        color: "var(--text-primary, #e6edf3)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "13px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .apiclient-split-handle {
          position: relative;
          z-index: 1;
        }
        .apiclient-split-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
      `}</style>
      <ApiClientSidebar activeView={activeView} onViewChange={setActiveView} i18n={i18n} onToggleHistory={onToggleHistory} isHistoryOpen={isHistoryOpen} />
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <ApiClientSecondaryPanel activeView={activeView} i18n={i18n} width={secondaryPanelWidth} />
        <div
          className="apiclient-split-handle"
          onMouseDown={handleSplitMouseDown}
          style={{
            width: "0px",
            background: isResizeHover ? "var(--scrollbar-thumb)" : "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
            transition: "width 0.15s, background 0.15s",
          }}
          onMouseEnter={() => setIsResizeHover(true)}
          onMouseLeave={() => setIsResizeHover(false)}
        />
        <div
          style={{
            flex: 1,
            minWidth: CONTENT_MIN_WIDTH,
            height: "100%",
            overflow: "hidden",
            background: "var(--bg-primary, #0d1117)",
          }}
        >
          <ApiClientRequestPanel t={t} />
        </div>
      </div>
    </div>
  );
};
export default ApiClientDashboard;
