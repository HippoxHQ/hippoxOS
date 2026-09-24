import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, TrendingUp, TrendingDown, BarChart3, ArrowDownUp, Activity } from "lucide-react";
import { CandleView, ICandleViewDataPoint, TimeframeEnum } from "@candleview/core";
import type { BondingCurveToken } from "./TokenCard";
const TEST_TIME = 300;
interface TokenDetailPanelProps {
  i18n?: "en" | "zh-cn";
  /** System theme - passed down from the app shell and forwarded to CandleView */
  theme?: "light" | "dark";
  token: BondingCurveToken | null;
  /** Called when the user clicks the close button */
  onClose?: () => void;
  /** Submit handler for a buy / sell order. Mirrors the trade panel's onSwap. */
  onSubmit?: (params: { token: BondingCurveToken; side: "buy" | "sell"; size: number; price: number }) => void;
}
/**
 * Mock OHLCV generator.
 * Mirrors the implementation in ChartPanel so the token detail chart
 * behaves the same way as the main trade panel chart.
 *
 * Replace with real data source when the backend is wired up.
 */
const generateMockCandles = (count: number = 200, basePrice: number = 0.05): ICandleViewDataPoint[] => {
  const candles: ICandleViewDataPoint[] = [];
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000);
  // 15-minute intervals
  const step = 15 * 60;
  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * step;
    // Random walk
    const drift = (Math.random() - 0.5) * basePrice * 0.08;
    const open = price;
    const close = Math.max(0.0001, open + drift);
    const high = Math.max(open, close) + Math.random() * basePrice * 0.03;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.03;
    const volume = Math.floor(Math.random() * 1_000_000 + 100_000);
    candles.push({
      time,
      open: +open.toFixed(6),
      high: +high.toFixed(6),
      low: +low.toFixed(6),
      close: +close.toFixed(6),
      volume,
    });
    price = close;
  }
  return candles;
};
/**
 * Build a single new incremental candle that continues from the previous one.
 * Mirrors the helper used in ChartPanel so the two charts stay consistent.
 */
const buildIncrementalCandle = (prevClose: number, basePrice: number): ICandleViewDataPoint => {
  const open = prevClose;
  const drift = (Math.random() - 0.5) * basePrice * 0.02;
  const close = Math.max(0.0001, open + drift);
  const high = Math.max(open, close) + Math.random() * basePrice * 0.01;
  const low = Math.min(open, close) - Math.random() * basePrice * 0.01;
  const volume = Math.floor(Math.random() * 200_000 + 10_000);
  return {
    time: Math.floor(Date.now() / 1000),
    open: +open.toFixed(6),
    high: +high.toFixed(6),
    low: +low.toFixed(6),
    close: +close.toFixed(6),
    volume,
  };
};
/**
 * A single trade-history row shown in the token detail panel.
 */
interface TokenTradeRow {
  id: string;
  side: "buy" | "sell";
  size: number;
  price: number;
  /** Wall-clock timestamp in milliseconds. */
  time: number;
}
/**
 * Random short hex address (kept for parity with other mock feeds).
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
 * Build a single new trade-history row anchored on the given base price.
 */
const buildTradeRow = (basePrice: number, time: number): TokenTradeRow => {
  const side: "buy" | "sell" = Math.random() > 0.5 ? "buy" : "sell";
  const size = +(Math.random() * 500 + 20).toFixed(2);
  // Small jitter around the base price so rows look realistic.
  const price = +(basePrice * (1 + (Math.random() - 0.5) * 0.004)).toFixed(6);
  return {
    id: `${time}-${Math.random().toString(36).slice(2, 8)}`,
    side,
    size,
    price,
    time,
  };
};
/**
 * Random delay between 500ms and 2000ms for the next trade row.
 * Matches the activity feed cadence used elsewhere.
 */
// const randomDelay = (): number => Math.random() * 1500 + 500;
const randomDelay = (): number => Math.random() * TEST_TIME;
/**
 * TokenDetailPanel - right side panel showing detail for the selected token.
 */
export const TokenDetailPanel: React.FC<TokenDetailPanelProps> = ({ i18n = "en", theme = "dark", token, onClose, onSubmit }) => {
  const isZh = i18n === "zh-cn";
  // All hooks are declared at the top, before any conditional return.
  // This keeps the hook order identical on every render.
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [size, setSize] = useState<string>("");
  // Track which percentage button is currently active.
  // null means no preset is selected (e.g. user typed a custom amount).
  const [sizePercent, setSizePercent] = useState<number | null>(null);
  // CandleView container ref + instance ref, mirroring ChartPanel.
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const candleViewRef = useRef<CandleView | null>(null);
  // Track readiness so we can safely call setData / setTitle.
  const [isChartReady, setIsChartReady] = useState(false);
  // Keep the latest theme in a ref so the mount effect can read it without
  // needing to be re-run when the theme changes.
  const themeRef = useRef<"light" | "dark">(theme);
  themeRef.current = theme;
  // Keep the latest locale in a ref for the same reason.
  const localeRef = useRef<"en" | "zh-cn">(isZh ? "zh-cn" : "en");
  // Full candle buffer currently held by the chart: initial data + increments.
  // Every incremental tick appends to this array and pushes it back via
  // setData, so the chart always renders the complete series.
  const dataRef = useRef<ICandleViewDataPoint[]>([]);
  // Mock account state (kept in sync with OrderTicketPanel).
  const availableBalance = 10000;
  const tokenBalance = 4.2183;
  // Live trade history state.
  // Seeded from the token price and then appended to on a random interval,
  // mirroring the activity feed cadence used elsewhere.
  const [trades, setTrades] = useState<TokenTradeRow[]>([]);
  // Keep the latest token price in a ref so the trade-row generator and the
  // scheduling loop can read it without re-subscribing on every price change.
  const priceRef = useRef<number>(token?.price ?? 0);
  priceRef.current = token?.price ?? 0;
  // Seed / re-seed the trade list whenever the selected token changes.
  useEffect(() => {
    if (!token) {
      setTrades([]);
      return;
    }
    const now = Date.now();
    const base = token.price;
    // Build 8 initial rows, newest first.
    const seeded = Array.from({ length: 8 }).map((_, i) => buildTradeRow(base, now - i * 4000));
    setTrades(seeded);
  }, [token?.id, token?.price]);
  // Append a new trade row at a random interval between 0.5s and 2s.
  // A self-rescheduling timeout is used instead of setInterval so each delay
  // is randomised independently.
  useEffect(() => {
    if (!token) return;
    let timer: number;
    const scheduleNext = () => {
      timer = window.setTimeout(() => {
        setTrades((prev) => {
          const next = buildTradeRow(priceRef.current || 0.05, Date.now());
          // Prepend and keep the list bounded.
          return [next, ...prev].slice(0, 200);
        });
        scheduleNext();
      }, randomDelay());
    };
    scheduleNext();
    return () => window.clearTimeout(timer);
  }, [token?.id]);
  // CandleView lifecycle - mirrors the implementation in ChartPanel.
  // Initialize CandleView once on mount.
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    // If an instance already exists (StrictMode double-mount), skip.
    if (candleViewRef.current) return;
    try {
      const initialData = generateMockCandles(200, token?.price ?? 0.05);
      dataRef.current = initialData;
      const cv = new CandleView({
        container,
        title: token?.symbol ?? "",
        // Share the system theme with CandleView.
        theme: themeRef.current,
        locale: localeRef.current,
        technologyPanel: true,
        drawingPanel: true,
        data: initialData,
        timeframe: TimeframeEnum.FIFTEEN_MINUTES,
      });
      candleViewRef.current = cv;
      // Give the internal engine a short moment to be ready before
      // applying further operations such as fitContent.
      const timer = window.setTimeout(() => {
        setIsChartReady(true);
        try {
          const chart = cv.getChart();
          if (chart?.chart) {
            chart.chart.timeScale().fitContent();
          }
        } catch (e) {
          console.warn("[TokenDetailPanel] fitContent failed:", e);
        }
      }, 300);
      return () => {
        window.clearTimeout(timer);
      };
    } catch (e) {
      console.error("[TokenDetailPanel] Failed to create CandleView:", e);
    }
  }, []);
  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      const cv = candleViewRef.current;
      if (cv) {
        try {
          cv.destroy();
        } catch (e) {
          console.warn("[TokenDetailPanel] Failed to destroy CandleView:", e);
        }
        candleViewRef.current = null;
      }
      setIsChartReady(false);
    };
  }, []);
  // Sync theme with CandleView whenever the system theme changes.
  useEffect(() => {
    const cv = candleViewRef.current;
    if (!cv) return;
    try {
      cv.setTheme(theme);
    } catch (e) {
      console.warn("[TokenDetailPanel] setTheme failed:", e);
    }
  }, [theme]);
  // Update title when the token changes.
  useEffect(() => {
    const cv = candleViewRef.current;
    if (!cv || !isChartReady) return;
    try {
      cv.setTitle(token?.symbol ?? "");
    } catch (e) {
      console.warn("[TokenDetailPanel] setTitle failed:", e);
    }
  }, [token?.symbol, isChartReady]);
  // Update locale when it changes.
  useEffect(() => {
    const cv = candleViewRef.current;
    if (!cv || !isChartReady) return;
    try {
      cv.setLocale(isZh ? "zh-cn" : "en");
    } catch (e) {
      console.warn("[TokenDetailPanel] setLocale failed:", e);
    }
  }, [isZh, isChartReady]);
  // Regenerate mock data when the token changes so the chart visibly reacts.
  // The buffer is reset at the same time so incremental appends continue
  // from the new base.
  useEffect(() => {
    const cv = candleViewRef.current;
    if (!cv || !isChartReady) return;
    try {
      const fresh = generateMockCandles(200, token?.price ?? 0.05);
      dataRef.current = fresh;
      cv.setData(fresh);
      const chart = cv.getChart();
      if (chart?.chart) {
        chart.chart.timeScale().fitContent();
      }
    } catch (e) {
      console.warn("[TokenDetailPanel] setData failed:", e);
    }
  }, [token?.id, token?.price, isChartReady]);
  // Incremental chart updates: append a new candle every second and push the
  // whole series back via setData(initial data + increments).
  useEffect(() => {
    if (!isChartReady) return;
    const interval = window.setInterval(() => {
      const cv = candleViewRef.current;
      if (!cv) return;
      try {
        const buffer = dataRef.current;
        const prevClose = buffer.length > 0 ? buffer[buffer.length - 1].close : priceRef.current || 0.05;
        const next = buildIncrementalCandle(prevClose, priceRef.current || 0.05);
        // Append the new candle and keep the buffer bounded.
        const updated = [...buffer, next].slice(-400);
        dataRef.current = updated;
        cv.setData(updated);
      } catch (e) {
        console.warn("[TokenDetailPanel] incremental setData failed:", e);
      }
    }, TEST_TIME);
    return () => window.clearInterval(interval);
  }, [isChartReady]);
  // ---- Empty state (after all hooks) ----
  if (!token) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary, #8b949e)",
          fontSize: 12,
          padding: 24,
          textAlign: "center",
          background: "var(--bg-secondary, #161b22)",
        }}
      >
        {isZh ? "点击左侧卡片查看代币详情" : "Click a token card to view details"}
      </div>
    );
  }
  // ---- Derived values (safe now that token is non-null) ----
  const isUp = token.priceChange24h >= 0;
  const defaultGradient = token.graduated ? "linear-gradient(135deg, rgba(63,185,80,0.4), rgba(63,185,80,0.1))" : "linear-gradient(135deg, rgba(88,166,255,0.4), rgba(88,166,255,0.1))";
  const isBuy = side === "buy";
  const accent = isBuy ? "#3fb950" : "#f85149";
  const notional = (parseFloat(size) || 0) * token.price;
  const estFee = notional * 0.003;
  // ---- Handlers ----
  const handlePercentClick = (pct: number) => {
    const computed = (availableBalance * (pct / 100)) / token.price;
    setSize(computed.toFixed(4));
    // Mark this preset as active.
    setSizePercent(pct);
  };
  const handleMaxClick = () => {
    const computed = availableBalance / token.price;
    setSize(computed.toFixed(4));
    // MAX is treated as the 100% preset.
    setSizePercent(100);
  };
  // Clear the active preset when the user types a custom size.
  const handleSizeChange = (value: string) => {
    setSize(value);
    setSizePercent(null);
  };
  const handleSubmit = () => {
    const s = parseFloat(size);
    if (!s || s <= 0) return;
    onSubmit?.({ token, side, size: s, price: token.price });
  };
  // ---- Shared styles ----
  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 11,
    lineHeight: 1.5,
  };
  const labelStyle: React.CSSProperties = {
    color: "var(--text-secondary, #8b949e)",
    fontSize: 11,
  };
  const valueStyle: React.CSSProperties = {
    color: "var(--text-primary, #e6edf3)",
    fontSize: 11,
    fontFamily: "monospace",
  };
  const sectionHeader: React.CSSProperties = {
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.5px",
    color: "var(--text-secondary, #8b949e)",
    borderBottom: "1px solid var(--border-color, #30363d)",
    flexShrink: 0,
  };
  /**
   * Format a timestamp as HH:MM:SS.
   */
  const formatTradeTime = (ms: number): string => {
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary, #161b22)",
        overflow: "hidden",
      }}
    >
      {/* 1. Token info header                                      */}
      <div
        style={{
          position: "relative",
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
          background: token.image ? `linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15)), url(${token.image}) center/cover no-repeat` : defaultGradient,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 26,
            height: 26,
            borderRadius: 5,
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
          title={isZh ? "关闭" : "Close"}
        >
          <X size={13} />
        </button>
        {/* Identity row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          {/* Logo / initials */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: token.graduated ? "rgba(63,185,80,0.25)" : "rgba(88,166,255,0.25)",
              border: `1px solid ${token.graduated ? "rgba(63,185,80,0.5)" : "rgba(88,166,255,0.5)"}`,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {token.symbol.slice(0, 3)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{token.symbol}</span>
              {token.graduated && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 4,
                    color: "#3fb950",
                    background: "rgba(63,185,80,0.2)",
                    border: "1px solid rgba(63,185,80,0.45)",
                  }}
                >
                  {isZh ? "已毕业" : "Graduated"}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.75)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {token.name}
            </span>
          </div>
        </div>
        {/* Price row */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              fontFamily: "monospace",
              color: "#fff",
            }}
          >
            {token.price.toFixed(6)}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 12,
              fontWeight: 700,
              color: isUp ? "#3fb950" : "#f85149",
            }}
          >
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isUp ? "+" : ""}
            {token.priceChange24h.toFixed(2)}%
          </span>
        </div>
      </div>
      {/* Scrollable body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {/* 2. Chart - CandleView with mock candles                 */}
        <div style={{ width: "100%", height: "400px" }}>
          <div
            ref={chartContainerRef}
            style={{
              height: 180,
              margin: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-color, #30363d)",
              background: "var(--bg-primary, #0d1117)",
              position: "relative",
              overflow: "hidden",
            }}
          />
        </div>
        {/* 3. Trade input (buy / sell)                             */}
        <div
          style={{
            ...sectionHeader,
            borderTop: "1px solid var(--border-color, #30363d)",
          }}
        >
          <ArrowDownUp size={12} />
          {isZh ? "交易" : "Trade"}
        </div>
        <div
          style={{
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Buy / Sell toggle: grouped button with center divider */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            {(["buy", "sell"] as const).map((s, idx) => {
              const active = side === s;
              const color = s === "buy" ? "#3fb950" : "#f85149";
              return (
                <React.Fragment key={s}>
                  {idx > 0 && (
                    <div
                      style={{
                        width: 1,
                        flexShrink: 0,
                        background: "var(--border-color, #30363d)",
                      }}
                    />
                  )}
                  <button
                    onClick={() => setSide(s)}
                    style={{
                      flex: 1,
                      padding: "5px 0",
                      background: active ? color : "transparent",
                      color: active ? "white" : "var(--text-secondary, #8b949e)",
                      border: "none",
                      borderRadius: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      letterSpacing: "0.5px",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {s === "buy" ? (isZh ? "买入" : "Buy") : isZh ? "卖出" : "Sell"}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
          {/* Size input + percentage presets */}
          <div
            style={{
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 5,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "8px 10px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={labelStyle}>{isZh ? "数量" : "Size"}</span>
                <span style={{ ...labelStyle, fontFamily: "monospace" }}>
                  {isZh ? "最大" : "Max"}: {(availableBalance / token.price).toFixed(4)}
                </span>
              </div>
              <input
                type="text"
                value={size}
                onChange={(e) => handleSizeChange(e.target.value)}
                placeholder="0.00"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary, #e6edf3)",
                  fontSize: 13,
                  padding: 0,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div
              style={{
                width: "100%",
                height: 1,
                background: "var(--border-color, #30363d)",
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                alignItems: "stretch",
              }}
            >
              {[25, 50, 75, 100].map((pct, idx) => {
                const active = sizePercent === pct;
                return (
                  <button
                    key={pct}
                    onClick={() => (pct === 100 ? handleMaxClick() : handlePercentClick(pct))}
                    style={{
                      width: "100%",
                      padding: "6px 0",
                      background: active ? "var(--accent-color, #58a6ff)" : "transparent",
                      color: active ? "#fff" : "var(--text-secondary, #8b949e)",
                      border: "none",
                      borderLeft: idx > 0 ? "1px solid var(--border-color, #30363d)" : "none",
                      borderRadius: 0,
                      fontSize: 10,
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {pct === 100 ? "MAX" : `${pct}%`}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Summary rows */}
          <div style={rowStyle}>
            <span style={labelStyle}>{isZh ? "可用余额" : "Available"}</span>
            <span style={valueStyle}>${availableBalance.toFixed(2)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>{isZh ? "持有数量" : "Holdings"}</span>
            <span style={valueStyle}>{tokenBalance.toFixed(4)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>{isZh ? "订单价值" : "Order Value"}</span>
            <span style={valueStyle}>${notional.toFixed(2)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>{isZh ? "预估手续费" : "Est. Fee"}</span>
            <span style={valueStyle}>${estFee.toFixed(3)}</span>
          </div>
          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!size || parseFloat(size) <= 0}
            style={{
              marginTop: 4,
              padding: "8px",
              background: !size || parseFloat(size) <= 0 ? "var(--bg-tertiary, #21262d)" : accent,
              color: !size || parseFloat(size) <= 0 ? "var(--text-secondary, #8b949e)" : "white",
              border: "none",
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 700,
              cursor: !size || parseFloat(size) <= 0 ? "not-allowed" : "pointer",
              letterSpacing: "0.5px",
            }}
          >
            {isBuy ? (isZh ? "买入" : "Buy") : isZh ? "卖出" : "Sell"} {token.symbol}
          </button>
        </div>
        {/* 4. Token trade history                                  */}
        <div
          style={{
            ...sectionHeader,
            borderTop: "1px solid var(--border-color, #30363d)",
          }}
        >
          <Activity size={12} />
          {isZh ? "交易记录" : "Trade History"}
        </div>
        <div style={{ padding: "4px 12px 12px" }}>
          {/* Column header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              padding: "6px 4px",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.5px",
              color: "var(--text-secondary, #8b949e)",
              borderBottom: "1px solid var(--border-color, #30363d)",
            }}
          >
            <span>{isZh ? "方向" : "Side"}</span>
            <span style={{ textAlign: "right" }}>{isZh ? "价格" : "Price"}</span>
            <span style={{ textAlign: "right" }}>{isZh ? "数量" : "Size"}</span>
            <span style={{ textAlign: "right" }}>{isZh ? "时间" : "Time"}</span>
          </div>
          {/*
            Scrollable trade list.
            A fixed max height keeps the list from pushing the rest of the panel
            out of view; rows beyond that height are reachable via the scrollbar.
          */}
          <div
            style={{
              maxHeight: 180,
              overflowY: "auto",
            }}
          >
            {/* Rows */}
            {trades.map((t) => {
              const rowIsBuy = t.side === "buy";
              return (
                <div
                  key={t.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    padding: "6px 4px",
                    fontSize: 11,
                    fontFamily: "monospace",
                    borderBottom: "1px solid var(--border-color, #30363d)",
                  }}
                >
                  <span
                    style={{
                      color: rowIsBuy ? "#3fb950" : "#f85149",
                      fontWeight: 700,
                    }}
                  >
                    {rowIsBuy ? (isZh ? "买" : "Buy") : isZh ? "卖" : "Sell"}
                  </span>
                  <span style={{ textAlign: "right" }}>{t.price.toFixed(6)}</span>
                  <span style={{ textAlign: "right" }}>{t.size}</span>
                  <span
                    style={{
                      textAlign: "right",
                      color: "var(--text-secondary, #8b949e)",
                    }}
                  >
                    {formatTradeTime(t.time)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
export default TokenDetailPanel;
