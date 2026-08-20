import { invoke } from "@tauri-apps/api/core";
/**
 * A-share stock price data structure (matches Rust backend)
 */
export interface AStockPrice {
    symbol: string;
    name: string;
    current_price: number;
    change_percent: number;
    change_amount: number;
    volume: number;
    turnover: number;
    high: number;
    low: number;
    open: number;
    prev_close: number;
    exchange: string;
}
/**
 * Batch response from backend
 */
export interface AStockBatchResponse {
    success: boolean;
    message: string;
    total: number;
    data: AStockPrice[];
}
/**
 * OHLCV K-line data structure
 */
export interface AStockKLine {
    date: string;      // Trading date: "2026-08-20"
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;    // Volume in shares
    amount: number;    // Turnover in CNY
}
/**
 * OHLCV response from backend
 */
export interface AStockKLineResponse {
    success: boolean;
    message: string;
    symbol: string;
    name: string;
    total: number;
    data: AStockKLine[];
}
/**
 * Frontend AStockItem interface (camelCase)
 */
export interface AStockItem {
    symbol: string;
    name: string;
    currentPrice: number;
    changePercent: number;
    changeAmount: number;
    volume: number;
    turnover?: number;
    high?: number;
    low?: number;
    open?: number;
    prevClose?: number;
    exchange?: string;
    marketCap?: number;
}
/**
 * A-share API commands
 */
export const aStockCommands = {
    /**
     * Fetch A-share stock data from Tencent & Sina (dual-source)
     * @param count - Number of stocks to fetch (default: 300, max: 300)
     */
    fetchAStocks: async (count: number = 300): Promise<AStockBatchResponse> => {
        return await invoke("cmd_fetch_a_stocks", { count });
    },
    /**
     * Get popular A-share symbols list
     * @param count - Number of symbols (default: 300)
     */
    getPopularAStocks: async (count: number = 300): Promise<string[]> => {
        return await invoke("cmd_get_popular_a_stocks", { count });
    },
    /**
     * Fetch OHLCV K-line data for a single stock from Eastmoney
     * @param symbol - Stock code, e.g. "sh600036" or "sz000001"
     * @param period - K-line period: "101"=daily (default), "102"=weekly, "103"=monthly, "1"/"5"/"15"/"30"/"60"=minutes
     * @param count - Number of records to fetch (default: 300, max: 1000)
     * @param adjust - Whether to use forward-adjusted prices (default: true)
     */
    fetchStockOHLCV: async (
        symbol: string,
        period: string = "101",
        count: number = 300,
        adjust: boolean = true
    ): Promise<AStockKLineResponse> => {
        return await invoke("cmd_fetch_a_stock_ohlcv", {
            symbol,
            period,
            count,
            adjust,
        });
    },
};
/**
 * Map backend data to frontend AStockItem format
 * Converts snake_case from Rust to camelCase for frontend
 */
export function mapToAStockItem(price: AStockPrice): AStockItem {
    return {
        symbol: price.symbol,
        name: price.name,
        currentPrice: price.current_price,
        changePercent: price.change_percent,
        changeAmount: price.change_amount,
        volume: price.volume,
        turnover: price.turnover,
        high: price.high,
        low: price.low,
        open: price.open,
        prevClose: price.prev_close,
        exchange: price.exchange,
        marketCap: price.current_price * price.volume * 10,
    };
}
/**
 * Batch map backend data to frontend format
 */
export function mapToAStockItems(prices: AStockPrice[]): AStockItem[] {
    return prices.map(mapToAStockItem);
}
/**
 * Fetch A-share stocks and return mapped frontend format
 */
export async function fetchAStocksMapped(count: number = 300): Promise<AStockItem[]> {
    const response = await aStockCommands.fetchAStocks(count);
    if (response.success) {
        return mapToAStockItems(response.data);
    }
    console.error("[AStock] Failed to fetch:", response.message);
    return [];
}
/**
 * Fetch OHLCV data and return as array of K-lines
 * @param symbol - Stock code, e.g. "sh600036" or "sz000001"
 * @param period - K-line period: "101"=daily (default), "102"=weekly, "103"=monthly, "1"/"5"/"15"/"30"/"60"=minutes
 * @param count - Number of records to fetch (default: 300, max: 1000)
 * @param adjust - Whether to use forward-adjusted prices (default: true)
 */
export async function fetchStockOHLCV(
    symbol: string,
    period: string = "101",
    count: number = 300,
    adjust: boolean = true
): Promise<AStockKLine[]> {
    const response = await aStockCommands.fetchStockOHLCV(symbol, period, count, adjust);
    if (response.success) {
        return response.data;
    }
    console.error("[AStock] Failed to fetch OHLCV:", response.message);
    return [];
}
/**
 * Filter A-stocks by search term
 */
export function filterAStocks(stocks: AStockItem[], searchTerm: string): AStockItem[] {
    if (!searchTerm.trim()) return stocks;
    const term = searchTerm.toLowerCase().trim();
    return stocks.filter(
        (item) =>
            item.symbol.toLowerCase().includes(term) ||
            item.name.toLowerCase().includes(term) ||
            (item.exchange && item.exchange.toLowerCase().includes(term))
    );
}
/**
 * Sort A-stocks by specified field
 */
export function sortAStocks(
    stocks: AStockItem[],
    sortBy: "volume" | "change" | "marketCap"
): AStockItem[] {
    const sorted = [...stocks];
    if (sortBy === "volume") {
        sorted.sort((a, b) => b.volume - a.volume);
    } else if (sortBy === "change") {
        sorted.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    } else {
        sorted.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    }
    return sorted;
}
/**
 * Convert AStockKLine to format compatible with chart libraries
 * Returns array of [time, open, high, low, close, volume]
 */
export function klineToChartData(klines: AStockKLine[]): Array<[string, number, number, number, number, number]> {
    return klines.map((k) => [
        k.date,
        k.open,
        k.high,
        k.low,
        k.close,
        k.volume,
    ]);
}
/**
 * Get available period options for display
 */
export const PERIOD_OPTIONS = [
    { value: "1", label: "1分钟" },
    { value: "5", label: "5分钟" },
    { value: "15", label: "15分钟" },
    { value: "30", label: "30分钟" },
    { value: "60", label: "60分钟" },
    { value: "101", label: "日线" },
    { value: "102", label: "周线" },
    { value: "103", label: "月线" },
] as const;
export type PeriodType = typeof PERIOD_OPTIONS[number]["value"];