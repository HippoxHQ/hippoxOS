import React, { useState, useEffect, useCallback, useRef } from "react";
import { AStockPanelProps } from "./types";
import { AStockItem, sortAStocks, fetchAStocksMapped, filterAStocks } from "../../../../command/Finance/AStock";
const AStockPanel: React.FC<AStockPanelProps> = ({ theme, i18n, onAStockClick }) => {
  const isDark = theme === "dark";
  const isZh = i18n === "zh-cn";
  const [aStockList, setAStockList] = useState<AStockItem[]>([]);
  const [filteredAStockList, setFilteredAStockList] = useState<AStockItem[]>([]);
  const [displayedAStockList, setDisplayedAStockList] = useState<AStockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [aStockSortBy, setAStockSortBy] = useState<"volume" | "change" | "marketCap">("marketCap");
  const [aStockLoading, setAStockLoading] = useState(false);
  const [aStockRefreshing, setAStockRefreshing] = useState(false);
  const [aStockDisplayCount, setAStockDisplayCount] = useState(20);
  const [aStockHasMore, setAStockHasMore] = useState(true);
  const [aStockError, setAStockError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  /**
   * Update A-share state
   */
  const updateAStockState = useCallback(
    (stocks: AStockItem[]) => {
      setAStockList(stocks);
      const sorted = sortAStocks(stocks, aStockSortBy);
      setFilteredAStockList(sorted);
      setDisplayedAStockList(sorted.slice(0, aStockDisplayCount));
      setAStockHasMore(sorted.length > aStockDisplayCount);
    },
    [aStockSortBy, aStockDisplayCount],
  );
  /**
   * Load data
   */
  const loadData = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      setAStockLoading(true);
      setAStockRefreshing(true);
      setAStockError(null);
      const stocks = await fetchAStocksMapped(300);
      if (stocks.length === 0) {
        setAStockList([]);
        setFilteredAStockList([]);
        setDisplayedAStockList([]);
        setAStockHasMore(false);
      } else {
        updateAStockState(stocks);
      }
    } catch {
      setAStockList([]);
      setFilteredAStockList([]);
      setDisplayedAStockList([]);
      setAStockHasMore(false);
    } finally {
      setAStockLoading(false);
      setAStockRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [updateAStockState]);
  /**
   * Load more
   */
  const loadMoreAStocks = useCallback(() => {
    if (aStockHasMore) {
      const newDisplayCount = aStockDisplayCount + 20;
      setAStockDisplayCount(newDisplayCount);
      setDisplayedAStockList(filteredAStockList.slice(0, newDisplayCount));
      setAStockHasMore(filteredAStockList.length > newDisplayCount);
    }
  }, [aStockDisplayCount, filteredAStockList, aStockHasMore]);
  // Filter and sort
  useEffect(() => {
    const filtered = filterAStocks(aStockList, searchTerm);
    const sorted = sortAStocks(filtered, aStockSortBy);
    setFilteredAStockList(sorted);
    setDisplayedAStockList(sorted.slice(0, aStockDisplayCount));
    setAStockHasMore(sorted.length > aStockDisplayCount);
  }, [searchTerm, aStockSortBy, aStockList, aStockDisplayCount]);
  // Initialize
  useEffect(() => {
    loadData();
  }, []);
  // Render item
  const renderItem = (stock: AStockItem) => {
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
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)" }}>{stock.symbol.replace(/^sh|^sz/, "").toUpperCase()}</span>
            {stock.exchange && <span style={{ marginLeft: "4px", fontSize: "8px", padding: "0 4px", borderRadius: "4px", backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>{stock.exchange}</span>}
          </div>
          <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{stock.name}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px", minWidth: "55px" }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: isPositive ? "var(--accent-green)" : "var(--accent-red)" }}>
            {isPositive ? "↗" : "↘"}
            {Math.abs(stock.changePercent).toFixed(2)}%
          </span>
          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{isZh ? "涨跌" : "Change"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)" }}>¥{formatPrice(stock.currentPrice)}</span>
          <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>{stock.volume > 0 ? `Vol: ${formatNumber(stock.volume)}` : ""}</span>
        </div>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Controls */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, padding: "8px", borderBottom: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
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
          <button
            onClick={() => {
              setAStockRefreshing(true);
              loadData();
            }}
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
        <input
          type="text"
          placeholder={isZh ? "搜索A股..." : "Search A-shares..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0", backgroundColor: "var(--bg-primary)" }}>
        {aStockLoading && displayedAStockList.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "加载A股数据..." : "Loading A-shares..."}</span>
          </div>
        ) : displayedAStockList.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "暂无A股数据" : "No A-shares available"}</span>
          </div>
        ) : (
          displayedAStockList.map(renderItem)
        )}
      </div>
      {/* Load more */}
      {aStockHasMore && (
        <div style={{ position: "sticky", bottom: 0, padding: "8px", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
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
            }}
          >
            {isZh ? `显示更多 (${displayedAStockList.length}/${filteredAStockList.length})` : `Load More (${displayedAStockList.length}/${filteredAStockList.length})`}
          </button>
        </div>
      )}
      {filteredAStockList.length > 0 && !aStockHasMore && (
        <div style={{ position: "sticky", bottom: 0, padding: "4px", fontSize: "9px", textAlign: "center", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-muted)" }}>
          {isZh ? `已显示全部 ${filteredAStockList.length} 只A股` : `Showing all ${filteredAStockList.length} A-shares`}
        </div>
      )}
    </div>
  );
};
export default AStockPanel;
