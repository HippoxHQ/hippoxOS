import React, { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";

interface UserProfileProps {
  t: (key: string, params?: any) => string;
  onClose?: () => void;
  currentSessionId?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({
  t,
  onClose,
  currentSessionId,
}) => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [tokenData, setTokenData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [dateRange, setDateRange] = useState<"week" | "month" | "year">(
    "month",
  );
  const [dialogData, setDialogData] = useState<any[]>([]);
  const heatmapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUserData();
    generateMockActivityData();
    generateMockDialogData();
  }, []);

  useEffect(() => {
    generateMockTokenData();
  }, [dateRange]);

  useEffect(() => {
    if (!heatmapContainerRef.current) return;

    const fixSvgSize = () => {
      const svg = heatmapContainerRef.current?.querySelector("svg");
      if (svg) {
        svg.style.width = "100%";
        svg.style.height = "180px";
      }
    };

    const timer = setTimeout(fixSvgSize, 150);
    const interval = setInterval(fixSvgSize, 500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [activityData]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const mockUserData = {
        username: "开发者",
        email: "developer@hippox.ai",
        joinDate: new Date(2024, 0, 1),
        totalSessions: 47,
        totalMessages: 1234,
        totalTokensUsed: 1250000,
        totalTasksExecuted: 892,
        favoriteSkills: [
          "数据分析",
          "文件处理",
          "网络请求",
          "代码生成",
          "文档处理",
        ],
        streakDays: 15,
        longestStreak: 28,
        achievements: [
          { name: "Test1", unlocked: true, icon: "🌅" },
          { name: "Test2", unlocked: true, icon: "⚡" },
          { name: "Test3", unlocked: false, icon: "🧭" },
          { name: "Test4", unlocked: true, icon: "🔮" },
        ],
      };
      setUserData(mockUserData);
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockActivityData = () => {
    const data = [];
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      let count = Math.floor(Math.random() * 15) + 1;
      if (isWeekend) count = Math.floor(count * 0.5);
      if (i < 7) count = Math.floor(count * 1.5);
      data.push({ date: date.toISOString().split("T")[0], count });
    }
    setActivityData(data);
  };

  const generateMockDialogData = () => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const count = Math.floor(Math.random() * 20) + 5;
      data.push({
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        count: count,
      });
    }
    setDialogData(data);
  };

  const generateMockTokenData = () => {
    const data = [];
    const days = dateRange === "year" ? 12 : dateRange === "month" ? 30 : 7;
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      let label: string;
      if (dateRange === "year") {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        label = `${date.getMonth() + 1}月`;
      } else {
        const date = new Date();
        date.setDate(today.getDate() - i);
        label = `${date.getMonth() + 1}/${date.getDate()}`;
      }
      const inputTokens = Math.floor(Math.random() * 8000) + 1000;
      const outputTokens = Math.floor(Math.random() * 4000) + 500;
      data.push({
        label,
        inputTokens,
        outputTokens,
        total: inputTokens + outputTokens,
      });
    }
    setTokenData(data);
    const total = data.reduce((sum, d) => sum + d.total, 0);
    setTotalTokens(total);
    setCategoryData([
      { name: "对话", value: Math.floor(total * 0.45), color: "#818cf8" },
      { name: "任务", value: Math.floor(total * 0.35), color: "#10b981" },
      { name: "技能", value: Math.floor(total * 0.2), color: "#f59e0b" },
    ]);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const getCellColor = (value: any) => {
    if (!value || !value.count) return "var(--bg-tertiary)";
    if (value.count <= 3) return "#0e4429";
    if (value.count <= 7) return "#006d32";
    if (value.count <= 12) return "#26a641";
    return "#39d353";
  };

  const stats = userData || {
    totalSessions: 0,
    totalMessages: 0,
    totalTokensUsed: 0,
    totalTasksExecuted: 0,
    streakDays: 0,
    longestStreak: 0,
    favoriteSkills: [],
    achievements: [],
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [hourlyData, setHourlyData] = useState<any[]>([]);

  const generateMockHourlyData = () => {
    const data = [];
    for (let i = 0; i < 24; i++) {
      let count;
      if (i >= 9 && i <= 11) count = Math.floor(Math.random() * 30) + 40;
      else if (i >= 14 && i <= 17) count = Math.floor(Math.random() * 30) + 35;
      else if (i >= 20 && i <= 22) count = Math.floor(Math.random() * 25) + 25;
      else count = Math.floor(Math.random() * 15) + 5;
      data.push({ hour: `${i}时`, count });
    }
    setHourlyData(data);
  };

  const getPeakHour = () => {
    if (hourlyData.length === 0) return "暂无";
    const max = Math.max(...hourlyData.map((d) => d.count));
    const peak = hourlyData.find((d) => d.count === max);
    return peak?.hour || "暂无";
  };

  const getMorningPercent = () => {
    const morning = hourlyData.slice(6, 12).reduce((s, d) => s + d.count, 0);
    const total = hourlyData.reduce((s, d) => s + d.count, 0);
    return total ? Math.round((morning / total) * 100) : 0;
  };

  const getNightPercent = () => {
    const night = hourlyData.slice(18, 24).reduce((s, d) => s + d.count, 0);
    const total = hourlyData.reduce((s, d) => s + d.count, 0);
    return total ? Math.round((night / total) * 100) : 0;
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    loadUserData();
    generateMockActivityData();
    generateMockDialogData();
    generateMockHourlyData();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--border-color)",
            borderTopColor: "var(--accent-color)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        ></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-secondary)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10.5px 16px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>👤</span>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {t("user.profile") || "个人资料"}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            color: "var(--text-secondary)",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--hover-bg)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "12px 16px",
            background: "var(--bg-secondary)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--accent-color), #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 600,
              color: "white",
              flexShrink: 0,
            }}
          >
            {stats.username?.charAt(0) || "U"}
          </div>
          <div style={{ flexShrink: 0, minWidth: "140px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {stats.username || "用户"}
              </span>
              <div
                style={{ display: "flex", gap: "3px", alignItems: "center" }}
              >
                {stats.achievements?.map((ach: any, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: "11px",
                      opacity: ach.unlocked ? 1 : 0.3,
                      cursor: "default",
                    }}
                    title={ach.name}
                  >
                    {ach.icon}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
              {stats.email || ""}
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {t("user.joined") || "加入于"}{" "}
              {stats.joinDate?.toLocaleDateString() || "2024年1月"}
            </div>
          </div>
          <div
            style={{
              flex: "0 0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "6px 12px",
              marginLeft: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "13px" }}>💬</span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#818cf8",
                    lineHeight: 1.2,
                  }}
                >
                  {stats.totalSessions}
                </div>
                <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                  {t("user.totalSessions") || "对话"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "13px" }}>📝</span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#10b981",
                    lineHeight: 1.2,
                  }}
                >
                  {formatNumber(stats.totalMessages)}
                </div>
                <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                  {t("user.totalMessages") || "消息"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "13px" }}>🔮</span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#f59e0b",
                    lineHeight: 1.2,
                  }}
                >
                  {formatNumber(stats.totalTokensUsed)}
                </div>
                <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                  {t("user.totalTokens") || "Token"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "13px" }}>⚙️</span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#8b5cf6",
                    lineHeight: 1.2,
                  }}
                >
                  {formatNumber(stats.totalTasksExecuted)}
                </div>
                <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                  {t("user.totalTasks") || "任务"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "13px" }}>🔥</span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#ef4444",
                    lineHeight: 1.2,
                  }}
                >
                  {stats.streakDays}
                  <span style={{ fontSize: "9px" }}>天</span>
                </div>
                <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                  {t("user.currentStreak") || "连续"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "13px" }}>🏆</span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#f59e0b",
                    lineHeight: 1.2,
                  }}
                >
                  {stats.longestStreak}
                  <span style={{ fontSize: "9px" }}>天</span>
                </div>
                <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                  {t("user.longestStreak") || "最长"}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            background: "var(--bg-secondary)",
            padding: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px" }}>📊</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                {t("user.activityHeatmap") || "活动热力图"}
              </span>
            </div>
          </div>
          <div
            style={{
              overflowX: "auto",
              overflowY: "hidden",
              display: "flex",
              justifyContent: "flex-start",
              height: "150px",
            }}
            ref={heatmapContainerRef}
          >
            <div style={{ display: "inline-block" }}>
              <CalendarHeatmap
                startDate={new Date(new Date().getFullYear(), 0, 1)}
                endDate={new Date(new Date().getFullYear(), 11, 31)}
                values={activityData}
                gutterSize={3}
                showWeekdayLabels={true}
                classForValue={(value) => {
                  if (!value) return "color-empty";
                  const color = getCellColor(value);
                  return `color-${color.replace("#", "")}`;
                }}
                titleForValue={(value) =>
                  value ? `${value.date}\n${value.count}次` : "无活动"
                }
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              gap: "30px",
              marginTop: "5px",
              fontSize: "9px",
              color: "var(--text-muted)",
              paddingLeft: "15px",
            }}
          >
            <span>
              总活动: {activityData.reduce((s, d) => s + d.count, 0)}次
            </span>
            <span>
              日均:{" "}
              {(activityData.reduce((s, d) => s + d.count, 0) / 365).toFixed(1)}
              次
            </span>
            <span>
              最高: {Math.max(...activityData.map((d) => d.count), 0)}次
            </span>
          </div>
        </div>
        <style>{`
          .react-calendar-heatmap rect { rx: 2; ry: 2; }
          .react-calendar-heatmap-weekday-labels text { font-size: 8px; fill: var(--text-muted); }
          .react-calendar-heatmap-month-labels text { font-size: 8px; fill: var(--text-secondary); }
          .color-empty { fill: var(--bg-tertiary); }
          .color-0e4429 { fill: #0e4429; }
          .color-006d32 { fill: #006d32; }
          .color-26a641 { fill: #26a641; }
          .color-39d353 { fill: #39d353; }
        `}</style>

        <style>{`
  .react-calendar-heatmap rect { rx: 2; ry: 2; }
  .react-calendar-heatmap-weekday-labels text { font-size: 8px; fill: var(--text-muted); }
  .react-calendar-heatmap-month-labels text { font-size: 8px; fill: var(--text-secondary); }
  .color-empty { fill: var(--bg-tertiary); }
  .color-0e4429 { fill: #0e4429; }
  .color-006d32 { fill: #006d32; }
  .color-26a641 { fill: #26a641; }
  .color-39d353 { fill: #39d353; }
  .react-calendar-heatmap { display: block !important; }
`}</style>

        <div
          style={{
            background: "var(--bg-secondary)",
            marginBottom: "12px",
            paddingBottom: "15px",
          }}
        >
          <div style={{}}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
                padding: "0px 10px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span style={{ fontSize: "12px" }}>🔮</span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  {t("user.tokenStats") || "Token 统计"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {(["week", "month", "year"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    style={{
                      padding: "2px 8px",
                      fontSize: "9px",
                      background:
                        dateRange === range
                          ? "var(--accent-color)"
                          : "var(--bg-tertiary)",
                      border: "none",
                      borderRadius: "10px",
                      color:
                        dateRange === range ? "white" : "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    {range === "week" ? "周" : range === "month" ? "月" : "年"}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px",
                background:
                  "linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span style={{ fontSize: "28px" }}>🔮</span>
                <div>
                  <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                    Token 统计
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "var(--accent-color)",
                    }}
                  >
                    {formatNumber(totalTokens)}
                  </div>
                  <div style={{ fontSize: "7px", color: "var(--text-muted)" }}>
                    {t("user.totalTokensUsed") || "总 Token 消耗"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "20px", textAlign: "right" }}>
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#818cf8",
                    }}
                  >
                    {formatNumber(
                      tokenData.reduce((s, d) => s + d.inputTokens, 0),
                    )}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                    输入 Token
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#10b981",
                    }}
                  >
                    {formatNumber(
                      tokenData.reduce((s, d) => s + d.outputTokens, 0),
                    )}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                    输出 Token
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {formatNumber(Math.floor(totalTokens / tokenData.length))}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                    日均消耗
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {formatNumber(
                      Math.max(...tokenData.map((d) => d.total), 0),
                    )}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                    峰值日
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {(
                      tokenData.reduce((s, d) => s + d.inputTokens, 0) /
                      tokenData.reduce((s, d) => s + d.outputTokens, 1)
                    ).toFixed(1)}
                    :1
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                    输入/输出比
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <div
                style={{
                  flex: 1,
                  background: "var(--bg-secondary)",
                  padding: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "6px",
                  }}
                >
                  Token 消耗趋势
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart
                    data={tokenData}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop
                          offset="0%"
                          stopColor="#818cf8"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#818cf8"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-color)"
                      opacity={0.3}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--text-muted)", fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--text-muted)", fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatNumber}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        fontSize: "10px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#818cf8"
                      strokeWidth={1.5}
                      fill="url(#g)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div
                style={{
                  flex: 1,
                  background: "var(--bg-secondary)",
                  padding: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "6px",
                  }}
                >
                  每日对话次数
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart
                    data={dialogData}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-color)"
                      opacity={0.3}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--text-muted)", fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--text-muted)", fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        fontSize: "10px",
                      }}
                    />
                    <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "6px",
                    fontSize: "8px",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>
                    总对话: {dialogData.reduce((s, d) => s + d.count, 0)}次
                  </span>
                  <span>
                    日均:{" "}
                    {(
                      dialogData.reduce((s, d) => s + d.count, 0) /
                      dialogData.length
                    ).toFixed(1)}
                    次
                  </span>
                  <span>
                    峰值: {Math.max(...dialogData.map((d) => d.count), 0)}次
                  </span>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  background: "var(--bg-secondary)",
                  padding: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "6px",
                  }}
                >
                  Token 分布
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <ResponsiveContainer width={70} height={70}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={18}
                        outerRadius={30}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1 }}>
                    {categoryData.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          marginBottom: "2px",
                        }}
                      >
                        <div
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "1px",
                            background: item.color,
                          }}
                        ></div>
                        <span
                          style={{
                            fontSize: "8px",
                            flex: 1,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: "8px",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                          }}
                        >
                          {formatNumber(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "10px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span style={{ fontSize: "12px" }}>⏰</span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  活跃时段分布
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart
                data={hourlyData}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                  opacity={0.3}
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "var(--text-muted)", fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    fontSize: "10px",
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "6px",
                fontSize: "8px",
                color: "var(--text-muted)",
              }}
            >
              <span>最活跃时段: {getPeakHour()}</span>
              <span>清晨(6-12): {getMorningPercent()}%</span>
              <span>夜晚(18-24): {getNightPercent()}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
