import React from "react";
import { FolderTree, Globe, History as HistoryIcon } from "lucide-react";
export type ApiClientSidebarView = "collections" | "environments" | "history";
interface ApiClientSidebarProps {
  activeView: ApiClientSidebarView;
  onViewChange: (view: ApiClientSidebarView) => void;
  i18n?: "en" | "zh-cn";
  /** Toggle the history sessions drawer */
  onToggleHistory?: () => void;
  /** Whether the history sessions drawer is currently open */
  isHistoryOpen?: boolean;
}
interface SidebarItem {
  key: ApiClientSidebarView;
  icon: React.ReactNode;
  labelEn: string;
  labelZh: string;
}
const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: "collections", icon: <FolderTree size={18} />, labelEn: "Collections", labelZh: "集合" },
  { key: "environments", icon: <Globe size={18} />, labelEn: "Environments", labelZh: "环境" },
  { key: "history", icon: <HistoryIcon size={18} />, labelEn: "History", labelZh: "历史" },
];
export const ApiClientSidebar: React.FC<ApiClientSidebarProps> = ({ activeView, onViewChange, i18n = "en", onToggleHistory, isHistoryOpen = false }) => {
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
  const renderHistorySessionsButton = () => {
    const label = isZh ? "历史会话" : "History";
    return (
      <button
        onClick={onToggleHistory}
        title={label}
        style={{
          width: 30,
          height: 30,
          margin: "2px auto",
          borderRadius: 5,
          border: "none",
          background: isHistoryOpen ? "var(--accent-color, #58a6ff)" : "transparent",
          color: isHistoryOpen ? "white" : "var(--text-secondary, #8b949e)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s, color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!isHistoryOpen) {
            e.currentTarget.style.background = "var(--hover-bg, #21262d)";
            e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isHistoryOpen) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
          }
        }}
      >
        <HistoryIcon size={18} />
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
      <div style={{ flex: 1 }} />
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
        {renderHistorySessionsButton()}
      </div>
    </div>
  );
};
export default ApiClientSidebar;
