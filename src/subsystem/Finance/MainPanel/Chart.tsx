import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { CandleView, ICandleViewDataPoint, MainChartType, TimeframeEnum } from "@candleview/core";
interface ChartProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  symbol: string;
  data: ICandleViewDataPoint[];
  chartData?: any;
  isValidData: boolean;
  onTimeframeChange?: (timeframe: string) => void;
}
export interface ChartRef {
  getEngine: () => any;
  getCandleView: () => CandleView | null;
  applyConfig: (config: any) => void;
}
const Chart = forwardRef<ChartRef, ChartProps>(({ theme, i18n, symbol, data, chartData, isValidData, onTimeframeChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const candleViewRef = useRef<CandleView | null>(null);
  const [isReady, setIsReady] = useState(false);
  const engineRef = useRef<any>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const initializationCompleteRef = useRef(false);
  const chartReadyRef = useRef(false);
  /**
   * Handle timeframe change from CandleView
   * This is called when user clicks on a timeframe button in the top panel
   */
  const handleTimeframeChange = useCallback(
    (timeframe: TimeframeEnum) => {
      console.log("[Chart] CandleView timeframe changed:", timeframe);
      onTimeframeChange?.(String(timeframe));
    },
    [onTimeframeChange],
  );
  /**
   * Check if chart is fully ready for operations
   */
  const isChartReady = useCallback((): boolean => {
    return candleViewRef.current !== null && chartReadyRef.current === true;
  }, []);
  /**
   * Apply configuration to the CandleView instance
   * This includes chart type, indicators, static marks, etc.
   */
  const applyCandleViewConfig = useCallback(
    (config: any) => {
      if (!isChartReady()) {
        console.log("[Chart] Skipping config apply - chart not ready");
        return;
      }
      const cv = candleViewRef.current;
      if (!cv) return;
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
    [isChartReady],
  );
  /**
   * Expose methods to parent component via ref
   */
  useImperativeHandle(ref, () => ({
    getEngine: () => engineRef.current,
    getCandleView: () => candleViewRef.current,
    applyConfig: applyCandleViewConfig,
  }));
  /**
   * Initialize CandleView and CVSEngine
   * This effect runs once on component mount
   */
  useEffect(() => {
    // Guard against multiple initializations
    if (initializationCompleteRef.current) {
      return;
    }
    if (!containerRef.current) {
      console.error("[Chart] Container ref is null");
      return;
    }
    if (candleViewRef.current) {
      console.log("[Chart] CandleView already exists, skipping initialization");
      return;
    }
    if (!isValidData) {
      console.error("[Chart] No valid data for chart initialization", { data });
      return;
    }
    try {
      console.log("[Chart] Initializing CandleView with data length:", data?.length);
      const candleView = new CandleView({
        container: containerRef.current,
        title: symbol,
        theme: theme,
        locale: i18n === "zh-cn" ? "zh-cn" : "en",
        technologyPanel: true,
        drawingPanel: true,
        data: data,
        timeframe: TimeframeEnum.ONE_SECOND,
      });
      // Set timeframe change callback
      candleView.setOnTimeframeChangeCallback((cv, timeframe) => {
        handleTimeframeChange(timeframe);
      });
      candleViewRef.current = candleView;
      initializationCompleteRef.current = true;
      // Mark chart as ready after a short delay to ensure internal engine is ready
      setTimeout(() => {
        chartReadyRef.current = true;
        setIsReady(true);
        console.log("[Chart] Chart is now ready for operations");
        // Apply initial chart data if available
        if (chartData) {
          applyCandleViewConfig(chartData);
        }
      }, 300);
      console.log("[Chart] CandleView instance created");
      // Load CVSEngine asynchronously
      import("@candleview/cvs-engine")
        .then((module) => {
          const { CVSEngine } = module;
          const engine = new CVSEngine(candleView as any, {
            autoExecuteOnNewCandle: false,
            enableLogging: true,
          });
          engineRef.current = engine;
          setIsEngineReady(true);
          console.log("[Chart] CVSEngine initialized successfully");
        })
        .catch((err) => {
          console.warn("[Chart] CVSEngine not available:", err.message);
          setIsEngineReady(false);
        });
    } catch (error) {
      console.error("[Chart] Failed to initialize CandleView:", error);
    }
    // Cleanup function
    return () => {
      console.log("[Chart] Cleaning up chart resources");
      chartReadyRef.current = false;
      if (engineRef.current) {
        try {
          engineRef.current.stop();
        } catch (e) {
          console.warn("[Chart] Error stopping engine:", e);
        }
        engineRef.current = null;
      }
      if (candleViewRef.current) {
        try {
          candleViewRef.current.destroy();
        } catch (e) {
          console.warn("[Chart] Error destroying CandleView:", e);
        }
        candleViewRef.current = null;
        setIsReady(false);
        setIsEngineReady(false);
        initializationCompleteRef.current = false;
      }
    };
  }, []); // Empty dependency array - run once on mount
  /**
   * Apply chart config when chartData prop changes
   */
  useEffect(() => {
    if (isChartReady() && chartData) {
      console.log("[Chart] Applying config from chartData prop");
      applyCandleViewConfig(chartData);
    }
  }, [chartData, isChartReady, applyCandleViewConfig]);
  /**
   * Update chart when data changes
   * This is the critical effect that updates the chart when new data arrives
   */
  useEffect(() => {
    // Strict validation: ensure chart is fully ready
    if (!isChartReady()) {
      console.log("[Chart] Skipping data update - chart not ready");
      return;
    }
    if (!isValidData) {
      console.log("[Chart] Skipping data update - invalid data");
      return;
    }
    if (!data || data.length === 0) {
      console.log("[Chart] Skipping data update - empty data array");
      return;
    }
    const cv = candleViewRef.current;
    if (!cv) {
      console.log("[Chart] Skipping data update - candleView is null");
      return;
    }
    console.log("[Chart] Updating chart with data length:", data.length);
    try {
      // Set data on the CandleView instance
      cv.setData(data);
      cv.setTitle(symbol);
      // Force fit content after data update
      setTimeout(() => {
        try {
          const chart = cv.getChart();
          if (chart?.chart) {
            chart.chart.timeScale().fitContent();
            console.log("[Chart] fitContent called successfully");
          }
        } catch (e) {
          console.warn("[Chart] Fit content after data update error:", e);
        }
      }, 150);
    } catch (error) {
      console.error("[Chart] Error updating chart data:", error);
    }
  }, [data, isValidData, symbol, isChartReady]);
  /**
   * Update theme when it changes
   */
  useEffect(() => {
    if (isChartReady()) {
      const cv = candleViewRef.current;
      if (cv) {
        cv.setTheme(theme);
      }
    }
  }, [theme, isChartReady]);
  /**
   * Update locale when it changes
   */
  useEffect(() => {
    if (isChartReady()) {
      const cv = candleViewRef.current;
      if (cv) {
        cv.setLocale(i18n === "zh-cn" ? "zh-cn" : "en");
      }
    }
  }, [i18n, isChartReady]);
  /**
   * Listen for external chart data events
   * This allows other components to send data to the chart
   */
  useEffect(() => {
    const handleChartData = (event: CustomEvent) => {
      const { taskData, chartData: eventChartData } = event.detail;
      // Guard: ensure chart is ready before processing
      if (!isChartReady()) {
        console.log("[Chart] Skipping chart data event - chart not ready");
        return;
      }
      const cv = candleViewRef.current;
      if (!cv) return;
      if (eventChartData) {
        console.log("[Chart] Applying config from event chartData");
        applyCandleViewConfig(eventChartData);
      }
      if (taskData?.final_output) {
        try {
          const parsedData = JSON.parse(taskData.final_output);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log("[Chart] Updating data from taskData.final_output, length:", parsedData.length);
            cv.setData(parsedData);
            setTimeout(() => {
              try {
                const chart = cv.getChart();
                if (chart?.chart) {
                  chart.chart.timeScale().fitContent();
                }
              } catch (e) {
                console.warn("[Chart] Fit content after data update error:", e);
              }
            }, 100);
          }
        } catch (e) {
          console.error("[Chart] Failed to parse chart data:", e);
        }
      }
    };
    window.addEventListener("open-chart-with-data", handleChartData as EventListener);
    return () => {
      window.removeEventListener("open-chart-with-data", handleChartData as EventListener);
    };
  }, [applyCandleViewConfig, isChartReady]);
  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
});
Chart.displayName = "Chart";
export default Chart;
