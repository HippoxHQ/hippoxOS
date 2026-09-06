import React, { useState, useEffect, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { profileCommands } from "../../command/Profile";
import type { UserProfile as UserProfileType } from "../../command/Profile";
import { UserProfileProps, UserStats } from "./types";
import { UserIcon, MessageIcon, FileTextIcon, CrystalIcon, SettingsIcon, FireIcon, TrophyIcon, ChartIcon, BarChart3Icon, ClockIcon, LoadingSpinnerIcon, RefreshCwIcon } from "./icons";
import { formatNumber, formatLocalDate } from "./utils";
import { osCommands } from "../../command/os";
import Heatmap from "../../components/Heatmap";
import { showToast, ToastType } from "../../components/Toast";
import { showTooltip } from "../../components/Tooltip";

const UserProfile: React.FC<UserProfileProps> = ({ t, onClose, currentSessionId }) => {
  const [userData, setUserData] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [tokenData, setTokenData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [dateRange, setDateRange] = useState<"week" | "month" | "year">("month");
  const [dialogData, setDialogData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const [heatmapKey, setHeatmapKey] = useState(0);
  /** Profile token totals loaded directly from profile (no polling) */
  const [profileTokens, setProfileTokens] = useState<{ input: number; output: number }>({ input: 0, output: 0 });
  /** Total task count from profile */
  const [totalTaskCount, setTotalTaskCount] = useState<number>(0);
  /** Session stats from profile */
  const [sessionStats, setSessionStats] = useState<{
    totalSessions: number;
    totalMessages: number;
    sessionChatMap: Map<string, number>;
  }>({ totalSessions: 0, totalMessages: 0, sessionChatMap: new Map() });

  // init
  useEffect(() => {
    loadRealUserData();
  }, []);

  const loadRealUserData = async () => {
    setLoading(true);
    try {
      // Load profile directly - get all stats from profile
      // No need to load sessions or chat.json files from disk
      let profile: UserProfileType | null = null;
      try {
        profile = await profileCommands.getProfile();
      } catch (e) {
        console.warn("Failed to load profile, using defaults:", e);
      }

      // Get token counts from profile top-level fields
      const totalInputTokens = profile?.total_input_tokens || 0;
      const totalOutputTokens = profile?.total_output_tokens || 0;
      const totalTokensUsed = totalInputTokens + totalOutputTokens;
      setProfileTokens({ input: totalInputTokens, output: totalOutputTokens });
      setTotalTokens(totalTokensUsed);

      // Get total task count from profile
      const totalTasksExecuted = profile?.total_task_count || 0;
      setTotalTaskCount(totalTasksExecuted);

      // Get session stats from profile (NO directory scanning)
      const totalSessions = profile?.total_sessions_count ? Object.keys(profile.total_sessions_count).length : 0;
      let totalMessages = 0;
      const sessionChatMap = new Map<string, number>();
      const activityByDate: Map<string, number> = new Map();
      const dailyDialogCount: Map<string, number> = new Map();
      const hourlyCount: Map<number, number> = new Map();

      // Initialize hourly counts
      for (let i = 0; i < 24; i++) hourlyCount.set(i, 0);

      // Process chat counts from profile
      if (profile?.total_sessions_chat_count) {
        for (const [sessionId, chatCount] of Object.entries(profile.total_sessions_chat_count)) {
          sessionChatMap.set(sessionId, chatCount);
          totalMessages += chatCount;

          // For activity tracking, we need to know when sessions were created
          // Use session creation timestamp from total_sessions_count
          const createdAt = profile.total_sessions_count?.[sessionId];
          if (createdAt) {
            const date = new Date(createdAt);
            const dateStr = formatLocalDate(date);
            // Add session creation as activity (1 activity per session)
            activityByDate.set(dateStr, (activityByDate.get(dateStr) || 0) + 1);
            dailyDialogCount.set(dateStr, (dailyDialogCount.get(dateStr) || 0) + chatCount);
            // Hourly distribution - use creation hour
            const hour = date.getHours();
            hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + chatCount);
          }
        }
      }

      setSessionStats({ totalSessions, totalMessages, sessionChatMap });

      // Build heatmap data
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

      // Set category data for pie chart using profile values
      setCategoryData([
        {
          name: t("user.inputTokens"),
          value: totalInputTokens,
          color: "#818cf8",
        },
        {
          name: t("user.outputTokens"),
          value: totalOutputTokens,
          color: "#10b981",
        },
      ]);

      // Build dialog data (last 7 days) from profile
      const last7Days: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        const key = formatLocalDate(date);
        last7Days.push({
          label: dateStr,
          count: dailyDialogCount.get(key) || 0,
        });
      }
      setDialogData(last7Days);

      // Build hourly data from profile
      const hourlyDataArray: any[] = [];
      for (let i = 0; i < 24; i++) {
        hourlyDataArray.push({
          hour: `${i}${t("user.hourUnit") || "时"}`,
          count: hourlyCount.get(i) || 0,
        });
      }
      setHourlyData(hourlyDataArray);

      // Calculate streak from activity data
      let streak = 0;
      const checkDate = new Date();
      for (let i = 0; i < 365; i++) {
        const dateStr = formatLocalDate(checkDate);
        if (activityByDate.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Get username
      let username = profile?.name || t("user.defaultUsername") || "用户";
      let email = profile?.email || `${username}@hippox.local`;
      if (!profile) {
        try {
          const systemUsername = await osCommands.getSystemUsername();
          if (systemUsername && systemUsername !== "用户") {
            username = systemUsername;
            email = `${systemUsername}@hippox.local`;
          }
        } catch (e) {
          console.error("Failed to get system username:", e);
        }
      }

      // Set user data
      setUserData({
        username,
        email,
        joinDate: profile ? new Date(profile.created_at) : new Date(),
        totalSessions,
        totalMessages,
        totalTokensUsed,
        favoriteSkills: [],
        streakDays: streak,
        longestStreak: 0,
        achievements: [],
      });
    } catch (error) {
      console.error("Failed to load user data:", error);
      showToast(ToastType.ERROR, t("user.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Regenerate token data for charts using profile values (no polling/task iteration)
   * Called when date range changes
   */
  useEffect(() => {
    const generateTokenDataFromProfile = async () => {
      try {
        // Load profile to get latest token counts from top-level fields
        const profile = await profileCommands.getProfile();
        const totalInput = profile.total_input_tokens || 0;
        const totalOutput = profile.total_output_tokens || 0;
        setProfileTokens({ input: totalInput, output: totalOutput });
        setTotalTokens(totalInput + totalOutput);

        // Generate chart data based on date range
        const days = dateRange === "year" ? 12 : dateRange === "month" ? 30 : 7;
        const result: any[] = [];
        const now = new Date();

        // Distribute tokens evenly across the period for visualization
        // TODO: For daily breakdown, consider storing daily token usage in profile
        for (let i = days - 1; i >= 0; i--) {
          let label: string;
          if (dateRange === "year") {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            label = `${date.getMonth() + 1}${t("user.monthUnit")}`;
          } else {
            const date = new Date();
            date.setDate(now.getDate() - i);
            label = `${date.getMonth() + 1}/${date.getDate()}`;
          }

          const avgInput = Math.round(totalInput / Math.max(days, 1));
          const avgOutput = Math.round(totalOutput / Math.max(days, 1));

          result.push({
            label,
            inputTokens: avgInput,
            outputTokens: avgOutput,
            total: avgInput + avgOutput,
          });
        }

        setTokenData(result);

        // Update pie chart data
        setCategoryData([
          {
            name: t("user.inputTokens"),
            value: totalInput,
            color: "#818cf8",
          },
          {
            name: t("user.outputTokens"),
            value: totalOutput,
            color: "#10b981",
          },
        ]);
      } catch (error) {
        console.error("Failed to generate token data from profile:", error);
      }
    };

    generateTokenDataFromProfile();
  }, [dateRange, t]);

  // Fix SVG size in heatmap
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
          padding: "4px 16px",
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
            {t("user.profile")}
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
              width: "32px",
              height: "32px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              showTooltip(t("user.refreshTooltip"), e.currentTarget);
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
              fontSize: "18px",
              width: "32px",
              height: "32px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              showTooltip(t("common.close"), e.currentTarget);
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            ✕
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
              background: "linear-gradient(135deg, var(--accent-color), #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 600,
              color: "white",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => showTooltip(stats.username || t("user.defaultUsername") || "用户", e.currentTarget)}
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
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
                    onMouseEnter={(e) => showTooltip(ach.unlocked ? ach.name : `${ach.name} (${t("user.locked")})`, e.currentTarget)}
                  >
                    {ach.icon}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{stats.email || ""}</div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {t("user.joined")} {stats.joinDate?.toLocaleDateString()}
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
              onMouseEnter={(e) => showTooltip(t("user.totalSessionsTooltip"), e.currentTarget)}
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
                  {t("user.totalSessions")}
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
              onMouseEnter={(e) => showTooltip(t("user.totalMessagesTooltip"), e.currentTarget)}
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
                  {t("user.totalMessages")}
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
              onMouseEnter={(e) => showTooltip(t("user.totalTokensTooltip"), e.currentTarget)}
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
              onMouseEnter={(e) => showTooltip(t("user.totalTasksTooltip"), e.currentTarget)}
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
                  {formatNumber(totalTaskCount)}
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("user.totalTasks")}
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
              onMouseEnter={(e) => showTooltip(t("user.currentStreakTooltip"), e.currentTarget)}
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
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{t("user.days")}</span>
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("user.currentStreak")}
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
              onMouseEnter={(e) => showTooltip(t("user.longestStreakTooltip"), e.currentTarget)}
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
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{t("user.days")}</span>
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("user.longestStreak")}
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
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                <ChartIcon />
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                {t("user.activityHeatmap")}
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
            <span onMouseEnter={(e) => showTooltip(t("user.totalActivitiesTooltip"), e.currentTarget)}>
              {t("user.totalActivities")}: {activityData.reduce((s, d) => s + d.count, 0)}
              {t("user.times")}
            </span>
            <span onMouseEnter={(e) => showTooltip(t("user.avgDailyTooltip"), e.currentTarget)}>
              {t("user.avgDaily")}: {(activityData.reduce((s, d) => s + d.count, 0) / 365).toFixed(1)}
              {t("user.times")}
            </span>
            <span onMouseEnter={(e) => showTooltip(t("user.maxDailyTooltip"), e.currentTarget)}>
              {t("user.maxDaily")}: {Math.max(...activityData.map((d) => d.count), 0)}
              {t("user.times")}
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
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  <CrystalIcon />
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  {t("user.tokenStats")}
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {(["week", "month", "year"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setDateRange(range);
                      showToast(ToastType.INFO, `${t("user.switchTo")} ${range === "week" ? t("user.week") : range === "month" ? t("user.month") : t("user.year")}`);
                    }}
                    style={{
                      padding: "2px 8px",
                      fontSize: "9px",
                      background: dateRange === range ? "var(--accent-color)" : "var(--bg-tertiary)",
                      border: "none",
                      borderRadius: "10px",
                      color: dateRange === range ? "white" : "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => showTooltip(`${range === "week" ? t("user.week") : range === "month" ? t("user.month") : t("user.year")} ${t("user.timeRange")}`, e.currentTarget)}
                  >
                    {range === "week" ? t("user.week") : range === "month" ? t("user.month") : t("user.year")}
                  </button>
                ))}
              </div>
            </div>

            {/* Token Summary */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px",
                background: "linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                  <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>{t("user.tokenStats")}</div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "var(--accent-color)",
                    }}
                  >
                    {formatNumber(totalTokens)}
                  </div>
                  <div style={{ fontSize: "7px", color: "var(--text-muted)" }}>{t("user.totalTokensUsed")}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "20px", textAlign: "right" }}>
                <div onMouseEnter={(e) => showTooltip(t("user.inputTokensTooltip"), e.currentTarget)}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#818cf8",
                    }}
                  >
                    {formatNumber(profileTokens.input)}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>{t("user.inputTokens")}</div>
                </div>
                <div onMouseEnter={(e) => showTooltip(t("user.outputTokensTooltip"), e.currentTarget)}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#10b981",
                    }}
                  >
                    {formatNumber(profileTokens.output)}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>{t("user.outputTokens")}</div>
                </div>
                <div onMouseEnter={(e) => showTooltip(t("user.avgDailyTokensTooltip"), e.currentTarget)}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {formatNumber(Math.floor(totalTokens / Math.max(tokenData.length, 1)))}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>{t("user.avgDailyTokens")}</div>
                </div>
                <div onMouseEnter={(e) => showTooltip(t("user.peakDayTooltip"), e.currentTarget)}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {formatNumber(Math.max(...tokenData.map((d) => d.total), 0))}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>{t("user.peakDay")}</div>
                </div>
                <div onMouseEnter={(e) => showTooltip(t("user.inputOutputRatioTooltip"), e.currentTarget)}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {(profileTokens.input / Math.max(profileTokens.output, 1)).toFixed(1)}
                    :1
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>{t("user.inputOutputRatio")}</div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: "flex", gap: "10px" }}>
              {/* Token Trend */}
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
                  {t("user.tokenTrend")}
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={tokenData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
                    <RechartsTooltip
                      contentStyle={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        fontSize: "10px",
                      }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#818cf8" strokeWidth={1.5} fill="url(#g)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Dialog Count */}
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
                  {t("user.dailyDialogCount")}
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={dialogData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 8 }} axisLine={false} tickLine={false} />
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
                  <span onMouseEnter={(e) => showTooltip(t("user.totalDialogTooltip"), e.currentTarget)}>
                    {t("user.totalDialog")}: {dialogData.reduce((s, d) => s + d.count, 0)}
                    {t("user.times")}
                  </span>
                  <span onMouseEnter={(e) => showTooltip(t("user.avgDailyDialogTooltip"), e.currentTarget)}>
                    {t("user.avgDailyDialog")}: {(dialogData.reduce((s, d) => s + d.count, 0) / Math.max(dialogData.length, 1)).toFixed(1)}
                    {t("user.times")}
                  </span>
                  <span onMouseEnter={(e) => showTooltip(t("user.peakDialogTooltip"), e.currentTarget)}>
                    {t("user.peakDialog")}: {Math.max(...dialogData.map((d) => d.count), 0)}
                    {t("user.times")}
                  </span>
                </div>
              </div>

              {/* Token Distribution Pie Chart */}
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
                  {t("user.tokenDistribution")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ResponsiveContainer width={70} height={70}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={18} outerRadius={30} dataKey="value" stroke="none">
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
                        onMouseEnter={(e) => showTooltip(`${item.name}: ${formatNumber(item.value)} ${t("user.tokens") || "Token"} (${Math.round((item.value / Math.max(totalTokens, 1)) * 100)}%)`, e.currentTarget)}
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
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  <ClockIcon />
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  {t("user.hourlyDistribution")}
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "var(--text-muted)", fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 8 }} axisLine={false} tickLine={false} />
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
              <span onMouseEnter={(e) => showTooltip(t("user.peakHourTooltip"), e.currentTarget)}>
                {t("user.peakHour")}: {getPeakHour()}
              </span>
              <span onMouseEnter={(e) => showTooltip(t("user.morningPeakTooltip"), e.currentTarget)}>
                {t("user.morningPeak")}: {getMorningPercent()}%
              </span>
              <span onMouseEnter={(e) => showTooltip(t("user.nightPeakTooltip"), e.currentTarget)}>
                {t("user.nightPeak")}: {getNightPercent()}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
