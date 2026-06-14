import React from "react";
import {
  ProgressRing,
  StatusPieChart,
  TrendLineChart,
} from "./ChartsComponents";

interface LeftStatsPanelProps {
  t: (key: string, params?: any) => string;
  stats: {
    total: number;
    enabled: number;
    disabled: number;
    completed: number;
  };
  executionTrend: {
    labels: string[];
    values: number[];
  };
  tasks?: any[];
}

const LeftStatsPanel: React.FC<LeftStatsPanelProps> = ({
  t,
  stats,
  executionTrend,
  tasks = [],
}) => {
  const runningTasks = stats.enabled;
  const failedTasks = tasks.filter(
    (t: any) => t.last_status === "failed",
  ).length;
  const successTasks = stats.completed;
  const pendingTasks = tasks.filter(
    (t: any) => !t.completed && !t.enabled,
  ).length;
  const scheduledTasks = tasks.filter(
    (t: any) =>
      t.next_execution_at && new Date(t.next_execution_at) > new Date(),
  ).length;
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toLocaleDateString();
  });
  const newTasksCount = tasks.filter((t: any) => {
    if (!t.created_at) return false;
    const createdDate = new Date(t.created_at).toLocaleDateString();
    return last7Days.includes(createdDate);
  }).length;
  const pieData = [
    {
      label: t("scheduled.enabled") || "已启用",
      value: stats.enabled,
      color: "#10b981",
    },
    {
      label: t("scheduled.disabled") || "已禁用",
      value: stats.disabled,
      color: "#6b7280",
    },
    {
      label: t("scheduled.completed") || "已完成",
      value: stats.completed,
      color: "#8b5cf6",
    },
  ].filter((d) => d.value > 0);
  const pieChartData = pieData.map((item) => ({
    name: item.label,
    value: item.value,
    color: item.color,
  }));
  const lineChartData = executionTrend.labels.map((label, idx) => ({
    label,
    value: executionTrend.values[idx],
  }));
  const otherStats = [
    {
      label: t("scheduled.running") || "运行中",
      value: runningTasks,
      icon: "▶️",
      color: "#10b981",
    },
    {
      label: t("scheduled.failed") || "执行失败",
      value: failedTasks,
      icon: "❌",
      color: "#ef4444",
    },
    {
      label: t("scheduled.pending") || "待执行",
      value: pendingTasks,
      icon: "⏳",
      color: "#f59e0b",
    },
    {
      label: t("scheduled.scheduled") || "计划中",
      value: scheduledTasks,
      icon: "📅",
      color: "#3b82f6",
    },
    {
      label: t("scheduled.newIn7Days") || "近7日新增",
      value: newTasksCount,
      icon: "✨",
      color: "#f59e0b",
    },
  ];
  const completionRate =
    stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const enabledRate = stats.total > 0 ? (stats.enabled / stats.total) * 100 : 0;
  const successRate =
    stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const renderStatCards = () => {
    const cards = [
      {
        label: t("scheduled.total") || "总任务",
        value: stats.total,
        icon: "📋",
        color: "#818cf8",
      },
      {
        label: t("scheduled.enabled") || "运行中",
        value: runningTasks,
        icon: "▶️",
        color: "#10b981",
      },
      {
        label: t("scheduled.completed") || "已完成",
        value: successTasks,
        icon: "✅",
        color: "#8b5cf6",
      },
      {
        label: t("scheduled.failed") || "失败",
        value: failedTasks,
        icon: "❌",
        color: "#ef4444",
      },
      {
        label: t("scheduled.disabled") || "已暂停",
        value: stats.disabled,
        icon: "⏸️",
        color: "#6b7280",
      },
      {
        label: t("scheduled.newIn7Days") || "近7日新增",
        value: newTasksCount,
        icon: "✨",
        color: "#f59e0b",
      },
    ];
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "8px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 8px",
              background: "var(--bg-tertiary)",
              borderRadius: "8px",
              transition: "all 0.2s ease",
              minWidth: 0,
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.background = "var(--bg-secondary)";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "var(--bg-tertiary)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "20px", flexShrink: 0, color: card.color }}>
              {card.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  wordBreak: "keep-all",
                  color: card.color,
                }}
              >
                {card.value}
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: "var(--text-secondary)",
                  marginTop: "2px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        flexShrink: 0,
        background: "var(--bg-secondary)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          padding: "10px",
          borderBottom: "1px solid var(--border-color)",
          background:
            "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "16px" }}>🎯</span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              letterSpacing: "0.3px",
              textTransform: "uppercase",
            }}
          >
            {t("scheduled.completionRate") || "完成率仪表盘"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <ProgressRing
            percentage={completionRate}
            label={t("scheduled.completionRateLabel") || "完成率"}
            color="#8b5cf6"
            size={70}
          />
          <ProgressRing
            percentage={successRate}
            label={t("scheduled.successRateLabel") || "成功率"}
            color="#10b981"
            size={70}
          />
          <ProgressRing
            percentage={enabledRate}
            label={t("scheduled.activeRateLabel") || "活跃率"}
            color="#f59e0b"
            size={70}
          />
        </div>
      </div>

      <div
        style={{
          padding: "10px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "16px" }}>🥧</span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              letterSpacing: "0.3px",
              textTransform: "uppercase",
            }}
          >
            {t("scheduled.statusDistribution") || "任务状态分布"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            // gap: "20px",
          }}
        >
          <div style={{ width: "180px", margin: "0 auto" }}>
            <StatusPieChart
              data={pieChartData}
              total={pieData.reduce((sum, d) => sum + d.value, 0)}
              t={t}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "16px",
              width: "100%",
            }}
          >
            {pieData.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11px",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                    background: item.color,
                  }}
                ></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {item.label}
                </span>
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontWeight: 600,
                  }}
                >
                  {item.value}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    minWidth: "36px",
                    textAlign: "right",
                  }}
                >
                  {Math.round((item.value / (stats.total || 1)) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "10px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "16px" }}>📈</span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              letterSpacing: "0.3px",
              textTransform: "uppercase",
            }}
          >
            {t("scheduled.executionTrend") || "执行趋势"}
          </span>
        </div>
        <TrendLineChart data={lineChartData} t={t} />
      </div>

      <div style={{ padding: "10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "16px" }}>📊</span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              letterSpacing: "0.3px",
              textTransform: "uppercase",
            }}
          >
            {t("scheduled.quickStats") || "快速统计"}
          </span>
        </div>
        {renderStatCards()}
      </div>
    </div>
  );
};

export default LeftStatsPanel;
