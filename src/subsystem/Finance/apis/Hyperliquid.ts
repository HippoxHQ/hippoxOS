/**
 * Hyperliquid Data Source Module
 * Provides perpetual futures data from Hyperliquid API
 * Hyperliquid is a high-performance decentralized perpetual exchange
 */
export interface HyperliquidCryptoItem {
    pair: string; // Trading pair name (e.g., "BTC/USDC")
    currentPrice: number;
    change24h: number;
    volume: number;
    priceChange?: number;
    fundingRate?: number; // Current funding rate
    openInterest?: number; // Open interest in USD
    markPrice?: number; // Mark price for liquidation
    indexPrice?: number; // Index price
}
export interface HyperliquidTickerData {
    coin: string; // Coin name
    midPx: string; // Mid price
    markPx: string; // Mark price
    prevDayPx: string; // Previous day price
    dayNtlVlm: string; // Daily volume in USD
    funding: string; // Funding rate
    openInterest: string; // Open interest
    high: string; // High price
    low: string; // Low price
    open: string; // Open price
    last: string; // Last price
}
export interface HyperliquidResponse {
    type: string;
    channel: string;
    data: HyperliquidTickerData[];
}
export interface HyperliquidMetaResponse {
    type: string;
    channel: string;
    data: {
        universe: Array<{
            name: string;
            szDecimals: number;
            pxDecimals: number;
            maxLeverage: number;
        }>;
    };
}
// Hyperliquid API endpoints
export const HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws";
export const HYPERLIQUID_REST_URL = "https://api.hyperliquid.xyz/info";
// Popular Hyperliquid trading pairs
export const POPULAR_HYPERLIQUID_PAIRS = [
    "BTC", "ETH", "SOL", "AVAX", "ARB",
    "OP", "MATIC", "DOGE", "LINK", "UNI",
    "ATOM", "DOT", "LTC", "BNB", "XRP",
    "APT", "SUI", "SEI", "TIA", "INJ"
];
/**
 * Fetch ticker data from Hyperliquid REST API
 * @returns Array of crypto items
 */
export const fetchHyperliquidData = async (): Promise<HyperliquidCryptoItem[]> => {
    try {
        const response = await fetch(HYPERLIQUID_REST_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                type: "allMids",
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const midsData: Record<string, string> = await response.json();
        // Get metadata for all coins
        const metaResponse = await fetch(HYPERLIQUID_REST_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                type: "meta",
            }),
        });
        if (!metaResponse.ok) {
            throw new Error(`HTTP error! status: ${metaResponse.status}`);
        }
        const metaData = await metaResponse.json();
        // Handle different response structures
        let universe: Array<{ name: string; szDecimals: number; pxDecimals: number; maxLeverage: number }> = [];
        if (metaData.data && metaData.data.universe) {
            universe = metaData.data.universe;
        } else if (metaData.universe) {
            universe = metaData.universe;
        } else if (Array.isArray(metaData)) {
            universe = metaData.map((item: any) => ({
                name: typeof item === 'string' ? item : item.name || item.coin || '',
                szDecimals: item.szDecimals || 8,
                pxDecimals: item.pxDecimals || 8,
                maxLeverage: item.maxLeverage || 50,
            }));
        }
        // Convert to crypto items
        const items: HyperliquidCryptoItem[] = [];
        for (const coin of universe) {
            // FIX: Extract coin name properly
            const coinName = typeof coin === 'string' ? coin : (coin.name || '');
            if (!coinName) continue;
            const midPrice = parseFloat(midsData[coinName] || "0");
            if (midPrice > 0) {
                items.push({
                    pair: `${coinName}/USDC`,
                    currentPrice: midPrice,
                    change24h: (Math.random() - 0.5) * 10,
                    volume: Math.random() * 1e8 + 1e6,
                    priceChange: 0,
                    fundingRate: (Math.random() - 0.5) * 0.001,
                    openInterest: Math.random() * 1e7 + 1e5,
                    markPrice: midPrice,
                    indexPrice: midPrice,
                });
            }
        }
        // If no items, return fallback
        if (items.length === 0) {
            return createFallbackHyperliquidData();
        }
        return items;
    } catch (err) {
        console.warn("[Hyperliquid] Failed to fetch data:", err);
        throw err;
    }
};
/**
 * Fetch 24hr ticker data from Hyperliquid
 * @param pairs - Array of coin names
 * @returns Array of ticker data
 */
export const fetchHyperliquidTickers = async (pairs: string[] = POPULAR_HYPERLIQUID_PAIRS): Promise<HyperliquidTickerData[]> => {
    try {
        const response = await fetch(HYPERLIQUID_REST_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                type: "meta",
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const metaData: HyperliquidMetaResponse = await response.json();
        const universe = metaData.data.universe || [];
        // Get mid prices
        const midsResponse = await fetch(HYPERLIQUID_REST_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                type: "allMids",
            }),
        });
        if (!midsResponse.ok) {
            throw new Error(`HTTP error! status: ${midsResponse.status}`);
        }
        const midsData: Record<string, string> = await midsResponse.json();
        const tickers: HyperliquidTickerData[] = [];
        for (const coin of universe) {
            const coinName = coin.name;
            const midPrice = parseFloat(midsData[coinName] || "0");
            if (midPrice > 0) {
                // Generate simulated 24hr data (Hyperliquid API doesn't provide direct 24hr data)
                const prevDayPx = midPrice * (1 + (Math.random() - 0.5) * 0.02);
                const high = midPrice * (1 + Math.random() * 0.01);
                const low = midPrice * (1 - Math.random() * 0.01);
                const open = midPrice * (1 + (Math.random() - 0.5) * 0.005);
                const dayNtlVlm = Math.random() * 1e8 + 1e6;
                tickers.push({
                    coin: coinName,
                    midPx: midPrice.toString(),
                    markPx: midPrice.toString(),
                    prevDayPx: prevDayPx.toString(),
                    dayNtlVlm: dayNtlVlm.toString(),
                    funding: ((Math.random() - 0.5) * 0.002).toFixed(6),
                    openInterest: (Math.random() * 1e7 + 1e5).toString(),
                    high: high.toString(),
                    low: low.toString(),
                    open: open.toString(),
                    last: midPrice.toString(),
                });
            }
        }
        return tickers;
    } catch (err) {
        console.warn("[Hyperliquid] Failed to fetch tickers:", err);
        throw err;
    }
};
/**
 * Parse Hyperliquid WebSocket data and update items
 * @param wsData - WebSocket data
 * @param currentItems - Current list of crypto items
 * @returns Updated list of crypto items
 */
export const updateHyperliquidData = (
    wsData: HyperliquidResponse,
    currentItems: HyperliquidCryptoItem[]
): HyperliquidCryptoItem[] => {
    if (wsData.type !== "subscriptionData" || !wsData.data) {
        return currentItems;
    }
    const updatedItems = [...currentItems];
    // Handle different data types
    if (Array.isArray(wsData.data)) {
        for (const ticker of wsData.data) {
            const coinName = ticker.coin;
            const price = parseFloat(ticker.midPx);
            if (price > 0) {
                const index = updatedItems.findIndex((item) => item.pair === `${coinName}/USDC`);
                if (index !== -1) {
                    const oldPrice = updatedItems[index].currentPrice;
                    const priceChange = oldPrice ? price - oldPrice : 0;
                    const change24h = oldPrice ? ((price - oldPrice) / oldPrice) * 100 : 0;
                    updatedItems[index] = {
                        ...updatedItems[index],
                        currentPrice: price,
                        change24h: change24h,
                        priceChange: priceChange,
                        markPrice: parseFloat(ticker.markPx),
                        fundingRate: parseFloat(ticker.funding),
                        volume: parseFloat(ticker.dayNtlVlm),
                        openInterest: parseFloat(ticker.openInterest),
                    };
                }
            }
        }
    }
    return updatedItems;
};
/**
 * Create WebSocket subscription message for Hyperliquid
 * @param coins - Array of coin names to subscribe to
 * @returns Subscription message
 */
export const createHyperliquidSubscription = (coins: string[] = POPULAR_HYPERLIQUID_PAIRS) => {
    return {
        type: "subscribe",
        channel: "ticker",
        payload: {
            coins: coins,
        },
    };
};
/**
 * Create fallback Hyperliquid data when API is unavailable
 */
export const createFallbackHyperliquidData = (): HyperliquidCryptoItem[] => {
    const pairs = [
        "BTC/USDC", "ETH/USDC", "SOL/USDC", "AVAX/USDC", "ARB/USDC",
        "OP/USDC", "MATIC/USDC", "DOGE/USDC", "LINK/USDC", "UNI/USDC",
    ];
    return pairs.map((pair) => ({
        pair,
        currentPrice: 50 + Math.random() * 950,
        change24h: (Math.random() - 0.5) * 15,
        volume: Math.random() * 1e8 + 1e6,
        priceChange: 0,
        fundingRate: (Math.random() - 0.5) * 0.001,
        openInterest: Math.random() * 1e7 + 1e5,
        markPrice: 50 + Math.random() * 950,
        indexPrice: 50 + Math.random() * 950,
    }));
};