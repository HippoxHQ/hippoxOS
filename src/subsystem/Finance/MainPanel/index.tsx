import React, { useRef, useEffect, useState, useCallback } from "react";
import { ICandleViewDataPoint, MainChartType, StaticMarkDirection, StaticMarkType } from "@candleview/core";
import { TEST_CANDLEVIEW_DATA8 } from "../../../test/TestData_3";
import Chart, { ChartRef } from "./Chart";
import DSL, { DSLRef } from "./DSL";
import MarketPanel from "./MarketPanel";
import NewsPanel from "./News";
import { PanelRightOpen, Newspaper, Code2, ChevronUp, ChevronDown } from "lucide-react";
import { fetchStockOHLCV } from "../../../command/Finance/AStock";
import { hasChartData, extractChartData } from "../llm/utils";
import { listenSetChartData, SET_CHART_DATA } from "../FinanceWindowsEventsManager";
/**
 * IStaticMarkItem - Local type definition matching CandleViewMark.ts
 * This type is NOT exported from @candleview/core, so we define it here.
 * Matches the interface used by CandleView.addStaticMarks()
 * At runtime, this is just a plain JSON object.
 */
interface IStaticMarkItem {
  time: number;
  text: string;
  direction: StaticMarkDirection;
  type: StaticMarkType;
  options?: {
    textColor?: string;
    backgroundColor?: string;
    isCircular?: boolean;
    fontSize?: number;
    padding?: number;
    label?: string;
  };
}
interface MainPanelProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  currentSessionId?: string;
  data?: ICandleViewDataPoint[];
  symbol?: string;
  taskId?: string;
  chartData?: any;
}
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
interface FunctionButton {
  id: string;
  label: string;
  icon: React.ReactNode;
}
export const MainPanel: React.FC<MainPanelProps> = ({ theme, i18n, currentSessionId, data, symbol = "BTC/USDT", taskId, chartData }) => {
  // Function area height percentage
  const [functionHeight, setFunctionHeight] = useState(40);
  const [editorWidth, setEditorWidth] = useState(60);
  const [isFunctionResizing, setIsFunctionResizing] = useState(false);
  const [isEditorResizing, setIsEditorResizing] = useState(false);
  const [isMarketResizing, setIsMarketResizing] = useState(false);
  const [isMarketCollapsed, setIsMarketCollapsed] = useState(false);
  const [marketPanelWidth, setMarketPanelWidth] = useState(240);
  const [chartSymbol, setChartSymbol] = useState(symbol);
  const [chartDataState, setChartDataState] = useState<any>(chartData);
  const [candleData, setCandleData] = useState<ICandleViewDataPoint[]>(data || TEST_CANDLEVIEW_DATA8);
  // Function tab: "dsl" or "news"
  const [activeFunctionTab, setActiveFunctionTab] = useState<"dsl" | "news">("news");
  // Function area collapsed state
  const [isFunctionCollapsed, setIsFunctionCollapsed] = useState(false);
  const currentSymbolRef = useRef<string>("");
  const currentNameRef = useRef<string>("");
  const currentPeriodRef = useRef<string>("101");
  const chartRef = useRef<ChartRef>(null);
  const dslRef = useRef<DSLRef>(null);
  const engineRef = useRef<any>(null);
  const startYRef = useRef(0);
  const startFunctionHeightRef = useRef(0);
  const startXRef = useRef(0);
  const startEditorWidthRef = useRef(0);
  const startMarketXRef = useRef(0);
  const startMarketWidthRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartDataFromProps = candleData;
  const isValidData = chartDataFromProps && Array.isArray(chartDataFromProps) && chartDataFromProps.length > 0;
  const isZh = i18n === "zh-cn";
  const isDark = theme === "dark";
  /**
   * Track processed message IDs to prevent infinite loop
   * When a message with chart data is processed, we mark it here
   */
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  // Function buttons - only News and DSL
  const functionButtons: FunctionButton[] = [
    {
      id: "news",
      label: isZh ? "新闻" : "News",
      icon: <Newspaper size={14} />,
    },
    {
      id: "dsl",
      label: "DSL",
      icon: <Code2 size={14} />,
    },
  ];
  // Toggle between DSL and News tabs
  const toggleFunctionTab = useCallback((tabId: string) => {
    setActiveFunctionTab(tabId as "dsl" | "news");
  }, []);
  const handleFunctionClick = useCallback(
    (buttonId: string) => {
      toggleFunctionTab(buttonId);
      console.log(`[FunctionBar] Clicked: ${buttonId}`);
    },
    [toggleFunctionTab],
  );
  /**
   * Toggle function area collapse/expand
   */
  const handleToggleFunctionCollapse = useCallback(() => {
    setIsFunctionCollapsed((prev) => !prev);
  }, []);
  /**
   * Fetch OHLCV data for a given symbol
   * This is the main data loading function
   * It updates both the state and the chart directly if available
   */
  const fetchDataForSymbol = useCallback(async (symbol: string, name: string, period: string = "101", count: number = 300, dataType: string = "astock") => {
    try {
      console.log("[Chart] Fetching data:", { symbol, name, period, count, dataType });
      let klines = null;
      if (dataType === "astock") {
        klines = await fetchStockOHLCV(symbol, period, count, true);
      } else {
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
        const chartDataPoints: ICandleViewDataPoint[] = klines.map((k: any) => ({
          time: Math.floor(new Date(k.date).getTime() / 1000),
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
        }));
        // Update state - Chart component will update via useEffect when data prop changes
        setCandleData(chartDataPoints);
        currentSymbolRef.current = symbol;
        currentNameRef.current = name;
        currentPeriodRef.current = period;
        const displaySymbol = symbol.replace(/^sh|^sz/, "").toUpperCase();
        const title = `${name} · ${displaySymbol}`;
        setChartSymbol(title);
        // DO NOT call cv.setData() here - let React props handle it
        // The Chart component's useEffect will handle the data update
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Chart] Failed to fetch OHLCV data:", err);
      return false;
    }
  }, []);
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
  const handleAStockClick = useCallback(
    async (symbol: string, name?: string) => {
      const stockName = name || symbol.replace(/^sh|^sz/, "").toUpperCase();
      await fetchDataForSymbol(symbol, stockName, "101", 300, "astock");
    },
    [fetchDataForSymbol],
  );
  const handleCryptoClick = useCallback(
    async (pair: string) => {
      await fetchDataForSymbol(pair, pair, "101", 300, "crypto");
    },
    [fetchDataForSymbol],
  );
  const handleStockClick = useCallback(async (symbol: string) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`;
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
      if (chartDataPoints.length === 0) throw new Error("No valid OHLCV data found");
      // Update state only - let Chart component handle rendering
      setCandleData(chartDataPoints);
      currentSymbolRef.current = symbol;
      currentNameRef.current = meta.longName || meta.shortName || symbol;
      currentPeriodRef.current = "101";
      const title = `${meta.longName || meta.shortName || symbol} · ${symbol}`;
      setChartSymbol(title);
      // DO NOT call cv.setData() here - let React props handle it
    } catch (err) {
      console.error("[Chart] Failed to fetch stock OHLCV data:", err);
    }
  }, []);
  const handlePerpetualClick = useCallback(
    async (pair: string) => {
      await fetchDataForSymbol(pair, pair, "101", 300, "crypto");
    },
    [fetchDataForSymbol],
  );
  const handleTimeframeChange = useCallback(
    async (timeframe: string) => {
      let period = TIMEFRAME_MAP[timeframe] || "101";
      const symbol = currentSymbolRef.current;
      const name = currentNameRef.current;
      const dataType = currentSymbolRef.current?.startsWith("sh") || currentSymbolRef.current?.startsWith("sz") ? "astock" : "crypto";
      if (symbol && name) {
        await fetchDataForSymbol(symbol, name, period, 300, dataType);
      }
    },
    [fetchDataForSymbol],
  );
  const toggleMarketPanel = useCallback(() => {
    setIsMarketCollapsed((prev) => !prev);
  }, []);
  /**
   * Listen for chart data update events from ticker bar (MarketPanel clicks)
   * This is the single source of truth for data loading
   */
  useEffect(() => {
    const unsubscribe = listenSetChartData((event: CustomEvent) => {
      const detail = event.detail;
      if (!detail) return;
      if (detail.symbol) {
        const symbol = detail.symbol;
        console.log("[MainPanel] Received ticker click:", symbol);
        const cleanSymbol = symbol.replace("/", "").toUpperCase();
        const pair = symbol.includes("/") ? symbol : cleanSymbol.replace("USDT", "/USDT");
        const name = cleanSymbol.replace("USDT", "");
        fetchDataForSymbol(pair, name, "101", 300, "crypto");
      }
    });
    return unsubscribe;
  }, [fetchDataForSymbol]);
  /**
   * Convert timestamp from seconds to milliseconds if needed
   * CandleView expects milliseconds timestamp
   * If timestamp is less than 10000000000 (year 2286), it's in seconds
   */
  const convertToMilliseconds = useCallback((timestamp: number): number => {
    if (timestamp < 10000000000) {
      return timestamp * 1000;
    }
    return timestamp;
  }, []);
  /**
   * Convert ChartOperation staticMarks to IStaticMarkItem format
   * Handles both seconds and milliseconds timestamps
   */
  const convertStaticMarks = useCallback(
    (marks: any[]): IStaticMarkItem[] => {
      return marks.map((mark) => ({
        time: convertToMilliseconds(mark.time),
        text: mark.text || "",
        direction: mark.direction === "up" ? StaticMarkDirection.Bottom : StaticMarkDirection.Top,
        type: mark.type === "text" ? StaticMarkType.Text : StaticMarkType.Arrow,
        options: {
          textColor: mark.color,
          backgroundColor: mark.backgroundColor,
          fontSize: mark.fontSize,
          label: mark.label,
        },
      }));
    },
    [convertToMilliseconds],
  );
  /**
   * Listen for chart data updates from LLM responses
   * This is the primary integration point between LLM and chart rendering
   * All visual markers are handled through staticMarks
   */
  useEffect(() => {
    const handleChartDataUpdated = (event: CustomEvent) => {
      const { content, messageId } = event.detail;
      if (!content) return;
      // Skip if already processed - prevents infinite loop
      if (messageId && processedMessageIdsRef.current.has(messageId)) {
        console.log("[MainPanel] Skipping already processed chart data:", messageId);
        return;
      }
      if (hasChartData(content)) {
        // Mark as processed immediately to prevent re-entry
        if (messageId) {
          processedMessageIdsRef.current.add(messageId);
        }
        const chartData = extractChartData(content);
        if (!chartData) return;
        console.log("[MainPanel] Processing chart operation from LLM:", chartData);
        // 1. Handle symbol change - dispatch event ONLY
        if (chartData.symbol) {
          console.log("[MainPanel] Dispatching symbol load request:", chartData.symbol);
          const symbol = chartData.symbol;
          let cleanSymbol = symbol;
          let dataType = "crypto";
          if (symbol.includes("/")) {
            cleanSymbol = symbol;
            dataType = "crypto";
          } else if (symbol.match(/^[A-Z]+$/)) {
            cleanSymbol = symbol;
            dataType = "stock";
          } else {
            cleanSymbol = symbol;
            dataType = "astock";
          }
          window.dispatchEvent(
            new CustomEvent(SET_CHART_DATA, {
              detail: { symbol: cleanSymbol, dataType },
            }),
          );
        }
        // 2. Handle DSL script execution
        if (chartData.dslScript) {
          console.log("[MainPanel] Processing DSL script from LLM");
          if (dslRef.current) {
            dslRef.current.setScript(chartData.dslScript);
            if (chartData.autoExecuteDSL !== false) {
              console.log("[MainPanel] Auto-executing DSL script");
              setTimeout(() => {
                dslRef.current?.execute();
              }, 300);
            } else {
              console.log("[MainPanel] DSL script loaded but auto-execution disabled");
            }
          }
        }
        // 3. Apply chart config via ChartRef - handles all chart operations safely
        // This includes chartType, title, indicators, and staticMarks
        if (chartRef.current) {
          const config: any = {};
          if (chartData.chartType) config.chartType = chartData.chartType;
          if (chartData.title) config.title = chartData.title;
          if (chartData.mainIndicators) config.mainIndicators = chartData.mainIndicators;
          if (chartData.subIndicators) config.subIndicators = chartData.subIndicators;
          // Convert staticMarks with proper timestamp handling
          // CandleView expects milliseconds timestamp
          // If timestamp is less than 10000000000 (year 2286), it's in seconds, convert to milliseconds
          if (chartData.staticMarks && chartData.staticMarks.length > 0) {
            config.staticMarks = convertStaticMarks(chartData.staticMarks);
          }
          // applyConfig has internal safety check: !candleViewRef.current || !isReady
          if (Object.keys(config).length > 0) {
            chartRef.current.applyConfig(config);
          }
        }
      }
    };
    window.addEventListener("chart-data-updated", handleChartDataUpdated as EventListener);
    return () => {
      window.removeEventListener("chart-data-updated", handleChartDataUpdated as EventListener);
    };
  }, [convertStaticMarks]);
  /**
   * Listen for the existing 'open-chart-with-data' event from Chart.tsx
   */
  useEffect(() => {
    const handleOpenChartWithData = (event: CustomEvent) => {
      const { taskData } = event.detail;
      if (taskData?.final_output) {
        try {
          const parsedData = JSON.parse(taskData.final_output);
          if (parsedData.terminalResponse?.chart) {
            const chartData = parsedData.terminalResponse.chart;
            // 1. Handle symbol loading - dispatch event only
            if (chartData.symbol) {
              window.dispatchEvent(
                new CustomEvent(SET_CHART_DATA, {
                  detail: { symbol: chartData.symbol },
                }),
              );
            }
            // 2. Handle DSL script
            if (chartData.dslScript) {
              if (dslRef.current) {
                dslRef.current.setScript(chartData.dslScript);
                if (chartData.autoExecuteDSL !== false) {
                  setTimeout(() => {
                    dslRef.current?.execute();
                  }, 300);
                }
              }
            }
            // 3. Apply config with timestamp conversion for static marks
            if (chartRef.current) {
              const config: any = {};
              if (chartData.chartType) config.chartType = chartData.chartType;
              if (chartData.title) config.title = chartData.title;
              if (chartData.mainIndicators) config.mainIndicators = chartData.mainIndicators;
              if (chartData.subIndicators) config.subIndicators = chartData.subIndicators;
              if (chartData.staticMarks && chartData.staticMarks.length > 0) {
                config.staticMarks = convertStaticMarks(chartData.staticMarks);
              }
              if (Object.keys(config).length > 0) {
                chartRef.current.applyConfig(config);
              }
            }
          }
        } catch (e) {
          // Not JSON or no chart data
        }
      }
    };
    window.addEventListener("open-chart-with-data", handleOpenChartWithData as EventListener);
    return () => {
      window.removeEventListener("open-chart-with-data", handleOpenChartWithData as EventListener);
    };
  }, [convertStaticMarks]);
  // Engine check for DSL
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
  /**
   * Load default Bitcoin data on component mount
   * This ensures the chart shows data immediately when the page loads
   */
  useEffect(() => {
    // Load Bitcoin data by default if no data is provided via props
    if (!data || data.length === 0) {
      const defaultSymbol = "BTC/USDT";
      const defaultName = "BTC";
      fetchDataForSymbol(defaultSymbol, defaultName, "101", 300, "crypto");
    }
  }, [data, fetchDataForSymbol]);
  // Function area resizing handlers
  const startFunctionResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startYRef.current = e.clientY;
      startFunctionHeightRef.current = functionHeight;
      setIsFunctionResizing(true);
    },
    [functionHeight],
  );
  const handleFunctionMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isFunctionResizing) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const deltaY = startYRef.current - e.clientY;
      const deltaPercent = (deltaY / rect.height) * 100;
      let newHeight = startFunctionHeightRef.current + deltaPercent;
      newHeight = Math.max(15, Math.min(77, newHeight));
      setFunctionHeight(newHeight);
    },
    [isFunctionResizing],
  );
  const stopFunctionResizing = useCallback(() => {
    setIsFunctionResizing(false);
  }, []);
  // Editor resizing handlers
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
      newWidth = Math.max(30, Math.min(80, newWidth));
      setEditorWidth(newWidth);
    },
    [isEditorResizing],
  );
  const stopEditorResizing = useCallback(() => {
    setIsEditorResizing(false);
  }, []);
  // Market resizing handlers
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
      newWidth = Math.max(150, Math.min(280, newWidth));
      setMarketPanelWidth(newWidth);
    },
    [isMarketResizing],
  );
  const stopMarketResizing = useCallback(() => {
    setIsMarketResizing(false);
  }, []);
  // Event listeners
  useEffect(() => {
    if (isFunctionResizing) {
      document.addEventListener("mousemove", handleFunctionMouseMove);
      document.addEventListener("mouseup", stopFunctionResizing);
    }
    return () => {
      document.removeEventListener("mousemove", handleFunctionMouseMove);
      document.removeEventListener("mouseup", stopFunctionResizing);
    };
  }, [isFunctionResizing, handleFunctionMouseMove, stopFunctionResizing]);
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
  const rightWidth = isMarketCollapsed ? 0 : marketPanelWidth;
  const leftWidth = `calc(100% - ${rightWidth}px)`;
  const renderFunctionContent = () => {
    switch (activeFunctionTab) {
      case "news":
        return <NewsPanel theme={theme} i18n={i18n} language={isZh ? "zh" : "en"} />;
      case "dsl":
      default:
        return (
          <div className="dsl-content-wrapper">
            <DSL ref={dslRef} theme={theme} i18n={i18n} editorWidth={editorWidth} onStartEditorResize={startEditorResizing} engineRef={engineRef} />
          </div>
        );
    }
  };
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
      <style>{`
        .function-resize-handle {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          height: 1px;
          background: var(--border-color);
          cursor: row-resize;
        }
        .function-resize-handle::after {
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
        .function-area {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;
          width: 100%;
          transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .function-area.collapsed {
          height: 0 !important;
          min-height: 0 !important;
          max-height: 0 !important;
          overflow: hidden;
          padding: 0;
          margin: 0;
          border: none;
        }
        .dsl-content-wrapper {
          flex: 1;
          overflow: hidden;
          min-height: 0;
          display: flex;
          flex-direction: row;
          width: 100%;
        }
        .function-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          border-top: 1px solid var(--border-color);
          background: ${isDark ? "var(--bg-secondary, #1e1e2e)" : "var(--bg-secondary, #f0f0f0)"};
          flex-shrink: 0;
          height: 30px;
          min-height: 30px;
          max-height: 30px;
          gap: 2px;
          overflow: hidden;
          position: relative;
          z-index: 5;
        }
        .function-bar-left {
          display: flex;
          align-items: center;
          gap: 2px;
          overflow: hidden;
          flex: 1;
        }
        .function-bar-right {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
          min-width: 22px;
        }
        .function-button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 4px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 11px;
          transition: all 0.15s ease;
          white-space: nowrap;
          height: 22px;
        }
        .function-button:hover {
          background: var(--hover-bg);
          color: var(--text-primary);
          border-color: var(--border-color);
        }
        .function-button.active {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border-color: var(--accent-color);
        }
        .function-divider {
          width: 1px;
          height: 16px;
          background: var(--border-color);
          flex-shrink: 0;
        }
        .function-collapse-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 4px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
          padding: 0;
          flex-shrink: 0;
        }
        .function-collapse-btn:hover {
          background: var(--hover-bg);
          color: var(--text-primary);
          border-color: var(--border-color);
        }
        .chart-container {
          flex: 1;
          min-height: 0;
          position: relative;
          overflow: hidden;
          transition: flex 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (max-width: 600px) {
          .function-button {
            padding: 3px 6px;
            font-size: 10px;
          }
          .function-button .label-text {
            display: none;
          }
          .function-divider {
            display: none;
          }
        }
      `}</style>
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
        <div className="chart-container">
          <Chart ref={chartRef} theme={theme} i18n={i18n} symbol={chartSymbol} data={chartDataFromProps} chartData={chartDataState} isValidData={isValidData} onTimeframeChange={handleTimeframeChange} />
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
              title={isZh ? "展开市场面板" : "Expand market panel"}
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
              <span style={{ fontSize: "12px", whiteSpace: "nowrap" }}>{isZh ? "市场" : "Market"}</span>
            </button>
          )}
        </div>
        {!isFunctionCollapsed && (
          <>
            <div className="function-resize-handle" onMouseDown={startFunctionResizing} />
            <div
              className="function-area"
              style={{
                height: `${functionHeight}%`,
                minHeight: "15%",
                maxHeight: "77%",
              }}
            >
              {renderFunctionContent()}
            </div>
          </>
        )}
        <div className="function-bar">
          <div className="function-bar-left">
            {functionButtons.map((btn, index) => (
              <React.Fragment key={btn.id}>
                {index > 0 && <div className="function-divider" />}
                <button className={`function-button ${btn.id === activeFunctionTab ? "active" : ""}`} onClick={() => handleFunctionClick(btn.id)} title={btn.label}>
                  {btn.icon}
                  <span className="label-text">{btn.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
          <div className="function-bar-right">
            <button className="function-collapse-btn" onClick={handleToggleFunctionCollapse} title={isFunctionCollapsed ? (isZh ? "展开功能区域" : "Expand function area") : isZh ? "收起功能区域" : "Collapse function area"}>
              {isFunctionCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>
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
      {isFunctionResizing && (
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
export default MainPanel;
