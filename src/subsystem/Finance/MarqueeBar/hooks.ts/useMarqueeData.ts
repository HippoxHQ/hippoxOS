import { useState, useEffect, useCallback } from "react";
import { TickerItem } from "../TickerBar";
import { NewsItem } from "../NewsTicker";
import { fetchFinancialNews } from "../../../../command/Finance/News";
export function useMarqueeData(language: "zh" | "en" = "en") {
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const isZh = language === "zh";
  /**
   * Fetch crypto data directly from Binance API
   */
  const fetchCryptoData = useCallback(async () => {
    try {
      const symbols = [
        "BTCUSDT",
        "ETHUSDT",
        "BNBUSDT",
        "SOLUSDT",
        "XRPUSDT",
        "ADAUSDT",
        "DOGEUSDT",
        "DOTUSDT",
        "LINKUSDT",
        "MATICUSDT",
        "AVAXUSDT",
        "UNIUSDT",
        "ATOMUSDT",
        "LTCUSDT",
        "BCHUSDT",
        "NEARUSDT",
        "APTUSDT",
        "ARBUSDT",
        "OPUSDT",
        "INJUSDT",
      ];
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`
      );
      if (!response.ok) throw new Error("Failed to fetch Binance data");
      const data = await response.json();
      if (data && data.length > 0) {
        const mapped: TickerItem[] = data.map((item: any) => ({
          symbol: item.symbol.replace("USDT", "/USDT"),
          price: parseFloat(item.lastPrice),
          change: parseFloat(item.priceChange),
          changePercent: parseFloat(item.priceChangePercent),
          volume: parseFloat(item.volume),
          high: parseFloat(item.highPrice),
          low: parseFloat(item.lowPrice),
        }));
        setTickerItems(mapped);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("[Marquee] Failed to fetch crypto data:", error);
    }
  }, []);
  /**
   * Fetch news data from backend Tauri command
   */
  const fetchNewsData = useCallback(async () => {
    try {
      const news = await fetchFinancialNews(20);
      if (news && news.length > 0) {
        const mapped: NewsItem[] = news.map((item) => ({
          id: item.id,
          title: item.title,
          source: item.source,
          time: item.published_at
            ? new Date(item.published_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
            : undefined,
          url: item.url,
          source_url: item.source_url,
          summary: item.summary,
          sentiment: item.sentiment,
          category: item.category,
        }));
        setNewsItems(mapped);
      }
    } catch (error) {
      console.error("[Marquee] Failed to fetch news data:", error);
    }
  }, []);
  /**
   * Fetch all data
   */
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchCryptoData(), fetchNewsData()]);
    } catch (error) {
      console.error("[Marquee] Failed to fetch all data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchCryptoData, fetchNewsData]);
  /**
   * Initial fetch
   */
  useEffect(() => {
    fetchAllData();
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);
  return {
    tickerItems,
    newsItems,
    isLoading,
    lastUpdate,
    refresh: fetchAllData,
  };
}