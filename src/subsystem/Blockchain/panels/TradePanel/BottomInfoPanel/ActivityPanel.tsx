import React, { useEffect, useRef, useState } from "react";
import { formatNum } from "../types";
interface ActivityPanelProps {
  i18n?: "en" | "zh-cn";
  symbol: string;
}
/**
 * A single activity row shown in the table.
 */
interface ActivityRow {
  id: string;
  /** Timestamp in milliseconds (updated each second for the "time" column). */
  time: number;
  /** Trade side. */
  side: "buy" | "sell";
  /** Market cap at the moment of the trade. */
  marketCap: number;
  /** Token amount traded. */
  amount: number;
  /** Total value in USD. */
  total: number;
  /** Gas fee in USD. */
  gas: number;
  /** Trader short address. */
  trader: string;
}
/**
 * Random short hex address used for the trader column.
 */
const randomAddress = (): string => {
  const hex = "0123456789abcdef";
  const part = (len: number) =>
    Array.from({ length: len })
      .map(() => hex[Math.floor(Math.random() * 16)])
      .join("");
  return `0x${part(4)}…${part(4)}`;
};
/**
 * Build a new mock activity row anchored at the given timestamp.
 */
const buildRow = (time: number, baseMarketCap: number): ActivityRow => {
  const side: "buy" | "sell" = Math.random() > 0.5 ? "buy" : "sell";
  const amount = +(Math.random() * 5000 + 100).toFixed(2);
  // Rough total: use a per-unit price derived from the market cap.
  const unitPrice = 0.05;
  const total = +(amount * unitPrice).toFixed(2);
  const gas = +(Math.random() * 3 + 0.1).toFixed(3);
  // Small random walk on the displayed market cap.
  const marketCap = +(baseMarketCap * (1 + (Math.random() - 0.5) * 0.01)).toFixed(0);
  return {
    id: `${time}-${Math.random().toString(36).slice(2, 8)}`,
    time,
    side,
    marketCap,
    amount,
    total,
    gas,
    trader: randomAddress(),
  };
};
/**
 * ActivityPanel - live trade feed.
 *
 * A new row is prepended every 5 seconds.
 * The displayed "time" column updates every second so it always shows the
 * current wall clock time for the most recent row.
 */
export const ActivityPanel: React.FC<ActivityPanelProps> = ({ i18n = "en", symbol }) => {
  const isZh = i18n === "zh-cn";
  // Mock base market cap used to seed new rows.
  const BASE_MARKET_CAP = 2_542_180;
  const [rows, setRows] = useState<ActivityRow[]>(() => {
    // Seed a few rows so the table is not empty on first render.
    const now = Date.now();
    return Array.from({ length: 8 }).map((_, i) => buildRow(now - i * 5000, BASE_MARKET_CAP));
  });
  // Tick counter that forces a re-render every second so the "time" column
  // keeps advancing.
  const [, setTick] = useState(0);
  // Prepend a new row every 5 seconds.
  const baseMarketCapRef = useRef(BASE_MARKET_CAP);
  useEffect(() => {
    const interval = window.setInterval(() => {
      setRows((prev) => {
        // Update the base cap slightly using the newest row.
        if (prev.length > 0) {
          baseMarketCapRef.current = prev[0].marketCap;
        }
        const next = buildRow(Date.now(), baseMarketCapRef.current);
        // Prepend and keep the list bounded.
        return [next, ...prev].slice(0, 200);
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);
  // Force a re-render every second so the time column updates.
  useEffect(() => {
    const interval = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);
  /**
   * Format a timestamp as HH:MM:SS.
   */
  const formatTime = (ms: number): string => {
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };
  /**
   * Format a USD value with K / M suffixes.
   */
  const formatUsd = (v: number): string => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
    return `$${v.toFixed(2)}`;
  };
  const headerCell: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
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
          gridTemplateColumns: "1fr 0.7fr 1fr 1fr 1fr 0.8fr 1.4fr",
          padding: "0 8px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
          background: "var(--bg-tertiary, #21262d)",
        }}
      >
        <span style={{ ...headerCell, textAlign: "left" }}>{isZh ? "时间" : "Time"}</span>
        <span style={headerCell}>{isZh ? "类型" : "Type"}</span>
        <span style={headerCell}>{isZh ? "市值" : "MCap"}</span>
        <span style={headerCell}>{isZh ? "数量" : "Amount"}</span>
        <span style={headerCell}>{isZh ? "总额" : "Total"}</span>
        <span style={headerCell}>{isZh ? "Gas" : "Gas"}</span>
        <span style={headerCell}>{isZh ? "交易者" : "Trader"}</span>
      </div>
      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {rows.map((row) => (
          <div
            key={row.id}
            // Hover highlight: use CSS variables so the effect follows the theme.
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 0.7fr 1fr 1fr 1fr 0.8fr 1.4fr",
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
            <span style={{ ...bodyCell, textAlign: "left", color: "var(--text-secondary, #8b949e)" }}>{formatTime(row.time)}</span>
            <span
              style={{
                ...bodyCell,
                color: row.side === "buy" ? "#3fb950" : "#f85149",
                fontWeight: 700,
              }}
            >
              {row.side === "buy" ? (isZh ? "买入" : "Buy") : isZh ? "卖出" : "Sell"}
            </span>
            <span style={bodyCell}>{formatUsd(row.marketCap)}</span>
            <span style={bodyCell}>{formatNum(row.amount, 2)}</span>
            <span style={bodyCell}>{formatUsd(row.total)}</span>
            <span style={{ ...bodyCell, color: "var(--text-secondary, #8b949e)" }}>${row.gas.toFixed(3)}</span>
            <span style={{ ...bodyCell, color: "var(--text-secondary, #8b949e)" }}>{row.trader}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ActivityPanel;
