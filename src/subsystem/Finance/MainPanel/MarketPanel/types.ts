export interface MarketPanelProps {
    theme: "light" | "dark";
    i18n: "en" | "zh-cn";
    onCryptoClick?: (pair: string) => void;
    onStockClick?: (symbol: string) => void;
    onAStockClick?: (symbol: string, name?: string) => void;
    onPerpetualClick?: (pair: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}
export interface CryptoPanelProps {
    theme: "light" | "dark";
    i18n: "en" | "zh-cn";
    onCryptoClick?: (pair: string) => void;
}
export interface StockPanelProps {
    theme: "light" | "dark";
    i18n: "en" | "zh-cn";
    onStockClick?: (symbol: string) => void;
}
export interface PerpetualPanelProps {
    theme: "light" | "dark";
    i18n: "en" | "zh-cn";
    onPerpetualClick?: (pair: string) => void;
}
export interface AStockPanelProps {
    theme: "light" | "dark";
    i18n: "en" | "zh-cn";
    onAStockClick?: (symbol: string, name?: string) => void;
}