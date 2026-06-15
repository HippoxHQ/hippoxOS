import React, { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { sysCommands } from "../../command/sys";
import { showToast, ToastType } from "../Toast";
import { showTooltip } from "../Tooltip";
import { taskPoolCommands } from "../../core/TaskPool";

import { UserProfileProps, UserStats } from "./types";
import {
  UserIcon,
  CloseIcon,
  MessageIcon,
  FileTextIcon,
  CrystalIcon,
  SettingsIcon,
  FireIcon,
  TrophyIcon,
  ChartIcon,
  BarChart3Icon,
  ClockIcon,
  SunriseIcon,
  ZapIcon,
  CompassIcon,
  GemIcon,
  LoadingSpinnerIcon,
  RefreshCwIcon,
} from "./icons";
import Heatmap from "../Heatmap";
import {
  loadAllTasksFromBackups,
  loadAllSessions,
  loadSessionChat,
  formatNumber,
  formatLocalDate,
} from "./utils";

const UserProfile: React.FC<UserProfileProps> = ({
  t,
  onClose,
  currentSessionId,
}) => {
  const [userData, setUserData] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [tokenData, setTokenData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [dateRange, setDateRange] = useState<"week" | "month" | "year">(
    "month",
  );
  const [dialogData, setDialogData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const [heatmapKey, setHeatmapKey] = useState(0);

  useEffect(() => {
    const persistTaskPool = async () => {
      try {
        await taskPoolCommands.persist();
      } catch (error) {
        console.error("Failed to persist task pool:", error);
      }
    };
    persistTaskPool();
    loadRealUserData();
  }, []);

  const loadRealUserData = async () => {
    setLoading(true);
    try {
      const sessions = await loadAllSessions();
      const totalSessions = sessions.length;
      const allTasks = await loadAllTasksFromBackups();
      const totalTasksExecuted = allTasks.length;

      let totalMessages = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      const activityByDate: Map<string, number> = new Map();
      const dailyDialogCount: Map<string, number> = new Map();
      const hourlyCount: Map<number, number> = new Map();
      for (let i = 0; i < 24; i++) hourlyCount.set(i, 0);

      for (const session of sessions) {
        const sessionId = session.session_id;
        const chatMessages = await loadSessionChat(sessionId);
        totalMessages += chatMessages.length;

        for (const msg of chatMessages) {
          const date = msg.timestamp ? msg.timestamp.split("T")[0] : null;
          if (date) {
            activityByDate.set(date, (activityByDate.get(date) || 0) + 1);
            dailyDialogCount.set(date, (dailyDialogCount.get(date) || 0) + 1);
          }
          if (msg.timestamp) {
            const hour = new Date(msg.timestamp).getHours();
            hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + 1);
          }
        }
      }

      for (const task of allTasks) {
        totalInputTokens += task.input_token_count || 0;
        totalOutputTokens += task.output_token_count || 0;
      }
      const totalTokensUsed = totalInputTokens + totalOutputTokens;

      const today = new Date();
      const startDate = new Date(new Date().getFullYear(), 0, 1);
      const endDate = new Date(new Date().getFullYear(), 11, 31);
      const heatmapData: any[] = [];

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = formatLocalDate(currentDate);
        const count = activityByDate.get(dateStr) || 0;
        heatmapData.push({ date: dateStr, count });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setActivityData(heatmapData);
      setHeatmapKey((prev) => prev + 1);
      setTotalTokens(totalTokensUsed);
      setCategoryData([
        {
          name: t("user.inputTokens") || "输入 Token",
          value: totalInputTokens,
          color: "#818cf8",
        },
        {
          name: t("user.outputTokens") || "输出 Token",
          value: totalOutputTokens,
          color: "#10b981",
        },
      ]);

      const last7Days: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        const key = date.toISOString().split("T")[0];
        last7Days.push({
          label: dateStr,
          count: dailyDialogCount.get(key) || 0,
        });
      }
      setDialogData(last7Days);

      const hourlyDataArray: any[] = [];
      for (let i = 0; i < 24; i++) {
        hourlyDataArray.push({
          hour: `${i}${t("user.hourUnit") || "时"}`,
          count: hourlyCount.get(i) || 0,
        });
      }
      setHourlyData(hourlyDataArray);

      let streak = 0;
      const checkDate = new Date();
      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if (activityByDate.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      let username = t("user.defaultUsername") || "用户";
      let email = `${username}@hippox.local`;
      try {
        const systemUsername = await sysCommands.getSystemUsername();
        if (systemUsername && systemUsername !== "用户") {
          username = systemUsername;
          email = `${systemUsername}@hippox.local`;
        }
      } catch (e) {
        console.error("Failed to get system username:", e);
      }

      setUserData({
        username,
        email,
        joinDate: new Date(),
        totalSessions,
        totalMessages,
        totalTokensUsed,
        totalTasksExecuted,
        favoriteSkills: [],
        streakDays: streak,
        longestStreak: 0,
        achievements: [
          {
            name: t("user.achievementEarlyBird") || "早起鸟",
            unlocked: totalMessages > 100,
            icon: <SunriseIcon />,
          },
          {
            name: t("user.achievementEfficiency") || "效率达人",
            unlocked: totalTasksExecuted > 50,
            icon: <ZapIcon />,
          },
          {
            name: t("user.achievementExplorer") || "探索者",
            unlocked: totalSessions > 10,
            icon: <CompassIcon />,
          },
          {
            name: t("user.achievementTokenMaster") || "Token 大师",
            unlocked: totalTokensUsed > 1000000,
            icon: <GemIcon />,
          },
        ],
      });
    } catch (error) {
      console.error("Failed to load user data:", error);
      showToast(ToastType.ERROR, t("user.loadFailed") || "加载用户数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const regenerateTokenData = async () => {
      const allTasks = await loadAllTasksFromBackups();
      const tasksByDate: Map<string, { input: number; output: number }> =
        new Map();
      for (const task of allTasks) {
        if (task.completed_at) {
          const date = new Date(task.completed_at * 1000);
          let key: string;
          if (dateRange === "year") {
            key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          } else if (dateRange === "month") {
            key = date.toISOString().split("T")[0];
          } else {
            key = date.toISOString().split("T")[0];
          }
          const existing = tasksByDate.get(key) || { input: 0, output: 0 };
          existing.input += task.input_token_count || 0;
          existing.output += task.output_token_count || 0;
          tasksByDate.set(key, existing);
        }
      }

      const days = dateRange === "year" ? 12 : dateRange === "month" ? 30 : 7;
      const result: any[] = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        let label: string;
        let key: string;
        if (dateRange === "year") {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          label = `${date.getMonth() + 1}${t("user.monthUnit") || "月"}`;
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        } else {
          const date = new Date();
          date.setDate(now.getDate() - i);
          label = `${date.getMonth() + 1}/${date.getDate()}`;
          key = date.toISOString().split("T")[0];
        }
        const data = tasksByDate.get(key) || { input: 0, output: 0 };
        result.push({
          label,
          inputTokens: data.input,
          outputTokens: data.output,
          total: data.input + data.output,
        });
      }
      setTokenData(result);
      const newTotalTokens = result.reduce((sum, d) => sum + d.total, 0);
      setTotalTokens(newTotalTokens);
    };
    regenerateTokenData();
  }, [dateRange, t]);

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

  const getPeakHour = () => {
    if (hourlyData.length === 0) return t("user.notAvailable") || "暂无";
    const max = Math.max(...hourlyData.map((d) => d.count));
    const peak = hourlyData.find((d) => d.count === max);
    return peak?.hour || t("user.notAvailable") || "暂无";
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

  const handleRefreshData = () => {
    loadRealUserData();
    showToast(ToastType.SUCCESS, t("user.dataRefreshed") || "数据已刷新");
  };

  const stats = userData || {
    username: t("user.defaultUsername") || "用户",
    email: "",
    joinDate: new Date(),
    totalSessions: 0,
    totalMessages: 0,
    totalTokensUsed: 0,
    totalTasksExecuted: 0,
    favoriteSkills: [],
    streakDays: 0,
    longestStreak: 0,
    achievements: [],
  };

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
        <div className="loading-spinner">
          <LoadingSpinnerIcon />
        </div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .loading-spinner-svg { animation: spin 0.8s linear infinite; color: var(--accent-color); }
        `}</style>
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
      {/* Header */}
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
          <span style={{ fontSize: "16px", color: "var(--text-secondary)" }}>
            <UserIcon />
          </span>
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={handleRefreshData}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: "4px 8px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              showTooltip(
                t("user.refreshTooltip") || "刷新数据",
                e.currentTarget,
              );
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <RefreshCwIcon />
          </button>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: "4px 8px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              showTooltip(t("common.close") || "关闭", e.currentTarget);
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* User Info Section */}
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
            onMouseEnter={(e) =>
              showTooltip(
                stats.username || t("user.defaultUsername") || "用户",
                e.currentTarget,
              )
            }
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
                {stats.username || t("user.defaultUsername") || "用户"}
              </span>
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                {stats.achievements?.map((ach: any, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: "11px",
                      opacity: ach.unlocked ? 1 : 0.3,
                      cursor: "default",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) =>
                      showTooltip(
                        ach.unlocked
                          ? ach.name
                          : `${ach.name} (${t("user.locked") || "未解锁"})`,
                        e.currentTarget,
                      )
                    }
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

          {/* Stats Grid */}
          <div
            style={{
              flex: "0 0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(85px, auto))",
              gap: "6px 12px",
              marginLeft: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
              }}
              onMouseEnter={(e) =>
                showTooltip(
                  t("user.totalSessionsTooltip") || "总对话次数",
                  e.currentTarget,
                )
              }
            >
              <span
                style={{
                  fontSize: "13px",
                  flexShrink: 0,
                  color: "var(--text-secondary)",
                }}
              >
                <MessageIcon />
              </span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {stats.totalSessions}
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("user.totalSessions") || "对话"}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
              }}
              onMouseEnter={(e) =>
                showTooltip(
                  t("user.totalMessagesTooltip") || "总消息数量",
                  e.currentTarget,
                )
              }
            >
              <span
                style={{
                  fontSize: "13px",
                  flexShrink: 0,
                  color: "var(--text-secondary)",
                }}
              >
                <FileTextIcon />
              </span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatNumber(stats.totalMessages)}
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("user.totalMessages") || "消息"}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
              }}
              onMouseEnter={(e) =>
                showTooltip(
                  t("user.totalTokensTooltip") || "总 Token 消耗",
                  e.currentTarget,
                )
              }
            >
              <span
                style={{
                  fontSize: "13px",
                  flexShrink: 0,
                  color: "var(--text-secondary)",
                }}
              >
                <CrystalIcon />
              </span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatNumber(stats.totalTokensUsed)}
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("user.totalTokens") || "Token"}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
              }}
              onMouseEnter={(e) =>
                showTooltip(
                  t("user.totalTasksTooltip") || "总任务执行次数",
                  e.currentTarget,
                )
              }
            >
              <span
                style={{
                  fontSize: "13px",
                  flexShrink: 0,
                  color: "var(--text-secondary)",
                }}
              >
                <SettingsIcon />
              </span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatNumber(stats.totalTasksExecuted)}
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("user.totalTasks") || "任务"}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
              }}
              onMouseEnter={(e) =>
                showTooltip(
                  t("user.currentStreakTooltip") || "当前连续活跃天数",
                  e.currentTarget,
                )
              }
            >
              <span
                style={{
                  fontSize: "13px",
                  flexShrink: 0,
                  color: "var(--text-secondary)",
                }}
              >
                <FireIcon />
              </span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {stats.streakDays}
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                    {t("user.days") || "天"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("user.currentStreak") || "连续"}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
              }}
              onMouseEnter={(e) =>
                showTooltip(
                  t("user.longestStreakTooltip") || "历史最长连续活跃天数",
                  e.currentTarget,
                )
              }
            >
              <span
                style={{
                  fontSize: "13px",
                  flexShrink: 0,
                  color: "var(--text-secondary)",
                }}
              >
                <TrophyIcon />
              </span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {stats.longestStreak}
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                    {t("user.days") || "天"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("user.longestStreak") || "最长"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Section */}
        <div style={{ background: "var(--bg-secondary)", padding: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{ fontSize: "12px", color: "var(--text-secondary)" }}
              >
                <ChartIcon />
              </span>
              <span
                style={{
                  fontSize: "14px",
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
              height: "180px",
            }}
            ref={heatmapContainerRef}
          >
            <div style={{ display: "inline-block" }}>
              <Heatmap data={activityData} t={t} />
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
            <span
              onMouseEnter={(e) =>
                showTooltip(
                  t("user.totalActivitiesTooltip") || "全年总活动次数",
                  e.currentTarget,
                )
              }
            >
              {t("user.totalActivities") || "总活动"}:{" "}
              {activityData.reduce((s, d) => s + d.count, 0)}
              {t("user.times") || "次"}
            </span>
            <span
              onMouseEnter={(e) =>
                showTooltip(
                  t("user.avgDailyTooltip") || "平均每日活动次数",
                  e.currentTarget,
                )
              }
            >
              {t("user.avgDaily") || "日均"}:{" "}
              {(activityData.reduce((s, d) => s + d.count, 0) / 365).toFixed(1)}
              {t("user.times") || "次"}
            </span>
            <span
              onMouseEnter={(e) =>
                showTooltip(
                  t("user.maxDailyTooltip") || "单日最高活动次数",
                  e.currentTarget,
                )
              }
            >
              {t("user.maxDaily") || "最高"}:{" "}
              {Math.max(...activityData.map((d) => d.count), 0)}
              {t("user.times") || "次"}
            </span>
          </div>
        </div>

        {/* Token Stats Section */}
        <div
          style={{
            background: "var(--bg-secondary)",
            marginBottom: "12px",
            paddingBottom: "15px",
          }}
        >
          <div style={{ padding: "0px 10px" }}>
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
                <span
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  <CrystalIcon />
                </span>
                <span
                  style={{
                    fontSize: "14px",
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
                    onClick={() => {
                      setDateRange(range);
                      showToast(
                        ToastType.INFO,
                        `${t("user.switchTo") || "切换到"} ${range === "week" ? t("user.week") || "周" : range === "month" ? t("user.month") || "月" : t("user.year") || "年"}`,
                      );
                    }}
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
                    onMouseEnter={(e) =>
                      showTooltip(
                        `${range === "week" ? t("user.week") || "周" : range === "month" ? t("user.month") || "月" : t("user.year") || "年"} ${t("user.timeRange") || "时间范围"}`,
                        e.currentTarget,
                      )
                    }
                  >
                    {range === "week"
                      ? t("user.week") || "周"
                      : range === "month"
                        ? t("user.month") || "月"
                        : t("user.year") || "年"}
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
                <span
                  style={{
                    fontSize: "28px",
                    color: "var(--accent-color)",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  🔮
                </span>
                <div>
                  <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                    {t("user.tokenStats") || "Token 统计"}
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
                <div
                  onMouseEnter={(e) =>
                    showTooltip(
                      t("user.inputTokensTooltip") || "输入 Token 总量",
                      e.currentTarget,
                    )
                  }
                >
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
                    {t("user.inputTokens") || "输入 Token"}
                  </div>
                </div>
                <div
                  onMouseEnter={(e) =>
                    showTooltip(
                      t("user.outputTokensTooltip") || "输出 Token 总量",
                      e.currentTarget,
                    )
                  }
                >
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
                    {t("user.outputTokens") || "输出 Token"}
                  </div>
                </div>
                <div
                  onMouseEnter={(e) =>
                    showTooltip(
                      t("user.avgDailyTokensTooltip") || "平均每日 Token 消耗",
                      e.currentTarget,
                    )
                  }
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {formatNumber(
                      Math.floor(totalTokens / Math.max(tokenData.length, 1)),
                    )}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                    {t("user.avgDailyTokens") || "日均消耗"}
                  </div>
                </div>
                <div
                  onMouseEnter={(e) =>
                    showTooltip(
                      t("user.peakDayTooltip") || "单日最高 Token 消耗",
                      e.currentTarget,
                    )
                  }
                >
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
                    {t("user.peakDay") || "峰值日"}
                  </div>
                </div>
                <div
                  onMouseEnter={(e) =>
                    showTooltip(
                      t("user.inputOutputRatioTooltip") ||
                        "输入输出 Token 比例",
                      e.currentTarget,
                    )
                  }
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {(
                      tokenData.reduce((s, d) => s + d.inputTokens, 0) /
                      Math.max(
                        tokenData.reduce((s, d) => s + d.outputTokens, 1),
                        1,
                      )
                    ).toFixed(1)}
                    :1
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                    {t("user.inputOutputRatio") || "输入/输出比"}
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
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ChartIcon />
                  {t("user.tokenTrend") || "Token 消耗趋势"}
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
                    <RechartsTooltip
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
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <BarChart3Icon />
                  {t("user.dailyDialogCount") || "每日对话次数"}
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
                    <RechartsTooltip
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
                  <span
                    onMouseEnter={(e) =>
                      showTooltip(
                        t("user.totalDialogTooltip") || "总对话次数",
                        e.currentTarget,
                      )
                    }
                  >
                    {t("user.totalDialog") || "总对话"}:{" "}
                    {dialogData.reduce((s, d) => s + d.count, 0)}
                    {t("user.times") || "次"}
                  </span>
                  <span
                    onMouseEnter={(e) =>
                      showTooltip(
                        t("user.avgDailyDialogTooltip") || "平均每日对话次数",
                        e.currentTarget,
                      )
                    }
                  >
                    {t("user.avgDailyDialog") || "日均"}:{" "}
                    {(
                      dialogData.reduce((s, d) => s + d.count, 0) /
                      Math.max(dialogData.length, 1)
                    ).toFixed(1)}
                    {t("user.times") || "次"}
                  </span>
                  <span
                    onMouseEnter={(e) =>
                      showTooltip(
                        t("user.peakDialogTooltip") || "单日最高对话次数",
                        e.currentTarget,
                      )
                    }
                  >
                    {t("user.peakDialog") || "峰值"}:{" "}
                    {Math.max(...dialogData.map((d) => d.count), 0)}
                    {t("user.times") || "次"}
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
                  {t("user.tokenDistribution") || "Token 分布"}
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
                        onMouseEnter={(e) =>
                          showTooltip(
                            `${item.name}: ${formatNumber(item.value)} ${t("user.tokens") || "Token"} (${Math.round((item.value / Math.max(totalTokens, 1)) * 100)}%)`,
                            e.currentTarget,
                          )
                        }
                      >
                        <div
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "1px",
                            background: item.color,
                          }}
                        />
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

          {/* Hourly Distribution */}
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
                <span
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  <ClockIcon />
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  {t("user.hourlyDistribution") || "活跃时段分布"}
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
                <RechartsTooltip
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
              <span
                onMouseEnter={(e) =>
                  showTooltip(
                    t("user.peakHourTooltip") || "最活跃的时间段",
                    e.currentTarget,
                  )
                }
              >
                {t("user.peakHour") || "最活跃时段"}: {getPeakHour()}
              </span>
              <span
                onMouseEnter={(e) =>
                  showTooltip(
                    t("user.morningPeakTooltip") || "清晨时段(6-12点)活动占比",
                    e.currentTarget,
                  )
                }
              >
                {t("user.morningPeak") || "清晨(6-12)"}: {getMorningPercent()}%
              </span>
              <span
                onMouseEnter={(e) =>
                  showTooltip(
                    t("user.nightPeakTooltip") || "夜晚时段(18-24点)活动占比",
                    e.currentTarget,
                  )
                }
              >
                {t("user.nightPeak") || "夜晚(18-24)"}: {getNightPercent()}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
