import React, { useState, useEffect, useCallback, useRef } from "react";
import { CryptoPanelProps } from "./types";
import { BinanceCryptoItem, BINANCE_WS_URL, createSubscriptionMessages, POPULAR_CRYPTO_PAIRS, updateCryptoPrice, fetchCryptoInitialData, sortCryptoItems, createFallbackCryptoData, filterCryptoItems } from "../../../../command/Finance/Binance";
const CryptoPanel: React.FC<CryptoPanelProps> = ({ theme, i18n, onCryptoClick }) => {
  const isDark = theme === "dark";
  const isZh = i18n === "zh-cn";
  const [cryptoList, setCryptoList] = useState<BinanceCryptoItem[]>([]);
  const [filteredCryptoList, setFilteredCryptoList] = useState<BinanceCryptoItem[]>([]);
  const [displayedCryptoList, setDisplayedCryptoList] = useState<BinanceCryptoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"volume" | "change">("volume");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  /**
   * Initialize Binance WebSocket connection
   */
  const initializeWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current) wsRef.current.close();
    try {
      const ws = new WebSocket(BINANCE_WS_URL);
      wsRef.current = ws;
      ws.onopen = () => {
        setWsConnected(true);
        setError(null);
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
          if (data.e === "24hrTicker") {
            setCryptoList((prev) => updateCryptoPrice(data, prev));
          }
        } catch {
          // Ignore parsing errors
        }
      };
      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => {
        setWsConnected(false);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => initializeWebSocket(), 5000);
      };
    } catch {
      // Silent fail
    }
  }, []);
  /**
   * Load crypto data via Tauri backend
   */
  const loadData = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchCryptoInitialData();
      if (data && data.length > 0) {
        setCryptoList(data);
        const sorted = sortCryptoItems(data, sortBy);
        setFilteredCryptoList(sorted);
        setDisplayedCryptoList(sorted.slice(0, displayCount));
        setHasMore(sorted.length > displayCount);
      } else {
        // Use fallback if no data
        const fallbackData = createFallbackCryptoData();
        setCryptoList(fallbackData);
        const sorted = sortCryptoItems(fallbackData, sortBy);
        setFilteredCryptoList(sorted);
        setDisplayedCryptoList(sorted.slice(0, displayCount));
        setHasMore(sorted.length > displayCount);
      }
    } catch {
      const fallbackData = createFallbackCryptoData();
      setCryptoList(fallbackData);
      const sorted = sortCryptoItems(fallbackData, sortBy);
      setFilteredCryptoList(sorted);
      setDisplayedCryptoList(sorted.slice(0, displayCount));
      setHasMore(sorted.length > displayCount);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [sortBy, displayCount]);
  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setDisplayCount(20);
    loadData();
  }, [loadData]);
  /**
   * Load more
   */
  const loadMore = useCallback(() => {
    if (hasMore) {
      const newDisplayCount = displayCount + 20;
      setDisplayCount(newDisplayCount);
      setDisplayedCryptoList(filteredCryptoList.slice(0, newDisplayCount));
      setHasMore(filteredCryptoList.length > newDisplayCount);
    }
  }, [displayCount, filteredCryptoList, hasMore]);
  // Filter and sort
  useEffect(() => {
    let filtered = cryptoList;
    if (searchTerm.trim()) {
      filtered = filterCryptoItems(cryptoList, searchTerm);
    }
    const sorted = sortCryptoItems(filtered, sortBy);
    setFilteredCryptoList(sorted);
    setDisplayedCryptoList(sorted.slice(0, displayCount));
    setHasMore(sorted.length > displayCount);
  }, [searchTerm, sortBy, cryptoList, displayCount]);
  // Initialize
  useEffect(() => {
    initializeWebSocket();
    loadData();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);
  /**
   * Render individual crypto item
   * Safely handles undefined values
   */
  const renderItem = (crypto: BinanceCryptoItem) => {
    // Skip rendering if crypto is invalid
    if (!crypto || !crypto.pair) {
      return null;
    }
    // Safely get values with defaults
    const currentPrice = crypto.currentPrice !== undefined && !isNaN(crypto.currentPrice) ? crypto.currentPrice : 0;
    const change24h = crypto.change24h !== undefined && !isNaN(crypto.change24h) ? crypto.change24h : 0;
    const isPositive = change24h >= 0;
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
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>{crypto.pair}</span>
          <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{isZh ? "现货" : "Spot"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px", minWidth: "60px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: isPositive ? "var(--accent-green)" : "var(--accent-red)",
            }}
          >
            {isPositive ? "↗" : "↘"}
            {Math.abs(change24h).toFixed(2)}%
          </span>
          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>24h</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)" }}>
            {currentPrice >= 100
              ? currentPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : currentPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
          </span>
          <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>{isZh ? "现价" : "Price"}</span>
        </div>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Controls */}
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
      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0", backgroundColor: "var(--bg-primary)" }}>
        {isLoading && displayedCryptoList.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "加载中..." : "Loading..."}</span>
          </div>
        ) : displayedCryptoList.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "暂无数据" : "No data"}</span>
          </div>
        ) : (
          displayedCryptoList.map(renderItem)
        )}
      </div>
      {/* Load more */}
      {hasMore && (
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
            }}
          >
            {isZh ? `显示更多 (${displayedCryptoList.length}/${filteredCryptoList.length})` : `Load More (${displayedCryptoList.length}/${filteredCryptoList.length})`}
          </button>
        </div>
      )}
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
    </div>
  );
};
export default CryptoPanel;
