import React, { useState } from "react";
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
  const [symbol, setSymbol] = useState("HIPPOX");
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const handleToggleRight = () => {
    setIsRightCollapsed((prev) => !prev);
  };
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
      {/* Left column: chart + live trades */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: isRightCollapsed ? "none" : "1px solid var(--border-color, #30363d)",
        }}
      >
        <div
          style={{
            height: "70%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <ChartPanel i18n={i18n} theme={theme} symbol={symbol} isRightCollapsed={isRightCollapsed} onToggleRight={handleToggleRight} />
        </div>
        <BottomInfoPanel i18n={i18n} />
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
