import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";

export const StatusPieChart: React.FC<{
  data: Array<{ name: string; value: number; color: string }>;
  total: number;
  t: (key: string) => string;
}> = ({ data, total, t }) => {
  if (total === 0) {
    return (
      <div className="pie-empty">
        <div className="pie-empty-icon">📊</div>
        <div className="pie-empty-text">
          {t("scheduled.noData") || "暂无数据"}
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={35}
          outerRadius={55}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-primary)"
          fontSize="16"
          fontWeight="bold"
        >
          {total}
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-secondary)"
          fontSize="9"
        >
          {t("scheduled.total") || "总计"}
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
};

export const TrendLineChart: React.FC<{
  data: Array<{ label: string; value: number }>;
  color?: string;
  t: (key: string, params?: any) => string;
}> = ({ data, color = "#818cf8", t }) => {
  return (
    <ResponsiveContainer width="100%" height={130}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 5, left: -10, bottom: 5 }}
      >
        <defs>
          <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border-color)"
          strokeOpacity={0.3}
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
          axisLine={{ stroke: "var(--border-color)" }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          width={25}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            fontSize: "11px",
            color: "var(--text-primary)",
          }}
          formatter={(value: any) => [
            `${value} ${t("scheduled.times")}`,
            t("scheduled.executionCount"),
          ]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#trendGradient)"
          dot={{
            r: 3.5,
            fill: color,
            stroke: "var(--bg-secondary)",
            strokeWidth: 1.5,
          }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export const ProgressRing: React.FC<{
  percentage: number;
  label: string;
  color: string;
  size?: number;
}> = ({ percentage, label, color, size = 70 }) => {
  const data = [{ name: label, value: percentage, fill: color }];

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="65%"
          outerRadius="85%"
          barSize={8}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar background dataKey="value" cornerRadius={4} fill={color} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: "bold",
            color: "var(--text-primary)",
          }}
        >
          {Math.round(percentage)}%
        </div>
        <div style={{ fontSize: "8px", color: "var(--text-secondary)" }}>
          {label}
        </div>
      </div>
    </div>
  );
};
