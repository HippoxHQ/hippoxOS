import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { dispatchSetChartData } from "../FinanceWindowsEventsManager";
export interface TickerItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  volume?: number;
}
interface TickerBarProps {
  items?: TickerItem[];
  theme?: "light" | "dark";
  speed?: number;
}
const TickerBar: React.FC<TickerBarProps> = ({ items: externalItems, theme = "dark", speed = 60 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  // Internal state for ticker data
  const [internalItems, setInternalItems] = useState<TickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDark = theme === "dark";
  // Use external items if provided, otherwise use internal
  const items = externalItems && externalItems.length > 0 ? externalItems : internalItems;
  const formatPrice = useCallback((price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(6);
    return price.toFixed(8);
  }, []);
  const formatChange = useCallback((change: number): string => {
    return change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
  }, []);
  // Fetch crypto data from Binance
  const fetchCryptoData = useCallback(async () => {
    try {
      const response = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22BNBUSDT%22,%22SOLUSDT%22,%22XRPUSDT%22,%22ADAUSDT%22,%22DOGEUSDT%22,%22DOTUSDT%22,%22LINKUSDT%22,%22MATICUSDT%22,%22AVAXUSDT%22,%22UNIUSDT%22%5D");
      if (!response.ok) throw new Error("Failed to fetch Binance data");
      const data = await response.json();
      const mapped: TickerItem[] = data.map((item: any) => ({
        symbol: item.symbol.replace("USDT", "/USDT"),
        price: parseFloat(item.lastPrice),
        change: parseFloat(item.priceChange),
        changePercent: parseFloat(item.priceChangePercent),
        high: parseFloat(item.highPrice),
        low: parseFloat(item.lowPrice),
        volume: parseFloat(item.volume),
      }));
      setInternalItems(mapped);
      setIsLoading(false);
    } catch (error) {
      console.error("[TickerBar] Failed to fetch crypto data:", error);
      setIsLoading(false);
    }
  }, []);
  // Fetch data on mount
  useEffect(() => {
    fetchCryptoData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchCryptoData, 10000);
    return () => clearInterval(interval);
  }, [fetchCryptoData]);
  // Memoize doubled items for seamless scroll
  const doubledItems = useMemo(() => {
    if (items.length === 0) return [];
    return [...items, ...items];
  }, [items]);
  // Handle click on ticker item - dispatch event using dispatchSetChartData
  const handleItemClick = useCallback((symbol: string) => {
    console.log("[TickerBar] Clicked:", symbol);
    // Dispatch event using the existing dispatchSetChartData function
    // The chart will listen to this event and update
    dispatchSetChartData({ symbol });
  }, []);
  const renderItem = useCallback(
    (item: TickerItem, key: number) => {
      const isPositive = item.change >= 0;
      const changeColor = isPositive ? "var(--accent-green, #22c55e)" : "var(--accent-red, #ef4444)";
      return (
        <div
          key={key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "0 16px",
            whiteSpace: "nowrap",
            flexShrink: 0,
            height: "100%",
            cursor: "pointer",
            borderRadius: "4px",
            transition: "background 0.15s",
          }}
          onClick={() => handleItemClick(item.symbol)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg, rgba(255,255,255,0.06))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{item.symbol}</span>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{formatPrice(item.price)}</span>
          <span style={{ fontSize: "12px", fontWeight: 500, color: changeColor }}>{formatChange(item.change)}</span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: changeColor,
              padding: "1px 6px",
              borderRadius: "3px",
              background: isPositive ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
            }}
          >
            {isPositive ? "+" : ""}
            {item.changePercent.toFixed(2)}%
          </span>
        </div>
      );
    },
    [formatPrice, formatChange, handleItemClick],
  );
  // Animation loop
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content || items.length === 0) return;
    let isAnimating = true;
    const animate = (timestamp: number) => {
      if (!isAnimating) return;
      if (isPausedRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;
      const currentScrollLeft = container.scrollLeft;
      const maxScroll = content.scrollWidth / 2;
      if (content.scrollWidth > container.clientWidth) {
        let newScrollLeft = currentScrollLeft + delta * speed;
        if (newScrollLeft >= maxScroll) {
          newScrollLeft = newScrollLeft - maxScroll;
        }
        container.scrollLeft = newScrollLeft;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      isAnimating = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastTimestampRef.current = 0;
    };
  }, [speed, items.length]);
  const handleMouseEnter = useCallback(() => {
    isPausedRef.current = true;
  }, []);
  const handleMouseLeave = useCallback(() => {
    isPausedRef.current = false;
    lastTimestampRef.current = 0;
  }, []);
  // Show loading state
  if (isLoading && items.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.03)",
          fontSize: "11px",
          color: "var(--text-muted)",
        }}
      >
        Loading prices...
      </div>
    );
  }
  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        height: "100%",
        overflow: "hidden",
        position: "relative",
        background: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.03)",
        cursor: "pointer",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={contentRef}
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          width: "max-content",
        }}
      >
        {doubledItems.map((item, idx) => renderItem(item, idx))}
      </div>
    </div>
  );
};
export default TickerBar;
