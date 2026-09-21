import React, { useRef, useEffect, useState, useCallback } from "react";
import { CandleView, ICandleViewDataPoint, TimeframeEnum } from "@candleview/core";
import SymbolInfoBar from "./SymbolInfoBar";
const TEST_TIME = 300;
interface ChartPanelProps {
  i18n?: "en" | "zh-cn";
  /** System theme - passed down from the app shell */
  theme?: "light" | "dark";
  /** Currently selected symbol (controlled from parent) */
  symbol: string;
  /** Whether the right order ticket panel is collapsed */
  isRightCollapsed?: boolean;
  /** Toggle the right order ticket panel */
  onToggleRight?: () => void;
}
/**
 * ChartPanel - Top-left K-line chart area.
 *
 * Uses CandleView from @candleview/core with local mock data.
 * Symbol switching is owned by the parent (TradePanel).
 * Theme is shared with the system theme.
 *
 * This component only renders the chart itself.
 * The bottom tabbed info area (activity / holders / positions) is owned by
 * BottomInfoPanel, which TradePanel renders below this chart.
 */
// Mock OHLCV generator
// Replace with real data source when the backend is wired up.
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
 * The new candle uses the current wall-clock second as its time so the chart
 * keeps advancing in real time.
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
export const ChartPanel: React.FC<ChartPanelProps> = ({ i18n = "en", theme = "dark", symbol, isRightCollapsed = false, onToggleRight }) => {
  const isZh = i18n === "zh-cn";
  // Container ref for CandleView
  const containerRef = useRef<HTMLDivElement>(null);
  // CandleView instance
  const candleViewRef = useRef<CandleView | null>(null);
  // Track readiness so we can safely call setData / setTitle
  const [isChartReady, setIsChartReady] = useState(false);
  // Keep the latest theme in a ref so the mount effect can read it without
  // needing to be re-run when the theme changes.
  const themeRef = useRef(theme);
  themeRef.current = theme;
  // Full data buffer currently held by the chart: initial data + increments.
  // Every incremental tick appends to this array and pushes it back via
  // setData, so the chart always renders the complete series.
  const dataRef = useRef<ICandleViewDataPoint[]>([]);
  // Initialize CandleView once on mount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // If an instance already exists (StrictMode double-mount), skip.
    if (candleViewRef.current) return;
    try {
      const initialData = generateMockCandles(200, 0.05);
      dataRef.current = initialData;
      const cv = new CandleView({
        container,
        title: symbol,
        // Share the system theme with CandleView.
        theme: themeRef.current,
        locale: isZh ? "zh-cn" : "en",
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
          console.warn("[ChartPanel] fitContent failed:", e);
        }
      }, 300);
      return () => {
        window.clearTimeout(timer);
      };
    } catch (e) {
      console.error("[ChartPanel] Failed to create CandleView:", e);
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
          console.warn("[ChartPanel] Failed to destroy CandleView:", e);
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
      console.warn("[ChartPanel] setTheme failed:", e);
    }
  }, [theme]);
  // Update title when the symbol changes.
  useEffect(() => {
    const cv = candleViewRef.current;
    if (!cv || !isChartReady) return;
    try {
      cv.setTitle(symbol);
    } catch (e) {
      console.warn("[ChartPanel] setTitle failed:", e);
    }
  }, [symbol, isChartReady]);
  // Update locale when it changes.
  useEffect(() => {
    const cv = candleViewRef.current;
    if (!cv || !isChartReady) return;
    try {
      cv.setLocale(isZh ? "zh-cn" : "en");
    } catch (e) {
      console.warn("[ChartPanel] setLocale failed:", e);
    }
  }, [isZh, isChartReady]);
  // Regenerate mock data when the symbol changes so the chart visibly reacts.
  const handleResetData = useCallback(() => {
    const cv = candleViewRef.current;
    if (!cv || !isChartReady) return;
    try {
      const fresh = generateMockCandles(200, 0.05);
      // Replace the buffer so incremental appends continue from the new base.
      dataRef.current = fresh;
      cv.setData(fresh);
      const chart = cv.getChart();
      if (chart?.chart) {
        chart.chart.timeScale().fitContent();
      }
    } catch (e) {
      console.warn("[ChartPanel] setData failed:", e);
    }
  }, [isChartReady]);
  useEffect(() => {
    if (!isChartReady) return;
    handleResetData();
  }, [symbol, isChartReady, handleResetData]);
  // Incremental updates: append a new candle every second and push the whole
  // series back via setData(initial data + increments).
  useEffect(() => {
    if (!isChartReady) return;
    const interval = window.setInterval(() => {
      const cv = candleViewRef.current;
      if (!cv) return;
      try {
        const buffer = dataRef.current;
        const prevClose = buffer.length > 0 ? buffer[buffer.length - 1].close : 0.05;
        const next = buildIncrementalCandle(prevClose, 0.05);
        // Append the new candle and keep the buffer bounded.
        const updated = [...buffer, next].slice(-400);
        dataRef.current = updated;
        cv.setData(updated);
      } catch (e) {
        console.warn("[ChartPanel] incremental setData failed:", e);
      }
    }, TEST_TIME);
    return () => window.clearInterval(interval);
  }, [isChartReady]);
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderBottom: "1px solid var(--border-color, #30363d)",
      }}
    >
      {/* Instrument header */}
      <SymbolInfoBar i18n={i18n} symbol={symbol} isRightCollapsed={isRightCollapsed} onToggleRight={onToggleRight} />
      {/* Chart area: CandleView mounts into this container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      />
    </div>
  );
};
export default ChartPanel;
