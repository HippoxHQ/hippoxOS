import { invoke } from "@tauri-apps/api/core";
export interface BinanceCryptoItem {
    pair: string;
    currentPrice: number;
    change24h: number;
    volume: number;
    priceChange?: number;
}
export interface BinanceTickerStream {
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
export interface BinanceTickerResponse {
    success: boolean;
    message: string;
    total: number;
    data: BinanceCryptoItem[];
}
export interface BinanceKLine {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    amount: number;
}
export interface BinanceKLineResponse {
    success: boolean;
    message: string;
    symbol: string;
    total: number;
    data: BinanceKLine[];
}
// Popular cryptocurrency pairs (lowercase for WebSocket)
export const POPULAR_CRYPTO_PAIRS = [
    "btcusdt",
    "ethusdt",
    "bnbusdt",
    "solusdt",
    "xrpusdt",
    "adausdt",
    "dogeusdt",
    "dotusdt",
    "avaxusdt",
    "linkusdt",
    "maticusdt",
    "uniusdt",
    "ltcusdt",
    "atomusdt",
    "etcusdt",
    "trxusdt",
    "filusdt",
    "apeusdt",
    "nearusdt",
    "ftmusdt",
];
// Binance WebSocket endpoints
export const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws";
/**
 * Create WebSocket subscription messages for crypto pairs
 */
export const createSubscriptionMessages = (pairs: string[], batchSize: number = 10) => {
    const messages: { method: string; params: string[]; id: number }[] = [];
    for (let i = 0; i < pairs.length; i += batchSize) {
        const batch = pairs.slice(i, i + batchSize);
        messages.push({
            method: "SUBSCRIBE",
            params: batch.map((pair) => `${pair}@ticker`),
            id: Math.floor(i / batchSize) + 1,
        });
    }
    return messages;
};
/**
 * Update crypto price from WebSocket ticker data
 */
export const updateCryptoPrice = (
    tickerData: BinanceTickerStream,
    currentItems: BinanceCryptoItem[]
): BinanceCryptoItem[] => {
    const symbol = tickerData.s;
    const newPrice = parseFloat(tickerData.c);
    const priceChangePercent = parseFloat(tickerData.P);
    const quoteVolume = parseFloat(tickerData.q);
    return currentItems.map((item) => {
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
};
/**
 * Fetch 24hr ticker data from Binance via Tauri backend
 */
export async function fetchCryptoInitialData(): Promise<BinanceCryptoItem[]> {
    try {
        const response = await invoke<BinanceTickerResponse>("cmd_fetch_binance_tickers");
        if (response.success) {
            return response.data;
        }
        console.warn("[Binance] Failed to fetch tickers:", response.message);
        return [];
    } catch (error) {
        console.error("[Binance] Error fetching tickers:", error);
        return [];
    }
}
/**
 * Fetch K-line data from Binance via Tauri backend
 */
export async function fetchBinanceKlines(
    symbol: string,
    interval: string = "1d",
    limit: number = 50
): Promise<BinanceKLine[]> {
    try {
        const response = await invoke<BinanceKLineResponse>("cmd_fetch_binance_klines", {
            symbol,
            interval,
            limit,
        });
        if (response.success) {
            return response.data;
        }
        console.warn("[Binance] Failed to fetch klines:", response.message);
        return [];
    } catch (error) {
        console.error("[Binance] Error fetching klines:", error);
        return [];
    }
}
/**
 * Create fallback crypto data when API is unavailable
 */
export const createFallbackCryptoData = (): BinanceCryptoItem[] => {
    const pairs = [
        "BTC/USDT",
        "ETH/USDT",
        "BNB/USDT",
        "SOL/USDT",
        "XRP/USDT",
        "ADA/USDT",
        "DOGE/USDT",
        "DOT/USDT",
        "AVAX/USDT",
        "LINK/USDT",
    ];
    return pairs.map((pair) => ({
        pair,
        currentPrice: 100 + Math.random() * 900,
        change24h: (Math.random() - 0.5) * 20,
        volume: Math.random() * 1000000000 + 1000000,
        priceChange: 0,
    }));
};
/**
 * Sort crypto items by specified field
 */
export const sortCryptoItems = (
    items: BinanceCryptoItem[],
    sortBy: "volume" | "change"
): BinanceCryptoItem[] => {
    const sorted = [...items];
    if (sortBy === "volume") {
        sorted.sort((a, b) => b.volume - a.volume);
    } else {
        sorted.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    }
    return sorted;
};
/**
 * Filter crypto items by search term
 */
export const filterCryptoItems = (items: BinanceCryptoItem[], searchTerm: string): BinanceCryptoItem[] => {
    if (!searchTerm.trim()) {
        return items;
    }
    return items.filter((item) => item.pair.toLowerCase().includes(searchTerm.toLowerCase()));
};