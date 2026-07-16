import React, { useRef, useEffect, useState, useCallback } from "react";
import { ICandleViewDataPoint } from "@candleview/core";
import { TEST_CANDLEVIEW_DATA8 } from "../../../test/TestData_3";
import Chart, { ChartRef } from "./Chart";
import DSL, { DSLRef } from "./DSL";

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
  const startYRef = useRef(0);
  const startChartHeightRef = useRef(0);
  const startXRef = useRef(0);
  const startEditorWidthRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartRef>(null);
  const dslRef = useRef<DSLRef>(null);
  const engineRef = useRef<any>(null);

  const chartDataFromProps = data || TEST_CANDLEVIEW_DATA8;
  const isValidData = chartDataFromProps && Array.isArray(chartDataFromProps) && chartDataFromProps.length > 0;

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

  const isDark = theme === "dark";
  const editorHeight = 100 - chartHeight;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
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
          height: `${chartHeight}%`,
          minHeight: "30%",
          maxHeight: "80%",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Chart ref={chartRef} theme={theme} i18n={i18n} symbol={symbol} data={chartDataFromProps} chartData={chartData} isValidData={isValidData} />
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
    </div>
  );
};

export default ChartChatPageCandleView;
