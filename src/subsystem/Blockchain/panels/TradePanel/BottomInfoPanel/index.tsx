import React, { useState } from "react";
import ActivityPanel from "./ActivityPanel";
import HoldersPanel from "./HoldersPanel";
import PositionsPanel from "./PositionsPanel";
interface BottomInfoPanelProps {
  i18n?: "en" | "zh-cn";
  /** Currently selected symbol, forwarded to the child panels */
  symbol: string;
}
/**
 * BottomInfoPanel - Bottom-left info area.
 *
 * Renders a tabbed table area with three tabs:
 *   - Activity  : live trade feed
 *   - Holders   : top holders
 *   - Positions : open positions
 *
 * Uses the same bg-secondary background as SymbolInfoBar for visual consistency.
 */
// Tab definitions for the bottom info area.
type BottomTab = "activity" | "holders" | "positions";
const BOTTOM_TABS: { key: BottomTab; labelZh: string; labelEn: string }[] = [
  { key: "activity", labelZh: "活动", labelEn: "Activity" },
  { key: "holders", labelZh: "持有者", labelEn: "Holders" },
  { key: "positions", labelZh: "仓位", labelEn: "Positions" },
];
export const BottomInfoPanel: React.FC<BottomInfoPanelProps> = ({ i18n = "en", symbol }) => {
  const isZh = i18n === "zh-cn";
  // Active tab in the bottom info area.
  const [activeTab, setActiveTab] = useState<BottomTab>("activity");
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderTop: "1px solid var(--border-color, #30363d)",
        background: "var(--bg-secondary, #161b22)",
      }}
    >
      {/* Tab bar with an active indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
          background: "var(--bg-secondary, #161b22)",
        }}
      >
        {BOTTOM_TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                position: "relative",
                padding: "8px 14px",
                background: "transparent",
                border: "none",
                color: active ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.3px",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {isZh ? tab.labelZh : tab.labelEn}
              {/* Active indicator block */}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    right: 10,
                    bottom: 0,
                    height: 2,
                    borderRadius: 2,
                    background: "var(--accent-color, #58a6ff)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {activeTab === "activity" && <ActivityPanel i18n={i18n} symbol={symbol} />}
        {activeTab === "holders" && <HoldersPanel i18n={i18n} symbol={symbol} />}
        {activeTab === "positions" && <PositionsPanel i18n={i18n} symbol={symbol} />}
      </div>
    </div>
  );
};
export default BottomInfoPanel;
