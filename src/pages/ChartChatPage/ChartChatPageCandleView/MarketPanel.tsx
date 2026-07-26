import { PanelRightClose } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";
interface CryptoItem {
  pair: string;
  currentPrice: number;
  change24h: number;
  volume: number;
  priceChange?: number;
}
interface StockItem {
  symbol: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  changeAmount: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  sector?: string;
  exchange?: string;
  lastUpdated?: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
}
interface MarketPanelProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  onCryptoClick?: (pair: string) => void;
  onStockClick?: (symbol: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}
interface BinanceTickerStream {
  e: string;
  E: number;
  s: string;
  p: string;
  P: string;
  w: string;
  x: string;
  c: string;
  Q: string;
  b: string;
  B: string;
  a: string;
  A: string;
  o: string;
  h: string;
  l: string;
  v: string;
  q: string;
  O: number;
  C: number;
  F: number;
  L: number;
  n: number;
}
interface BinanceTicker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  askPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}
interface YahooFinanceChartResult {
  meta: {
    currency: string;
    symbol: string;
    exchangeName: string;
    fullExchangeName: string;
    instrumentType: string;
    regularMarketPrice: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    regularMarketTime: number;
    regularMarketVolume: number;
    regularMarketDayHigh: number;
    regularMarketDayLow: number;
    regularMarketPreviousClose?: number;
    chartPreviousClose?: number;
    longName?: string;
    shortName?: string;
    priceHint: number;
    dataGranularity: string;
    range: string;
  };
  timestamp: number[];
  indicators: {
    quote: Array<{
      open: (number | null)[];
      high: (number | null)[];
      low: (number | null)[];
      close: (number | null)[];
      volume: (number | null)[];
    }>;
  };
}
interface YahooFinanceResponse {
  chart: {
    result: YahooFinanceChartResult[];
    error: any;
  };
}
const POPULAR_CRYPTO_PAIRS = ["btcusdt", "ethusdt", "bnbusdt", "solusdt", "xrpusdt", "adausdt", "dogeusdt", "dotusdt", "avaxusdt", "linkusdt", "maticusdt", "uniusdt", "ltcusdt", "atomusdt", "etcusdt", "trxusdt", "filusdt", "apeusdt", "nearusdt", "ftmusdt"];
const POPULAR_STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "BRK-B", "JPM", "V", "JNJ", "WMT", "UNH", "PG", "MA", "HD", "CVX", "BAC", "XOM", "PFE"];
const MarketPanel: React.FC<MarketPanelProps> = ({ theme, i18n, onCryptoClick, onStockClick, isCollapsed, onToggleCollapse }) => {
  const isDark = theme === "dark";
  const isZh = i18n === "zh-cn";
  const [activeTab, setActiveTab] = useState<"crypto" | "stocks">("crypto");
  const [cryptoList, setCryptoList] = useState<CryptoItem[]>([]);
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [filteredCryptoList, setFilteredCryptoList] = useState<CryptoItem[]>([]);
  const [filteredStockList, setFilteredStockList] = useState<StockItem[]>([]);
  const [displayedCryptoList, setDisplayedCryptoList] = useState<CryptoItem[]>([]);
  const [displayedStockList, setDisplayedStockList] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"volume" | "change">("volume");
  const [stockSortBy, setStockSortBy] = useState<"volume" | "change" | "marketCap">("volume");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockRefreshing, setStockRefreshing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [stockDisplayCount, setStockDisplayCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [stockHasMore, setStockHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentStockApiIndexRef = useRef(0);
  const STOCK_APIS = [
    {
      name: "yfinance",
      baseUrl: "https://query1.finance.yahoo.com",
    },
  ];
  const getCSSVar = (varName: string) => {
    if (typeof document !== "undefined") {
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || undefined;
    }
    return undefined;
  };
  const initializeWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    const ws = new WebSocket("wss://stream.binance.com:9443/ws");
    wsRef.current = ws;
    ws.onopen = () => {
      setWsConnected(true);
      setError(null);
      fetchCryptoInitialData();
      setTimeout(() => {
        const batchSize = 10;
        for (let i = 0; i < POPULAR_CRYPTO_PAIRS.length; i += batchSize) {
          const batch = POPULAR_CRYPTO_PAIRS.slice(i, i + batchSize);
          const subscribeMsg = {
            method: "SUBSCRIBE",
            params: batch.map((pair) => `${pair}@ticker`),
            id: i / batchSize + 1,
          };
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(subscribeMsg));
            }
          }, i * 200);
        }
      }, 500);
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.e === "24hrTicker") {
          updateCryptoPrice(data);
        }
      } catch (err) {}
    };
    ws.onerror = () => {
      setError(isZh ? "WebSocket 连接错误" : "WebSocket connection error");
      setWsConnected(false);
    };
    ws.onclose = () => {
      setWsConnected(false);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        initializeWebSocket();
      }, 5000);
    };
  }, [isZh]);
  const fetchCryptoInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: BinanceTicker24hr[] = await response.json();
      const formattedData: CryptoItem[] = data
        .filter((item) => item.symbol.endsWith("USDT"))
        .map((item) => ({
          pair: `${item.symbol.replace("USDT", "")}/USDT`,
          currentPrice: parseFloat(item.lastPrice),
          change24h: parseFloat(item.priceChangePercent),
          volume: parseFloat(item.quoteVolume),
          priceChange: 0,
        }))
        .filter((item) => {
          return !isNaN(item.currentPrice) && !isNaN(item.change24h) && item.currentPrice > 0 && item.volume > 10000;
        });
      setCryptoList(formattedData);
      const sorted = [...formattedData].sort((a, b) => b.volume - a.volume);
      setFilteredCryptoList(sorted);
      setDisplayedCryptoList(sorted.slice(0, displayCount));
      setHasMore(sorted.length > displayCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : isZh ? "获取数据失败" : "Failed to fetch data");
      const fallbackData = createFallbackCryptoData();
      setCryptoList(fallbackData);
      const sorted = [...fallbackData].sort((a, b) => b.volume - a.volume);
      setFilteredCryptoList(sorted);
      setDisplayedCryptoList(sorted.slice(0, displayCount));
      setHasMore(sorted.length > displayCount);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  const createFallbackCryptoData = (): CryptoItem[] => {
    const pairs = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT", "ADA/USDT", "DOGE/USDT", "DOT/USDT", "AVAX/USDT", "LINK/USDT"];
    return pairs.map((pair) => ({
      pair,
      currentPrice: 100 + Math.random() * 900,
      change24h: (Math.random() - 0.5) * 20,
      volume: Math.random() * 1000000000 + 1000000,
      priceChange: 0,
    }));
  };
  const updateCryptoPrice = useCallback((tickerData: BinanceTickerStream) => {
    setCryptoList((prev) => {
      const symbol = tickerData.s;
      const newPrice = parseFloat(tickerData.c);
      const priceChangePercent = parseFloat(tickerData.P);
      const quoteVolume = parseFloat(tickerData.q);
      return prev.map((item) => {
        if (item.pair === `${symbol.replace("USDT", "")}/USDT`) {
          const oldPrice = item.currentPrice;
          const priceChange = oldPrice ? newPrice - oldPrice : 0;
          return {
            ...item,
            currentPrice: newPrice,
            change24h: priceChangePercent,
            volume: quoteVolume,
            priceChange,
          };
        }
        return item;
      });
    });
  }, []);
  const fetchStockData = async () => {
    try {
      setStockLoading(true);
      setStockRefreshing(true);
      setStockError(null);
      const successfulStocks: StockItem[] = [];
      const maxStocks = 10;
      for (let i = 0; i < Math.min(POPULAR_STOCKS.length, maxStocks); i++) {
        const symbol = POPULAR_STOCKS[i];
        try {
          const stockData = await fetchStockFromYahoo(symbol);
          if (stockData) {
            successfulStocks.push(stockData);
          }
          if (i < Math.min(POPULAR_STOCKS.length, maxStocks) - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch (err) {}
      }
      if (successfulStocks.length === 0) {
        const fallbackStocks = createFallbackStockData();
        updateStockState(fallbackStocks);
      } else {
        updateStockState(successfulStocks);
      }
    } catch (err) {
      setStockError(isZh ? "获取股票数据失败，请稍后重试" : "Failed to retrieve stock data");
      const fallbackStocks = createFallbackStockData();
      updateStockState(fallbackStocks);
    } finally {
      setStockLoading(false);
      setStockRefreshing(false);
    }
  };
  const fetchStockFromYahoo = async (symbol: string): Promise<StockItem | null> => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: YahooFinanceResponse = await response.json();
      if (data.chart.error || !data.chart.result || data.chart.result.length === 0) {
        return null;
      }
      const result = data.chart.result[0];
      const meta = result.meta;
      const indicators = result.indicators;
      const quote = indicators.quote[0];
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.regularMarketPreviousClose || meta.chartPreviousClose || currentPrice * 0.99;
      const changeAmount = currentPrice - previousClose;
      const changePercent = (changeAmount / previousClose) * 100;
      return {
        symbol: meta.symbol,
        name: meta.longName || meta.shortName || symbol,
        currentPrice,
        changePercent,
        changeAmount,
        volume: meta.regularMarketVolume,
        marketCap: undefined,
        sector: undefined,
        exchange: meta.fullExchangeName,
        lastUpdated: meta.regularMarketTime * 1000,
      };
    } catch (err) {
      return null;
    }
  };
  const createFallbackStockData = (): StockItem[] => {
    const stockTemplates = [
      { symbol: "AAPL", name: "Apple Inc.", basePrice: 185, sector: "Technology" },
      { symbol: "MSFT", name: "Microsoft Corp.", basePrice: 415, sector: "Technology" },
      { symbol: "GOOGL", name: "Alphabet Inc.", basePrice: 153, sector: "Technology" },
      { symbol: "AMZN", name: "Amazon.com Inc.", basePrice: 178, sector: "Consumer" },
      { symbol: "TSLA", name: "Tesla Inc.", basePrice: 245, sector: "Automotive" },
      { symbol: "NVDA", name: "NVIDIA Corp.", basePrice: 950, sector: "Technology" },
      { symbol: "META", name: "Meta Platforms", basePrice: 485, sector: "Technology" },
      { symbol: "JPM", name: "JPMorgan Chase", basePrice: 189, sector: "Financial" },
      { symbol: "V", name: "Visa Inc.", basePrice: 279, sector: "Financial" },
      { symbol: "JNJ", name: "Johnson & Johnson", basePrice: 161, sector: "Healthcare" },
    ];
    return stockTemplates.map((stock) => {
      const changePercent = (Math.random() - 0.5) * 5;
      const currentPrice = stock.basePrice * (1 + changePercent / 100);
      const changeAmount = currentPrice - stock.basePrice;
      const volume = Math.random() * 1e7 + 1e6;
      return {
        symbol: stock.symbol,
        name: stock.name,
        currentPrice,
        changePercent,
        changeAmount,
        volume,
        marketCap: stock.basePrice * (Math.random() * 5e6 + 1e6),
        sector: stock.sector,
        exchange: "NASDAQ",
        lastUpdated: Date.now(),
      };
    });
  };
  const updateStockState = (stocks: StockItem[]) => {
    setStockList(stocks);
    let sorted = [...stocks];
    if (stockSortBy === "volume") {
      sorted.sort((a, b) => b.volume - a.volume);
    } else if (stockSortBy === "change") {
      sorted.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    } else {
      sorted.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    }
    setFilteredStockList(sorted);
    setDisplayedStockList(sorted.slice(0, stockDisplayCount));
    setStockHasMore(sorted.length > stockDisplayCount);
  };
  const handleRefresh = () => {
    setIsRefreshing(true);
    setDisplayCount(20);
    fetchCryptoInitialData();
  };
  const handleRefreshStocks = () => {
    currentStockApiIndexRef.current = (currentStockApiIndexRef.current + 1) % STOCK_APIS.length;
    fetchStockData();
  };
  const loadMore = useCallback(() => {
    if (hasMore) {
      const newDisplayCount = displayCount + 20;
      setDisplayCount(newDisplayCount);
      setDisplayedCryptoList(filteredCryptoList.slice(0, newDisplayCount));
      setHasMore(filteredCryptoList.length > newDisplayCount);
    }
  }, [displayCount, filteredCryptoList, hasMore]);
  const loadMoreStocks = useCallback(() => {
    if (stockHasMore) {
      const newDisplayCount = stockDisplayCount + 20;
      setStockDisplayCount(newDisplayCount);
      setDisplayedStockList(filteredStockList.slice(0, newDisplayCount));
      setStockHasMore(filteredStockList.length > newDisplayCount);
    }
  }, [stockDisplayCount, filteredStockList, stockHasMore]);
  useEffect(() => {
    if (!searchTerm.trim()) {
      const sorted = [...cryptoList];
      if (sortBy === "volume") {
        sorted.sort((a, b) => b.volume - a.volume);
      } else {
        sorted.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
      }
      setFilteredCryptoList(sorted);
      setDisplayedCryptoList(sorted.slice(0, displayCount));
      setHasMore(sorted.length > displayCount);
    } else {
      const filtered = cryptoList.filter((item) => item.pair.toLowerCase().includes(searchTerm.toLowerCase()));
      const sorted = filtered;
      if (sortBy === "volume") {
        sorted.sort((a, b) => b.volume - a.volume);
      } else {
        sorted.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
      }
      setFilteredCryptoList(sorted);
      setDisplayedCryptoList(sorted.slice(0, displayCount));
      setHasMore(sorted.length > displayCount);
    }
  }, [searchTerm, sortBy, cryptoList, displayCount]);
  useEffect(() => {
    if (!stockSearchTerm.trim()) {
      const sorted = [...stockList];
      if (stockSortBy === "volume") {
        sorted.sort((a, b) => b.volume - a.volume);
      } else if (stockSortBy === "change") {
        sorted.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      } else {
        sorted.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      }
      setFilteredStockList(sorted);
      setDisplayedStockList(sorted.slice(0, stockDisplayCount));
      setStockHasMore(sorted.length > stockDisplayCount);
    } else {
      const filtered = stockList.filter((item) => item.symbol.toLowerCase().includes(stockSearchTerm.toLowerCase()) || item.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) || (item.sector && item.sector.toLowerCase().includes(stockSearchTerm.toLowerCase())));
      const sorted = filtered;
      if (stockSortBy === "volume") {
        sorted.sort((a, b) => b.volume - a.volume);
      } else if (stockSortBy === "change") {
        sorted.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      } else {
        sorted.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      }
      setFilteredStockList(sorted);
      setDisplayedStockList(sorted.slice(0, stockDisplayCount));
      setStockHasMore(sorted.length > stockDisplayCount);
    }
  }, [stockSearchTerm, stockSortBy, stockList, stockDisplayCount]);
  useEffect(() => {
    initializeWebSocket();
    fetchStockData();
    const stockInterval = setInterval(() => {
      if (!stockLoading && !stockRefreshing) {
        fetchStockData();
      }
    }, 60000);
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      clearInterval(stockInterval);
    };
  }, []);
  const renderCryptoItem = (crypto: CryptoItem) => {
    const isPositive = crypto.change24h >= 0;
    return (
      <div
        key={crypto.pair}
        onClick={() => onCryptoClick?.(crypto.pair)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          minHeight: "32px",
          transition: "background 0.15s",
          cursor: "pointer",
          borderBottom: "1px solid var(--border-color)",
          backgroundColor: "transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--hover-bg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)" }}>{crypto.pair}</span>
          <span style={{ fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{isZh ? "现货" : "Spot"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px", minWidth: "60px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: isPositive ? "var(--accent-green)" : "var(--accent-red)" }}>
            {isPositive ? "↗" : "↘"}
            {Math.abs(crypto.change24h).toFixed(2)}%
          </span>
          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>24h</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)" }}>
            {crypto.currentPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: crypto.currentPrice >= 100 ? 2 : 4,
            })}
          </span>
          <span style={{ fontSize: "9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{isZh ? "现价" : "Price"}</span>
        </div>
      </div>
    );
  };
  const renderStockItem = (stock: StockItem) => {
    const isPositive = stock.changePercent >= 0;
    const formatNumber = (value: number): string => {
      if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
      return value.toFixed(2);
    };
    const formatPrice = (price: number): string => {
      if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (price >= 100) return price.toFixed(2);
      if (price >= 10) return price.toFixed(2);
      if (price >= 1) return price.toFixed(2);
      return price.toFixed(3);
    };
    return (
      <div
        key={`${stock.symbol}`}
        onClick={() => onStockClick?.(stock.symbol)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          minHeight: "32px",
          transition: "background 0.15s",
          cursor: "pointer",
          borderBottom: "1px solid var(--border-color)",
          backgroundColor: "transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--hover-bg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, marginRight: "4px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)" }}>{stock.symbol}</span>
            {stock.exchange && <span style={{ marginLeft: "4px", fontSize: "8px", padding: "0 4px", borderRadius: "4px", backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>{stock.exchange}</span>}
          </div>
          <span style={{ fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{stock.name}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px", minWidth: "55px" }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: isPositive ? "var(--accent-green)" : "var(--accent-red)" }}>
            {isPositive ? "↗" : "↘"}
            {Math.abs(stock.changePercent).toFixed(2)}%
          </span>
          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{isZh ? "涨跌" : "Change"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)" }}>${formatPrice(stock.currentPrice)}</span>
          <span style={{ fontSize: "9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{stock.volume > 0 ? `Vol: ${formatNumber(stock.volume)}` : ""}</span>
        </div>
      </div>
    );
  };
  const cryptoControls = (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        padding: "8px",
        borderBottom: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            onClick={() => setSortBy("volume")}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              backgroundColor: sortBy === "volume" ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: sortBy === "volume" ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isZh ? "交易量" : "Volume"}
          </button>
          <button
            onClick={() => setSortBy("change")}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              backgroundColor: sortBy === "change" ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: sortBy === "change" ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isZh ? "波动" : "Change"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "9px", color: wsConnected ? "var(--accent-green)" : "var(--accent-red)" }}>{wsConnected ? "●" : "○"}</span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: isRefreshing ? "not-allowed" : "pointer",
              opacity: isRefreshing ? 0.5 : 1,
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
            }}
          >
            {isRefreshing ? "🔄" : "↻"}
          </button>
        </div>
      </div>
      <input
        type="text"
        placeholder={isZh ? "搜索交易对..." : "Search pairs..."}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: "100%",
          padding: "4px 8px",
          fontSize: "12px",
          borderRadius: "4px",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
      {isLoading && !isRefreshing && <div style={{ marginTop: "4px", fontSize: "10px", textAlign: "center", color: "var(--text-muted)" }}>{isZh ? "加载中..." : "Loading..."}</div>}
      {error && <div style={{ marginTop: "4px", fontSize: "10px", textAlign: "center", color: "var(--accent-red)" }}>{error}</div>}
    </div>
  );
  const stockControls = (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        padding: "8px",
        borderBottom: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            onClick={() => setStockSortBy("volume")}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              backgroundColor: stockSortBy === "volume" ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: stockSortBy === "volume" ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isZh ? "成交量" : "Volume"}
          </button>
          <button
            onClick={() => setStockSortBy("change")}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              backgroundColor: stockSortBy === "change" ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: stockSortBy === "change" ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isZh ? "涨跌幅" : "Change"}
          </button>
          <button
            onClick={() => setStockSortBy("marketCap")}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              backgroundColor: stockSortBy === "marketCap" ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: stockSortBy === "marketCap" ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isZh ? "市值" : "Mkt Cap"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>Yahoo</span>
          <button
            onClick={handleRefreshStocks}
            disabled={stockLoading || stockRefreshing}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: stockLoading || stockRefreshing ? "not-allowed" : "pointer",
              opacity: stockLoading || stockRefreshing ? 0.5 : 1,
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
            }}
          >
            {stockRefreshing ? "🔄" : "↻"}
          </button>
        </div>
      </div>
      <input
        type="text"
        placeholder={isZh ? "搜索股票..." : "Search stocks..."}
        value={stockSearchTerm}
        onChange={(e) => setStockSearchTerm(e.target.value)}
        disabled={stockLoading}
        style={{
          width: "100%",
          padding: "4px 8px",
          fontSize: "12px",
          borderRadius: "4px",
          border: "1px solid var(--border-color)",
          backgroundColor: stockLoading ? "var(--bg-tertiary)" : "var(--bg-primary)",
          color: "var(--text-primary)",
          outline: "none",
          opacity: stockLoading ? 0.5 : 1,
        }}
      />
      {stockError && <div style={{ marginTop: "4px", fontSize: "10px", textAlign: "center", color: "var(--accent-yellow)" }}>⚠️ {stockError}</div>}
    </div>
  );
  const loadMoreButton = hasMore && (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        padding: "8px",
        borderTop: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      <button
        onClick={loadMore}
        style={{
          width: "100%",
          padding: "6px",
          fontSize: "10px",
          fontWeight: 500,
          borderRadius: "4px",
          border: "1px solid var(--border-color)",
          cursor: "pointer",
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--text-primary)",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--hover-bg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
        }}
      >
        {isZh ? `显示更多 (${displayedCryptoList.length}/${filteredCryptoList.length})` : `Load More (${displayedCryptoList.length}/${filteredCryptoList.length})`}
      </button>
    </div>
  );
  const stockLoadMoreButton = stockHasMore && (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        padding: "8px",
        borderTop: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      <button
        onClick={loadMoreStocks}
        style={{
          width: "100%",
          padding: "6px",
          fontSize: "10px",
          fontWeight: 500,
          borderRadius: "4px",
          border: "1px solid var(--border-color)",
          cursor: "pointer",
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--text-primary)",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--hover-bg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
        }}
      >
        {isZh ? `显示更多 (${displayedStockList.length}/${filteredStockList.length})` : `Load More (${displayedStockList.length}/${filteredStockList.length})`}
      </button>
    </div>
  );
  if (isCollapsed) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "40px",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <button
          onClick={onToggleCollapse}
          style={{
            padding: "8px",
            borderRadius: "4px",
            transition: "all 0.2s",
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            border: "none",
            cursor: "pointer",
          }}
          title={isZh ? "展开市场面板" : "Expand market panel"}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    );
  }
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 12px",
          borderBottom: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-secondary)",
          flexShrink: 0,
          minHeight: "41px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          <span style={{ marginRight: "5px" }}>📊</span>
          {isZh ? "市场" : "Market"}
        </span>
        <button
          onClick={onToggleCollapse}
          style={{
            padding: "4px",
            borderRadius: "4px",
            transition: "all 0.2s",
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={isZh ? "收起市场面板" : "Collapse market panel"}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <PanelRightClose size={16} />
        </button>
      </div>
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-color)",
          flexShrink: 0,
          padding: "4px 8px",
          gap: "6px",
          backgroundColor: "var(--bg-tertiary)",
        }}
      >
        <button
          onClick={() => setActiveTab("crypto")}
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: "11px",
            borderRadius: "5px",
            border: "1px solid var(--border-color)",
            cursor: "pointer",
            transition: "all 0.15s",
            backgroundColor: activeTab === "crypto" ? "var(--bg-secondary)" : "var(--bg-tertiary)",
            color: activeTab === "crypto" ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          {isZh ? "加密货币" : "Cryptos"}
          {wsConnected && <span style={{ marginLeft: "4px", fontSize: "8px", color: "var(--accent-green)" }}>●</span>}
        </button>
        <button
          onClick={() => setActiveTab("stocks")}
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: "11px",
            borderRadius: "5px",
            border: "1px solid var(--border-color)",
            cursor: "pointer",
            transition: "all 0.15s",
            backgroundColor: activeTab === "stocks" ? "var(--bg-secondary)" : "var(--bg-tertiary)",
            color: activeTab === "stocks" ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          {isZh ? "美国股票" : "US Stocks"}
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.05)",
        }}
      >
        {activeTab === "crypto" ? (
          <>
            {cryptoControls}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "4px 0",
                backgroundColor: "var(--bg-primary)",
              }}
            >
              {isLoading && displayedCryptoList.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "加载中..." : "Loading..."}</span>
                </div>
              ) : displayedCryptoList.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "暂无数据" : "No data"}</span>
                </div>
              ) : (
                displayedCryptoList.map(renderCryptoItem)
              )}
            </div>
            {loadMoreButton}
            {filteredCryptoList.length > 0 && !hasMore && (
              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  padding: "4px",
                  fontSize: "9px",
                  textAlign: "center",
                  borderTop: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-muted)",
                }}
              >
                {isZh ? `已显示全部 ${filteredCryptoList.length} 个交易对` : `Showing all ${filteredCryptoList.length} pairs`}
              </div>
            )}
          </>
        ) : (
          <>
            {stockControls}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "4px 0",
                backgroundColor: "var(--bg-primary)",
              }}
            >
              {stockLoading && displayedStockList.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "加载股票数据..." : "Loading stocks..."}</span>
                </div>
              ) : displayedStockList.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "暂无股票数据" : "No stocks available"}</span>
                </div>
              ) : (
                displayedStockList.map(renderStockItem)
              )}
            </div>
            {stockLoadMoreButton}
            {filteredStockList.length > 0 && !stockHasMore && (
              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  padding: "4px",
                  fontSize: "9px",
                  textAlign: "center",
                  borderTop: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-muted)",
                }}
              >
                {isZh ? `已显示全部 ${filteredStockList.length} 只股票` : `Showing all ${filteredStockList.length} stocks`}
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        /* 滚动条样式 - 与 DSL 一致 */
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover);
        }
        ::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
    </div>
  );
};
export default MarketPanel;
