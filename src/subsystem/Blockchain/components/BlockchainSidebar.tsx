import React from "react";
import { Wallet, BarChart3, ArrowDownUp, Droplets, Activity, Settings, Layers, CandlestickChart } from "lucide-react";
// Sidebar view keys - extend this union to add more panels in the future
export type BlockchainSidebarView = "account" | "bondingCurve" | "swap" | "trade" | "liquidity" | "activity" | "layers" | "settings";
interface BlockchainSidebarProps {
  activeView: BlockchainSidebarView;
  onViewChange: (view: BlockchainSidebarView) => void;
  i18n?: "en" | "zh-cn";
}
interface SidebarItem {
  key: BlockchainSidebarView;
  icon: React.ReactNode;
  labelEn: string;
  labelZh: string;
}
// Sidebar items - add new entries here to expose more panels
const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: "trade", icon: <CandlestickChart size={18} />, labelEn: "Trade", labelZh: "交易" },
  { key: "swap", icon: <ArrowDownUp size={18} />, labelEn: "Swap", labelZh: "兑换" },
  { key: "bondingCurve", icon: <BarChart3 size={18} />, labelEn: "Bonding Curve", labelZh: "联合曲线" },
  { key: "account", icon: <Wallet size={18} />, labelEn: "Account", labelZh: "账户" },
  // Trade view: Hyperliquid-style pro trading layout
  { key: "liquidity", icon: <Droplets size={18} />, labelEn: "Liquidity", labelZh: "流动性" },
  { key: "activity", icon: <Activity size={18} />, labelEn: "Activity", labelZh: "活动" },
  { key: "layers", icon: <Layers size={18} />, labelEn: "Layers", labelZh: "图层" },
];
const BOTTOM_ITEMS: SidebarItem[] = [{ key: "settings", icon: <Settings size={18} />, labelEn: "Settings", labelZh: "设置" }];
/**
 * BlockchainSidebar - 45px wide icon sidebar.
 * Clicking an icon switches the active dashboard panel.
 * Designed to be extended: just add new items to SIDEBAR_ITEMS.
 */
export const BlockchainSidebar: React.FC<BlockchainSidebarProps> = ({ activeView, onViewChange, i18n = "en" }) => {
  const isZh = i18n === "zh-cn";
  const renderItem = (item: SidebarItem) => {
    const isActive = activeView === item.key;
    const label = isZh ? item.labelZh : item.labelEn;
    return (
      <button
        key={item.key}
        onClick={() => onViewChange(item.key)}
        title={label}
        style={{
          width: 30,
          height: 30,
          margin: "2px auto",
          borderRadius: 5,
          border: "none",
          background: isActive ? "var(--accent-color, #58a6ff)" : "transparent",
          color: isActive ? "white" : "var(--text-secondary, #8b949e)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s, color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "var(--hover-bg, #21262d)";
            e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
          }
        }}
      >
        {item.icon}
      </button>
    );
  };
  return (
    <div
      style={{
        width: 45,
        minWidth: 45,
        height: "100%",
        background: "var(--bg-secondary, #161b22)",
        borderRight: "1px solid var(--border-color, #30363d)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 8,
        boxSizing: "border-box",
        flexShrink: 0,
        gap: 2,
      }}
    >
      {/* Top group: main views */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        {SIDEBAR_ITEMS.map(renderItem)}
      </div>
      {/* Spacer pushes bottom items down */}
      <div style={{ flex: 1 }} />
      {/* Bottom group: settings */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          borderTop: "1px solid var(--border-color, #30363d)",
          paddingTop: 6,
        }}
      >
        {BOTTOM_ITEMS.map(renderItem)}
      </div>
    </div>
  );
};
export default BlockchainSidebar;
