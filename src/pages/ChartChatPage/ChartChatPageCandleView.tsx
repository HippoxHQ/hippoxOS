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

const getDefaultScript = (locale: string): string => {
  const isZh = locale === "zh-cn";

  return `// ${isZh ? "示例脚本 - 自定义主图和副图指标" : "Example Script - Custom Main & Sub Indicators"}
// ============================================

// 1. ${isZh ? "自定义主图指标：计算 OHLC 均值通道" : "Custom main indicator: OHLC mean channel"}
plotMain({
    id: 'ohlc_mean',
    calculator: (idx, open, high, low, close, volume) => {
        return (high + low + close) / 3;
    },
    options: {
        name: '${isZh ? "OHLC均值" : "OHLC Mean"}',
        color: '#FF6B6B',
        width: 2,
        style: 'solid'
    }
});

// 2. ${isZh ? "另一个主图指标：价格波动率（最高价-最低价）" : "Another main indicator: Price volatility (High - Low)"}
plotMain({
    id: 'volatility',
    calculator: (idx, open, high, low, close, volume) => {
        return high - low;
    },
    options: {
        name: '${isZh ? "波动率" : "Volatility"}',
        color: '#4ECDC4',
        width: 1,
        style: 'dashed'
    }
});

// 3. ${isZh ? "批量添加主图指标 - 多条线一起添加" : "Batch add main indicators - multiple lines"}
plotMain([
    {
        id: 'upper_band',
        calculator: (idx, open, high, low, close, volume) => {
            return close * 1.05;
        },
        options: { name: '${isZh ? "上轨" : "Upper Band"}', color: '#45B7D1', width: 1, style: 'dotted' }
    },
    {
        id: 'lower_band',
        calculator: (idx, open, high, low, close, volume) => {
            return close * 0.95;
        },
        options: { name: '${isZh ? "下轨" : "Lower Band"}', color: '#F39C12', width: 1, style: 'dotted' }
    }
]);

// 4. ${isZh ? "自定义副图指标：自定义 RSI 风格指标" : "Custom sub indicator: RSI style"}
plotSub({
    id: 'custom_rsi',
    calculator: (idx, open, high, low, close, volume) => {
        return 50 + Math.sin(idx * 0.1) * 30;
    },
    options: {
        name: 'Custom RSI',
        color: '#FF6B6B',
        width: 2,
        type: 'line'
    }
});

// 5. ${isZh ? "自定义副图指标：成交量柱状图" : "Custom sub indicator: Volume histogram"}
plotSub({
    id: 'custom_volume',
    calculator: (idx, open, high, low, close, volume) => {
        return volume / 1000;
    },
    options: {
        name: 'Volume/1000',
        color: '#4ECDC4',
        type: 'histogram'
    }
});

// 6. ${isZh ? "批量添加副图指标" : "Batch add sub indicators"}
plotSub([
    {
        id: 'momentum',
        calculator: (idx, open, high, low, close, volume) => {
            return close - open;
        },
        options: { name: '${isZh ? "动量" : "Momentum"}', color: '#FF9800', type: 'line', width: 1 }
    },
    {
        id: 'range_percent',
        calculator: (idx, open, high, low, close, volume) => {
            return ((high - low) / close) * 100;
        },
        options: { name: '${isZh ? "振幅%" : "Range%"}', color: '#9C27B0', type: 'area' }
    }
]);

console.log("${isZh ? "所有自定义指标已添加完成" : "All custom indicators added"}");
console.log("${isZh ? "主图指标: OHLC均值, 波动率, 上下轨" : "Main indicators: OHLC Mean, Volatility, Upper/Lower Bands"}");
console.log("${isZh ? "副图指标: Custom RSI, Volume, 动量, 振幅%" : "Sub indicators: Custom RSI, Volume, Momentum, Range %"}");

return {
    message: "${isZh ? "自定义指标测试完成" : "Custom indicators test completed"}",
    mainCount: 5,
    subCount: 5
};`;
};

const getExampleScripts = (locale: string) => {
  const isZh = locale === "zh-cn";
  return [
    {
      name: isZh ? "自定义指标完整示例" : "Custom Indicators Full Example",
      script: getDefaultScript(locale),
    },
    {
      name: isZh ? "简单主图线" : "Simple Main Line",
      script: `// ${isZh ? "简单主图线" : "Simple Main Line"}
plotMain({
    id: 'simple_line',
    calculator: (idx, open, high, low, close, volume) => close,
    options: { name: '${isZh ? "收盘价" : "Close Price"}', color: '#FF6B6B', width: 2 }
});

console.log("${isZh ? "主图线已添加" : "Main line added"}");
return { message: "done" };`,
    },
    {
      name: isZh ? "简单副图线" : "Simple Sub Line",
      script: `// ${isZh ? "简单副图线" : "Simple Sub Line"}
plotSub({
    id: 'simple_sub',
    calculator: (idx, open, high, low, close, volume) => close,
    options: { name: '${isZh ? "收盘价副图" : "Close Price Sub"}', color: '#4ECDC4', type: 'line' }
});

console.log("${isZh ? "副图线已添加" : "Sub line added"}");
return { message: "done" };`,
    },
    {
      name: isZh ? "清除所有自定义指标" : "Clear All Custom Indicators",
      script: `// ${isZh ? "清除所有自定义指标" : "Clear All Custom Indicators"}
clearAllMain();
clearAllSub();
console.log("${isZh ? "所有自定义指标已清除" : "All custom indicators cleared"}");
return { message: "cleared" };`,
    },
  ];
};

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
  const engineRef = useRef<any>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [script, setScript] = useState(getDefaultScript(i18n));
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [chartHeight, setChartHeight] = useState(55); 
  const [editorWidth, setEditorWidth] = useState(60); 
  const [isChartResizing, setIsChartResizing] = useState(false);
  const [isEditorResizing, setIsEditorResizing] = useState(false);
  const startYRef = useRef(0);
  const startChartHeightRef = useRef(0);
  const startXRef = useRef(0);
  const startEditorWidthRef = useRef(0);
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      originalLog(...args);
      const message = args
        .map((arg) => {
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(" ");
      setLogs((prev) => [...prev, `[LOG] ${message}`]);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      const message = args.map((arg) => String(arg)).join(" ");
      setLogs((prev) => [...prev, `[WARN] ${message}`]);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      const message = args.map((arg) => String(arg)).join(" ");
      setLogs((prev) => [...prev, `[ERROR] ${message}`]);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);
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
      import("@candleview/cvs-engine")
        .then((module) => {
          const { CVSEngine } = module;
          const engine = new CVSEngine(candleView as any, {
            autoExecuteOnNewCandle: false,
            enableLogging: true,
          });
          engineRef.current = engine;
          setIsEngineReady(true);
          console.log(
            "[ChartChatPageCandleView] CVSEngine loaded successfully",
          );
        })
        .catch((err) => {
          console.warn(
            "[ChartChatPageCandleView] CVSEngine not available:",
            err.message,
          );
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
    setScript(getDefaultScript(i18n));
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
  const handleExecute = () => {
    if (!engineRef.current) {
      setExecutionResult({
        success: false,
        message: "CVSEngine not available",
      });
      return;
    }
    setLogs([]);
    try {
      engineRef.current.loadScript(script);
      const result = engineRef.current.execute();
      if (result.success) {
        setExecutionResult({
          success: true,
          message: `Executed in ${result.duration?.toFixed(2)}ms`,
        });
      } else {
        setExecutionResult({
          success: false,
          message: result.error || "Execution failed",
        });
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  const handleStart = () => {
    if (!engineRef.current) return;
    setLogs([]);
    engineRef.current.start();
    setIsEngineRunning(true);
    setExecutionResult({
      success: true,
      message: "Engine started, will execute on each new candle",
    });
  };
  const handleStop = () => {
    if (!engineRef.current) return;
    engineRef.current.stop();
    setIsEngineRunning(false);
    setExecutionResult({ success: true, message: "Engine stopped" });
  };
  const handleClear = () => {
    if (!engineRef.current) return;
    engineRef.current.clearAllCustomIndicators();
    setExecutionResult({
      success: true,
      message: "All custom indicators cleared",
    });
  };
  const handleReset = () => {
    setScript(getDefaultScript(i18n));
    setLogs([]);
    setExecutionResult({ success: true, message: "Reset to default script" });
  };
  const handleClearLogs = () => {
    setLogs([]);
  };
  const handleLoadExample = (exampleScript: string) => {
    setScript(exampleScript);
    setLogs([]);
    setExecutionResult({ success: true, message: "Example script loaded" });
  };
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
      const container = containerRef.current?.parentElement?.parentElement;
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
      const container = containerRef.current?.parentElement;
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
  const exampleScripts = getExampleScripts(i18n);
  const isDark = theme === "dark";
  const editorHeight = 100 - chartHeight;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: isDark
          ? "var(--bg-primary, #1a1a2e)"
          : "var(--bg-primary, #f5f5f5)",
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

      {/* ===== 上部分：图表 ===== */}
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
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* ===== 水平分割线（上下分割） ===== */}
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

      {/* ===== 下部分：DSL 编辑区 + 终端 ===== */}
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
        {/* 左侧：DSL 编辑区 */}
        <div
          style={{
            width: `${editorWidth}%`,
            minWidth: "30%",
            maxWidth: "80%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRight: "1px solid var(--border-color)",
          }}
        >
          {/* 标题栏 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 12px",
              borderBottom: "1px solid var(--border-color)",
              background: isDark
                ? "var(--bg-secondary, #2d2d3d)"
                : "var(--bg-secondary, #e8e8e8)",
              flexShrink: 0,
              minHeight: "32px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: isDark
                  ? "var(--text-primary, #eee)"
                  : "var(--text-primary, #222)",
              }}
            >
              📝 DSL Script Editor
              {!isEngineReady && (
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "10px",
                    color: "#eab308",
                  }}
                >
                  (Engine loading...)
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={handleReset}
                style={{
                  padding: "2px 10px",
                  fontSize: "11px",
                  borderRadius: "4px",
                  background: isDark
                    ? "var(--bg-tertiary, #3d3d4d)"
                    : "var(--bg-tertiary, #d0d0d0)",
                  color: isDark
                    ? "var(--text-secondary, #aaa)"
                    : "var(--text-secondary, #555)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
              <button
                onClick={handleClear}
                style={{
                  padding: "2px 10px",
                  fontSize: "11px",
                  borderRadius: "4px",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  cursor: "pointer",
                }}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* 示例按钮 */}
          <div
            style={{
              padding: "4px 12px",
              borderBottom: "1px solid var(--border-color)",
              background: isDark
                ? "var(--bg-tertiary, #252535)"
                : "var(--bg-tertiary, #ddd)",
              flexShrink: 0,
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: isDark
                  ? "var(--text-muted, #888)"
                  : "var(--text-muted, #666)",
                marginRight: "4px",
              }}
            >
              {i18n === "zh-cn" ? "快速示例:" : "Quick Examples:"}
            </span>
            {exampleScripts.map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleLoadExample(example.script)}
                style={{
                  padding: "1px 10px",
                  fontSize: "11px",
                  borderRadius: "4px",
                  background: isDark
                    ? "var(--bg-secondary, #2d2d3d)"
                    : "var(--bg-secondary, #e8e8e8)",
                  color: isDark
                    ? "var(--text-secondary, #aaa)"
                    : "var(--text-secondary, #555)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                }}
              >
                {example.name}
              </button>
            ))}
          </div>

          {/* 脚本编辑区 */}
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            style={{
              flex: 1,
              padding: "12px 16px",
              fontSize: "13px",
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              background: isDark
                ? "var(--bg-primary, #1a1a2e)"
                : "var(--bg-primary, #f5f5f5)",
              color: isDark
                ? "var(--text-primary, #eee)"
                : "var(--text-primary, #222)",
              border: "none",
              resize: "none",
              outline: "none",
              minHeight: "80px",
              lineHeight: 1.6,
            }}
            spellCheck={false}
          />
        </div>

        {/* ===== 垂直分割线（左右分割） ===== */}
        <div
          className="editor-resize-handle"
          style={{
            width: "1px",
            height: "100%",
            background: "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
          }}
          onMouseDown={startEditorResizing}
        />

        {/* 右侧：终端输出 */}
        <div
          style={{
            width: `${100 - editorWidth}%`,
            minWidth: "20%",
            maxWidth: "70%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* 终端标题栏 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 12px",
              borderBottom: "1px solid var(--border-color)",
              background: isDark
                ? "var(--bg-secondary, #2d2d3d)"
                : "var(--bg-secondary, #e8e8e8)",
              flexShrink: 0,
              minHeight: "32px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: isDark
                  ? "var(--text-primary, #eee)"
                  : "var(--text-primary, #222)",
              }}
            >
              📋 {i18n === "zh-cn" ? "输出日志" : "Output Logs"}
            </span>
            <button
              onClick={handleClearLogs}
              style={{
                padding: "2px 10px",
                fontSize: "11px",
                borderRadius: "4px",
                background: isDark
                  ? "var(--bg-tertiary, #3d3d4d)"
                  : "var(--bg-tertiary, #d0d0d0)",
                color: isDark
                  ? "var(--text-secondary, #aaa)"
                  : "var(--text-secondary, #555)",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
              }}
            >
              {i18n === "zh-cn" ? "清空" : "Clear"}
            </button>
          </div>

          {/* 日志内容 */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "8px 12px",
              fontSize: "12px",
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              background: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.05)",
              color: isDark
                ? "var(--text-secondary, #aaa)"
                : "var(--text-secondary, #555)",
              lineHeight: 1.8,
            }}
          >
            {logs.length === 0 ? (
              <span
                style={{
                  color: isDark
                    ? "var(--text-muted, #666)"
                    : "var(--text-muted, #999)",
                }}
              >
                {i18n === "zh-cn"
                  ? "等待脚本执行..."
                  : "Waiting for script execution..."}
              </span>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "2px 0",
                    borderBottom: "1px solid var(--border-color)",
                    color: isDark
                      ? "var(--text-primary, #ddd)"
                      : "var(--text-primary, #333)",
                    fontSize: "11px",
                  }}
                >
                  {log}
                </div>
              ))
            )}
          </div>

          {/* 底部操作栏 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 12px",
              borderTop: "1px solid var(--border-color)",
              background: isDark
                ? "var(--bg-secondary, #2d2d3d)"
                : "var(--bg-secondary, #e8e8e8)",
              flexShrink: 0,
              minHeight: "36px",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={handleExecute}
                disabled={!isEngineReady}
                style={{
                  padding: "4px 14px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  background: isEngineReady
                    ? isDark
                      ? "var(--accent-color, #3b82f6)"
                      : "var(--accent-color, #2563eb)"
                    : isDark
                      ? "var(--bg-tertiary, #3d3d4d)"
                      : "var(--bg-tertiary, #d0d0d0)",
                  color: isEngineReady
                    ? "#fff"
                    : isDark
                      ? "var(--text-muted, #666)"
                      : "var(--text-muted, #999)",
                  border: "none",
                  cursor: isEngineReady ? "pointer" : "not-allowed",
                  opacity: isEngineReady ? 1 : 0.5,
                }}
              >
                Execute
              </button>
              <button
                onClick={handleStart}
                disabled={!isEngineReady || isEngineRunning}
                style={{
                  padding: "4px 14px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  background:
                    !isEngineReady || isEngineRunning
                      ? isDark
                        ? "var(--bg-tertiary, #3d3d4d)"
                        : "var(--bg-tertiary, #d0d0d0)"
                      : "#22c55e",
                  color:
                    !isEngineReady || isEngineRunning
                      ? isDark
                        ? "var(--text-muted, #666)"
                        : "var(--text-muted, #999)"
                      : "#fff",
                  border: "none",
                  cursor:
                    !isEngineReady || isEngineRunning
                      ? "not-allowed"
                      : "pointer",
                  opacity: !isEngineReady || isEngineRunning ? 0.5 : 1,
                }}
              >
                Start
              </button>
              <button
                onClick={handleStop}
                disabled={!isEngineReady || !isEngineRunning}
                style={{
                  padding: "4px 14px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  background:
                    !isEngineReady || !isEngineRunning
                      ? isDark
                        ? "var(--bg-tertiary, #3d3d4d)"
                        : "var(--bg-tertiary, #d0d0d0)"
                      : "#ef4444",
                  color:
                    !isEngineReady || !isEngineRunning
                      ? isDark
                        ? "var(--text-muted, #666)"
                        : "var(--text-muted, #999)"
                      : "#fff",
                  border: "none",
                  cursor:
                    !isEngineReady || !isEngineRunning
                      ? "not-allowed"
                      : "pointer",
                  opacity: !isEngineReady || !isEngineRunning ? 0.5 : 1,
                }}
              >
                Stop
              </button>
            </div>
            {executionResult && (
              <span
                style={{
                  fontSize: "11px",
                  color: executionResult.success ? "#22c55e" : "#ef4444",
                }}
              >
                {executionResult.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 全局拖拽遮罩 */}
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
