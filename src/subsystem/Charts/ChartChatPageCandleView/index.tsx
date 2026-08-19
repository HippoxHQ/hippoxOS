import React, { useRef, useEffect, useState, useCallback } from "react";
import { ICandleViewDataPoint } from "@candleview/core";
import { TEST_CANDLEVIEW_DATA8 } from "../../../test/TestData_3";
import Chart, { ChartRef } from "./Chart";
import DSL, { DSLRef } from "./DSL";
import MarketPanel from "./MarketPanel";
import { PanelRightOpen } from "lucide-react";
interface ChartChatPageCandleViewProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  currentSessionId?: string;
  data?: ICandleViewDataPoint[];
  symbol?: string;
  taskId?: string;
  chartData?: any;
}
export const ChartChatPageCandleView: React.FC<ChartChatPageCandleViewProps> = ({ theme, i18n, currentSessionId, data, symbol = "BTC/USDT", taskId, chartData }) => {
  const [chartHeight, setChartHeight] = useState(55);
  const [editorWidth, setEditorWidth] = useState(60);
  const [isChartResizing, setIsChartResizing] = useState(false);
  const [isEditorResizing, setIsEditorResizing] = useState(false);
  const [isMarketResizing, setIsMarketResizing] = useState(false);
  const [isMarketCollapsed, setIsMarketCollapsed] = useState(false);
  const [marketPanelWidth, setMarketPanelWidth] = useState(240);
  const startYRef = useRef(0);
  const startChartHeightRef = useRef(0);
  const startXRef = useRef(0);
  const startEditorWidthRef = useRef(0);
  const startMarketXRef = useRef(0);
  const startMarketWidthRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartRef>(null);
  const dslRef = useRef<DSLRef>(null);
  const engineRef = useRef<any>(null);
  const chartDataFromProps = data || TEST_CANDLEVIEW_DATA8;
  const isValidData = chartDataFromProps && Array.isArray(chartDataFromProps) && chartDataFromProps.length > 0;
  const handleCryptoClick = useCallback((pair: string) => {
    console.log("[MarketPanel] Crypto clicked:", pair);
  }, []);
  const handleStockClick = useCallback((symbol: string) => {
    console.log("[MarketPanel] Stock clicked:", symbol);
  }, []);
  const toggleMarketPanel = useCallback(() => {
    setIsMarketCollapsed((prev) => !prev);
  }, []);
  useEffect(() => {
    const checkEngine = () => {
      if (chartRef.current) {
        const engine = chartRef.current.getEngine();
        if (engine && !engineRef.current) {
          engineRef.current = engine;
        }
      }
    };
    const interval = setInterval(checkEngine, 300);
    return () => clearInterval(interval);
  }, []);
  const startChartResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startYRef.current = e.clientY;
      startChartHeightRef.current = chartHeight;
      setIsChartResizing(true);
    },
    [chartHeight],
  );
  const handleChartMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isChartResizing) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const deltaY = e.clientY - startYRef.current;
      const deltaPercent = (deltaY / rect.height) * 100;
      let newHeight = startChartHeightRef.current + deltaPercent;
      newHeight = Math.max(30, newHeight);
      newHeight = Math.min(80, newHeight);
      setChartHeight(newHeight);
    },
    [isChartResizing],
  );
  const stopChartResizing = useCallback(() => {
    setIsChartResizing(false);
  }, []);
  const startEditorResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;
      startEditorWidthRef.current = editorWidth;
      setIsEditorResizing(true);
    },
    [editorWidth],
  );
  const handleEditorMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isEditorResizing) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const deltaX = e.clientX - startXRef.current;
      const deltaPercent = (deltaX / rect.width) * 100;
      let newWidth = startEditorWidthRef.current + deltaPercent;
      newWidth = Math.max(30, newWidth);
      newWidth = Math.min(80, newWidth);
      setEditorWidth(newWidth);
    },
    [isEditorResizing],
  );
  const stopEditorResizing = useCallback(() => {
    setIsEditorResizing(false);
  }, []);
  const startMarketResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startMarketXRef.current = e.clientX;
      startMarketWidthRef.current = marketPanelWidth;
      setIsMarketResizing(true);
    },
    [marketPanelWidth],
  );
  const handleMarketMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isMarketResizing) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const deltaX = startMarketXRef.current - e.clientX;
      let newWidth = startMarketWidthRef.current + deltaX;
      newWidth = Math.max(150, newWidth);
      newWidth = Math.min(280, newWidth);
      setMarketPanelWidth(newWidth);
    },
    [isMarketResizing],
  );
  const stopMarketResizing = useCallback(() => {
    setIsMarketResizing(false);
  }, []);
  // Chart resize events
  useEffect(() => {
    if (isChartResizing) {
      document.addEventListener("mousemove", handleChartMouseMove);
      document.addEventListener("mouseup", stopChartResizing);
    }
    return () => {
      document.removeEventListener("mousemove", handleChartMouseMove);
      document.removeEventListener("mouseup", stopChartResizing);
    };
  }, [isChartResizing, handleChartMouseMove, stopChartResizing]);
  // Editor resize events
  useEffect(() => {
    if (isEditorResizing) {
      document.addEventListener("mousemove", handleEditorMouseMove);
      document.addEventListener("mouseup", stopEditorResizing);
    }
    return () => {
      document.removeEventListener("mousemove", handleEditorMouseMove);
      document.removeEventListener("mouseup", stopEditorResizing);
    };
  }, [isEditorResizing, handleEditorMouseMove, stopEditorResizing]);
  // Market resize events
  useEffect(() => {
    if (isMarketResizing) {
      document.addEventListener("mousemove", handleMarketMouseMove);
      document.addEventListener("mouseup", stopMarketResizing);
    }
    return () => {
      document.removeEventListener("mousemove", handleMarketMouseMove);
      document.removeEventListener("mouseup", stopMarketResizing);
    };
  }, [isMarketResizing, handleMarketMouseMove, stopMarketResizing]);
  const isDark = theme === "dark";
  const editorHeight = 100 - chartHeight;
  const rightWidth = isMarketCollapsed ? 0 : marketPanelWidth;
  const leftWidth = `calc(100% - ${rightWidth}px)`;
  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        position: "relative",
        background: isDark ? "var(--bg-primary, #1a1a2e)" : "var(--bg-primary, #f5f5f5)",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <style>{`
        .chart-resize-handle {
          position: relative;
          z-index: 1;
        }
        .chart-resize-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: 0;
          right: 0;
          bottom: -10px;
          cursor: row-resize;
          z-index: 10;
        }
        .editor-resize-handle {
          position: relative;
          z-index: 1;
        }
        .editor-resize-handle::after {
          content: '';
          position: absolute;
          top: 0;
          left: -10px;
          right: -10px;
          bottom: 0;
          cursor: col-resize;
          z-index: 10;
        }
        .market-resize-handle {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          transition: background 0.2s;
        }
        .market-resize-handle::after {
          content: '';
          position: absolute;
          top: 0;
          left: -8px;
          right: -8px;
          bottom: 0;
          cursor: col-resize;
          z-index: 10;
        }
        .market-resize-handle .handle-line {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 2px;
          height: 30px;
          background: var(--text-muted);
          border-radius: 2px;
          transition: background 0.2s;
        }
        .market-resize-handle:hover .handle-line {
          background: var(--text-secondary);
        }
        textarea::-webkit-scrollbar,
        div::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        textarea::-webkit-scrollbar-track,
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        textarea::-webkit-scrollbar-thumb,
        div::-webkit-scrollbar-thumb {
          background: ${isDark ? "rgba(75, 85, 99, 0.5)" : "rgba(156, 163, 175, 0.5)"};
          border-radius: 2px;
        }
        textarea::-webkit-scrollbar-thumb:hover,
        div::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? "rgba(75, 85, 99, 0.7)" : "rgba(156, 163, 175, 0.7)"};
        }
        textarea::-webkit-scrollbar-corner,
        div::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
      <div
        style={{
          width: leftWidth,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: `${chartHeight}%`,
            minHeight: "30%",
            maxHeight: "80%",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <Chart ref={chartRef} theme={theme} i18n={i18n} symbol={symbol} data={chartDataFromProps} chartData={chartData} isValidData={isValidData} />
          {isMarketCollapsed && (
            <button
              onClick={toggleMarketPanel}
              style={{
                position: "absolute",
                top: "5px",
                right: "10px",
                zIndex: 20,
                padding: "6px 10px",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                transition: "all 0.2s",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                background: isDark ? "#374151" : "#ffffff",
                color: isDark ? "#e5e7eb" : "#374151",
                cursor: "pointer",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                height: "32px",
              }}
              title={i18n === "zh-cn" ? "展开市场面板" : "Expand market panel"}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? "#4b5563" : "#f3f4f6";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? "#374151" : "#ffffff";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <PanelRightOpen size={16} />
              <span style={{ fontSize: "12px", whiteSpace: "nowrap" }}>{i18n === "zh-cn" ? "市场" : "Market"}</span>
            </button>
          )}
        </div>
        <div
          className="chart-resize-handle"
          style={{
            height: "1px",
            background: "var(--border-color)",
            cursor: "row-resize",
            flexShrink: 0,
            position: "relative",
          }}
          onMouseDown={startChartResizing}
        />
        <div
          style={{
            height: `${editorHeight}%`,
            minHeight: "20%",
            maxHeight: "70%",
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <DSL ref={dslRef} theme={theme} i18n={i18n} editorWidth={editorWidth} onStartEditorResize={startEditorResizing} engineRef={engineRef} />
        </div>
      </div>
      {!isMarketCollapsed && (
        <div
          className="market-resize-handle"
          style={{
            width: "1px",
            height: "100%",
            background: "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
          }}
          onMouseDown={startMarketResizing}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? "#4a5568" : "#9ca3af";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--border-color)";
          }}
        />
      )}
      {!isMarketCollapsed && (
        <div
          style={{
            width: `${rightWidth}px`,
            minWidth: "150px",
            maxWidth: "280px",
            height: "100%",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <MarketPanel theme={theme} i18n={i18n} onCryptoClick={handleCryptoClick} onStockClick={handleStockClick} isCollapsed={isMarketCollapsed} onToggleCollapse={toggleMarketPanel} />
        </div>
      )}
      {isChartResizing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            cursor: "row-resize",
          }}
        />
      )}
      {isEditorResizing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            cursor: "col-resize",
          }}
        />
      )}
      {isMarketResizing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            cursor: "col-resize",
          }}
        />
      )}
    </div>
  );
};
export default ChartChatPageCandleView;
