import React from "react";
import Swap, { SwapToken } from "../components/Swap";
const MOCK_TOKENS: SwapToken[] = [
  { symbol: "ETH", name: "Ethereum", balance: 4.2183, priceUsd: 3245.18, icon: "Ξ", color: "#627EEA" },
  { symbol: "HIPPOX", name: "Hippox Token", balance: 128450.0, priceUsd: 0.0421, icon: "H", color: "#8B5CF6" },
  { symbol: "USDC", name: "USD Coin", balance: 5120.55, priceUsd: 1.0, icon: "$", color: "#2775CA" },
  { symbol: "WBTC", name: "Wrapped BTC", balance: 0.0842, priceUsd: 67234.1, icon: "₿", color: "#F7931A" },
];
interface SwapPanelProps {
  i18n?: "en" | "zh-cn";
}
/**
 * SwapPanel - Swap view for the blockchain dashboard.
 *
 * Layout:
 *   - A single square swap card centered both horizontally and vertically
 *   - The card uses a plain 1px border, no shadow
 */
export const SwapPanel: React.FC<SwapPanelProps> = ({ i18n = "en" }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary, #0d1117)",
        padding: 24,
        boxSizing: "border-box",
        overflow: "auto",
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: "100%",
          minHeight: 420,
          background: "var(--bg-secondary, #161b22)",
          border: "1px solid var(--border-color, #30363d)",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
          padding: "8px 0",
          boxSizing: "border-box",
        }}
      >
        <Swap
          i18n={i18n}
          tokens={MOCK_TOKENS}
          defaultFromSymbol="ETH"
          defaultToSymbol="HIPPOX"
          onSwap={({ fromToken, toToken, fromAmount, toAmount, slippage }) => {
            console.log("[SwapPanel] swap intent:", {
              fromToken: fromToken.symbol,
              toToken: toToken.symbol,
              fromAmount,
              toAmount,
              slippage,
            });
          }}
          style={{ background: "transparent" }}
        />
      </div>
    </div>
  );
};
export default SwapPanel;
