import React, { useRef, useEffect, useState, useCallback } from "react";
import { ICandleViewDataPoint, MainChartType, StaticMarkDirection, StaticMarkType } from "@candleview/core";
import Chart, { ChartRef } from "./Chart";
import DSL, { DSLRef } from "./DSL";
import MarketPanel from "./MarketPanel";
import NewsPanel from "./News";
import AIAnalysis from "./AIAnalysis";
import { PanelRightOpen, Newspaper, Code2, ChevronUp, ChevronDown, Sparkles, History } from "lucide-react";
import { fetchStockOHLCV } from "../../../command/Finance/AStock";
import { listenSetChartData, SET_CHART_DATA } from "../FinanceWindowsEventsManager";
import { showToast, ToastType } from "../../../components/Toast";
import { mainPanelStyles } from "./mainpanel.style";
import { fetchStocksBatch } from "../../../command/Finance/Yahoo";
import { fetchBinanceKlines } from "../../../command/Finance/Binance";
import { resolveDisclaimer, DEFAULT_DISCLAIMER_ZH, DEFAULT_DISCLAIMER_EN } from "../llm/types";
import { extractChartData, hasChartData } from "../utils/parser";
import HistorySession, { HistorySessionRef } from "./HistorySession";
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
  // Translation function (used by the embedded history panel)
  t?: (key: string, params?: any) => string;
  // Session select handler (used by the embedded history panel)
  onSessionSelect?: (sessionId: string) => void;
  // New session handler (used by the embedded history panel)
  onNewSession?: () => void;
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
/**
 * Words that must NEVER appear in the chart title.
 * The LLM has been known to append "模拟行情走势" / "demo" / "chart" etc.
 * to the title; we strip them defensively on the frontend regardless of
 * what the prompt says.
 */
const TITLE_NOISE_WORDS = [
  // Chinese
  "模拟行情走势",
  "模拟行情",
  "模拟",
  "示例",
  "演示",
  "走势",
  "K线图",
  "k线图",
  "蜡烛图",
  "图表",
  "数据",
  "技术分析",
  "分析",
  "行情",
  // English
  "simulated",
  "simulation",
  "demo",
  "sample",
  "mock",
  "example",
  "chart",
  "data",
  "technical analysis",
  "analysis",
  "trend",
  "kline",
  "candlestick",
];
export const MainPanel: React.FC<MainPanelProps> = ({ theme, i18n, currentSessionId, data, symbol = "BTC/USDT", taskId, chartData, t, onSessionSelect, onNewSession }) => {
  const [functionHeight, setFunctionHeight] = useState(40);
  const [editorWidth, setEditorWidth] = useState(60);
  const [isFunctionResizing, setIsFunctionResizing] = useState(false);
  const [isEditorResizing, setIsEditorResizing] = useState(false);
  const [isMarketResizing, setIsMarketResizing] = useState(false);
  const [isMarketCollapsed, setIsMarketCollapsed] = useState(false);
  const [marketPanelWidth, setMarketPanelWidth] = useState(240);
  const [chartSymbol, setChartSymbol] = useState(symbol);
  const [chartDataState, setChartDataState] = useState<any>(chartData);
  const [candleData, setCandleData] = useState<ICandleViewDataPoint[]>(data || []);
  // Active function tab now supports "ai" in addition to "dsl" and "news"
  // and "history" for the embedded history session panel.
  const [activeFunctionTab, setActiveFunctionTab] = useState<"dsl" | "news" | "ai" | "history">("news");
  const [isFunctionCollapsed, setIsFunctionCollapsed] = useState(false);
  // Analysis state shared with the AIAnalysis panel.
  // The full analysis object is stored so the panel can render any structured
  // section that the LLM decided to include.
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [analysisDisclaimer, setAnalysisDisclaimer] = useState<string>("");
  const currentSymbolRef = useRef<string>("");
  const currentNameRef = useRef<string>("");
  const currentPeriodRef = useRef<string>("101");
  const chartRef = useRef<ChartRef>(null);
  const dslRef = useRef<DSLRef>(null);
  const historySessionRef = useRef<HistorySessionRef>(null);
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
  // Fallback translation function when no `t` prop is provided.
  const translate = useCallback(
    (key: string): string => {
      if (t) return t(key);
      // Minimal fallbacks for the keys used by the embedded history panel.
      const fallbacksZh: Record<string, string> = {
        "history.category.pinned": "已置顶",
        "history.category.today": "今天",
        "history.category.yesterday": "昨天",
        "history.category.last7days": "最近7天",
        "history.category.last30days": "最近30天",
        "history.category.older": "更早",
        "history.loading": "加载中...",
        "history.empty": "暂无历史会话",
        "history.untitled": "未命名",
        "history.rename": "重命名",
        "history.pin": "置顶",
        "history.unpin": "取消置顶",
        "history.delete": "删除",
        "history.toast.pinned": "已置顶",
        "history.toast.unpinned": "已取消置顶",
        "history.toast.pinFailed": "置顶失败",
        "history.toast.deleted": "已删除",
        "history.toast.deleteFailed": "删除失败",
        "history.toast.renamed": "已重命名",
        "history.toast.renameFailed": "重命名失败",
        "history.dialog.confirmDeleteTitle": "删除会话",
        "history.dialog.confirmDeleteMessage": "确定要删除该会话吗？此操作不可恢复。",
        "history.dialog.delete": "删除",
        "history.dialog.cancel": "取消",
        "history.dialog.cannotDeleteTitle": "无法删除",
        "history.dialog.cannotDeleteMessage": "至少保留一个会话。",
        "history.dialog.gotIt": "知道了",
      };
      const fallbacksEn: Record<string, string> = {
        "history.category.pinned": "Pinned",
        "history.category.today": "Today",
        "history.category.yesterday": "Yesterday",
        "history.category.last7days": "Last 7 Days",
        "history.category.last30days": "Last 30 Days",
        "history.category.older": "Older",
        "history.loading": "Loading...",
        "history.empty": "No History Chat",
        "history.untitled": "Untitled",
        "history.rename": "Rename",
        "history.pin": "Pin",
        "history.unpin": "Unpin",
        "history.delete": "Delete",
        "history.toast.pinned": "Pinned",
        "history.toast.unpinned": "Unpinned",
        "history.toast.pinFailed": "Pin failed",
        "history.toast.deleted": "Deleted",
        "history.toast.deleteFailed": "Delete failed",
        "history.toast.renamed": "Renamed",
        "history.toast.renameFailed": "Rename failed",
        "history.dialog.confirmDeleteTitle": "Delete Session",
        "history.dialog.confirmDeleteMessage": "Are you sure you want to delete this session? This action cannot be undone.",
        "history.dialog.delete": "Delete",
        "history.dialog.cancel": "Cancel",
        "history.dialog.cannotDeleteTitle": "Cannot Delete",
        "history.dialog.cannotDeleteMessage": "At least one session must remain.",
        "history.dialog.gotIt": "Got it",
      };
      return isZh ? fallbacksZh[key] || key : fallbacksEn[key] || key;
    },
    [t, isZh],
  );
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
  // Function buttons now include the "AI" analysis tab and the "History" tab.
  const functionButtons: FunctionButton[] = [
    { id: "news", label: isZh ? "新闻" : "News", icon: <Newspaper size={14} /> },
    { id: "dsl", label: "DSL", icon: <Code2 size={14} /> },
    { id: "ai", label: isZh ? "AI分析" : "AI", icon: <Sparkles size={14} /> },
    { id: "history", label: isZh ? "历史会话" : "History", icon: <History size={14} /> },
  ];
  const toggleFunctionTab = useCallback((tabId: string) => {
    setActiveFunctionTab(tabId as "dsl" | "news" | "ai" | "history");
  }, []);
  const handleFunctionClick = useCallback(
    (buttonId: string) => {
      toggleFunctionTab(buttonId);
      // Every function button click must expand the function area,
      // even if it was previously collapsed.
      setIsFunctionCollapsed(false);
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
   * Strip every known noise word from a title fragment and trim whitespace.
   * Used to remove "模拟行情走势" / "demo" / "chart" / etc. that the LLM
   * sometimes appends to the chart title.
   */
  const cleanTitleFragment = useCallback((fragment: string): string => {
    let out = String(fragment || "");
    for (const w of TITLE_NOISE_WORDS) {
      // Case-insensitive, global replace
      out = out.replace(new RegExp(w, "gi"), " ");
    }
    // Collapse repeated spaces and trim
    out = out.replace(/\s+/g, " ").trim();
    return out;
  }, []);
  /**
   * NEW: broadcast the exact raw klines the chart just loaded.
   *
   * This is the SINGLE SOURCE OF TRUTH for market data in the finance module.
   * FinanceChatPanel listens for "chart-klines-ready" and reuses these klines
   * to build the [MARKET_DATA] block sent to the LLM. This guarantees the
   * LLM always analyzes the SAME data the user is looking at on the chart,
   * with no second fetch and no data mismatch.
   */
  const broadcastChartKlines = useCallback((payload: { symbol: string; displaySymbol: string; name: string; dataType: string; period: string; klines: any[] }) => {
    try {
      window.dispatchEvent(new CustomEvent("chart-klines-ready", { detail: payload }));
    } catch (e) {
      console.warn("[MainPanel] Failed to broadcast chart klines:", e);
    }
  }, []);
  /**
   * Fetch OHLCV data - Non-blocking with timeout protection.
   *
   * The final chart title is ALWAYS built locally as "name · code".
   * The `name` argument is first passed through cleanTitleFragment() as a
   * last line of defense, so no noise word can slip into the title even if
   * the caller passed a dirty string.
   */
  const fetchDataForSymbol = useCallback(
    async (symbol: string, name: string, period: string = "101", count: number = MAX_DATA_POINTS, dataType: string = "astock") => {
      try {
        const maxCount = Math.min(count, MAX_DATA_POINTS);
        console.log("[Chart] Fetching data:", { symbol, name, period, actualCount: maxCount, dataType });
        const fetchData = async (): Promise<any[]> => {
          if (dataType === "astock") {
            return await fetchStockOHLCV(symbol, period, maxCount, true);
          } else {
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
          // Final title is ALWAYS "name · code" with no extra text.
          // Defensively re-clean the name here as a last line of defense.
          const displaySymbol = symbol.replace(/^sh|^sz/, "").toUpperCase();
          let safeName = cleanTitleFragment(name);
          if (!safeName || safeName === displaySymbol) {
            safeName = displaySymbol;
          }
          setChartSymbol(`${safeName} · ${displaySymbol}`);
          console.log(`[Chart] Loaded ${chartDataPoints.length} data points, title="${safeName} · ${displaySymbol}"`);
          // NEW: broadcast the raw klines for FinanceChatPanel.
          broadcastChartKlines({ symbol, displaySymbol, name: safeName, dataType, period, klines });
          return true;
        }
        return false;
      } catch (err) {
        console.error("[Chart] Failed to fetch OHLCV data:", err);
        showToast(ToastType.ERROR, `Failed to load data: ${err instanceof Error ? err.message : "Unknown error"}`);
        return false;
      }
    },
    [cleanTitleFragment, broadcastChartKlines],
  );
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
  const handleStockClick = useCallback(
    async (symbol: string) => {
      try {
        showToast(ToastType.INFO, `Loading ${symbol}...`);
        const stocks = await fetchStocksBatch([symbol]);
        if (stocks && stocks.length > 0) {
          const stock = stocks[0];
          if (!stock || !stock.symbol || stock.currentPrice === undefined || isNaN(stock.currentPrice)) {
            showToast(ToastType.ERROR, `Failed to load ${symbol} data`);
            return;
          }
          const currentPrice = stock.currentPrice;
          const chartDataPoints: ICandleViewDataPoint[] = [];
          const now = Date.now();
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
          // Prefer the real stock name when available, otherwise fall back to the code.
          const displayName = stock.name || symbol;
          currentNameRef.current = displayName;
          currentPeriodRef.current = "101";
          const displaySymbol = symbol.replace(/^sh|^sz/, "").toUpperCase();
          let safeName = cleanTitleFragment(displayName);
          if (!safeName || safeName === displaySymbol) {
            safeName = displaySymbol;
          }
          setChartSymbol(`${safeName} · ${displaySymbol}`);
          console.log(`[Chart] Loaded ${chartDataPoints.length} data points, title="${safeName} · ${displaySymbol}"`);
          // NEW: broadcast the raw klines for FinanceChatPanel (shaped like klines).
          broadcastChartKlines({
            symbol,
            displaySymbol,
            name: safeName,
            dataType: "stock",
            period: "101",
            klines: chartDataPoints.map((p) => ({
              date: new Date(p.time * 1000).toISOString(),
              open: p.open,
              high: p.high,
              low: p.low,
              close: p.close,
              volume: p.volume,
            })),
          });
          showToast(ToastType.SUCCESS, `Loaded ${symbol}`);
        } else {
          generateFallbackData(symbol);
        }
      } catch (err) {
        console.error("[MainPanel] Failed to fetch stock data:", err);
        generateFallbackData(symbol);
      }
    },
    [cleanTitleFragment, broadcastChartKlines],
  );
  const generateFallbackData = useCallback(
    (symbol: string) => {
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
      const displaySymbol = symbol.replace(/^sh|^sz/, "").toUpperCase();
      setChartSymbol(`${displaySymbol} · ${displaySymbol}`);
      console.log(`[Chart] Loaded ${chartDataPoints.length} data points (fallback), title="${displaySymbol} · ${displaySymbol}"`);
      // NEW: broadcast the raw klines for FinanceChatPanel.
      broadcastChartKlines({
        symbol,
        displaySymbol,
        name: displaySymbol,
        dataType: "crypto",
        period: "101",
        klines: chartDataPoints.map((p) => ({
          date: new Date(p.time * 1000).toISOString(),
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume,
        })),
      });
      showToast(ToastType.SUCCESS, `Loaded ${symbol} (synthetic data)`);
    },
    [broadcastChartKlines],
  );
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
   * Normalize a symbol coming from the LLM into the exact shape
   * that fetchDataForSymbol expects, together with a data type.
   *
   * Handles:
   * - Crypto pairs (BTC/USDT, BTCUSDT)
   * - A-share codes (600519, sh600519, sz000001, 002384.SZ, 600519.SH)
   * - Plain US tickers (AAPL, BRK.B)
   */
  const normalizeSymbolAndType = useCallback((rawSymbol: string): { symbol: string; name: string; dataType: string; period: string } => {
    const s = String(rawSymbol || "").trim();
    // Crypto pair like "BTC/USDT"
    if (s.includes("/")) {
      const parts = s.split("/");
      const name = (parts[0] || "").toUpperCase();
      return { symbol: s.toUpperCase(), name, dataType: "crypto", period: "101" };
    }
    // A-share code with suffix, e.g. "002384.SZ", "600519.SH"
    const astockSuffixed = s.match(/^(\d{6})\.(SZ|SH)$/i);
    if (astockSuffixed) {
      const digits = astockSuffixed[1];
      const exchange = astockSuffixed[2].toLowerCase();
      const prefixed = exchange === "sh" ? `sh${digits}` : `sz${digits}`;
      return { symbol: prefixed, name: digits.toUpperCase(), dataType: "astock", period: "101" };
    }
    // A-share 6-digit code, possibly prefixed with sh/sz
    if (/^(sh|sz)?\d{6}$/i.test(s)) {
      const lower = s.toLowerCase();
      const prefixed = lower.startsWith("sh") || lower.startsWith("sz") ? lower : lower.startsWith("6") ? `sh${lower}` : `sz${lower}`;
      const name = lower.replace(/^(sh|sz)/, "").toUpperCase();
      return { symbol: prefixed, name, dataType: "astock", period: "101" };
    }
    // Crypto plain like "BTCUSDT"
    const cryptoPlain = s.match(/^([A-Z]{2,10})(USDT|USDC|BTC|ETH)$/i);
    if (cryptoPlain) {
      const base = cryptoPlain[1].toUpperCase();
      const quote = cryptoPlain[2].toUpperCase();
      return { symbol: `${base}/${quote}`, name: base, dataType: "crypto", period: "101" };
    }
    // Plain US ticker (letters, maybe with a dot for class shares)
    if (/^[A-Za-z.\-]{1,8}$/.test(s)) {
      const upper = s.toUpperCase();
      return { symbol: upper, name: upper, dataType: "stock", period: "101" };
    }
    // Fallback: treat as crypto pair suffix heuristic
    const upper = s.toUpperCase();
    return { symbol: upper, name: upper, dataType: "crypto", period: "101" };
  }, []);
  /**
   * Switch the chart to the given symbol from an LLM response.
   *
   * The final chart title is ALWAYS rebuilt on the frontend as:
   *     `${name} · ${code}`
   * We never trust the raw chart.title string from the LLM directly, because
   * it may contain extra words like "模拟行情走势" or "demo".
   *
   * Priority for `name`:
   *   1. The part before " · " in the LLM-provided title, after noise cleaning.
   *   2. The display name produced by normalizeSymbolAndType.
   *   3. The bare code (so the title becomes "CODE · CODE").
   */
  const applySymbolFromLLM = useCallback(
    async (rawSymbol: string, providedTitle?: string) => {
      if (!rawSymbol) return;
      const { symbol, name, dataType, period } = normalizeSymbolAndType(rawSymbol);
      // Try to extract a clean name from the LLM-provided title.
      let cleanedName = "";
      if (providedTitle && providedTitle.trim().length > 0) {
        // If there is a "·" separator, take only the part before it.
        const parts = providedTitle.split("·");
        const head = parts.length >= 2 ? parts[0] : providedTitle;
        cleanedName = cleanTitleFragment(head);
      }
      // Choose the final name.
      // Never allow the name to be empty, and never allow it to equal the raw
      // code when a better candidate exists.
      const displaySymbol = symbol.replace(/^sh|^sz/, "").toUpperCase();
      let finalName = cleanedName;
      if (!finalName || finalName === displaySymbol) {
        finalName = name && name !== displaySymbol ? name : displaySymbol;
      }
      console.log("[MainPanel] Applying symbol from LLM:", {
        symbol,
        finalName,
        displaySymbol,
        dataType,
        period,
      });
      // fetchDataForSymbol will still concatenate " · " + displaySymbol itself,
      // but we pass only the sanitized name here to keep the pipeline single-sourced.
      await fetchDataForSymbol(symbol, finalName, period, MAX_DATA_POINTS, dataType);
    },
    [fetchDataForSymbol, normalizeSymbolAndType, cleanTitleFragment],
  );
  /**
   * Listen for chart data updates from LLM responses.
   * Also handles structured analysis + mandatory disclaimer.
   *
   * Whenever the LLM response carries a symbol, the chart is switched to
   * that symbol, even if the rest of the chart block is minimal.
   *
   * When an analysis block is detected, the "AI" tab is automatically opened
   * and the function area is expanded so the user can see the result immediately.
   */
  useEffect(() => {
    const handleChartDataUpdated = (event: CustomEvent) => {
      const { content, messageId } = event.detail;
      if (!content) return;
      if (messageId && processedMessageIdsRef.current.has(messageId)) {
        console.log("[MainPanel] Skipping already processed chart data:", messageId);
        return;
      }
      // Parse once; the same parsed object drives both chart and analysis.
      let parsed: any = null;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = null;
      }
      // Handle symbol switch FIRST, independent of full chart payload
      const rawSymbol: string | undefined = parsed?.terminalResponse?.chart?.symbol;
      if (rawSymbol) {
        // Pass the LLM-provided chart title (if any) so the frontend can extract
        // a clean display name from it. The final title is rebuilt locally as
        // "name · code" and never taken verbatim from the LLM.
        const providedTitle: string | undefined = parsed?.terminalResponse?.chart?.title;
        applySymbolFromLLM(rawSymbol, providedTitle);
      }
      // Handle chart operations (DSL, indicators, marks, chart type)
      if (parsed && hasChartData(content)) {
        const chartData = extractChartData(content);
        if (chartData) {
          console.log("[MainPanel] Processing chart operation from LLM:", chartData);
          // Handle DSL script execution
          if (chartData.dslScript) {
            if (dslRef.current) {
              dslRef.current.setScript(chartData.dslScript);
              if (chartData.autoExecuteDSL !== false) {
                setTimeout(() => dslRef.current?.execute(), 300);
              }
            }
          }
          // Apply chart config.
          // NOTE: We intentionally DO NOT copy chartData.title into config.title,
          // because the title is already fully managed by setChartSymbol via the
          // "name · code" pipeline. Copying the raw LLM title here would
          // overwrite the clean title with the possibly-dirty LLM one.
          if (chartRef.current) {
            const config: any = {};
            if (chartData.chartType) config.chartType = chartData.chartType;
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
      }
      // Handle structured analysis + disclaimer (independent of chart)
      if (parsed) {
        const analysis = parsed?.terminalResponse?.analysis;
        const chatMsg = parsed?.chatResponse?.m;
        const rawDisclaimer = parsed?.chatResponse?.disclaimer;
        if (analysis || chatMsg) {
          const lang: "zh" | "en" = isZh ? "zh" : "en";
          const safeDisclaimer = resolveDisclaimer(rawDisclaimer, lang);
          // Fallback safety net: always show a disclaimer when analysis exists
          const finalDisclaimer = analysis ? safeDisclaimer || (lang === "zh" ? DEFAULT_DISCLAIMER_ZH : DEFAULT_DISCLAIMER_EN) : "";
          // Pass the whole analysis object; the panel decides what to render.
          const merged = { ...(analysis || {}), _chatMessage: chatMsg || "" };
          setAnalysisData(merged);
          setAnalysisDisclaimer(finalDisclaimer);
          // Automatically open the "AI" tab and expand the function area
          // so the freshly received analysis is visible immediately.
          setActiveFunctionTab("ai");
          setIsFunctionCollapsed(false);
        }
      }
      // Mark the message as processed after handling, so re-dispatches are ignored.
      if (messageId) processedMessageIdsRef.current.add(messageId);
    };
    window.addEventListener("chart-data-updated", handleChartDataUpdated as EventListener);
    return () => window.removeEventListener("chart-data-updated", handleChartDataUpdated as EventListener);
  }, [convertStaticMarks, isZh, applySymbolFromLLM]);
  useEffect(() => {
    const handleOpenChartWithData = (event: CustomEvent) => {
      const { taskData } = event.detail;
      if (taskData?.final_output) {
        try {
          const parsedData = JSON.parse(taskData.final_output);
          if (parsedData.terminalResponse?.chart) {
            const chartData = parsedData.terminalResponse.chart;
            if (chartData.symbol) {
              applySymbolFromLLM(chartData.symbol, chartData.title);
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
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener("open-chart-with-data", handleOpenChartWithData as EventListener);
    return () => window.removeEventListener("open-chart-with-data", handleOpenChartWithData as EventListener);
  }, [convertStaticMarks, applySymbolFromLLM]);
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
  useEffect(() => {
    if (!initialLoadRef.current && (!data || data.length === 0)) {
      initialLoadRef.current = true;
      console.log("[MainPanel] Loading default BTC data (once)");
      fetchDataForSymbol("BTC/USDT", "BTC", "101", MAX_DATA_POINTS, "crypto");
    }
  }, [data, fetchDataForSymbol]);
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
      case "ai":
        return <AIAnalysis theme={theme} i18n={i18n} analysis={analysisData} disclaimer={analysisDisclaimer} currentSessionId={currentSessionId} />;
      case "history":
        return <HistorySession ref={historySessionRef} t={translate} i18n={i18n} onSessionSelect={onSessionSelect} currentSessionId={currentSessionId} onNewSession={onNewSession} />;
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
