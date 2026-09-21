// Shared types and mock data for the Trade panel
export interface OrderBookLevel {
    price: number;
    size: number;
    total: number;
}
export interface Position {
    symbol: string;
    side: "long" | "short";
    size: number;
    entry: number;
    mark: number;
    pnl: number;
    pnlPercent: number;
    liq: number;
}
export interface OpenOrder {
    id: string;
    symbol: string;
    side: "buy" | "sell";
    type: string;
    price: number;
    size: number;
    filled: string;
    time: string;
}
export interface TradeFill {
    id: string;
    symbol: string;
    side: "buy" | "sell";
    price: number;
    size: number;
    time: string;
}
// Constants
export const MOCK_SYMBOLS = ["BTC-PERP", "ETH-PERP", "SOL-PERP", "HIPPOX-PERP"];
export const MID_PRICE = 67432.5;
// Mock data
export const MOCK_POSITIONS: Position[] = [
    { symbol: "BTC-PERP", side: "long", size: 0.12, entry: 66120.0, mark: MID_PRICE, pnl: 157.5, pnlPercent: 1.98, liq: 59200.0 },
    { symbol: "ETH-PERP", side: "short", size: 2.5, entry: 3320.0, mark: 3245.18, pnl: 187.05, pnlPercent: 2.25, liq: 3680.0 },
    { symbol: "SOL-PERP", side: "long", size: 45.0, entry: 142.8, mark: 138.5, pnl: -193.5, pnlPercent: -3.01, liq: 118.0 },
];
export const MOCK_OPEN_ORDERS: OpenOrder[] = [
    { id: "o1", symbol: "BTC-PERP", side: "buy", type: "Limit", price: 66000.0, size: 0.05, filled: "0%", time: "10:22:14" },
    { id: "o2", symbol: "ETH-PERP", side: "sell", type: "Limit", price: 3350.0, size: 1.2, filled: "40%", time: "10:18:03" },
    { id: "o3", symbol: "SOL-PERP", side: "buy", type: "Limit", price: 135.0, size: 20.0, filled: "0%", time: "10:05:47" },
];
export const MOCK_FILLS: TradeFill[] = [
    { id: "f1", symbol: "BTC-PERP", side: "buy", price: 66120.0, size: 0.06, time: "09:52:11" },
    { id: "f2", symbol: "ETH-PERP", side: "sell", price: 3320.0, size: 1.0, time: "09:47:32" },
    { id: "f3", symbol: "SOL-PERP", side: "buy", price: 142.8, size: 45.0, time: "09:40:05" },
    { id: "f4", symbol: "BTC-PERP", side: "sell", price: 65980.0, size: 0.02, time: "09:31:18" },
];
/**
 * Generate a mock order book centered around a given mid price.
 * Replace with real order book data when integrating with the backend.
 */
export const generateOrderBook = (mid: number, levels: number = 12) => {
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    let bidTotal = 0;
    let askTotal = 0;
    for (let i = 0; i < levels; i++) {
        const bidSize = +(Math.random() * 2 + 0.1).toFixed(3);
        const askSize = +(Math.random() * 2 + 0.1).toFixed(3);
        bidTotal += bidSize;
        askTotal += askSize;
        bids.push({
            price: +(mid - (i + 1) * 2.5 - Math.random() * 1.5).toFixed(1),
            size: bidSize,
            total: +bidTotal.toFixed(3),
        });
        asks.push({
            price: +(mid + (i + 1) * 2.5 + Math.random() * 1.5).toFixed(1),
            size: askSize,
            total: +askTotal.toFixed(3),
        });
    }
    return { bids, asks };
};
// Formatting helpers
export const formatNum = (v: number, decimals = 2): string =>
    v.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
export const formatUsd = (v: number): string => `$${formatNum(v, 2)}`;
// Shared style tokens
export const subtleText: React.CSSProperties = {
    color: "var(--text-secondary, #8b949e)",
    fontSize: "11px",
};
export const sectionHeader: React.CSSProperties = {
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-secondary, #8b949e)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "1px solid var(--border-color, #30363d)",
    flexShrink: 0,
};
export const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--bg-tertiary, #0d1117)",
    border: "1px solid var(--border-color, #30363d)",
    borderRadius: 8,
    padding: "8px 10px",
    color: "var(--text-primary, #e6edf3)",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
};