import React, { useState } from "react";
import BlockchainSidebar, { BlockchainSidebarView } from "../components/BlockchainSidebar";
import AccountPanel from "../panels/AccountPanel";
import BondingCurvePanel from "../panels/BondingCurvePanel";
import SwapPanel from "../panels/SwapPanel";
import TradePanel from "../panels/TradePanel";
// Trade view: Hyperliquid-style pro trading layout
interface BlockchainDashboardProps {
  theme?: "light" | "dark";
  i18n?: "en" | "zh-cn";
  /** Toggle the history drawer (forwarded to the sidebar's bottom button) */
  onToggleHistory?: () => void;
  /** Whether the history drawer is currently open */
  isHistoryOpen?: boolean;
}
/**
 * BlockchainDashboard - Home page for HippoxOS Blockchain subsystem.
 *
 * The left sidebar (45px) switches the active panel.
 * Panels are separated by 1px borders, no gaps.
 */
export const BlockchainDashboard: React.FC<BlockchainDashboardProps> = ({ theme = "dark", i18n = "en", onToggleHistory, isHistoryOpen = false }) => {
  // Active sidebar view - extend BlockchainSidebarView union to add more panels
  const [activeView, setActiveView] = useState<BlockchainSidebarView>("account");
  /**
   * Render the currently active panel.
   * Add a new case here when adding new sidebar items.
   */
  const renderActivePanel = () => {
    switch (activeView) {
      case "account":
        return <AccountPanel i18n={i18n} />;
      case "bondingCurve":
        return <BondingCurvePanel i18n={i18n} />;
      case "swap":
        return <SwapPanel i18n={i18n} />;
      case "trade":
        return <TradePanel i18n={i18n} theme={theme === "dark" ? "dark" : "light"} />;
      case "liquidity":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "流动性" : "Liquidity"} />;
      case "activity":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "活动" : "Activity"} />;
      case "layers":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "图层" : "Layers"} />;
      case "settings":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "设置" : "Settings"} />;
      default:
        return null;
    }
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
        background: "var(--bg-primary, #0d1117)",
        color: "var(--text-primary, #e6edf3)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "13px",
        boxSizing: "border-box",
      }}
    >
      {/* Left sidebar - panel switcher + history drawer toggle */}
      <BlockchainSidebar activeView={activeView} onViewChange={setActiveView} i18n={i18n} onToggleHistory={onToggleHistory} isHistoryOpen={isHistoryOpen} />
      {/* Active panel content */}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>{renderActivePanel()}</div>
    </div>
  );
};
/**
 * PlaceholderPanel - temporary stub for sidebar views not yet implemented.
 * Replace with real panel components as they are built out.
 */
const PlaceholderPanel: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-secondary, #8b949e)",
        fontSize: 14,
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 32, opacity: 0.3 }}>⛓️</div>
      <div>{title}</div>
      <div style={{ fontSize: 11, opacity: 0.6 }}>Coming soon</div>
    </div>
  );
};
export default BlockchainDashboard;
