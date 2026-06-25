import {
  CandleView,
  ICandleViewDataPoint,
  MainChartType,
  TimeframeEnum,
} from "@candleview/core";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { TEST_CANDLEVIEW_DATA8 } from "../../test/TestData_3";

interface ChartChatPageCandleViewProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  currentSessionId?: string;
  data?: ICandleViewDataPoint[];
  symbol?: string;
  taskId?: string;
  chartData?: any;
}

export const ChartChatPageCandleView: React.FC<
  ChartChatPageCandleViewProps
> = ({
  theme,
  i18n,
  currentSessionId,
  data,
  symbol = "BTC/USDT",
  taskId,
  chartData,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const candleViewRef = useRef<CandleView | null>(null);
  const [isReady, setIsReady] = useState(false);
  const chartDataFromProps = data || TEST_CANDLEVIEW_DATA8;
  const isValidData =
    chartDataFromProps &&
    Array.isArray(chartDataFromProps) &&
    chartDataFromProps.length > 0;
  const applyCandleViewConfig = useCallback(
    (config: any) => {
      if (!candleViewRef.current || !isReady) return;
      const cv = candleViewRef.current;
      if (config?.chartType) {
        try {
          cv.setChartType(config.chartType as MainChartType);
        } catch (e) {
          console.warn("Failed to set chart type:", e);
        }
      }
      if (config?.title) {
        try {
          cv.setTitle(config.title);
        } catch (e) {
          console.warn("Failed to set title:", e);
        }
      }
      if (config?.mainIndicators && Array.isArray(config.mainIndicators)) {
        config.mainIndicators.forEach((indicator: any) => {
          try {
            if (indicator.enabled) {
              cv.openMainChartIndicator(indicator.type, indicator.parameters);
            } else {
              cv.closeMainChartIndicator(indicator.type);
            }
          } catch (e) {
            console.warn(`Failed to apply indicator ${indicator.type}:`, e);
          }
        });
      }
      if (config?.subIndicators && Array.isArray(config.subIndicators)) {
        config.subIndicators.forEach((indicator: any) => {
          try {
            if (indicator.enabled) {
              cv.openSubChartIndicator(indicator.type);
            } else {
              cv.closeSubChartIndicator(indicator.type);
            }
          } catch (e) {
            console.warn(`Failed to apply sub-indicator ${indicator.type}:`, e);
          }
        });
      }
      if (config?.staticMarks && Array.isArray(config.staticMarks)) {
        try {
          cv.addStaticMarks(config.staticMarks);
        } catch (e) {
          console.warn("Failed to add static marks:", e);
        }
      }
      if (config?.priceEvents && Array.isArray(config.priceEvents)) {
        try {
          cv.registerPriceEvents(config.priceEvents);
        } catch (e) {
          console.warn("Failed to register price events:", e);
        }
      }
    },
    [isReady],
  );
  useEffect(() => {
    if (!containerRef.current) return;
    if (candleViewRef.current) return;
    if (!isValidData) {
      console.error("No valid data for chart initialization", {
        chartDataFromProps,
      });
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
        data: chartDataFromProps,
        timeframe: TimeframeEnum.ONE_SECOND,
      });
      candleViewRef.current = candleView;
      setIsReady(true);
      setTimeout(() => {
        if (chartData) {
          applyCandleViewConfig(chartData);
        }
      }, 500);
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
    if (isReady && candleViewRef.current && chartData) {
      applyCandleViewConfig(chartData);
    }
  }, [chartData, isReady, applyCandleViewConfig]);

  useEffect(() => {
    if (!candleViewRef.current || !isValidData) return;
    candleViewRef.current.setData(chartDataFromProps);
    setTimeout(() => {
      try {
        const chart = candleViewRef.current?.getChart();
        if (chart?.chart) {
          chart.chart.timeScale().fitContent();
        }
      } catch (e) {}
    }, 100);
  }, [chartDataFromProps]);

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
      const { taskData, chartData: eventChartData } = event.detail;
      if (eventChartData && candleViewRef.current && isReady) {
        applyCandleViewConfig(eventChartData);
      }
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
  }, [applyCandleViewConfig, isReady]);

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

export default ChartChatPageCandleView;
