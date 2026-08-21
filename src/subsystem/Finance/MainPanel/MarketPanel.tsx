import { PanelRightClose } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { BinanceCryptoItem, BINANCE_WS_URL, createSubscriptionMessages, POPULAR_CRYPTO_PAIRS, updateCryptoPrice, fetchCryptoInitialData, sortCryptoItems, createFallbackCryptoData, filterCryptoItems } from "../apis/Binance";
import { HyperliquidCryptoItem, HYPERLIQUID_WS_URL, createHyperliquidSubscription, POPULAR_HYPERLIQUID_PAIRS, updateHyperliquidData, fetchHyperliquidData, createFallbackHyperliquidData } from "../apis/Hyperliquid";
import { YahooStockItem, fetchStocksBatch, POPULAR_STOCKS, createFallbackStockData } from "../apis/Yahoo";
import { AStockItem, fetchAStocksMapped, sortAStocks, filterAStocks } from "../../../command/Finance/AStock";
interface MarketPanelProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  onCryptoClick?: (pair: string) => void;
  onStockClick?: (symbol: string) => void;
  onAStockClick?: (symbol: string, name?: string) => void;
  onPerpetualClick?: (pair: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}
// Define the data source types
type DataSourceType = "binance" | "yahoo" | "hyperliquid";
const MarketPanel: React.FC<MarketPanelProps> = ({ theme, i18n, onCryptoClick, onStockClick, onAStockClick, isCollapsed, onToggleCollapse, onPerpetualClick }) => {
  const isDark = theme === "dark";
  const isZh = i18n === "zh-cn";
  // State for tabs and data
  const [activeTab, setActiveTab] = useState<"crypto" | "stocks" | "perpetuals" | "astocks">("crypto");
  const [cryptoList, setCryptoList] = useState<BinanceCryptoItem[]>([]);
  const [stockList, setStockList] = useState<YahooStockItem[]>([]);
  const [perpetualList, setPerpetualList] = useState<HyperliquidCryptoItem[]>([]);
  const [aStockList, setAStockList] = useState<AStockItem[]>([]);
  // Filtered and displayed lists
  const [filteredCryptoList, setFilteredCryptoList] = useState<BinanceCryptoItem[]>([]);
  const [filteredStockList, setFilteredStockList] = useState<YahooStockItem[]>([]);
  const [filteredPerpetualList, setFilteredPerpetualList] = useState<HyperliquidCryptoItem[]>([]);
  const [filteredAStockList, setFilteredAStockList] = useState<AStockItem[]>([]);
  const [displayedCryptoList, setDisplayedCryptoList] = useState<BinanceCryptoItem[]>([]);
  const [displayedStockList, setDisplayedStockList] = useState<YahooStockItem[]>([]);
  const [displayedPerpetualList, setDisplayedPerpetualList] = useState<HyperliquidCryptoItem[]>([]);
  const [displayedAStockList, setDisplayedAStockList] = useState<AStockItem[]>([]);
  // Search and sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [perpetualSearchTerm, setPerpetualSearchTerm] = useState("");
  const [aStockSearchTerm, setAStockSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"volume" | "change">("volume");
  const [stockSortBy, setStockSortBy] = useState<"volume" | "change" | "marketCap">("volume");
  const [perpetualSortBy, setPerpetualSortBy] = useState<"volume" | "change" | "openInterest">("volume");
  const [aStockSortBy, setAStockSortBy] = useState<"volume" | "change" | "marketCap">("marketCap");
  // Loading and connection states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockRefreshing, setStockRefreshing] = useState(false);
  const [perpetualLoading, setPerpetualLoading] = useState(false);
  const [perpetualRefreshing, setPerpetualRefreshing] = useState(false);
  const [aStockLoading, setAStockLoading] = useState(false);
  const [aStockRefreshing, setAStockRefreshing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [hlWsConnected, setHlWsConnected] = useState(false);
  // Display pagination states
  const [displayCount, setDisplayCount] = useState(20);
  const [stockDisplayCount, setStockDisplayCount] = useState(20);
  const [perpetualDisplayCount, setPerpetualDisplayCount] = useState(20);
  const [aStockDisplayCount, setAStockDisplayCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [stockHasMore, setStockHasMore] = useState(true);
  const [perpetualHasMore, setPerpetualHasMore] = useState(true);
  const [aStockHasMore, setAStockHasMore] = useState(true);
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [perpetualError, setPerpetualError] = useState<string | null>(null);
  const [aStockError, setAStockError] = useState<string | null>(null);
  // Data source tracking
  const [activeDataSource, setActiveDataSource] = useState<DataSourceType>("binance");
  const [stockDataSource, setStockDataSource] = useState<DataSourceType>("yahoo");
  const [perpetualDataSource, setPerpetualDataSource] = useState<DataSourceType>("hyperliquid");
  // Refs for WebSocket connections
  const wsRef = useRef<WebSocket | null>(null);
  const hlWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hlReconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /**
   * Initialize Binance WebSocket connection for real-time crypto data
   */
  const initializeBinanceWebSocket = useCallback(() => {
    // Skip if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    const ws = new WebSocket(BINANCE_WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      setWsConnected(true);
      setError(null);
      // Send subscription messages in batches to avoid rate limiting
      const messages = createSubscriptionMessages(POPULAR_CRYPTO_PAIRS, 10);
      setTimeout(() => {
        for (const msg of messages) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
          }
        }
      }, 500);
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Update price when receiving ticker data
        if (data.e === "24hrTicker") {
          setCryptoList((prev) => updateCryptoPrice(data, prev));
        }
      } catch (err) {
        // Ignore parsing errors for non-ticker messages
      }
    };
    ws.onerror = () => {
      setError(isZh ? "Binance WebSocket 连接错误" : "Binance WebSocket connection error");
      setWsConnected(false);
    };
    ws.onclose = () => {
      setWsConnected(false);
      // Attempt to reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        initializeBinanceWebSocket();
      }, 5000);
    };
  }, [isZh]);
  /**
   * Initialize Hyperliquid WebSocket connection for real-time perpetual data
   */
  const initializeHyperliquidWebSocket = useCallback(() => {
    // Skip if already connected
    if (hlWsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    // Close existing connection
    if (hlWsRef.current) {
      hlWsRef.current.close();
    }
    const ws = new WebSocket(HYPERLIQUID_WS_URL);
    hlWsRef.current = ws;
    ws.onopen = () => {
      setHlWsConnected(true);
      setPerpetualError(null);
      // Send subscription message for ticker data
      const subMsg = createHyperliquidSubscription(POPULAR_HYPERLIQUID_PAIRS);
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(subMsg));
        }
      }, 500);
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Update perpetual data when receiving WebSocket messages
        setPerpetualList((prev) => updateHyperliquidData(data, prev));
      } catch (err) {
        // Ignore parsing errors
      }
    };
    ws.onerror = () => {
      setPerpetualError(isZh ? "Hyperliquid WebSocket 连接错误" : "Hyperliquid WebSocket connection error");
      setHlWsConnected(false);
    };
    ws.onclose = () => {
      setHlWsConnected(false);
      // Attempt to reconnect after 5 seconds
      if (hlReconnectTimeoutRef.current) {
        clearTimeout(hlReconnectTimeoutRef.current);
      }
      hlReconnectTimeoutRef.current = setTimeout(() => {
        initializeHyperliquidWebSocket();
      }, 5000);
    };
  }, [isZh]);
  /**
   * Load cryptocurrency data from Binance
   */
  const loadCryptoData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchCryptoInitialData();
      setCryptoList(data);
      // Sort and filter the data
      const sorted = sortCryptoItems(data, sortBy);
      setFilteredCryptoList(sorted);
      setDisplayedCryptoList(sorted.slice(0, displayCount));
      setHasMore(sorted.length > displayCount);
    } catch (err) {
      // Use fallback data on error
      setError(err instanceof Error ? err.message : isZh ? "获取数据失败" : "Failed to fetch data");
      const fallbackData = createFallbackCryptoData();
      setCryptoList(fallbackData);
      const sorted = sortCryptoItems(fallbackData, sortBy);
      setFilteredCryptoList(sorted);
      setDisplayedCryptoList(sorted.slice(0, displayCount));
      setHasMore(sorted.length > displayCount);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  /**
   * Load stock data from Yahoo Finance
   */
  const loadStockData = async () => {
    try {
      setStockLoading(true);
      setStockRefreshing(true);
      setStockError(null);
      const stocks = await fetchStocksBatch(POPULAR_STOCKS);
      if (stocks.length === 0) {
        // Use fallback data if no stocks were fetched
        const fallbackStocks = createFallbackStockData();
        updateStockState(fallbackStocks);
      } else {
        updateStockState(stocks);
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
  /**
   * Load perpetual futures data from Hyperliquid
   */
  const loadPerpetualData = async () => {
    try {
      setPerpetualLoading(true);
      setPerpetualRefreshing(true);
      setPerpetualError(null);
      const data = await fetchHyperliquidData();
      if (data.length === 0) {
        // Use fallback data if no perpetual data was fetched
        const fallbackData = createFallbackHyperliquidData();
        updatePerpetualState(fallbackData);
      } else {
        updatePerpetualState(data);
      }
    } catch (err) {
      setPerpetualError(isZh ? "获取永续合约数据失败" : "Failed to fetch perpetual data");
      const fallbackData = createFallbackHyperliquidData();
      updatePerpetualState(fallbackData);
    } finally {
      setPerpetualLoading(false);
      setPerpetualRefreshing(false);
    }
  };
  /**
   * Load A-share stock data from Tauri backend (Tencent + Sina dual-source)
   */
  const loadAStockData = async () => {
    try {
      setAStockLoading(true);
      setAStockRefreshing(true);
      setAStockError(null);
      // Fetch from backend via Tauri invoke
      const stocks = await fetchAStocksMapped(300);
      if (stocks.length === 0) {
        setAStockError(isZh ? "无法获取A股数据，请检查网络" : "Unable to fetch A-share data, please check network");
        setAStockList([]);
        setFilteredAStockList([]);
        setDisplayedAStockList([]);
        setAStockHasMore(false);
      } else {
        updateAStockState(stocks);
      }
    } catch (err) {
      setAStockError(isZh ? "获取A股数据失败" : "Failed to fetch A-share data");
      setAStockList([]);
      setFilteredAStockList([]);
      setDisplayedAStockList([]);
      setAStockHasMore(false);
    } finally {
      setAStockLoading(false);
      setAStockRefreshing(false);
    }
  };
  /**
   * Update stock state with new data and apply sorting
   */
  const updateStockState = (stocks: YahooStockItem[]) => {
    setStockList(stocks);
    let sorted = [...stocks];
    // Apply sorting based on selected sort type
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
  /**
   * Update perpetual state with new data and apply sorting
   */
  const updatePerpetualState = (items: HyperliquidCryptoItem[]) => {
    setPerpetualList(items);
    let sorted = [...items];
    // Apply sorting based on selected sort type
    if (perpetualSortBy === "volume") {
      sorted.sort((a, b) => b.volume - a.volume);
    } else if (perpetualSortBy === "change") {
      sorted.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    } else {
      sorted.sort((a, b) => (b.openInterest || 0) - (a.openInterest || 0));
    }
    setFilteredPerpetualList(sorted);
    setDisplayedPerpetualList(sorted.slice(0, perpetualDisplayCount));
    setPerpetualHasMore(sorted.length > perpetualDisplayCount);
  };
  /**
   * Update A-share state with new data and apply sorting
   */
  const updateAStockState = (stocks: AStockItem[]) => {
    // Store all stocks (up to 300) in the list
    setAStockList(stocks);
    const sorted = sortAStocks(stocks, aStockSortBy);
    setFilteredAStockList(sorted);
    // Only display first 20
    setDisplayedAStockList(sorted.slice(0, aStockDisplayCount));
    setAStockHasMore(sorted.length > aStockDisplayCount);
  };
  /**
   * Handle refresh for crypto data
   */
  const handleRefresh = () => {
    setIsRefreshing(true);
    setDisplayCount(20);
    loadCryptoData();
  };
  /**
   * Handle refresh for stock data
   */
  const handleRefreshStocks = () => {
    loadStockData();
  };
  /**
   * Handle refresh for perpetual data
   */
  const handleRefreshPerpetuals = () => {
    loadPerpetualData();
  };
  /**
   * Handle refresh for A-share data
   */
  const handleRefreshAStocks = () => {
    loadAStockData();
  };
  /**
   * Load more crypto items for display
   */
  const loadMore = useCallback(() => {
    if (hasMore) {
      const newDisplayCount = displayCount + 20;
      setDisplayCount(newDisplayCount);
      setDisplayedCryptoList(filteredCryptoList.slice(0, newDisplayCount));
      setHasMore(filteredCryptoList.length > newDisplayCount);
    }
  }, [displayCount, filteredCryptoList, hasMore]);
  /**
   * Load more stock items for display
   */
  const loadMoreStocks = useCallback(() => {
    if (stockHasMore) {
      const newDisplayCount = stockDisplayCount + 20;
      setStockDisplayCount(newDisplayCount);
      setDisplayedStockList(filteredStockList.slice(0, newDisplayCount));
      setStockHasMore(filteredStockList.length > newDisplayCount);
    }
  }, [stockDisplayCount, filteredStockList, stockHasMore]);
  /**
   * Load more perpetual items for display
   */
  const loadMorePerpetuals = useCallback(() => {
    if (perpetualHasMore) {
      const newDisplayCount = perpetualDisplayCount + 20;
      setPerpetualDisplayCount(newDisplayCount);
      setDisplayedPerpetualList(filteredPerpetualList.slice(0, newDisplayCount));
      setPerpetualHasMore(filteredPerpetualList.length > newDisplayCount);
    }
  }, [perpetualDisplayCount, filteredPerpetualList, perpetualHasMore]);
  /**
   * Load more A-share items for display
   */
  const loadMoreAStocks = useCallback(() => {
    if (aStockHasMore) {
      const newDisplayCount = aStockDisplayCount + 20;
      setAStockDisplayCount(newDisplayCount);
      setDisplayedAStockList(filteredAStockList.slice(0, newDisplayCount));
      setAStockHasMore(filteredAStockList.length > newDisplayCount);
    }
  }, [aStockDisplayCount, filteredAStockList, aStockHasMore]);
  /**
   * Reload data when switching tabs to ensure fresh data
   */
  useEffect(() => {
    if (activeTab === "crypto") {
      loadCryptoData();
    } else if (activeTab === "stocks") {
      loadStockData();
    } else if (activeTab === "perpetuals") {
      loadPerpetualData();
    } else if (activeTab === "astocks") {
      loadAStockData();
    }
  }, [activeTab]);
  // Effect for filtering and sorting crypto data
  useEffect(() => {
    let filtered = cryptoList;
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filterCryptoItems(cryptoList, searchTerm);
    }
    // Apply sorting
    const sorted = sortCryptoItems(filtered, sortBy);
    setFilteredCryptoList(sorted);
    setDisplayedCryptoList(sorted.slice(0, displayCount));
    setHasMore(sorted.length > displayCount);
  }, [searchTerm, sortBy, cryptoList, displayCount]);
  // Effect for filtering and sorting stock data
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
  // Effect for filtering and sorting perpetual data
  useEffect(() => {
    if (!perpetualSearchTerm.trim()) {
      const sorted = [...perpetualList];
      if (perpetualSortBy === "volume") {
        sorted.sort((a, b) => b.volume - a.volume);
      } else if (perpetualSortBy === "change") {
        sorted.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
      } else {
        sorted.sort((a, b) => (b.openInterest || 0) - (a.openInterest || 0));
      }
      setFilteredPerpetualList(sorted);
      setDisplayedPerpetualList(sorted.slice(0, perpetualDisplayCount));
      setPerpetualHasMore(sorted.length > perpetualDisplayCount);
    } else {
      const filtered = perpetualList.filter((item) => item.pair.toLowerCase().includes(perpetualSearchTerm.toLowerCase()));
      const sorted = filtered;
      if (perpetualSortBy === "volume") {
        sorted.sort((a, b) => b.volume - a.volume);
      } else if (perpetualSortBy === "change") {
        sorted.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
      } else {
        sorted.sort((a, b) => (b.openInterest || 0) - (a.openInterest || 0));
      }
      setFilteredPerpetualList(sorted);
      setDisplayedPerpetualList(sorted.slice(0, perpetualDisplayCount));
      setPerpetualHasMore(sorted.length > perpetualDisplayCount);
    }
  }, [perpetualSearchTerm, perpetualSortBy, perpetualList, perpetualDisplayCount]);
  // Effect for filtering and sorting A-share data
  useEffect(() => {
    const filtered = filterAStocks(aStockList, aStockSearchTerm);
    const sorted = sortAStocks(filtered, aStockSortBy);
    setFilteredAStockList(sorted);
    setDisplayedAStockList(sorted.slice(0, aStockDisplayCount));
    setAStockHasMore(sorted.length > aStockDisplayCount);
  }, [aStockSearchTerm, aStockSortBy, aStockList, aStockDisplayCount]);
  // Initialize data sources on mount
  useEffect(() => {
    initializeBinanceWebSocket();
    initializeHyperliquidWebSocket();
    loadCryptoData();
    loadStockData();
    loadPerpetualData();
    loadAStockData();
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (hlWsRef.current) {
        hlWsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (hlReconnectTimeoutRef.current) {
        clearTimeout(hlReconnectTimeoutRef.current);
      }
    };
  }, []);
  // Render individual crypto item
  const renderCryptoItem = (crypto: BinanceCryptoItem) => {
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
  // Render individual stock item
  const renderStockItem = (stock: YahooStockItem) => {
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
            {stock.exchange && (
              <span
                style={{
                  marginLeft: "4px",
                  fontSize: "8px",
                  padding: "0 4px",
                  borderRadius: "4px",
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                }}
              >
                {stock.exchange}
              </span>
            )}
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
  // Render individual perpetual item
  const renderPerpetualItem = (item: HyperliquidCryptoItem) => {
    const isPositive = item.change24h >= 0;
    const formatNumber = (value: number): string => {
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
      return value.toFixed(2);
    };
    return (
      <div
        key={item.pair}
        onClick={() => onPerpetualClick?.(item.pair)}
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
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "var(--text-primary)",
            }}
          >
            {item.pair}
          </span>
          <span
            style={{
              fontSize: "10px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "var(--text-secondary)",
            }}
          >
            {item.fundingRate !== undefined ? `${(item.fundingRate * 100).toFixed(3)}%` : ""}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            margin: "0 4px",
            minWidth: "60px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: isPositive ? "var(--accent-green)" : "var(--accent-red)",
            }}
          >
            {isPositive ? "↗" : "↘"}
            {Math.abs(item.change24h).toFixed(2)}%
          </span>
          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>24h</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "var(--text-primary)",
            }}
          >
            ${item.currentPrice.toFixed(2)}
          </span>
          <span
            style={{
              fontSize: "9px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "var(--text-secondary)",
            }}
          >
            {item.openInterest ? `OI: $${formatNumber(item.openInterest)}` : ""}
          </span>
        </div>
      </div>
    );
  };
  // Render individual A-share item
  const renderAStockItem = (stock: AStockItem) => {
    const isPositive = stock.changePercent >= 0;
    const formatNumber = (value: number): string => {
      if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
      return value.toFixed(2);
    };
    const formatPrice = (price: number): string => {
      if (price >= 100) return price.toFixed(2);
      if (price >= 10) return price.toFixed(2);
      if (price >= 1) return price.toFixed(3);
      return price.toFixed(4);
    };
    return (
      <div
        key={stock.symbol}
        onClick={() => onAStockClick?.(stock.symbol, stock.name)}
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
            <span style={{ fontSize: "12px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)" }}>{stock.symbol.replace(/^sh|^sz/, "").toUpperCase()}</span>
            {stock.exchange && (
              <span
                style={{
                  marginLeft: "4px",
                  fontSize: "8px",
                  padding: "0 4px",
                  borderRadius: "4px",
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                }}
              >
                {stock.exchange}
              </span>
            )}
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
          <span style={{ fontSize: "12px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)" }}>¥{formatPrice(stock.currentPrice)}</span>
          <span style={{ fontSize: "9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{stock.volume > 0 ? `Vol: ${formatNumber(stock.volume)}` : ""}</span>
        </div>
      </div>
    );
  };
  // Crypto controls - search and filter
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
  // Stock controls - search and filter
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
  // Perpetual controls - search and filter
  const perpetualControls = (
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
            onClick={() => setPerpetualSortBy("volume")}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              backgroundColor: perpetualSortBy === "volume" ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: perpetualSortBy === "volume" ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isZh ? "交易量" : "Volume"}
          </button>
          <button
            onClick={() => setPerpetualSortBy("change")}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              backgroundColor: perpetualSortBy === "change" ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: perpetualSortBy === "change" ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isZh ? "涨跌幅" : "Change"}
          </button>
          <button
            onClick={() => setPerpetualSortBy("openInterest")}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              backgroundColor: perpetualSortBy === "openInterest" ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: perpetualSortBy === "openInterest" ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isZh ? "持仓量" : "Open Int."}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={handleRefreshPerpetuals}
            disabled={perpetualLoading || perpetualRefreshing}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: perpetualLoading || perpetualRefreshing ? "not-allowed" : "pointer",
              opacity: perpetualLoading || perpetualRefreshing ? 0.5 : 1,
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
            }}
          >
            {perpetualRefreshing ? "🔄" : "↻"}
          </button>
        </div>
      </div>
      <input
        type="text"
        placeholder={isZh ? "搜索永续合约..." : "Search perpetuals..."}
        value={perpetualSearchTerm}
        onChange={(e) => setPerpetualSearchTerm(e.target.value)}
        disabled={perpetualLoading}
        style={{
          width: "100%",
          padding: "4px 8px",
          fontSize: "12px",
          borderRadius: "4px",
          border: "1px solid var(--border-color)",
          backgroundColor: perpetualLoading ? "var(--bg-tertiary)" : "var(--bg-primary)",
          color: "var(--text-primary)",
          outline: "none",
          opacity: perpetualLoading ? 0.5 : 1,
        }}
      />
      {perpetualError && <div style={{ marginTop: "4px", fontSize: "10px", textAlign: "center", color: "var(--accent-yellow)" }}>⚠️ {perpetualError}</div>}
    </div>
  );
  // A-share controls - search and filter
  const aStockControls = (
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
            onClick={() => setAStockSortBy("marketCap")}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              backgroundColor: aStockSortBy === "marketCap" ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: aStockSortBy === "marketCap" ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isZh ? "市值" : "Mkt Cap"}
          </button>
          <button
            onClick={() => setAStockSortBy("volume")}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              backgroundColor: aStockSortBy === "volume" ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: aStockSortBy === "volume" ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isZh ? "成交量" : "Volume"}
          </button>
          <button
            onClick={() => setAStockSortBy("change")}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              backgroundColor: aStockSortBy === "change" ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: aStockSortBy === "change" ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isZh ? "涨跌幅" : "Change"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>🇨🇳 A股</span>
          <button
            onClick={handleRefreshAStocks}
            disabled={aStockLoading || aStockRefreshing}
            style={{
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              cursor: aStockLoading || aStockRefreshing ? "not-allowed" : "pointer",
              opacity: aStockLoading || aStockRefreshing ? 0.5 : 1,
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
            }}
          >
            {aStockRefreshing ? "🔄" : "↻"}
          </button>
        </div>
      </div>
      <input
        type="text"
        placeholder={isZh ? "搜索A股..." : "Search A-shares..."}
        value={aStockSearchTerm}
        onChange={(e) => setAStockSearchTerm(e.target.value)}
        disabled={aStockLoading}
        style={{
          width: "100%",
          padding: "4px 8px",
          fontSize: "12px",
          borderRadius: "4px",
          border: "1px solid var(--border-color)",
          backgroundColor: aStockLoading ? "var(--bg-tertiary)" : "var(--bg-primary)",
          color: "var(--text-primary)",
          outline: "none",
          opacity: aStockLoading ? 0.5 : 1,
        }}
      />
      {aStockError && <div style={{ marginTop: "4px", fontSize: "10px", textAlign: "center", color: "var(--accent-yellow)" }}>⚠️ {aStockError}</div>}
    </div>
  );
  // Load more button for crypto
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
  // Load more button for stocks
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
  // Load more button for perpetuals
  const perpetualLoadMoreButton = perpetualHasMore && (
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
        onClick={loadMorePerpetuals}
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
        {isZh ? `显示更多 (${displayedPerpetualList.length}/${filteredPerpetualList.length})` : `Load More (${displayedPerpetualList.length}/${filteredPerpetualList.length})`}
      </button>
    </div>
  );
  // Load more button for A-shares
  const aStockLoadMoreButton = aStockHasMore && (
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
        onClick={loadMoreAStocks}
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
        {isZh ? `显示更多 (${displayedAStockList.length}/${filteredAStockList.length})` : `Load More (${displayedAStockList.length}/${filteredAStockList.length})`}
      </button>
    </div>
  );
  // Collapsed view
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
  // Full panel view
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
      {/* Header */}
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
      {/* Tab Navigation */}
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
          {isZh ? "美股" : "US Stocks"}
        </button>
        <button
          onClick={() => setActiveTab("perpetuals")}
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: "11px",
            borderRadius: "5px",
            border: "1px solid var(--border-color)",
            cursor: "pointer",
            transition: "all 0.15s",
            backgroundColor: activeTab === "perpetuals" ? "var(--bg-secondary)" : "var(--bg-tertiary)",
            color: activeTab === "perpetuals" ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          {isZh ? "永续合约" : "Perpetuals"}
        </button>
        <button
          onClick={() => setActiveTab("astocks")}
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: "11px",
            borderRadius: "5px",
            border: "1px solid var(--border-color)",
            cursor: "pointer",
            transition: "all 0.15s",
            backgroundColor: activeTab === "astocks" ? "var(--bg-secondary)" : "var(--bg-tertiary)",
            color: activeTab === "astocks" ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          {isZh ? "A股" : "A-Shares"}
        </button>
      </div>
      {/* Content Area */}
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
        ) : activeTab === "stocks" ? (
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
        ) : activeTab === "perpetuals" ? (
          <>
            {perpetualControls}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "4px 0",
                backgroundColor: "var(--bg-primary)",
              }}
            >
              {perpetualLoading && displayedPerpetualList.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "加载永续合约数据..." : "Loading perpetuals..."}</span>
                </div>
              ) : displayedPerpetualList.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "暂无永续合约数据" : "No perpetuals available"}</span>
                </div>
              ) : (
                displayedPerpetualList.map(renderPerpetualItem)
              )}
            </div>
            {perpetualLoadMoreButton}
            {filteredPerpetualList.length > 0 && !perpetualHasMore && (
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
                {isZh ? `已显示全部 ${filteredPerpetualList.length} 个永续合约` : `Showing all ${filteredPerpetualList.length} perpetuals`}
              </div>
            )}
          </>
        ) : (
          // A-shares tab
          <>
            {aStockControls}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "4px 0",
                backgroundColor: "var(--bg-primary)",
              }}
            >
              {aStockLoading && displayedAStockList.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "加载A股数据..." : "Loading A-shares..."}</span>
                </div>
              ) : displayedAStockList.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "暂无A股数据" : "No A-shares available"}</span>
                </div>
              ) : (
                displayedAStockList.map(renderAStockItem)
              )}
            </div>
            {aStockLoadMoreButton}
            {filteredAStockList.length > 0 && !aStockHasMore && (
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
                {isZh ? `已显示全部 ${filteredAStockList.length} 只A股` : `Showing all ${filteredAStockList.length} A-shares`}
              </div>
            )}
          </>
        )}
      </div>
      {/* Global styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
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
