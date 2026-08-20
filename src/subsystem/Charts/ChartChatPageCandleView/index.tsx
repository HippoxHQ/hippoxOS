import React, { useRef, useEffect, useState, useCallback } from "react";
import { ICandleViewDataPoint } from "@candleview/core";
import { TEST_CANDLEVIEW_DATA8 } from "../../../test/TestData_3";
import Chart, { ChartRef } from "./Chart";
import DSL, { DSLRef } from "./DSL";
import MarketPanel from "./MarketPanel";
import { PanelRightOpen } from "lucide-react";
import { fetchStockOHLCV } from "../../../command/Finance/AStock";
interface ChartChatPageCandleViewProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  currentSessionId?: string;
  data?: ICandleViewDataPoint[];
  symbol?: string;
  taskId?: string;
  chartData?: any;
}
/**
 * Map CandleView timeframe to backend period parameter
 * 1m -> 1 minute, 5m -> 5 minutes, 1H -> 1 hour, 1D -> daily, 1W -> weekly, 1M -> monthly
 */
const TIMEFRAME_MAP: Record<string, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1H": "60",
  "1D": "101",
  "1W": "102",
  "1M": "103",
};
export const ChartChatPageCandleView: React.FC<ChartChatPageCandleViewProps> = ({ theme, i18n, currentSessionId, data, symbol = "BTC/USDT", taskId, chartData }) => {
  const [chartHeight, setChartHeight] = useState(55);
  const [editorWidth, setEditorWidth] = useState(60);
  const [isChartResizing, setIsChartResizing] = useState(false);
  const [isEditorResizing, setIsEditorResizing] = useState(false);
  const [isMarketResizing, setIsMarketResizing] = useState(false);
  const [isMarketCollapsed, setIsMarketCollapsed] = useState(false);
  const [marketPanelWidth, setMarketPanelWidth] = useState(240);
  const [chartSymbol, setChartSymbol] = useState(symbol);
  const [chartDataState, setChartDataState] = useState<any>(chartData);
  const [candleData, setCandleData] = useState<ICandleViewDataPoint[]>(data || TEST_CANDLEVIEW_DATA8);
  // Use refs to avoid closure issues in callbacks
  const currentSymbolRef = useRef<string>("");
  const currentNameRef = useRef<string>("");
  const currentPeriodRef = useRef<string>("101");
  const chartRef = useRef<ChartRef>(null);
  const startYRef = useRef(0);
  const startChartHeightRef = useRef(0);
  const startXRef = useRef(0);
  const startEditorWidthRef = useRef(0);
  const startMarketXRef = useRef(0);
  const startMarketWidthRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dslRef = useRef<DSLRef>(null);
  const engineRef = useRef<any>(null);
  const chartDataFromProps = candleData;
  const isValidData = chartDataFromProps && Array.isArray(chartDataFromProps) && chartDataFromProps.length > 0;
  /**
   * Fetch OHLCV data for a symbol with specific timeframe
   * @param symbol - Symbol identifier (stock code or trading pair)
   * @param name - Display name for the asset
   * @param period - Time period: "101"=daily, "102"=weekly, "103"=monthly, "1"/"5"/"30"/"60"=minutes
   * @param count - Number of records to fetch
   * @param dataType - Type of data source: "astock", "crypto", "stock", "perpetual"
   * @returns boolean indicating success
   */
  const fetchDataForSymbol = useCallback(async (symbol: string, name: string, period: string = "101", count: number = 300, dataType: string = "astock") => {
    try {
      console.log("[Chart] Fetching data:", { symbol, name, period, count, dataType });
      let klines = null;
      // For A-shares, use the backend API
      if (dataType === "astock") {
        klines = await fetchStockOHLCV(symbol, period, count, true);
      } else {
        // For crypto and other asset types, fetch from Binance or other sources
        // This uses the existing Binance API infrastructure
        const binanceSymbol = symbol.replace("/", "").toUpperCase();
        const binanceInterval = getBinanceInterval(period);
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${count}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawData = await response.json();
        klines = rawData.map((k: any) => ({
          date: new Date(k[0]).toISOString().split("T")[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          amount: parseFloat(k[7]),
        }));
      }
      if (klines && klines.length > 0) {
        // Convert to CandleView format - time must be timestamp in seconds
        const chartDataPoints: ICandleViewDataPoint[] = klines.map((k: any) => ({
          time: Math.floor(new Date(k.date).getTime() / 1000),
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
        }));
        console.log("[Chart] Converted data points:", chartDataPoints.length);
        // Update React state
        setCandleData(chartDataPoints);
        currentSymbolRef.current = symbol;
        currentNameRef.current = name;
        currentPeriodRef.current = period;
        // Format title
        const displaySymbol = symbol.replace(/^sh|^sz/, "").toUpperCase();
        const title = `${name} · ${displaySymbol}`;
        setChartSymbol(title);
        // Directly update chart via ref
        if (chartRef.current) {
          const cv = chartRef.current.getCandleView();
          if (cv) {
            console.log("[Chart] Updating chart with", chartDataPoints.length, "points");
            cv.setData(chartDataPoints, true);
            cv.setTitle(title);
            // Force refresh
            try {
              const chart = cv.getChart();
              if (chart?.chart) {
                const currentType = (chart as any).chartType || "Candle";
                chart.updateChartType(currentType);
              }
            } catch (e) {
              console.warn("Force refresh error:", e);
            }
            // Fit content after data update
            setTimeout(() => {
              try {
                const chart = cv.getChart();
                if (chart?.chart) {
                  chart.chart.timeScale().fitContent();
                  console.log("[Chart] fitContent called");
                }
              } catch (e) {
                console.warn("Fit content error:", e);
              }
            }, 200);
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Chart] Failed to fetch OHLCV data:", err);
      return false;
    }
  }, []);
  /**
   * Get Binance interval string from period parameter
   */
  const getBinanceInterval = (period: string): string => {
    const map: Record<string, string> = {
      "1": "1m",
      "5": "5m",
      "15": "15m",
      "30": "30m",
      "60": "1h",
      "101": "1d",
      "102": "1w",
      "103": "1M",
    };
    return map[period] || "1d";
  };
  /**
   * Handle A-share stock click from MarketPanel
   */
  const handleAStockClick = useCallback(
    async (symbol: string, name?: string) => {
      console.log("[MarketPanel] A-Share clicked:", symbol, name);
      const stockName = name || symbol.replace(/^sh|^sz/, "").toUpperCase();
      await fetchDataForSymbol(symbol, stockName, "101", 300, "astock");
    },
    [fetchDataForSymbol],
  );
  /**
   * Handle crypto click from MarketPanel
   */
  const handleCryptoClick = useCallback(
    async (pair: string) => {
      console.log("[MarketPanel] Crypto clicked:", pair);
      // Fetch OHLCV data for crypto from Binance
      await fetchDataForSymbol(pair, pair, "101", 300, "crypto");
    },
    [fetchDataForSymbol],
  );
  /**
   * Handle stock click from MarketPanel (US stocks via Yahoo Finance)
   */
  const handleStockClick = useCallback(async (symbol: string) => {
    console.log("[MarketPanel] Stock clicked:", symbol);
    try {
      // Fetch data from Yahoo Finance via the existing fetchStockFromYahoo function
      // Since we don't have a direct OHLCV API for Yahoo in the backend,
      // we use the existing frontend fetch method
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.chart.error || !data.chart.result || data.chart.result.length === 0) {
        throw new Error("No data returned from Yahoo Finance");
      }
      const result = data.chart.result[0];
      const quote = result.indicators.quote[0];
      const timestamps = result.timestamp;
      const meta = result.meta;
      const chartDataPoints: ICandleViewDataPoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] !== null && quote.high[i] !== null && quote.low[i] !== null && quote.close[i] !== null && quote.volume[i] !== null) {
          chartDataPoints.push({
            time: timestamps[i],
            open: quote.open[i] as number,
            high: quote.high[i] as number,
            low: quote.low[i] as number,
            close: quote.close[i] as number,
            volume: quote.volume[i] as number,
          });
        }
      }
      if (chartDataPoints.length === 0) {
        throw new Error("No valid OHLCV data found");
      }
      setCandleData(chartDataPoints);
      currentSymbolRef.current = symbol;
      currentNameRef.current = meta.longName || meta.shortName || symbol;
      currentPeriodRef.current = "101";
      const title = `${meta.longName || meta.shortName || symbol} · ${symbol}`;
      setChartSymbol(title);
      if (chartRef.current) {
        const cv = chartRef.current.getCandleView();
        if (cv) {
          cv.setData(chartDataPoints, true);
          cv.setTitle(title);
          setTimeout(() => {
            try {
              const chart = cv.getChart();
              if (chart?.chart) {
                chart.chart.timeScale().fitContent();
              }
            } catch (e) {
              console.warn("Fit content error:", e);
            }
          }, 200);
        }
      }
    } catch (err) {
      console.error("[Chart] Failed to fetch stock OHLCV data:", err);
    }
  }, []);
  /**
   * Handle perpetual click from MarketPanel
   */
  const handlePerpetualClick = useCallback(
    async (pair: string) => {
      console.log("[MarketPanel] Perpetual clicked:", pair);
      // For perpetuals, fetch from Binance as well (they use the same symbol format)
      await fetchDataForSymbol(pair, pair, "101", 300, "crypto");
    },
    [fetchDataForSymbol],
  );
  /**
   * Handle timeframe change from CandleView top panel
   */
  const handleTimeframeChange = useCallback(
    async (timeframe: string) => {
      console.log("[Chart] Timeframe changed to:", timeframe);
      let period = TIMEFRAME_MAP[timeframe];
      if (!period) {
        console.warn("[Chart] Unknown timeframe:", timeframe, "falling back to daily");
        period = "101";
      }
      console.log("[Chart] Backend period:", period);
      const symbol = currentSymbolRef.current;
      const name = currentNameRef.current;
      const dataType = currentSymbolRef.current?.startsWith("sh") || currentSymbolRef.current?.startsWith("sz") ? "astock" : "crypto";
      console.log("[Chart] Current symbol from ref:", symbol, "name:", name);
      if (symbol && name) {
        await fetchDataForSymbol(symbol, name, period, 300, dataType);
      } else {
        console.warn("[Chart] No symbol set, cannot fetch data for timeframe change");
      }
    },
    [fetchDataForSymbol],
  );
  /**
   * Toggle market panel collapse state
   */
  const toggleMarketPanel = useCallback(() => {
    setIsMarketCollapsed((prev) => !prev);
  }, []);
  // ============================================
  // Engine check for DSL
  // ============================================
  useEffect(() => {
    const checkEngine = () => {
      if (chartRef.current) {
        const engine = chartRef.current.getEngine();
        if (engine && !engineRef.current) {
          engineRef.current = engine;
        }
      }
    };
    const interval = setInterval(checkEngine, 300);
    return () => clearInterval(interval);
  }, []);
  // ============================================
  // Chart resizing handlers
  // ============================================
  const startChartResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startYRef.current = e.clientY;
      startChartHeightRef.current = chartHeight;
      setIsChartResizing(true);
    },
    [chartHeight],
  );
  const handleChartMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isChartResizing) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const deltaY = e.clientY - startYRef.current;
      const deltaPercent = (deltaY / rect.height) * 100;
      let newHeight = startChartHeightRef.current + deltaPercent;
      newHeight = Math.max(30, newHeight);
      newHeight = Math.min(80, newHeight);
      setChartHeight(newHeight);
    },
    [isChartResizing],
  );
  const stopChartResizing = useCallback(() => {
    setIsChartResizing(false);
  }, []);
  const startEditorResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;
      startEditorWidthRef.current = editorWidth;
      setIsEditorResizing(true);
    },
    [editorWidth],
  );
  const handleEditorMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isEditorResizing) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const deltaX = e.clientX - startXRef.current;
      const deltaPercent = (deltaX / rect.width) * 100;
      let newWidth = startEditorWidthRef.current + deltaPercent;
      newWidth = Math.max(30, newWidth);
      newWidth = Math.min(80, newWidth);
      setEditorWidth(newWidth);
    },
    [isEditorResizing],
  );
  const stopEditorResizing = useCallback(() => {
    setIsEditorResizing(false);
  }, []);
  const startMarketResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startMarketXRef.current = e.clientX;
      startMarketWidthRef.current = marketPanelWidth;
      setIsMarketResizing(true);
    },
    [marketPanelWidth],
  );
  const handleMarketMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isMarketResizing) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const deltaX = startMarketXRef.current - e.clientX;
      let newWidth = startMarketWidthRef.current + deltaX;
      newWidth = Math.max(150, newWidth);
      newWidth = Math.min(280, newWidth);
      setMarketPanelWidth(newWidth);
    },
    [isMarketResizing],
  );
  const stopMarketResizing = useCallback(() => {
    setIsMarketResizing(false);
  }, []);
  // ============================================
  // Event listeners for resizing
  // ============================================
  useEffect(() => {
    if (isChartResizing) {
      document.addEventListener("mousemove", handleChartMouseMove);
      document.addEventListener("mouseup", stopChartResizing);
    }
    return () => {
      document.removeEventListener("mousemove", handleChartMouseMove);
      document.removeEventListener("mouseup", stopChartResizing);
    };
  }, [isChartResizing, handleChartMouseMove, stopChartResizing]);
  useEffect(() => {
    if (isEditorResizing) {
      document.addEventListener("mousemove", handleEditorMouseMove);
      document.addEventListener("mouseup", stopEditorResizing);
    }
    return () => {
      document.removeEventListener("mousemove", handleEditorMouseMove);
      document.removeEventListener("mouseup", stopEditorResizing);
    };
  }, [isEditorResizing, handleEditorMouseMove, stopEditorResizing]);
  useEffect(() => {
    if (isMarketResizing) {
      document.addEventListener("mousemove", handleMarketMouseMove);
      document.addEventListener("mouseup", stopMarketResizing);
    }
    return () => {
      document.removeEventListener("mousemove", handleMarketMouseMove);
      document.removeEventListener("mouseup", stopMarketResizing);
    };
  }, [isMarketResizing, handleMarketMouseMove, stopMarketResizing]);
  const isDark = theme === "dark";
  const editorHeight = 100 - chartHeight;
  const rightWidth = isMarketCollapsed ? 0 : marketPanelWidth;
  const leftWidth = `calc(100% - ${rightWidth}px)`;
  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        position: "relative",
        background: isDark ? "var(--bg-primary, #1a1a2e)" : "var(--bg-primary, #f5f5f5)",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Global styles for scrollbars and resize handles */}
      <style>{`
        .chart-resize-handle {
          position: relative;
          z-index: 1;
        }
        .chart-resize-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: 0;
          right: 0;
          bottom: -10px;
          cursor: row-resize;
          z-index: 10;
        }
        .editor-resize-handle {
          position: relative;
          z-index: 1;
        }
        .editor-resize-handle::after {
          content: '';
          position: absolute;
          top: 0;
          left: -10px;
          right: -10px;
          bottom: 0;
          cursor: col-resize;
          z-index: 10;
        }
        .market-resize-handle {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          transition: background 0.2s;
        }
        .market-resize-handle::after {
          content: '';
          position: absolute;
          top: 0;
          left: -8px;
          right: -8px;
          bottom: 0;
          cursor: col-resize;
          z-index: 10;
        }
        .market-resize-handle .handle-line {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 2px;
          height: 30px;
          background: var(--text-muted);
          border-radius: 2px;
          transition: background 0.2s;
        }
        .market-resize-handle:hover .handle-line {
          background: var(--text-secondary);
        }
        textarea::-webkit-scrollbar,
        div::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        textarea::-webkit-scrollbar-track,
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        textarea::-webkit-scrollbar-thumb,
        div::-webkit-scrollbar-thumb {
          background: ${isDark ? "rgba(75, 85, 99, 0.5)" : "rgba(156, 163, 175, 0.5)"};
          border-radius: 2px;
        }
        textarea::-webkit-scrollbar-thumb:hover,
        div::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? "rgba(75, 85, 99, 0.7)" : "rgba(156, 163, 175, 0.7)"};
        }
        textarea::-webkit-scrollbar-corner,
        div::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
      {/* Left panel: Chart + DSL */}
      <div
        style={{
          width: leftWidth,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Chart area */}
        <div
          style={{
            height: `${chartHeight}%`,
            minHeight: "30%",
            maxHeight: "80%",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <Chart ref={chartRef} theme={theme} i18n={i18n} symbol={chartSymbol} data={chartDataFromProps} chartData={chartDataState} isValidData={isValidData} onTimeframeChange={handleTimeframeChange} />
          {/* Collapsed market panel toggle button */}
          {isMarketCollapsed && (
            <button
              onClick={toggleMarketPanel}
              style={{
                position: "absolute",
                top: "5px",
                right: "10px",
                zIndex: 20,
                padding: "6px 10px",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                transition: "all 0.2s",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                background: isDark ? "#374151" : "#ffffff",
                color: isDark ? "#e5e7eb" : "#374151",
                cursor: "pointer",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                height: "32px",
              }}
              title={i18n === "zh-cn" ? "展开市场面板" : "Expand market panel"}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? "#4b5563" : "#f3f4f6";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? "#374151" : "#ffffff";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <PanelRightOpen size={16} />
              <span style={{ fontSize: "12px", whiteSpace: "nowrap" }}>{i18n === "zh-cn" ? "市场" : "Market"}</span>
            </button>
          )}
        </div>
        {/* Chart resize handle */}
        <div
          className="chart-resize-handle"
          style={{
            height: "1px",
            background: "var(--border-color)",
            cursor: "row-resize",
            flexShrink: 0,
            position: "relative",
          }}
          onMouseDown={startChartResizing}
        />
        {/* DSL editor area */}
        <div
          style={{
            height: `${editorHeight}%`,
            minHeight: "20%",
            maxHeight: "70%",
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <DSL ref={dslRef} theme={theme} i18n={i18n} editorWidth={editorWidth} onStartEditorResize={startEditorResizing} engineRef={engineRef} />
        </div>
      </div>
      {/* Market panel resize handle */}
      {!isMarketCollapsed && (
        <div
          className="market-resize-handle"
          style={{
            width: "1px",
            height: "100%",
            background: "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
          }}
          onMouseDown={startMarketResizing}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? "#4a5568" : "#9ca3af";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--border-color)";
          }}
        />
      )}
      {/* Market panel */}
      {!isMarketCollapsed && (
        <div
          style={{
            width: `${rightWidth}px`,
            minWidth: "150px",
            maxWidth: "280px",
            height: "100%",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <MarketPanel theme={theme} i18n={i18n} onCryptoClick={handleCryptoClick} onStockClick={handleStockClick} onAStockClick={handleAStockClick} onPerpetualClick={handlePerpetualClick} isCollapsed={isMarketCollapsed} onToggleCollapse={toggleMarketPanel} />
        </div>
      )}
      {/* Overlays for resizing */}
      {isChartResizing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            cursor: "row-resize",
          }}
        />
      )}
      {isEditorResizing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            cursor: "col-resize",
          }}
        />
      )}
      {isMarketResizing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            cursor: "col-resize",
          }}
        />
      )}
    </div>
  );
};
export default ChartChatPageCandleView;
