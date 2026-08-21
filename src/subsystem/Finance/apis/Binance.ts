/**
 * Binance Data Source Module
 * Provides cryptocurrency data from Binance API
 */
export interface BinanceCryptoItem {
    pair: string;
    currentPrice: number;
    change24h: number;
    volume: number;
    priceChange?: number;
}
export interface BinanceTickerStream {
    e: string; // Event type
    E: number; // Event time
    s: string; // Symbol
    p: string; // Price change
    P: string; // Price change percent
    w: string; // Weighted average price
    x: string; // First trade(F)-1 price (first trade before the 24hr rolling window)
    c: string; // Last price
    Q: string; // Last quantity
    b: string; // Best bid price
    B: string; // Best bid quantity
    a: string; // Best ask price
    A: string; // Best ask quantity
    o: string; // Open price
    h: string; // High price
    l: string; // Low price
    v: string; // Total traded base asset volume
    q: string; // Total traded quote asset volume
    O: number; // Statistics open time
    C: number; // Statistics close time
    F: number; // First trade ID
    L: number; // Last trade ID
    n: number; // Total number of trades
}
export interface BinanceTicker24hr {
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
// Popular cryptocurrency pairs
export const POPULAR_CRYPTO_PAIRS = [
    "btcusdt", "ethusdt", "bnbusdt", "solusdt", "xrpusdt",
    "adausdt", "dogeusdt", "dotusdt", "avaxusdt", "linkusdt",
    "maticusdt", "uniusdt", "ltcusdt", "atomusdt", "etcusdt",
    "trxusdt", "filusdt", "apeusdt", "nearusdt", "ftmusdt"
];
// Binance WebSocket endpoints
export const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws";
export const BINANCE_REST_URL = "https://api.binance.com/api/v3";
/**
 * Fetch 24hr ticker data from Binance REST API
 * @returns Array of crypto items
 */
export const fetchCryptoInitialData = async (): Promise<BinanceCryptoItem[]> => {
    try {
        const response = await fetch(`${BINANCE_REST_URL}/ticker/24hr`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: BinanceTicker24hr[] = await response.json();
        const formattedData: BinanceCryptoItem[] = data
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
        return formattedData;
    } catch (err) {
        console.warn("[Binance] Failed to fetch initial data:", err);
        throw err;
    }
};
/**
 * Update crypto price from WebSocket ticker data
 * @param tickerData - The ticker data from WebSocket
 * @param currentItems - Current list of crypto items
 * @returns Updated list of crypto items
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
 * Create WebSocket subscription messages for crypto pairs
 * @param pairs - Array of crypto pair symbols
 * @param batchSize - Number of pairs per subscription batch
 * @returns Array of subscription messages
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
 * Create fallback crypto data when API is unavailable
 */
export const createFallbackCryptoData = (): BinanceCryptoItem[] => {
    const pairs = [
        "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT",
        "ADA/USDT", "DOGE/USDT", "DOT/USDT", "AVAX/USDT", "LINK/USDT"
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
export const filterCryptoItems = (
    items: BinanceCryptoItem[],
    searchTerm: string
): BinanceCryptoItem[] => {
    if (!searchTerm.trim()) {
        return items;
    }
    return items.filter((item) =>
        item.pair.toLowerCase().includes(searchTerm.toLowerCase())
    );
};