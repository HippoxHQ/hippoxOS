import React, { useState, useEffect } from "react";
import IntegratedCandleView from "../integrations/IntegratedCandleView";

interface ChartContentProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  currentSessionId?: string;
  taskId?: string;
  chartData?: any;
  t: (key: string, params?: any) => string;
}

export const ChartContent: React.FC<ChartContentProps> = ({
  theme,
  i18n,
  currentSessionId,
  taskId,
  chartData,
  t,
}) => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (chartData) {
      setKey((prev) => prev + 1);
    }
  }, [chartData]);

  if (!chartData) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          color: "var(--text-tertiary)",
          fontSize: "14px",
        }}
      >
        Loading chart...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "var(--bg-secondary)",
      }}
    >
      <div style={{ flex: 1, width: "100%", height: "100%" }}>
        <IntegratedCandleView
          key={key}
          theme={theme}
          i18n={i18n}
          currentSessionId={currentSessionId}
          taskId={taskId}
          chartData={chartData}
          symbol={taskId ? `Task ${taskId.slice(-6)}` : "BTC/USDT"}
        />
      </div>
    </div>
  );
};
