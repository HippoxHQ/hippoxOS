import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const MetricsGrid: React.FC<{
  metrics: { key: string; value: string | number; unit?: string }[];
  t: (key: string) => string;
}> = ({ metrics, t }) => {
  const chartData = metrics
    .map((m) => {
      const numValue = typeof m.value === "number" ? m.value : parseFloat(String(m.value).replace(/[^0-9.-]/g, ""));
      return {
        name: m.key,
        value: isNaN(numValue) ? 0 : numValue,
        unit: m.unit || "",
        displayValue: m.value,
      };
    })
    .filter((d) => d.value > 0 || d.value === 0);
  const hasValidData = chartData.some((d) => d.value > 0);
  const getColorForMetric = (key: string): string => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash % 360);
    const saturation = 45 + Math.abs(hash % 15);
    const lightness = 50 + Math.abs((hash >> 4) % 15);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };
  const coloredData = chartData.map((item) => ({
    ...item,
    color: getColorForMetric(item.name),
  }));
  const maxValue = Math.max(...coloredData.map((d) => d.value), 1);
  const yAxisMax = maxValue * 1.1;
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            padding: "6px 10px",
            fontSize: "11px",
            color: "var(--text-primary)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              color: "var(--text-secondary)",
              fontWeight: 500,
              marginBottom: "2px",
            }}
          >
            {data.name}
          </div>
          <div style={{ fontWeight: 600, color: data.color }}>
            {data.value}
            {data.unit ? ` ${data.unit}` : ""}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="terminal-metrics-wrapper"
      style={{
        margin: "6px 0",
        background: "var(--bg-tertiary)",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        padding: "10px 12px 8px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 8px",
          alignItems: "center",
        }}
      >
        {metrics.map((metric, idx) => {
          const color = getColorForMetric(metric.key);
          return (
            <div
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: "4px",
                padding: "2px 4px",
                borderRadius: "4px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text-tertiary)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                {metric.key}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: color,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {metric.value}
              </span>
              {metric.unit && (
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {metric.unit}
                </span>
              )}
              {idx < metrics.length - 1 && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--border-color)",
                    marginLeft: "2px",
                  }}
                >
                  •
                </span>
              )}
            </div>
          );
        })}
      </div>
      {hasValidData && coloredData.length >= 2 && (
        <div
          style={{
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: "1px solid var(--border-color)",
            height: "100px",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={coloredData} margin={{ top: 8, right: 4, bottom: 4, left: 0 }}>
              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 9,
                  fill: "var(--text-tertiary)",
                  fontWeight: 500,
                }}
                axisLine={false}
                tickLine={false}
                interval={0}
                tickMargin={6}
              />
              <YAxis
                domain={[0, yAxisMax]}
                tick={{
                  fontSize: 8,
                  fill: "var(--text-tertiary)",
                }}
                axisLine={false}
                tickLine={false}
                width={30}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${value / 1000000}M`;
                  if (value >= 1000) return `${value / 1000}K`;
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--border-color)", opacity: 0.1 }} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={40} minPointSize={4}>
                {coloredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default MetricsGrid;
