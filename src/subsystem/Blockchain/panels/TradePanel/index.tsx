import React, { useState, useRef, useCallback, useEffect } from "react";
import ChartPanel from "./ChartPanel";
import BottomInfoPanel from "./BottomInfoPanel";
import OrderTicketPanel from "./OrderTicketPanel";
import { MID_PRICE } from "./types";
interface TradePanelProps {
  i18n?: "en" | "zh-cn";
  /** System theme, forwarded to CandleView */
  theme?: "light" | "dark";
}
/**
 * TradePanel - Hyperliquid-style trading layout.
 */
export const TradePanel: React.FC<TradePanelProps> = ({ i18n = "en", theme = "dark" }) => {
  const [symbol] = useState("HIPPOX");
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  // Bottom region height as a percentage of the left column height.
  // Default 30% so the chart gets most of the space initially.
  const [bottomPercent, setBottomPercent] = useState<number>(40);
  // Whether the user is currently dragging the divider.
  const [isResizing, setIsResizing] = useState(false);
  // Refs used for measuring and dragging.
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const dragStartPercentRef = useRef(0);
  const handleToggleRight = () => {
    setIsRightCollapsed((prev) => !prev);
  };
  // Divider drag handling
  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStartYRef.current = e.clientY;
      dragStartPercentRef.current = bottomPercent;
      setIsResizing(true);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [bottomPercent],
  );
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const col = leftColumnRef.current;
      if (!col) return;
      const rect = col.getBoundingClientRect();
      if (rect.height <= 0) return;
      // The bottom area grows as the mouse moves UP.
      const deltaY = dragStartYRef.current - e.clientY;
      const deltaPercent = (deltaY / rect.height) * 100;
      let next = dragStartPercentRef.current + deltaPercent;
      // Clamp: bottom region min 20%, max 50%.
      next = Math.max(20, Math.min(50, next));
      setBottomPercent(next);
    };
    const handleUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isResizing]);
  // Top (chart) region takes the remaining space.
  const chartPercent = 100 - bottomPercent;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "var(--bg-primary, #0d1117)",
        color: "var(--text-primary, #e6edf3)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 13,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Left column: chart (variable) + divider + bottom info (variable) */}
      <div
        ref={leftColumnRef}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: isRightCollapsed ? "none" : "1px solid var(--border-color, #30363d)",
        }}
      >
        {/* Top: chart area */}
        <div
          style={{
            height: `${chartPercent}%`,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <ChartPanel i18n={i18n} theme={theme} symbol={symbol} isRightCollapsed={isRightCollapsed} onToggleRight={handleToggleRight} />
        </div>
        {/* Draggable divider */}
        <div
          onMouseDown={handleDividerMouseDown}
          style={{
            height: 1,
            flexShrink: 0,
            background: isResizing ? "var(--accent-color, #58a6ff)" : "var(--border-color, #30363d)",
            cursor: "row-resize",
            position: "relative",
            transition: "background 0.15s",
          }}
        >
          {/* Larger invisible hit area so the divider is easy to grab. */}
          <div
            style={{
              position: "absolute",
              top: -4,
              left: 0,
              right: 0,
              bottom: -4,
              cursor: "row-resize",
            }}
          />
        </div>
        {/* Bottom: tabbed info area */}
        <div
          style={{
            height: `${bottomPercent}%`,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <BottomInfoPanel i18n={i18n} symbol={symbol} />
        </div>
      </div>
      {/* Right column: order ticket */}
      {!isRightCollapsed && (
        <div
          style={{
            width: 300,
            minWidth: 300,
            maxWidth: 300,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <OrderTicketPanel
            i18n={i18n}
            symbol={symbol}
            midPrice={MID_PRICE}
            onSubmit={(params) => {
              console.log("[TradePanel] order intent:", params);
            }}
          />
        </div>
      )}
    </div>
  );
};
export default TradePanel;
