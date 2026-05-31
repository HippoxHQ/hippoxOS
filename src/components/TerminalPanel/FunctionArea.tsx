import React, { useState, useEffect, useRef } from "react";
import CandleView from "candleview";
import { TEST_CANDLEVIEW_DATA8 } from "../../test/TestData_3";

interface FunctionAreaProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
  onClose: () => void;
  containerHeight: number;
}

type FunctionModule =
  | "candleview"
  | "indicator"
  | "analysis"
  | "pattern"
  | "backtest"
  | "strategy"
  | "signal"
  | "news"
  | "sentiment"
  | "volatility"
  | "correlation"
  | "risk";

interface ModuleConfig {
  id: FunctionModule;
  name: string;
  icon: string;
  component: React.ReactNode;
  closable?: boolean;
}

const FunctionArea: React.FC<FunctionAreaProps> = ({
  theme,
  i18n,
  t,
  currentSessionId,
  onClose,
  containerHeight,
}) => {
  const [activeModule, setActiveModule] =
    useState<FunctionModule>("candleview");
  const [candleKey, setCandleKey] = useState(0);
  const [openModules, setOpenModules] = useState<Set<FunctionModule>>(
    new Set<FunctionModule>(["candleview"]),
  );
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  useEffect(() => {
    setCandleKey((prev) => prev + 1);
  }, [currentSessionId]);

  const checkScrollPosition = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setShowLeftScroll(scrollLeft > 5);
      setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    window.addEventListener("resize", checkScrollPosition);
    return () => window.removeEventListener("resize", checkScrollPosition);
  }, [openModules]);

  const handleScroll = (direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScrollPosition, 100);
    }
  };

  const handleCloseModule = (moduleId: FunctionModule, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenModules = new Set(openModules);
    newOpenModules.delete(moduleId);
    setOpenModules(newOpenModules);
    if (activeModule === moduleId && newOpenModules.size > 0) {
      const firstModule = Array.from(newOpenModules)[0];
      setActiveModule(firstModule);
    }
    if (newOpenModules.size === 0) {
      onClose();
    }
  };

  const openModule = (moduleId: FunctionModule) => {
    setOpenModules((prev) => {
      const newSet = new Set(prev);
      if (!newSet.has(moduleId)) {
        newSet.add(moduleId);
        setTimeout(checkScrollPosition, 100);
      }
      return newSet;
    });
    setActiveModule(moduleId);
  };

  const allModules: ModuleConfig[] = [
    {
      id: "candleview",
      name: "Candlestick Chart",
      icon: "📊",
      closable: true,
      component: (
        <CandleView
          key={`candle-${currentSessionId}-${candleKey}`}
          data={TEST_CANDLEVIEW_DATA8}
          title="BTC/USDT Candlestick Chart"
          theme={theme}
          i18n={i18n}
          height={"100%"}
          width={"100%"}
          leftpanel={true}
          toppanel={true}
          terminal={false}
          ai={false}
          timezone="Asia/Shanghai"
          timeframe="1s"
        />
      ),
    },
    {
      id: "indicator",
      name: "Technical Indicators",
      icon: "📈",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>Technical Indicators</h3>
          <p>RSI: 52.3</p>
          <p>MACD: Golden Cross</p>
          <p>Bollinger Bands: Upper Band Breakout</p>
          <p>KDJ: Overbought</p>
        </div>
      ),
    },
    {
      id: "analysis",
      name: "AI Analysis",
      icon: "🤖",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>AI Intelligent Analysis</h3>
          <p>
            Based on current candlestick patterns, the market is in an upward
            channel...
          </p>
          <p>Suggested support level: $65,000</p>
          <p>Resistance level: $68,500</p>
        </div>
      ),
    },
    {
      id: "pattern",
      name: "Pattern Recognition",
      icon: "🔍",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>Pattern Recognition</h3>
          <p>Detected: Head and Shoulders Bottom</p>
          <p>Confidence: 85%</p>
          <p>Target Price: $70,000</p>
        </div>
      ),
    },
    {
      id: "backtest",
      name: "Backtest",
      icon: "⏮️",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>Strategy Backtest</h3>
          <p>Win Rate: 62.5%</p>
          <p>Max Drawdown: -12.3%</p>
          <p>Sharpe Ratio: 1.8</p>
        </div>
      ),
    },
    {
      id: "strategy",
      name: "Strategies",
      icon: "⚙️",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>Trading Strategies</h3>
          <p>Grid Trading Strategy</p>
          <p>Martingale Strategy</p>
          <p>Trend Following Strategy</p>
        </div>
      ),
    },
    {
      id: "signal",
      name: "Signals",
      icon: "🔔",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>Trading Signals</h3>
          <p>🟢 Buy Signal (2024-01-15)</p>
          <p>🔴 Sell Signal (2024-01-10)</p>
          <p>🟡 Wait Signal</p>
        </div>
      ),
    },
    {
      id: "news",
      name: "News",
      icon: "📰",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>Related News</h3>
          <p>• BTC breaks $70,000 to new highs</p>
          <p>• Institutional funds continue to flow in</p>
          <p>• Halving expected to drive upward momentum</p>
        </div>
      ),
    },
    {
      id: "sentiment",
      name: "Sentiment",
      icon: "😊",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>Market Sentiment</h3>
          <p>Fear & Greed Index: 72 (Greed)</p>
          <p>Long/Short Ratio: 1.25</p>
          <p>Funding Rate: 0.01%</p>
        </div>
      ),
    },
    {
      id: "volatility",
      name: "Volatility",
      icon: "📊",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>Volatility Analysis</h3>
          <p>Historical Volatility: 45%</p>
          <p>Implied Volatility: 52%</p>
          <p>Volatility Cone: Mid-High</p>
        </div>
      ),
    },
    {
      id: "correlation",
      name: "Correlation",
      icon: "🔗",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>Correlation Analysis</h3>
          <p>BTC-ETH: 0.85</p>
          <p>BTC-S&P500: 0.32</p>
          <p>BTC-DXY: -0.28</p>
        </div>
      ),
    },
    {
      id: "risk",
      name: "Risk Management",
      icon: "🛡️",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>Risk Control</h3>
          <p>Current Position: 30%</p>
          <p>Stop Loss Suggestion: $62,000</p>
          <p>Take Profit Suggestion: $72,000</p>
        </div>
      ),
    },
  ];

  const modules = allModules.filter((m) => openModules.has(m.id));

  const handleModuleChange = (moduleId: FunctionModule) => {
    setActiveModule(moduleId);
  };

  const activeModuleContent = modules.find(
    (m) => m.id === activeModule,
  )?.component;

  const addTestModule = () => {
    const testModules: FunctionModule[] = [
      "indicator",
      "analysis",
      "pattern",
      "backtest",
      "strategy",
      "signal",
      "news",
      "sentiment",
      "volatility",
      "correlation",
      "risk",
    ];
    const notOpen = testModules.filter((m) => !openModules.has(m));
    if (notOpen.length > 0) {
      openModule(notOpen[0]);
    }
  };

  return (
    <div
      className="function-area-container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px 0 12px",
          borderBottom: "1px solid var(--border-color, #333)",
          flexShrink: 0,
          gap: "8px",
        }}
      >
        {showLeftScroll && (
          <button
            onClick={() => handleScroll("left")}
            style={{
              flexShrink: 0,
              width: "24px",
              height: "28px",
              borderRadius: "4px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
            }}
          >
            ◀
          </button>
        )}

        <div
          ref={tabsContainerRef}
          onScroll={checkScrollPosition}
          style={{
            flex: 1,
            display: "flex",
            gap: "4px",
            overflowX: "auto",
            overflowY: "hidden",
            minHeight: "40px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className="hide-scrollbar"
        >
          {modules.map((module) => (
            <div
              key={module.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 8px 6px 14px",
                background:
                  activeModule === module.id
                    ? "var(--bg-tertiary, #2d2d2d)"
                    : "transparent",
                borderRadius: "8px 8px 0 0",
                color:
                  activeModule === module.id
                    ? "var(--text-primary, #fff)"
                    : "var(--text-secondary, #aaa)",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: activeModule === module.id ? 500 : 400,
                transition: "all 0.2s ease",
                borderBottom:
                  activeModule === module.id
                    ? "2px solid var(--accent-color, #00aaff)"
                    : "2px solid transparent",
                marginBottom: "-1px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onClick={() => handleModuleChange(module.id)}
              onMouseEnter={(e) => {
                if (activeModule !== module.id) {
                  e.currentTarget.style.background = "var(--hover-bg, #2a2a2a)";
                  e.currentTarget.style.color = "var(--text-primary, #fff)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeModule !== module.id) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary, #aaa)";
                }
              }}
            >
              <span>{module.icon}</span>
              <span>{module.name}</span>
              {module.closable && (
                <span
                  onClick={(e) => handleCloseModule(module.id, e)}
                  style={{
                    marginLeft: "4px",
                    fontSize: "12px",
                    opacity: 0.7,
                    cursor: "pointer",
                    padding: "2px",
                    borderRadius: "2px",
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    e.currentTarget.style.background = "var(--bg-secondary)";
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.opacity = "0.7";
                  }}
                >
                  ✕
                </span>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          {showRightScroll && (
            <button
              onClick={() => handleScroll("right")}
              style={{
                width: "24px",
                height: "28px",
                borderRadius: "4px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
              }}
            >
              ▶
            </button>
          )}

          <button
            onClick={addTestModule}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "4px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
            }}
            title="Add Module"
          >
            +
          </button>

          <button
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "4px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
            }}
            title="Close Panel"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        className="function-content"
        style={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
        }}
      >
        {activeModuleContent || (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-tertiary)",
            }}
          >
            Please select a function module
          </div>
        )}
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .function-content::-webkit-scrollbar {
          width: 6px;
        }
        .function-content::-webkit-scrollbar-track {
          background: var(--bg-secondary);
          border-radius: 3px;
        }
        .function-content::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }
        .function-content::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }
        .function-area-container .function-tabs-scroll::-webkit-scrollbar {
          height: 0px;
        }
      `}</style>
    </div>
  );
};

export default FunctionArea;
