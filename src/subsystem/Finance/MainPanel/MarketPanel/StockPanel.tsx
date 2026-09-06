import React, { useState, useEffect, useCallback, useRef } from "react";
import { StockPanelProps } from "./types";
import { YahooStockItem, createFallbackStockData } from "../../../../command/Finance/Yahoo";
const StockPanel: React.FC<StockPanelProps> = ({ theme, i18n, onStockClick }) => {
  const isDark = theme === "dark";
  const isZh = i18n === "zh-cn";
  const [stockList, setStockList] = useState<YahooStockItem[]>([]);
  const [filteredStockList, setFilteredStockList] = useState<YahooStockItem[]>([]);
  const [displayedStockList, setDisplayedStockList] = useState<YahooStockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockSortBy, setStockSortBy] = useState<"volume" | "change" | "marketCap">("volume");
  const [stockLoading, setStockLoading] = useState(false);
  const [stockRefreshing, setStockRefreshing] = useState(false);
  const [stockDisplayCount, setStockDisplayCount] = useState(20);
  const [stockHasMore, setStockHasMore] = useState(true);
  const hasLoadedRef = useRef(false);
  const loadTriggerRef = useRef<HTMLDivElement>(null);
  /**
   * Format number with K, M, B, T suffixes
   */
  const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return "0";
    }
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  };
  /**
   * Format price with appropriate decimal places
   */
  const formatPrice = (price: number | undefined): string => {
    if (price === undefined || price === null || isNaN(price)) {
      return "0.00";
    }
    if (price >= 1000) {
      return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (price >= 100) return price.toFixed(2);
    if (price >= 10) return price.toFixed(2);
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(3);
  };
  /**
   * Update stock state with new data
   */
  const updateStockState = useCallback(
    (stocks: YahooStockItem[]) => {
      setStockList(stocks);
      let sorted = [...stocks];
      if (stockSortBy === "volume") {
        sorted.sort((a, b) => (b.volume || 0) - (a.volume || 0));
      } else if (stockSortBy === "change") {
        sorted.sort((a, b) => Math.abs(b.changePercent || 0) - Math.abs(a.changePercent || 0));
      } else {
        sorted.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      }
      setFilteredStockList(sorted);
      setDisplayedStockList(sorted.slice(0, stockDisplayCount));
      setStockHasMore(sorted.length > stockDisplayCount);
    },
    [stockSortBy, stockDisplayCount],
  );
  /**
   * Load stock data - using fallback data immediately
   * No network requests to avoid CORS issues
   */
  const loadData = useCallback(() => {
    if (hasLoadedRef.current) return;
    setStockLoading(true);
    setStockRefreshing(true);
    // Use fallback data immediately
    const fallbackStocks = createFallbackStockData();
    updateStockState(fallbackStocks);
    hasLoadedRef.current = true;
    setStockLoading(false);
    setStockRefreshing(false);
  }, [updateStockState]);
  /**
   * Load more stocks for pagination
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
   * Refresh stock data - reload fallback data
   */
  const handleRefresh = useCallback(() => {
    if (stockRefreshing || stockLoading) return;
    hasLoadedRef.current = false;
    setStockDisplayCount(20);
    loadData();
  }, [loadData, stockLoading, stockRefreshing]);
  // Filter and sort
  useEffect(() => {
    if (!searchTerm.trim()) {
      const sorted = [...stockList];
      if (stockSortBy === "volume") {
        sorted.sort((a, b) => (b.volume || 0) - (a.volume || 0));
      } else if (stockSortBy === "change") {
        sorted.sort((a, b) => Math.abs(b.changePercent || 0) - Math.abs(a.changePercent || 0));
      } else {
        sorted.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      }
      setFilteredStockList(sorted);
      setDisplayedStockList(sorted.slice(0, stockDisplayCount));
      setStockHasMore(sorted.length > stockDisplayCount);
    } else {
      const filtered = stockList.filter((item) => (item.symbol && item.symbol.toLowerCase().includes(searchTerm.toLowerCase())) || (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) || (item.sector && item.sector.toLowerCase().includes(searchTerm.toLowerCase())));
      const sorted = filtered;
      if (stockSortBy === "volume") {
        sorted.sort((a, b) => (b.volume || 0) - (a.volume || 0));
      } else if (stockSortBy === "change") {
        sorted.sort((a, b) => Math.abs(b.changePercent || 0) - Math.abs(a.changePercent || 0));
      } else {
        sorted.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      }
      setFilteredStockList(sorted);
      setDisplayedStockList(sorted.slice(0, stockDisplayCount));
      setStockHasMore(sorted.length > stockDisplayCount);
    }
  }, [searchTerm, stockSortBy, stockList, stockDisplayCount]);
  // Initialize - load immediately when component mounts
  useEffect(() => {
    // Load data immediately with a small delay to allow UI to render first
    const timer = setTimeout(() => {
      if (!hasLoadedRef.current) {
        loadData();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [loadData]);
  /**
   * Render individual stock item
   */
  const renderItem = (stock: YahooStockItem) => {
    if (!stock || !stock.symbol) {
      return null;
    }
    const isPositive = (stock.changePercent || 0) >= 0;
    const currentPrice = stock.currentPrice !== undefined && !isNaN(stock.currentPrice) ? stock.currentPrice : 0;
    const volume = stock.volume !== undefined && !isNaN(stock.volume) ? stock.volume : 0;
    const changePercent = stock.changePercent !== undefined && !isNaN(stock.changePercent) ? stock.changePercent : 0;
    return (
      <div
        key={stock.symbol}
        onClick={() => onStockClick?.(stock.symbol)}
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
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, marginRight: "4px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)" }}>{stock.symbol}</span>
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
          <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{stock.name || stock.symbol}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px", minWidth: "55px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              color: isPositive ? "var(--accent-green)" : "var(--accent-red)",
            }}
          >
            {isPositive ? "↗" : "↘"}
            {Math.abs(changePercent).toFixed(2)}%
          </span>
          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{isZh ? "涨跌" : "Change"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)" }}>${formatPrice(currentPrice)}</span>
          <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>{volume > 0 ? `Vol: ${formatNumber(volume)}` : ""}</span>
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
          flexShrink: 0,
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
          <button
            onClick={handleRefresh}
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
        <input
          type="text"
          placeholder={isZh ? "搜索股票..." : "Search stocks..."}
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
        {stockLoading && displayedStockList.length === 0 && <div style={{ marginTop: "4px", fontSize: "10px", textAlign: "center", color: "var(--text-muted)" }}>{isZh ? "加载数据..." : "Loading..."}</div>}
      </div>
      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0", backgroundColor: "var(--bg-primary)" }}>
        {displayedStockList.length === 0 && !stockLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "暂无股票数据" : "No stocks available"}</span>
          </div>
        ) : (
          displayedStockList.map(renderItem)
        )}
      </div>
      {/* Load more */}
      {stockHasMore && displayedStockList.length > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            padding: "8px",
            borderTop: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-secondary)",
            flexShrink: 0,
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
            }}
          >
            {isZh ? `显示更多 (${displayedStockList.length}/${filteredStockList.length})` : `Load More (${displayedStockList.length}/${filteredStockList.length})`}
          </button>
        </div>
      )}
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
            flexShrink: 0,
          }}
        >
          {isZh ? `已显示全部 ${filteredStockList.length} 只股票` : `Showing all ${filteredStockList.length} stocks`}
        </div>
      )}
    </div>
  );
};
export default StockPanel;
