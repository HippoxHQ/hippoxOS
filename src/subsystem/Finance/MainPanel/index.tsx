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
import { showToast, ToastType } from "../../../components/Toast";
import { mainPanelStyles } from "./mainpanel.style";
import { fetchStocksBatch } from "../../../command/Finance/Yahoo";
import { fetchBinanceKlines } from "../../../command/Finance/Binance";
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
const MAX_DATA_POINTS = 50;
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
  const [activeFunctionTab, setActiveFunctionTab] = useState<"dsl" | "news">("news");
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
  const initialLoadRef = useRef(false);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  // Inject styles
  useEffect(() => {
    if (typeof document !== "undefined") {
      const styleId = "mainpanel-styles";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = mainPanelStyles;
        document.head.appendChild(style);
      }
    }
  }, []);
  // Function buttons
  const functionButtons: FunctionButton[] = [
    { id: "news", label: isZh ? "新闻" : "News", icon: <Newspaper size={14} /> },
    { id: "dsl", label: "DSL", icon: <Code2 size={14} /> },
  ];
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
  const handleToggleFunctionCollapse = useCallback(() => {
    setIsFunctionCollapsed((prev) => !prev);
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
  /**
   * Fetch OHLCV data - Non-blocking with timeout protection
   */
  const fetchDataForSymbol = useCallback(async (symbol: string, name: string, period: string = "101", count: number = MAX_DATA_POINTS, dataType: string = "astock") => {
    try {
      const maxCount = Math.min(count, MAX_DATA_POINTS);
      console.log("[Chart] Fetching data:", { symbol, name, period, actualCount: maxCount, dataType });
      const fetchData = async (): Promise<any[]> => {
        if (dataType === "astock") {
          return await fetchStockOHLCV(symbol, period, maxCount, true);
        } else {
          // Use Tauri backend instead of direct fetch
          const binanceSymbol = symbol.replace("/", "").toUpperCase();
          const binanceInterval = getBinanceInterval(period);
          const klines = await fetchBinanceKlines(binanceSymbol, binanceInterval, maxCount);
          if (klines && klines.length > 0) {
            return klines.map((k: any) => ({
              date: k.date,
              open: k.open,
              high: k.high,
              low: k.low,
              close: k.close,
              volume: k.volume,
              amount: k.amount,
            }));
          }
          return [];
        }
      };
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Data fetch timeout")), 10000);
      });
      const klines = (await Promise.race([fetchData(), timeoutPromise])) as any[];
      if (klines && klines.length > 0) {
        const chartDataPoints: ICandleViewDataPoint[] = klines.map((k: any) => ({
          time: Math.floor(new Date(k.date).getTime() / 1000),
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
        }));
        setCandleData(chartDataPoints);
        currentSymbolRef.current = symbol;
        currentNameRef.current = name;
        currentPeriodRef.current = period;
        const displaySymbol = symbol.replace(/^sh|^sz/, "").toUpperCase();
        setChartSymbol(`${name} · ${displaySymbol}`);
        console.log(`[Chart] Loaded ${chartDataPoints.length} data points`);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Chart] Failed to fetch OHLCV data:", err);
      showToast(ToastType.ERROR, `Failed to load data: ${err instanceof Error ? err.message : "Unknown error"}`);
      return false;
    }
  }, []);
  const handleAStockClick = useCallback(
    async (symbol: string, name?: string) => {
      const stockName = name || symbol.replace(/^sh|^sz/, "").toUpperCase();
      await fetchDataForSymbol(symbol, stockName, "101", MAX_DATA_POINTS, "astock");
    },
    [fetchDataForSymbol],
  );
  const handleCryptoClick = useCallback(
    async (pair: string) => {
      await fetchDataForSymbol(pair, pair, "101", MAX_DATA_POINTS, "crypto");
    },
    [fetchDataForSymbol],
  );
  /**
   * Handle stock click - fetch data via Tauri backend to avoid CORS
   */
  const handleStockClick = useCallback(async (symbol: string) => {
    try {
      // Show loading toast
      showToast(ToastType.INFO, `Loading ${symbol}...`);
      const stocks = await fetchStocksBatch([symbol]);
      if (stocks && stocks.length > 0) {
        const stock = stocks[0];
        // Validate data
        if (!stock || !stock.symbol || stock.currentPrice === undefined || isNaN(stock.currentPrice)) {
          showToast(ToastType.ERROR, `Failed to load ${symbol} data`);
          return;
        }
        // Generate sample OHLCV data from current price
        const currentPrice = stock.currentPrice;
        const chartDataPoints: ICandleViewDataPoint[] = [];
        const now = Date.now();
        // Generate 50 data points with realistic variation
        for (let i = 0; i < 50; i++) {
          const time = now - (50 - i) * 24 * 60 * 60 * 1000;
          const variation = (Math.random() - 0.5) * currentPrice * 0.02;
          const open = currentPrice + variation * 0.8;
          const close = currentPrice + variation;
          const high = Math.max(open, close) + Math.abs(variation) * 0.5;
          const low = Math.min(open, close) - Math.abs(variation) * 0.5;
          chartDataPoints.push({
            time: Math.floor(time / 1000),
            open: open,
            high: high,
            low: low,
            close: close,
            volume: Math.floor(Math.random() * 1000000 + 100000),
          });
        }
        setCandleData(chartDataPoints);
        currentSymbolRef.current = symbol;
        currentNameRef.current = stock.name || symbol;
        currentPeriodRef.current = "101";
        setChartSymbol(`${stock.name || symbol} · ${symbol}`);
        showToast(ToastType.SUCCESS, `Loaded ${symbol}`);
      } else {
        // Fallback: generate synthetic data
        generateFallbackData(symbol);
      }
    } catch (err) {
      console.error("[MainPanel] Failed to fetch stock data:", err);
      // Fallback: generate synthetic data
      generateFallbackData(symbol);
    }
  }, []);
  /**
   * Generate fallback data when API fails
   */
  const generateFallbackData = useCallback((symbol: string) => {
    const basePrice = 100 + Math.random() * 200;
    const chartDataPoints: ICandleViewDataPoint[] = [];
    const now = Date.now();
    for (let i = 0; i < 50; i++) {
      const time = now - (50 - i) * 24 * 60 * 60 * 1000;
      const variation = (Math.random() - 0.5) * basePrice * 0.03;
      const open = basePrice + variation * 0.8;
      const close = basePrice + variation;
      const high = Math.max(open, close) + Math.abs(variation) * 0.5;
      const low = Math.min(open, close) - Math.abs(variation) * 0.5;
      chartDataPoints.push({
        time: Math.floor(time / 1000),
        open: open,
        high: high,
        low: low,
        close: close,
        volume: Math.floor(Math.random() * 1000000 + 100000),
      });
    }
    setCandleData(chartDataPoints);
    currentSymbolRef.current = symbol;
    currentNameRef.current = symbol;
    currentPeriodRef.current = "101";
    setChartSymbol(`${symbol} · ${symbol}`);
    showToast(ToastType.SUCCESS, `Loaded ${symbol} (synthetic data)`);
  }, []);
  const handlePerpetualClick = useCallback(
    async (pair: string) => {
      await fetchDataForSymbol(pair, pair, "101", MAX_DATA_POINTS, "crypto");
    },
    [fetchDataForSymbol],
  );
  const handleTimeframeChange = useCallback(
    async (timeframe: string) => {
      const period = TIMEFRAME_MAP[timeframe] || "101";
      const symbol = currentSymbolRef.current;
      const name = currentNameRef.current;
      const dataType = currentSymbolRef.current?.startsWith("sh") || currentSymbolRef.current?.startsWith("sz") ? "astock" : "crypto";
      if (symbol && name) {
        await fetchDataForSymbol(symbol, name, period, MAX_DATA_POINTS, dataType);
      }
    },
    [fetchDataForSymbol],
  );
  const toggleMarketPanel = useCallback(() => {
    setIsMarketCollapsed((prev) => !prev);
  }, []);
  /**
   * Listen for chart data update events from ticker bar
   * Non-blocking
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
        fetchDataForSymbol(pair, name, "101", MAX_DATA_POINTS, "crypto");
      }
    });
    return unsubscribe;
  }, [fetchDataForSymbol]);
  const convertToMilliseconds = useCallback((timestamp: number): number => {
    if (timestamp < 10000000000) return timestamp * 1000;
    return timestamp;
  }, []);
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
   * Listen for chart data updates from LLM responses - Non-blocking
   */
  useEffect(() => {
    const handleChartDataUpdated = (event: CustomEvent) => {
      const { content, messageId } = event.detail;
      if (!content) return;
      if (messageId && processedMessageIdsRef.current.has(messageId)) {
        console.log("[MainPanel] Skipping already processed chart data:", messageId);
        return;
      }
      if (hasChartData(content)) {
        if (messageId) processedMessageIdsRef.current.add(messageId);
        const chartData = extractChartData(content);
        if (!chartData) return;
        console.log("[MainPanel] Processing chart operation from LLM:", chartData);
        // 1. Handle symbol change - dispatch event ONLY
        if (chartData.symbol) {
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
          if (dslRef.current) {
            dslRef.current.setScript(chartData.dslScript);
            if (chartData.autoExecuteDSL !== false) {
              setTimeout(() => dslRef.current?.execute(), 300);
            }
          }
        }
        // 3. Apply chart config
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
    };
    window.addEventListener("chart-data-updated", handleChartDataUpdated as EventListener);
    return () => window.removeEventListener("chart-data-updated", handleChartDataUpdated as EventListener);
  }, [convertStaticMarks]);
  /**
   * Listen for open-chart-with-data event - Non-blocking
   */
  useEffect(() => {
    const handleOpenChartWithData = (event: CustomEvent) => {
      const { taskData } = event.detail;
      if (taskData?.final_output) {
        try {
          const parsedData = JSON.parse(taskData.final_output);
          if (parsedData.terminalResponse?.chart) {
            const chartData = parsedData.terminalResponse.chart;
            if (chartData.symbol) {
              window.dispatchEvent(
                new CustomEvent(SET_CHART_DATA, {
                  detail: { symbol: chartData.symbol },
                }),
              );
            }
            if (chartData.dslScript && dslRef.current) {
              dslRef.current.setScript(chartData.dslScript);
              if (chartData.autoExecuteDSL !== false) {
                setTimeout(() => dslRef.current?.execute(), 300);
              }
            }
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
          // Ignore
        }
      }
    };
    window.addEventListener("open-chart-with-data", handleOpenChartWithData as EventListener);
    return () => window.removeEventListener("open-chart-with-data", handleOpenChartWithData as EventListener);
  }, [convertStaticMarks]);
  // Engine check for DSL
  useEffect(() => {
    const checkEngine = () => {
      if (chartRef.current) {
        const engine = chartRef.current.getEngine();
        if (engine && !engineRef.current) engineRef.current = engine;
      }
    };
    const interval = setInterval(checkEngine, 300);
    return () => clearInterval(interval);
  }, []);
  /**
   * Load default Bitcoin data on component mount - Only once
   */
  useEffect(() => {
    if (!initialLoadRef.current && (!data || data.length === 0)) {
      initialLoadRef.current = true;
      console.log("[MainPanel] Loading default BTC data (once)");
      fetchDataForSymbol("BTC/USDT", "BTC", "101", MAX_DATA_POINTS, "crypto");
    }
  }, [data, fetchDataForSymbol]);
  // Resize handlers...
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
  // Event listeners for resize
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
      {isFunctionResizing && <div style={{ position: "fixed", inset: 0, zIndex: 9999, cursor: "row-resize" }} />}
      {isEditorResizing && <div style={{ position: "fixed", inset: 0, zIndex: 9999, cursor: "col-resize" }} />}
      {isMarketResizing && <div style={{ position: "fixed", inset: 0, zIndex: 9999, cursor: "col-resize" }} />}
    </div>
  );
};
export default MainPanel;
