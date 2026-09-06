import { invoke } from "@tauri-apps/api/core";
export interface HyperliquidCryptoItem {
    pair: string;
    currentPrice: number;
    change24h: number;
    volume: number;
    priceChange?: number;
    fundingRate?: number;
    openInterest?: number;
    markPrice?: number;
    indexPrice?: number;
}
export interface HyperliquidPerpetualResponse {
    success: boolean;
    message: string;
    total: number;
    data: HyperliquidCryptoItem[];
}
// Hyperliquid WebSocket endpoints
export const HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws";
// Popular Hyperliquid trading pairs
export const POPULAR_HYPERLIQUID_PAIRS = [
    "BTC", "ETH", "SOL", "AVAX", "ARB",
    "OP", "MATIC", "DOGE", "LINK", "UNI",
    "ATOM", "DOT", "LTC", "BNB", "XRP",
    "APT", "SUI", "SEI", "TIA", "INJ"
];
/**
 * Fetch perpetual data from Hyperliquid via Tauri backend
 */
export async function fetchHyperliquidData(): Promise<HyperliquidCryptoItem[]> {
    try {
        const response = await invoke<HyperliquidPerpetualResponse>("cmd_fetch_hyperliquid_perpetuals");
        if (response.success) {
            return response.data;
        }
        console.warn("[Hyperliquid] Failed to fetch perpetuals:", response.message);
        return [];
    } catch (error) {
        console.error("[Hyperliquid] Error fetching perpetuals:", error);
        return [];
    }
}
/**
 * Parse Hyperliquid WebSocket data and update items
 */
export const updateHyperliquidData = (
    wsData: any,
    currentItems: HyperliquidCryptoItem[]
): HyperliquidCryptoItem[] => {
    // WebSocket parsing logic
    if (wsData.type !== "subscriptionData" || !wsData.data) {
        return currentItems;
    }
    const updatedItems = [...currentItems];
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