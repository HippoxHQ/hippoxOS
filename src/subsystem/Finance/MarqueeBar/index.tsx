import React from "react";
import TickerBar from "./TickerBar";
import NewsTicker from "./NewsTicker";
import { useMarqueeData } from "./hooks.ts/useMarqueeData";
interface MarqueeBarProps {
  theme?: "light" | "dark";
  tickerSpeed?: number;
  newsSpeed?: number;
  language?: "zh" | "en";
}
const MarqueeBar: React.FC<MarqueeBarProps> = ({ theme = "dark", tickerSpeed = 60, newsSpeed = 50, language = "en" }) => {
  const isDark = theme === "dark";
  const { tickerItems, newsItems, isLoading } = useMarqueeData(language);
  // Loading state
  if (isLoading && tickerItems.length === 0 && newsItems.length === 0) {
    return (
      <div
        style={{
          height: "30px",
          minHeight: "30px",
          maxHeight: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          flexShrink: 0,
          borderTop: `1px solid var(--border-color)`,
          background: isDark ? "var(--bg-secondary, #1e1e2e)" : "var(--bg-secondary, #f0f0f0)",
          fontSize: "12px",
          color: "var(--text-muted)",
        }}
      >
        Loading market data...
      </div>
    );
  }
  return (
    <div
      style={{
        height: "30px",
        minHeight: "30px",
        maxHeight: "30px",
        display: "flex",
        flexDirection: "row",
        width: "100%",
        flexShrink: 0,
        borderTop: `1px solid var(--border-color)`,
        background: isDark ? "var(--bg-secondary, #1e1e2e)" : "var(--bg-secondary, #f0f0f0)",
        overflow: "hidden",
      }}
    >
      {/* Left: Price ticker - 50% width */}
      <div style={{ flex: "0 0 50%", height: "100%", overflow: "hidden" }}>
        <TickerBar items={tickerItems} theme={theme} speed={tickerSpeed} />
      </div>
      {/* Right: News ticker - 50% width */}
      <div style={{ flex: "0 0 50%", height: "100%", overflow: "hidden" }}>
        <NewsTicker items={newsItems} theme={theme} speed={newsSpeed} language={language} />
      </div>
    </div>
  );
};
export default MarqueeBar;
