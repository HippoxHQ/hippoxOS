import { PanelRightClose } from "lucide-react";
import React, { useState, lazy, Suspense, useRef, useEffect } from "react";
import { MarketPanelProps } from "./types";
// Lazy load panels - only load when tab is active
const CryptoPanel = lazy(() => import("./CryptoPanel"));
const StockPanel = lazy(() => import("./StockPanel"));
const AStockPanel = lazy(() => import("./AStockPanel"));
const MarketPanel: React.FC<MarketPanelProps> = ({ theme, i18n, onCryptoClick, onStockClick, onAStockClick, isCollapsed, onToggleCollapse, onPerpetualClick }) => {
  const isDark = theme === "dark";
  const isZh = i18n === "zh-cn";
  const [activeTab, setActiveTab] = useState<"crypto" | "stocks" | "astocks">("crypto");
  // Track which tabs have been loaded to prevent lazy loading on every render
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(["crypto"]));
  const isFirstRender = useRef(true);
  // Loading fallback
  const LoadingFallback = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "40px",
      }}
    >
      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isZh ? "加载中..." : "Loading..."}</span>
    </div>
  );
  // Handle tab change - mark tab as loaded
  const handleTabChange = (tab: "crypto" | "stocks" | "astocks") => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      setLoadedTabs((prev) => new Set(prev).add(tab));
    }
  };
  // Preload StockPanel when hovering over the tab
  const handleTabHover = (tab: "crypto" | "stocks" | "perpetuals" | "astocks") => {
    if (!loadedTabs.has(tab)) {
      // Preload the component without triggering data fetch
      // The component's lazy loading will load the code, but data fetch is controlled by Intersection Observer
      setLoadedTabs((prev) => new Set(prev).add(tab));
    }
  };
  // Render active panel content
  const renderContent = () => {
    const props = { theme, i18n };
    // Only render if tab has been loaded
    if (!loadedTabs.has(activeTab)) {
      return <LoadingFallback />;
    }
    switch (activeTab) {
      case "crypto":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CryptoPanel {...props} onCryptoClick={onCryptoClick} />
          </Suspense>
        );
      case "stocks":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <StockPanel {...props} onStockClick={onStockClick} />
          </Suspense>
        );
      case "astocks":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AStockPanel {...props} onAStockClick={onAStockClick} />
          </Suspense>
        );
      default:
        return null;
    }
  };
  // Collapsed view
  if (isCollapsed) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "40px",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <button
          onClick={onToggleCollapse}
          style={{
            padding: "8px",
            borderRadius: "4px",
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            border: "none",
            cursor: "pointer",
          }}
          title={isZh ? "展开市场面板" : "Expand market panel"}
        >
          <svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    );
  }
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 12px",
          borderBottom: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-secondary)",
          flexShrink: 0,
          minHeight: "41px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>
          <span style={{ marginRight: "5px" }}>📊</span>
          {isZh ? "市场" : "Market"}
        </span>
        <button
          onClick={onToggleCollapse}
          style={{
            padding: "4px",
            borderRadius: "4px",
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={isZh ? "收起市场面板" : "Collapse market panel"}
        >
          <PanelRightClose size={16} />
        </button>
      </div>
      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-color)",
          flexShrink: 0,
          padding: "4px 8px",
          gap: "6px",
          backgroundColor: "var(--bg-tertiary)",
        }}
      >
        <button
          onClick={() => handleTabChange("crypto")}
          onMouseEnter={() => handleTabHover("crypto")}
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: "11px",
            borderRadius: "5px",
            border: "1px solid var(--border-color)",
            cursor: "pointer",
            backgroundColor: activeTab === "crypto" ? "var(--bg-secondary)" : "var(--bg-tertiary)",
            color: activeTab === "crypto" ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          {isZh ? "加密货币" : "Cryptos"}
        </button>
        <button
          onClick={() => handleTabChange("stocks")}
          onMouseEnter={() => handleTabHover("stocks")}
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: "11px",
            borderRadius: "5px",
            border: "1px solid var(--border-color)",
            cursor: "pointer",
            backgroundColor: activeTab === "stocks" ? "var(--bg-secondary)" : "var(--bg-tertiary)",
            color: activeTab === "stocks" ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          {isZh ? "美股" : "US Stocks"}
        </button>
        <button
          onClick={() => handleTabChange("astocks")}
          onMouseEnter={() => handleTabHover("astocks")}
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: "11px",
            borderRadius: "5px",
            border: "1px solid var(--border-color)",
            cursor: "pointer",
            backgroundColor: activeTab === "astocks" ? "var(--bg-secondary)" : "var(--bg-tertiary)",
            color: activeTab === "astocks" ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          {isZh ? "A股" : "A-Shares"}
        </button>
      </div>
      {/* Content Area - only renders active tab */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.05)",
        }}
      >
        {renderContent()}
      </div>
      {/* Global styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover);
        }
        ::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
    </div>
  );
};
export default MarketPanel;
