import {
  CandleView,
  ICandleViewDataPoint,
  MainChartType,
} from "@candleview/core";
import React, { useRef, useEffect, useState } from "react";
import { TEST_CANDLEVIEW_DATA8 } from "../../../../test/TestData_3";

interface IntegratedCandleViewProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  currentSessionId?: string;
  data?: ICandleViewDataPoint[];
  symbol?: string;
  taskId?: string;
}

export const IntegratedCandleView: React.FC<IntegratedCandleViewProps> = ({
  theme,
  i18n,
  currentSessionId,
  data,
  symbol = "BTC/USDT",
  taskId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const candleViewRef = useRef<CandleView | null>(null);
  const [isReady, setIsReady] = useState(false);
  const chartData = data || TEST_CANDLEVIEW_DATA8;
  const isValidData =
    chartData && Array.isArray(chartData) && chartData.length > 0;
  useEffect(() => {
    if (!containerRef.current) return;
    if (candleViewRef.current) return;
    if (!isValidData) {
      console.error("No valid data for chart initialization", { chartData });
      return;
    }
    try {
      const candleView = new CandleView({
        container: containerRef.current,
        title: symbol,
        theme: theme,
        locale: i18n === "zh-cn" ? "zh-cn" : "en",
        technologyPanel: true,
        drawingPanel: true,
        data: chartData,
        activeTimeframe: undefined,
      });
      candleViewRef.current = candleView;
      setIsReady(true);
    } catch (error) {
      console.error("Failed to initialize CandleView:", error);
    }
    return () => {
      if (candleViewRef.current) {
        candleViewRef.current.destroy();
        candleViewRef.current = null;
        setIsReady(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!candleViewRef.current || !isValidData) return;
    candleViewRef.current.setData(chartData);
    setTimeout(() => {
      try {
        const chart = candleViewRef.current?.getChart();
        if (chart?.chart) {
          chart.chart.timeScale().fitContent();
        }
      } catch (e) {}
    }, 100);
  }, [chartData]);

  useEffect(() => {
    if (candleViewRef.current) {
      candleViewRef.current.setTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (candleViewRef.current) {
      candleViewRef.current.setLocale(i18n === "zh-cn" ? "zh-cn" : "en");
    }
  }, [i18n]);

  useEffect(() => {
    const handleChartData = (event: CustomEvent) => {
      const { taskData } = event.detail;
      if (taskData?.final_output) {
        try {
          const parsedData = JSON.parse(taskData.final_output);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            if (candleViewRef.current) {
              candleViewRef.current.setData(parsedData);

              setTimeout(() => {
                try {
                  const chart = candleViewRef.current?.getChart();
                  if (chart?.chart) {
                    chart.chart.timeScale().fitContent();
                  }
                } catch (e) {
                  console.warn("Fit content after data update error:", e);
                }
              }, 100);
            }
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
    if (candleViewRef.current && currentSessionId && isReady) {
      try {
        const chart = candleViewRef.current.getChart();
        if (chart?.chart) {
          chart.chart.timeScale().fitContent();
        }
      } catch (e) {
        console.warn("Session refresh error:", e);
      }
    }
  }, [currentSessionId, isReady]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    />
  );
};

export default IntegratedCandleView;
