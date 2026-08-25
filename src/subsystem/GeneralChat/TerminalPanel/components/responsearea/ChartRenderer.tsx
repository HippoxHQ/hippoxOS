import React from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart } from "recharts";
import { ChartData } from "../../../llm/types";
interface ChartRendererProps {
  data: ChartData;
  t: (key: string) => string;
  isZh?: boolean;
}
const DEFAULT_COLORS = [
  "#6366f1", // Indigo
  "#818cf8", // Light Indigo
  "#a78bfa", // Purple
  "#8b5cf6", // Deep Purple
  "#7c3aed", // Dark Purple
  "#6d28d9", // Darker Purple
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#ef4444", // Red
];
const ChartRenderer: React.FC<ChartRendererProps> = ({ data, t, isZh = true }) => {
  if (!data || !data.series || data.series.length === 0) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "12px",
        }}
      >
        {isZh ? "暂无图表数据" : "No chart data available"}
      </div>
    );
  }
  // Format data for Recharts
  const chartData = data.xAxisData.map((label, index) => {
    const entry: Record<string, any> = { name: label };
    data.series.forEach((series) => {
      entry[series.name] = series.data[index] ?? 0;
    });
    return entry;
  });
  // Get colors
  const getColors = () => {
    if (data.colors && data.colors.length > 0) {
      return data.colors;
    }
    const colors: string[] = [];
    data.series.forEach((series, index) => {
      colors.push(series.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]);
    });
    return colors;
  };
  const colors = getColors();
  // ===== Custom Tooltip =====
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            color: "var(--text-primary)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>{label}</div>
          {payload.map((item: any, idx: number) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "10px",
                  height: "10px",
                  borderRadius: "2px",
                  background: item.color,
                }}
              />
              <span>{item.name}:</span>
              <span style={{ fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  // ===== Render by chart type =====
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 20, left: 0, bottom: 5 },
    };
    const tooltip = <Tooltip content={<CustomTooltip />} />;
    const legend = (
      <Legend
        wrapperStyle={{
          fontSize: "11px",
          color: "var(--text-secondary)",
          paddingTop: "8px",
        }}
      />
    );
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />;
    switch (data.type) {
      case "line":
        return (
          <LineChart {...commonProps}>
            {grid}
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={{ stroke: "var(--border-color)" }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
              axisLine={{ stroke: "var(--border-color)" }}
              tickLine={false}
              label={
                data.yAxisLabel
                  ? {
                      value: data.yAxisLabel,
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "var(--text-tertiary)", fontSize: 11 },
                    }
                  : undefined
              }
            />
            {tooltip}
            {legend}
            {data.series.map((series, index) => (
              <Line key={series.name} type="monotone" dataKey={series.name} stroke={colors[index % colors.length]} strokeWidth={2.5} dot={{ r: 4, fill: colors[index % colors.length] }} activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        );
      case "area":
        return (
          <AreaChart {...commonProps}>
            {grid}
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={{ stroke: "var(--border-color)" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={{ stroke: "var(--border-color)" }} tickLine={false} />
            {tooltip}
            {legend}
            {data.series.map((series, index) => (
              <Area key={series.name} type="monotone" dataKey={series.name} stroke={colors[index % colors.length]} fill={colors[index % colors.length]} fillOpacity={0.2} strokeWidth={2} />
            ))}
          </AreaChart>
        );
      case "bar":
        return (
          <BarChart {...commonProps}>
            {grid}
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={{ stroke: "var(--border-color)" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={{ stroke: "var(--border-color)" }} tickLine={false} />
            {tooltip}
            {legend}
            {data.series.map((series, index) => (
              <Bar key={series.name} dataKey={series.name} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} stackId={series.stack} barSize={series.stack ? undefined : 30} />
            ))}
          </BarChart>
        );
      case "scatter":
        // For scatter, combine all series into one data array with x/y values
        // Format: each series becomes a group of points
        return (
          <ScatterChart {...commonProps}>
            {grid}
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={{ stroke: "var(--border-color)" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={{ stroke: "var(--border-color)" }} tickLine={false} />
            {tooltip}
            {legend}
            {data.series.map((series, index) => (
              <Scatter
                key={series.name}
                name={series.name}
                data={series.data.map((value, i) => ({
                  name: data.xAxisData[i],
                  value: value,
                }))}
                fill={colors[index % colors.length]}
              />
            ))}
          </ScatterChart>
        );
      case "pie":
        // Pie chart uses first series only
        const pieData =
          data.series[0]?.data.map((value, index) => ({
            name: data.xAxisData[index] || `Item ${index + 1}`,
            value: value,
          })) || [];
        return (
          <PieChart {...commonProps}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => {
                const p = percent ?? 0;
                return `${name}: ${(p * 100).toFixed(1)}%`;
              }}
              outerRadius={100}
              dataKey="value"
              paddingAngle={2}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "12px",
                        color: "var(--text-primary)",
                      }}
                    >
                      <div>{data.name}</div>
                      <div style={{ fontWeight: 600 }}>
                        {data.value} ({((data.value / pieData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                paddingTop: "8px",
              }}
            />
          </PieChart>
        );
      default:
        return (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: "12px",
            }}
          >
            {isZh ? "不支持的图表类型" : "Unsupported chart type"}
          </div>
        );
    }
  };
  // ===== Get type badge =====
  const getTypeBadge = (): string => {
    const typeMap: Record<string, string> = isZh
      ? {
          line: "📈 折线图",
          bar: "📊 柱状图",
          area: "📈 面积图",
          scatter: "📊 散点图",
          pie: "🍕 饼图",
        }
      : {
          line: "📈 Line Chart",
          bar: "📊 Bar Chart",
          area: "📈 Area Chart",
          scatter: "📊 Scatter Chart",
          pie: "🍕 Pie Chart",
        };
    return typeMap[data.type] || (isZh ? "📊 图表" : "📊 Chart");
  };
  return (
    <div
      className="terminal-chart-container"
      style={{
        margin: "8px 0",
        background: "var(--bg-tertiary)",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          minHeight: "32px",
        }}
      >
        <span style={{ fontSize: "13px", lineHeight: 1 }}>{getTypeBadge()}</span>
        {data.title && (
          <span
            style={{
              flex: 1,
              color: "var(--text-primary)",
              fontSize: "12px",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.title}
          </span>
        )}
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-tertiary)",
            marginLeft: "auto",
          }}
        >
          {data.series.length} {isZh ? "个系列" : "series"}
        </span>
      </div>
      <div
        style={{
          padding: "12px 16px 8px",
          height: "280px",
          width: "100%",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
export default ChartRenderer;
