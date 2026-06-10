import { CandleView, ICandleViewDataPoint } from "@candleview/core";
import React, { useRef, useEffect, useState } from "react";
import { TEST_CANDLEVIEW_DATA8 } from "../../../../test/TestData_3";

interface IntegratedCandleViewProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  currentSessionId?: string;
  data?: ICandleViewDataPoint[];
  symbol?: string;
}

export const IntegratedCandleView: React.FC<IntegratedCandleViewProps> = ({
  theme,
  i18n,
  currentSessionId,
  data,
  symbol = "BTC/USDT",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const candleViewRef = useRef<any>(null);
  const chartData = data || TEST_CANDLEVIEW_DATA8;
  useEffect(() => {
    if (!containerRef.current) return;
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    const candleView = new CandleView({
      container: containerRef.current,
      data: chartData,
      title: `${symbol} Candlestick Chart`,
      theme: theme,
      locale: i18n === "zh-cn" ? "zh-cn" : "en",
      technologyPanel: true,
      drawingPanel: true,
    });
    candleViewRef.current = candleView;
    return () => {
      if (candleViewRef.current) {
        candleViewRef.current.destroy?.();
        candleViewRef.current = null;
      }
    };
  }, [chartData, theme, i18n, symbol]);
  useEffect(() => {
    const handleChartData = (event: CustomEvent) => {
      const { taskId, taskData } = event.detail;
      if (candleViewRef.current && taskData?.final_output) {
        try {
          const parsedData = JSON.parse(taskData.final_output);
          if (Array.isArray(parsedData)) {
            candleViewRef.current.setData?.(parsedData);
          }
        } catch (e) {
          console.error("Failed to parse chart data:", e);
        }
      }
    };
    window.addEventListener(
      "open-chart-with-data",
      handleChartData as EventListener,
    );
    return () => {
      window.removeEventListener(
        "open-chart-with-data",
        handleChartData as EventListener,
      );
    };
  }, []);
  useEffect(() => {
    if (candleViewRef.current && currentSessionId) {
      candleViewRef.current.refresh?.();
    }
  }, [currentSessionId]);
  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        flex: 1,
      }}
    />
  );
};

export default IntegratedCandleView;
