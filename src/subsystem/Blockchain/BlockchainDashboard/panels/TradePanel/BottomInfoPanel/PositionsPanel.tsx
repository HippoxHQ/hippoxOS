import React from "react";
import { formatNum } from "../types";
interface PositionsPanelProps {
  i18n?: "en" | "zh-cn";
  symbol: string;
}
/**
 * A single open position.
 */
interface PositionRow {
  id: string;
  symbol: string;
  side: "long" | "short";
  size: number;
  entry: number;
  mark: number;
  pnl: number;
  pnlPercent: number;
  liq: number;
}
const MOCK_POSITIONS: PositionRow[] = [
  {
    id: "p1",
    symbol: "HIPPOX/USDT",
    side: "long",
    size: 12_000,
    entry: 0.0412,
    mark: 0.05,
    pnl: 105.6,
    pnlPercent: 21.36,
    liq: 0.0287,
  },
  {
    id: "p2",
    symbol: "ETH/USDT",
    side: "short",
    size: 1.5,
    entry: 3_320.0,
    mark: 3_245.18,
    pnl: 112.23,
    pnlPercent: 2.25,
    liq: 3_680.0,
  },
  {
    id: "p3",
    symbol: "SOL/USDT",
    side: "long",
    size: 45,
    entry: 142.8,
    mark: 138.5,
    pnl: -193.5,
    pnlPercent: -3.01,
    liq: 118.0,
  },
];
/**
 * PositionsPanel - open positions table.
 */
export const PositionsPanel: React.FC<PositionsPanelProps> = ({ i18n = "en" }) => {
  const isZh = i18n === "zh-cn";
  const headerCell: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.5px",
    color: "var(--text-secondary, #8b949e)",
    textAlign: "right",
    whiteSpace: "nowrap",
  };
  const bodyCell: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: 11,
    fontFamily: "monospace",
    textAlign: "right",
    whiteSpace: "nowrap",
    color: "var(--text-primary, #e6edf3)",
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 0.8fr 1fr 1fr 1fr 1.2fr 1fr",
          padding: "0 8px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
          background: "var(--bg-tertiary, #21262d)",
        }}
      >
        <span style={{ ...headerCell, textAlign: "left" }}>{isZh ? "交易对" : "Symbol"}</span>
        <span style={headerCell}>{isZh ? "方向" : "Side"}</span>
        <span style={headerCell}>{isZh ? "数量" : "Size"}</span>
        <span style={headerCell}>{isZh ? "开仓" : "Entry"}</span>
        <span style={headerCell}>{isZh ? "标记" : "Mark"}</span>
        <span style={headerCell}>PNL</span>
        <span style={headerCell}>{isZh ? "强平" : "Liq."}</span>
      </div>
      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {MOCK_POSITIONS.map((row) => (
          <div
            key={row.id}
            // Hover highlight: use CSS variables so the effect follows the theme.
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 0.8fr 1fr 1fr 1fr 1.2fr 1fr",
              padding: "0 8px",
              borderBottom: "1px solid var(--border-color, #30363d)",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg, rgba(255,255,255,0.04))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span style={{ ...bodyCell, textAlign: "left", fontWeight: 600 }}>{row.symbol}</span>
            <span
              style={{
                ...bodyCell,
                color: row.side === "long" ? "#3fb950" : "#f85149",
                fontWeight: 600,
              }}
            >
              {row.side === "long" ? (isZh ? "多" : "Long") : isZh ? "空" : "Short"}
            </span>
            <span style={bodyCell}>{formatNum(row.size, 2)}</span>
            <span style={bodyCell}>{formatNum(row.entry, 4)}</span>
            <span style={bodyCell}>{formatNum(row.mark, 4)}</span>
            <span
              style={{
                ...bodyCell,
                color: row.pnl >= 0 ? "#3fb950" : "#f85149",
                fontWeight: 600,
              }}
            >
              {row.pnl >= 0 ? "+" : ""}
              {formatNum(row.pnl, 2)} ({row.pnlPercent >= 0 ? "+" : ""}
              {row.pnlPercent.toFixed(2)}%)
            </span>
            <span style={{ ...bodyCell, color: "#f0883e" }}>{formatNum(row.liq, 4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default PositionsPanel;
