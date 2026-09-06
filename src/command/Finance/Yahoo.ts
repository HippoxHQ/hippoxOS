import { invoke } from "@tauri-apps/api/core";
export interface YahooStockItem {
    symbol: string;
    name: string;
    currentPrice: number;
    changePercent: number;
    changeAmount: number;
    volume: number;
    marketCap?: number;
    sector?: string;
    exchange?: string;
    open?: number;
    high?: number;
    low?: number;
    previousClose?: number;
}
export interface YahooBatchResponse {
    success: boolean;
    message: string;
    total: number;
    data: YahooStockItem[];
}
// Popular US stocks for default tracking
export const POPULAR_STOCKS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META",
    "TSLA", "NVDA", "BRK-B", "JPM", "V",
    "JNJ", "WMT", "UNH", "PG", "MA",
    "HD", "CVX", "BAC", "XOM", "PFE"
];
/**
 * Fetch stocks from Yahoo Finance via Tauri backend
 */
export async function fetchStocksBatch(symbols: string[] = POPULAR_STOCKS): Promise<YahooStockItem[]> {
    try {
        const response = await invoke<YahooBatchResponse>("cmd_fetch_yahoo_stocks", { symbols });
        if (response.success) {
            return response.data;
        }
        console.warn("[Yahoo] Failed to fetch stocks:", response.message);
        return [];
    } catch (error) {
        console.error("[Yahoo] Error fetching stocks:", error);
        return [];
    }
}
/**
 * Generate fallback stock data when API is unavailable
 */
export const createFallbackStockData = (): YahooStockItem[] => {
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
        const volume = Math.floor(Math.random() * 1e7 + 1e6);
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
        };
    });
};