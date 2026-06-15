import React, { useEffect, useState } from "react";
import {
  ProgressRing,
  StatusPieChart,
  TrendLineChart,
} from "./ChartsComponents";

const TargetIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const PieChartIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

const LineChartIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

const BarChart3Icon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20V10" />
    <path d="M18 20V4" />
    <path d="M6 20v-4" />
  </svg>
);

const PlayIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const XCircleIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ClockIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const SparklesIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v1" />
    <path d="M12 20v1" />
    <path d="M3 12h1" />
    <path d="M20 12h1" />
    <path d="m5.6 5.6.7.7" />
    <path d="m17.7 17.7.7.7" />
    <path d="m5.6 18.4.7-.7" />
    <path d="m17.7 6.3.7-.7" />
    <path d="M12 7a5 5 0 1 0 5 5" />
    <path d="m15.5 8.5 1 1" />
    <path d="m15 12a3 3 0 1 1-3-3" />
  </svg>
);

const PauseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const ListIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

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
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  useEffect(() => {
    const checkTheme = () => {
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark" ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkTheme(isDark);
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

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
  ];
  const nonZeroData = pieData.filter((d) => d.value > 0);
  const hasData = nonZeroData.length > 0;
  const emptyDataColor = isDarkTheme ? "#3a3a3a" : "#e5e7eb";
  const emptyDataBorderColor = isDarkTheme ? "#4a4a4a" : "#d1d5db";
  const displayPieData: Array<{ label: string; value: number; color: string }> =
    hasData ? nonZeroData : [];
  const pieTotal = displayPieData.reduce(
    (sum: number, d: { label: string; value: number; color: string }) =>
      sum + d.value,
    0,
  );
  const displayPieChartData = displayPieData.map((item) => ({
    name: item.label,
    value: item.value,
    color: item.color,
  }));
  const lineChartData = executionTrend.labels.map((label, idx) => ({
    label,
    value: executionTrend.values[idx],
  }));
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
        icon: <ListIcon />,
      },
      {
        label: t("scheduled.enabled") || "运行中",
        value: runningTasks,
        icon: <PlayIcon />,
      },
      {
        label: t("scheduled.completed") || "已完成",
        value: successTasks,
        icon: <CheckCircleIcon />,
      },
      {
        label: t("scheduled.failed") || "失败",
        value: failedTasks,
        icon: <XCircleIcon />,
      },
      {
        label: t("scheduled.disabled") || "已暂停",
        value: stats.disabled,
        icon: <PauseIcon />,
      },
      {
        label: t("scheduled.newIn7Days") || "近7日新增",
        value: newTasksCount,
        icon: <SparklesIcon />,
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
              padding: "8px 10px",
              background: "var(--bg-tertiary)",
              borderRadius: "6px",
              transition: "all 0.2s ease",
              minWidth: 0,
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-tertiary)";
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              {card.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  lineHeight: 1.2,
                  color: "var(--text-primary)",
                }}
              >
                {card.value}
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: "var(--text-muted)",
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
          <span style={{ fontSize: "16px", color: "var(--text-secondary)", }}>
            <TargetIcon />
          </span>
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
          <span style={{ fontSize: "16px", color: "var(--text-secondary)", }}>
            <PieChartIcon />
          </span>
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
          }}
        >
          <div style={{ width: "180px", margin: "0 auto" }}>
            <StatusPieChart
              data={displayPieChartData}
              total={pieTotal}
              t={t}
              emptyColor={!hasData ? emptyDataColor : undefined}
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
                  {stats.total > 0
                    ? `${Math.round((item.value / stats.total) * 100)}%`
                    : "0%"}
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
          <span style={{ fontSize: "16px", color: "var(--text-secondary)", }}>
            <LineChartIcon />
          </span>
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
            marginBottom: "10px",
          }}
        >
          <span style={{ fontSize: "16px", color: "var(--text-secondary)" }}>
            <BarChart3Icon />
          </span>
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
