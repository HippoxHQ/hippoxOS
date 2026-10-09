import React, { useState } from "react";
import DataBaseClientSidebar, { DataBaseClientSidebarView } from "./components/DataBaseClientSidebar";
interface DataBaseClientDashboardProps {
  theme?: "light" | "dark";
  i18n?: "en" | "zh-cn";
  /** Toggle the history drawer (forwarded to the sidebar's bottom button) */
  onToggleHistory?: () => void;
  /** Whether the history drawer is currently open */
  isHistoryOpen?: boolean;
}
/**
 * DataBaseClientDashboard.
 */
export const DataBaseClientDashboard: React.FC<DataBaseClientDashboardProps> = ({
  theme = "dark",
  i18n = "en",
  onToggleHistory,
  isHistoryOpen = false,
}) => {
  // Active sidebar view — extend DataBaseClientSidebarView union to add more panels
  const [activeView, setActiveView] = useState<DataBaseClientSidebarView>("overview");
  /**
   * Render the currently active panel.
   * All views are empty placeholders for now.
   */
  const renderActivePanel = () => {
    switch (activeView) {
      case "overview":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "概览" : "Overview"} />;
      case "tables":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "数据表" : "Tables"} />;
      case "query":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "查询" : "Query"} />;
      case "console":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "控制台" : "Console"} />;
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
      <DataBaseClientSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        i18n={i18n}
        onToggleHistory={onToggleHistory}
        isHistoryOpen={isHistoryOpen}
      />
      {/* Active panel content - currently empty placeholders */}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>{renderActivePanel()}</div>
    </div>
  );
};
/**
 * PlaceholderPanel .
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
      <div style={{ fontSize: 32, opacity: 0.3 }}>🗄️</div>
      <div>{title}</div>
      <div style={{ fontSize: 11, opacity: 0.6 }}>Coming soon</div>
    </div>
  );
};
export default DataBaseClientDashboard;