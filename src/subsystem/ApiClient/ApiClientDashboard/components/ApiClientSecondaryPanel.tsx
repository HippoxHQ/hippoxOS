import React from "react";
import { ApiClientSidebarView } from "./ApiClientSidebar";
interface ApiClientSecondaryPanelProps {
  activeView: ApiClientSidebarView;
  i18n?: "en" | "zh-cn";
  width: number;
}
export const ApiClientSecondaryPanel: React.FC<ApiClientSecondaryPanelProps> = ({ activeView, i18n = "en", width }) => {
  const isZh = i18n === "zh-cn";
  const titleByView: Record<ApiClientSidebarView, string> = {
    collections: isZh ? "集合" : "Collections",
    environments: isZh ? "环境" : "Environments",
    history: isZh ? "历史" : "History",
  };
  const emptyTextByView: Record<ApiClientSidebarView, string> = {
    collections: isZh ? "暂无集合" : "No collections yet",
    environments: isZh ? "暂无环境" : "No environments yet",
    history: isZh ? "暂无历史" : "No history yet",
  };
  return (
    <div
      style={{
        width,
        minWidth: width,
        height: "100%",
        background: "var(--bg-secondary, #161b22)",
        borderRight: "1px solid var(--border-color, #30363d)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
          minHeight: 41,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>{titleByView[activeView]}</span>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted, #6e7681)",
          fontSize: 12,
          textAlign: "center",
        }}
      >
        {emptyTextByView[activeView]}
      </div>
    </div>
  );
};
export default ApiClientSecondaryPanel;
