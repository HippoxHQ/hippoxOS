import { Code2, FileText } from "lucide-react";
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";

interface DSLProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  editorWidth: number;
  onStartEditorResize: (e: React.MouseEvent) => void;
  engineRef?: React.MutableRefObject<any>;
}

export interface DSLRef {
  getScript: () => string;
  setScript: (script: string) => void;
  execute: () => void;
  start: () => void;
  stop: () => void;
  reset: () => void;
  clearLogs: () => void;
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

const DSL = forwardRef<DSLRef, DSLProps>(({ theme, i18n, editorWidth, onStartEditorResize, engineRef }, ref) => {
  const isDark = theme === "dark";
  const isZh = i18n === "zh-cn";

  const [script, setScript] = useState(getDefaultScript(i18n));
  const [logs, setLogs] = useState<string[]>([]);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const exampleScripts = getExampleScripts(i18n);

  useEffect(() => {
    const checkEngine = () => {
      if (engineRef?.current) {
        setIsEngineReady(true);
      }
    };
    checkEngine();
    const interval = setInterval(checkEngine, 500);
    return () => clearInterval(interval);
  }, [engineRef]);

  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const scrollToBottom = () => {
      setTimeout(() => {
        if (logsContainerRef.current) {
          logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
      }, 50);
    };

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
      scrollToBottom();
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      const message = args.map((arg) => String(arg)).join(" ");
      setLogs((prev) => [...prev, `[WARN] ${message}`]);
      scrollToBottom();
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      const message = args.map((arg) => String(arg)).join(" ");
      setLogs((prev) => [...prev, `[ERROR] ${message}`]);
      scrollToBottom();
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    setScript(getDefaultScript(i18n));
  }, [i18n]);

  const checkScrollButtons = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollWidth > clientWidth && scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = tabsRef.current.scrollLeft + (direction === "left" ? -scrollAmount : scrollAmount);
      tabsRef.current.scrollTo({ left: newScrollLeft, behavior: "smooth" });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (tabsRef.current) {
      const delta = e.deltaY > 0 ? 1 : -1;
      const scrollAmount = 50;
      const newScrollLeft = tabsRef.current.scrollLeft + delta * scrollAmount;
      tabsRef.current.scrollTo({ left: newScrollLeft, behavior: "auto" });
      e.preventDefault();
    }
  };

  useEffect(() => {
    const currentTabs = tabsRef.current;
    if (currentTabs) {
      currentTabs.addEventListener("scroll", checkScrollButtons);
      window.addEventListener("resize", checkScrollButtons);
      setTimeout(checkScrollButtons, 50);
      return () => {
        currentTabs.removeEventListener("scroll", checkScrollButtons);
        window.removeEventListener("resize", checkScrollButtons);
      };
    }
  }, [exampleScripts]);

  const executeScript = () => {
    if (!engineRef?.current) {
      setExecutionResult({
        success: false,
        message: "Engine not available",
      });
      return;
    }
    try {
      engineRef.current.loadScript(script);
      const result = engineRef.current.execute();
      if (result.success) {
        setExecutionResult({
          success: true,
          message: `Executed in ${result.duration?.toFixed(2) || 0}ms`,
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

  const handleExecute = () => {
    if (!isEngineReady || !engineRef?.current) {
      setExecutionResult({
        success: false,
        message: "CVSEngine not available",
      });
      return;
    }
    executeScript();
  };

  const handleStart = () => {
    if (!engineRef?.current) return;
    setIsEngineRunning(true);
    engineRef.current.start();
    setExecutionResult({
      success: true,
      message: "Engine started, will execute on each new candle",
    });
  };

  const handleStop = () => {
    if (!engineRef?.current) return;
    setIsEngineRunning(false);
    engineRef.current.stop();
    setExecutionResult({ success: true, message: "Engine stopped" });
  };

  const handleReset = () => {
    if (!engineRef?.current) return;
    engineRef.current.clearAllCustomIndicators();
    setExecutionResult({
      success: true,
      message: "All custom indicators cleared",
    });
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleLoadExample = (exampleScript: string) => {
    setScript(exampleScript);
    setExecutionResult({ success: true, message: "Example script loaded" });
  };

  useImperativeHandle(ref, () => ({
    getScript: () => script,
    setScript: (newScript: string) => setScript(newScript),
    execute: handleExecute,
    start: handleStart,
    stop: handleStop,
    reset: handleReset,
    clearLogs: handleClearLogs,
  }));

  const rightWidth = 100 - editorWidth;

  const globalStyles = `
      .dsl-example-tabs-container {
        position: relative;
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-bottom: 1px solid var(--border-color);
        background: ${isDark ? "var(--bg-tertiary, #252535)" : "var(--bg-tertiary, #ddd)"};
        flex-shrink: 0;
        overflow: hidden;
        gap: 6px;
      }
      .dsl-example-label {
        font-size: 11px;
        color: ${isDark ? "var(--text-muted, #888)" : "var(--text-muted, #666)"};
        flex-shrink: 0;
        white-space: nowrap;
      }
      .dsl-example-tabs-scroll {
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        -ms-overflow-style: none;
        min-width: 0;
      }
      .dsl-example-tabs-scroll::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
      .dsl-example-tabs {
        display: flex;
        gap: 6px;
        min-width: max-content;
      }
      .dsl-example-btn {
        padding: 2px 12px;
        font-size: 11px;
        border-radius: 5px;
        background: ${isDark ? "var(--bg-secondary, #2d2d3d)" : "var(--bg-secondary, #e8e8e8)"};
        color: ${isDark ? "var(--text-secondary, #aaa)" : "var(--text-secondary, #555)"};
        border: 1px solid var(--border-color);
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: background 0.15s;
      }
      .dsl-example-btn:hover {
        background: ${isDark ? "var(--hover-bg, rgba(255, 255, 255, 0.08))" : "var(--hover-bg, rgba(0, 0, 0, 0.04))"};
      }
      .dsl-example-scroll-btn {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${isDark ? "var(--bg-secondary, #2d2d3d)" : "var(--bg-secondary, #e8e8e8)"};
        border: 1px solid var(--border-color);
        border-radius: 5px;
        cursor: pointer;
        color: ${isDark ? "var(--text-secondary, #aaa)" : "var(--text-secondary, #555)"};
        font-size: 12px;
        flex-shrink: 0;
        user-select: none;
        padding: 0;
        transition: background 0.15s;
      }
      .dsl-example-scroll-btn:hover {
        background: ${isDark ? "var(--hover-bg, rgba(255, 255, 255, 0.08))" : "var(--hover-bg, rgba(0, 0, 0, 0.04))"};
      }
      .dsl-example-scroll-btn.disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .dsl-example-scroll-btn.disabled:hover {
        background: ${isDark ? "var(--bg-secondary, #2d2d3d)" : "var(--bg-secondary, #e8e8e8)"};
      }
    `;

  if (typeof document !== "undefined") {
    const styleId = "dsl-example-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = globalStyles;
      document.head.appendChild(style);
    }
  }

  return (
    <>
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 12px",
            borderBottom: "1px solid var(--border-color)",
            background: isDark ? "var(--bg-secondary, #2d2d3d)" : "var(--bg-secondary, #e8e8e8)",
            flexShrink: 0,
            minHeight: "32px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: isDark ? "var(--text-primary, #eee)" : "var(--text-primary, #222)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                transform: "translateY(2px)",
                marginRight: "5px",
              }}
            >
              <Code2 size={14} />
            </span>
            DSL Script Editor
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
              onClick={handleExecute}
              disabled={!isEngineReady}
              style={{
                padding: "2px 10px",
                fontSize: "11px",
                borderRadius: "5px",
                background: isEngineReady ? (isDark ? "var(--accent-color, #3b82f6)" : "var(--accent-color, #2563eb)") : isDark ? "var(--bg-tertiary, #3d3d4d)" : "var(--bg-tertiary, #d0d0d0)",
                color: isEngineReady ? "#fff" : isDark ? "var(--text-muted, #666)" : "var(--text-muted, #999)",
                border: "none",
                cursor: isEngineReady ? "pointer" : "not-allowed",
                opacity: isEngineReady ? 1 : 0.5,
              }}
            >
              Execute
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: "2px 10px",
                fontSize: "11px",
                borderRadius: "5px",
                background: isDark ? "var(--bg-tertiary, #3d3d4d)" : "var(--bg-tertiary, #d0d0d0)",
                color: isDark ? "var(--text-secondary, #aaa)" : "var(--text-secondary, #555)",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>
        <div className="dsl-example-tabs-container">
          <span className="dsl-example-label">{isZh ? "快速示例:" : "Quick Examples:"}</span>
          {showLeftArrow && (
            <button className="dsl-example-scroll-btn" onClick={() => scrollTabs("left")}>
              ◀
            </button>
          )}
          <div className="dsl-example-tabs-scroll" ref={tabsRef} onScroll={checkScrollButtons} onWheel={handleWheel}>
            <div className="dsl-example-tabs">
              {exampleScripts.map((example, idx) => (
                <button key={idx} className="dsl-example-btn" onClick={() => handleLoadExample(example.script)}>
                  {example.name}
                </button>
              ))}
            </div>
          </div>
          {showRightArrow && (
            <button className="dsl-example-scroll-btn" onClick={() => scrollTabs("right")}>
              ▶
            </button>
          )}
        </div>

        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          style={{
            flex: 1,
            padding: "12px 16px",
            fontSize: "13px",
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            background: isDark ? "var(--bg-primary, #1a1a2e)" : "var(--bg-primary, #f5f5f5)",
            color: isDark ? "var(--text-primary, #eee)" : "var(--text-primary, #222)",
            border: "none",
            resize: "none",
            outline: "none",
            minHeight: "80px",
            lineHeight: 1.6,
          }}
          spellCheck={false}
        />
      </div>

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
        onMouseDown={onStartEditorResize}
      />

      <div
        style={{
          width: `${rightWidth}%`,
          minWidth: "20%",
          maxWidth: "70%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 12px",
            borderBottom: "1px solid var(--border-color)",
            background: isDark ? "var(--bg-secondary, #2d2d3d)" : "var(--bg-secondary, #e8e8e8)",
            flexShrink: 0,
            minHeight: "32px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: isDark ? "var(--text-primary, #eee)" : "var(--text-primary, #222)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                transform: "translateY(2px)",
                marginRight: "5px",
              }}
            >
              <FileText size={14} />
            </span>
            {isZh ? "输出日志" : "Output Logs"}
          </span>
          <button
            onClick={handleClearLogs}
            style={{
              padding: "2px 10px",
              fontSize: "11px",
              borderRadius: "5px",
              background: isDark ? "var(--bg-tertiary, #3d3d4d)" : "var(--bg-tertiary, #d0d0d0)",
              color: isDark ? "var(--text-secondary, #aaa)" : "var(--text-secondary, #555)",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
            }}
          >
            {isZh ? "清空" : "Clear"}
          </button>
        </div>
        <div
          ref={logsContainerRef}
          style={{
            flex: 1,
            overflow: "auto",
            padding: "8px 12px",
            fontSize: "12px",
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            background: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.05)",
            color: isDark ? "var(--text-secondary, #aaa)" : "var(--text-secondary, #555)",
            lineHeight: 1.8,
          }}
        >
          {logs.length === 0 ? (
            <span
              style={{
                color: isDark ? "var(--text-muted, #666)" : "var(--text-muted, #999)",
              }}
            >
              {isZh ? "等待脚本执行..." : "Waiting for script execution..."}
            </span>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  padding: "2px 0",
                  borderBottom: "1px solid var(--border-color)",
                  color: isDark ? "var(--text-primary, #ddd)" : "var(--text-primary, #333)",
                  fontSize: "11px",
                }}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
});

DSL.displayName = "DSL";

export default DSL;
