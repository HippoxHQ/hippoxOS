import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  CandleView,
  ICandleViewDataPoint,
  MainChartType,
  TimeframeEnum,
} from "@candleview/core";

interface ChartProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  symbol: string;
  data: ICandleViewDataPoint[];
  chartData?: any;
  isValidData: boolean;
}

export interface ChartRef {
  getEngine: () => any;
  getCandleView: () => CandleView | null;
  applyConfig: (config: any) => void;
}

const Chart = forwardRef<ChartRef, ChartProps>(
  ({ theme, i18n, symbol, data, chartData, isValidData }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const candleViewRef = useRef<CandleView | null>(null);
    const [isReady, setIsReady] = useState(false);
    const engineRef = useRef<any>(null);
    const [isEngineReady, setIsEngineReady] = useState(false);

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
              console.warn(
                `Failed to apply sub-indicator ${indicator.type}:`,
                e,
              );
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

    useImperativeHandle(ref, () => ({
      getEngine: () => engineRef.current,
      getCandleView: () => candleViewRef.current,
      applyConfig: applyCandleViewConfig,
    }));

    useEffect(() => {
      if (!containerRef.current) return;
      if (candleViewRef.current) return;
      if (!isValidData) {
        console.error("No valid data for chart initialization", { data });
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
          data: data,
          timeframe: TimeframeEnum.ONE_SECOND,
        });

        candleViewRef.current = candleView;
        setIsReady(true);

        import("@candleview/cvs-engine")
          .then((module) => {
            const { CVSEngine } = module;
            const engine = new CVSEngine(candleView as any, {
              autoExecuteOnNewCandle: false,
              enableLogging: true,
            });
            engineRef.current = engine;
            setIsEngineReady(true);
          })
          .catch((err) => {
            console.warn("[Chart] CVSEngine not available:", err.message);
            setIsEngineReady(false);
          });

        setTimeout(() => {
          if (chartData) {
            applyCandleViewConfig(chartData);
          }
        }, 500);
      } catch (error) {
        console.error("Failed to initialize CandleView:", error);
      }

      return () => {
        if (engineRef.current) {
          engineRef.current.stop();
          engineRef.current = null;
        }
        if (candleViewRef.current) {
          candleViewRef.current.destroy();
          candleViewRef.current = null;
          setIsReady(false);
          setIsEngineReady(false);
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
      candleViewRef.current.setData(data);
      setTimeout(() => {
        try {
          const chart = candleViewRef.current?.getChart();
          if (chart?.chart) {
            chart.chart.timeScale().fitContent();
          }
        } catch (e) {}
      }, 100);
    }, [data, isValidData]);
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
    return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
  },
);

Chart.displayName = "Chart";

export default Chart;
