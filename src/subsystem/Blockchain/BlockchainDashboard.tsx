import React from "react";
interface BlockchainDashboardProps {
  theme?: "light" | "dark";
  i18n?: "en" | "zh-cn";
}
export const BlockchainDashboard: React.FC<BlockchainDashboardProps> = () => {
  return <div style={{ width: "100%", height: "100%", padding: 12 }}>BlockchainDashboard</div>;
};
export default BlockchainDashboard;
