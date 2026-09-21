import React from "react";
import { TradeFill, MOCK_FILLS, formatNum, subtleText } from "./types";
interface BottomInfoPanelProps {
  i18n?: "en" | "zh-cn";
}
/**
 * BottomInfoPanel - Bottom-left info area.
 *
 * Shows only the live trade feed (recent fills).
 * Uses the same bg-secondary background as SymbolInfoBar for visual consistency.
 */
export const BottomInfoPanel: React.FC<BottomInfoPanelProps> = ({ i18n = "en" }) => {
  const isZh = i18n === "zh-cn";
  // Mock fills - replace with a live stream from the backend
  const fills: TradeFill[] = MOCK_FILLS;
  return (
    <div
      style={{
        height: "30%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderTop: "1px solid var(--border-color, #30363d)",
        background: "var(--bg-secondary, #161b22)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary, #8b949e)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {isZh ? "实时成交" : "Live Trades"}
        </span>
        <span style={{ ...subtleText, fontSize: 10 }}>
          {isZh ? "最新" : "Latest"} {fills.length}
        </span>
      </div>
      {/* Column header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 0.8fr 1fr 1fr 1fr",
          padding: "6px 12px",
          fontSize: 10,
          color: "var(--text-secondary, #8b949e)",
          borderBottom: "1px solid var(--border-color, #30363d)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          flexShrink: 0,
        }}
      >
        <span>{isZh ? "合约" : "Symbol"}</span>
        <span>{isZh ? "方向" : "Side"}</span>
        <span style={{ textAlign: "right" }}>{isZh ? "价格" : "Price"}</span>
        <span style={{ textAlign: "right" }}>{isZh ? "数量" : "Size"}</span>
        <span style={{ textAlign: "right" }}>{isZh ? "时间" : "Time"}</span>
      </div>
      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {fills.map((f) => (
          <div
            key={f.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 0.8fr 1fr 1fr 1fr",
              padding: "6px 12px",
              fontSize: 11,
              fontFamily: "monospace",
              borderBottom: "1px solid var(--border-color, #30363d)",
            }}
          >
            <span style={{ fontWeight: 600 }}>{f.symbol}</span>
            <span style={{ color: f.side === "buy" ? "#3fb950" : "#f85149" }}>{f.side === "buy" ? (isZh ? "买" : "Buy") : isZh ? "卖" : "Sell"}</span>
            <span style={{ textAlign: "right" }}>{formatNum(f.price, 1)}</span>
            <span style={{ textAlign: "right" }}>{f.size}</span>
            <span
              style={{
                textAlign: "right",
                color: "var(--text-secondary, #8b949e)",
              }}
            >
              {f.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default BottomInfoPanel;
