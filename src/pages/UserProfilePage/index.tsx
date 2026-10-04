import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { profileCommands } from "../../command/Profile";
import type { UserProfile as UserProfileType } from "../../command/Profile";
import { UserProfileProps, UserStats } from "./types";
import { UserIcon, MessageIcon, FileTextIcon, CrystalIcon, SettingsIcon, FireIcon, TrophyIcon, ChartIcon, BarChart3Icon, ClockIcon, LoadingSpinnerIcon, RefreshCwIcon, LayersIcon, SubsystemImageIcon, MusicIcon, VideoIcon } from "./icons";
import { formatNumber, formatLocalDate } from "./utils";
import { osCommands } from "../../command/os";
import Heatmap from "../../components/Heatmap";
import { showToast, ToastType } from "../../components/Toast";
import { showTooltip } from "../../components/Tooltip";
import { X } from "lucide-react";
interface ChatStatisticsRecord {
  task_id: string;
  session_id: string;
  subsystem: string;
  role: string;
  source: string;
  provider: string;
  model: string;
  content: string;
  workflow_mode: string;
  input_tokens: number;
  output_tokens: number;
  created_at: number;
}
/** Root structure of one chat subsystem's statistics.json. */
interface ChatStatistics {
  version: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_task_count: number;
  records: ChatStatisticsRecord[];
}
/** Canonical subsystem keys, mirroring the backend SubSystemEnum. */
type SubsystemKey = "general" | "finance" | "map" | "code_editor" | "video" | "sandbox3d" | "block_chain";
/** Map of subsystem key -> that subsystem's chat statistics ledger. */
type SubsystemStatisticsMap = Partial<Record<SubsystemKey, ChatStatistics>>;
/**
 * One record inside a media generation statistics.json.
 */
interface MediaTaskRecord {
  task_id: string;
  session_id: string;
  provider: string;
  model?: string | null;
  prompt: string;
  /** Token output reported by the provider (0 if not reported). */
  output_tokens?: number;
  usage?: any;
  /** image only: number of produced images for this task. */
  file_count?: number;
  /** image only: local paths of the produced images. */
  file_paths?: string[];
  /** audio / video only: produced media duration in seconds. */
  duration_seconds?: number | null;
  /** audio / video only: local path of the produced media. */
  file_path?: string | null;
  resolution?: string | null;
  format?: string | null;
  created_at: number;
  completed_at: number;
}
/** Root structure of a media generation statistics.json. */
interface MediaStatistics {
  version: number;
  modality: string;
  total_output_tokens: number;
  total_task_count: number;
  records: MediaTaskRecord[];
}
/** Bundle of the three media generation statistics ledgers. */
interface MediaGenerationStatistics {
  image: MediaStatistics | null;
  audio: MediaStatistics | null;
  video: MediaStatistics | null;
}
/** Metadata for each chat subsystem card: key, fallback label, accent color. */
const SUBSYSTEM_META: { key: SubsystemKey; label: string; color: string }[] = [
  { key: "general", label: "General", color: "#818cf8" },
  { key: "finance", label: "Finance", color: "#10b981" },
  { key: "map", label: "Map", color: "#f59e0b" },
  { key: "code_editor", label: "CodeEditor", color: "#8b5cf6" },
  { key: "video", label: "Video", color: "#ec4899" },
  { key: "sandbox3d", label: "SandBox3D", color: "#06b6d4" },
  { key: "block_chain", label: "BlockChain", color: "#f43f5e" },
];
/** Canonical subsystem keys, mirroring the backend SubSystemEnum. */
const SUBSYSTEM_KEYS: SubsystemKey[] = ["general", "finance", "map", "code_editor", "video", "sandbox3d", "block_chain"];
/** Max height (px) of a per-model breakdown panel before it scrolls. */
const MODEL_BREAKDOWN_MAX_HEIGHT = 250;
const UserProfile: React.FC<UserProfileProps> = ({ t, onClose, currentSessionId }) => {
  const isZh = t("i18n") === "zh";
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
  const [profileTokens, setProfileTokens] = useState<{ input: number; output: number }>({ input: 0, output: 0 });
  const [totalTaskCount, setTotalTaskCount] = useState<number>(0);
  const [sessionStats, setSessionStats] = useState<{
    totalSessions: number;
    totalMessages: number;
    sessionChatMap: Map<string, number>;
  }>({ totalSessions: 0, totalMessages: 0, sessionChatMap: new Map() });
  const [subsystemStats, setSubsystemStats] = useState<SubsystemStatisticsMap>({});
  const [mediaStats, setMediaStats] = useState<MediaGenerationStatistics>({ image: null, audio: null, video: null });
  const [expandedSubsystem, setExpandedSubsystem] = useState<SubsystemKey | null>("general");
  const [chartSubsystem, setChartSubsystem] = useState<SubsystemKey>("general");
  const [expandedMedia, setExpandedMedia] = useState<"image" | "audio" | "video" | null>(null);
  // init
  useEffect(() => {
    loadRealUserData();
  }, []);
  const loadDetailedStatistics = async () => {
    // Fetch every subsystem ledger in parallel.
    const subsystemEntries = await Promise.all(
      SUBSYSTEM_KEYS.map(async (subsystem) => {
        try {
          const stats = await invoke<ChatStatistics>("cmd_get_statistics_by_subsystem", { subsystem });
          return [subsystem, stats] as const;
        } catch (e) {
          console.warn(`Failed to load statistics for subsystem ${subsystem}:`, e);
          return [subsystem, null] as const;
        }
      }),
    );
    const subsysMap: SubsystemStatisticsMap = {};
    for (const [key, value] of subsystemEntries) {
      if (value) subsysMap[key] = value;
    }
    setSubsystemStats(subsysMap);
    // Fetch the three media generation ledgers in parallel.
    const [image, audio, video] = await Promise.all([
      invoke<MediaStatistics>("cmd_get_generate_image_statistics").catch((e) => {
        console.warn("Failed to load image statistics:", e);
        return null;
      }),
      invoke<MediaStatistics>("cmd_get_generate_audio_statistics").catch((e) => {
        console.warn("Failed to load audio statistics:", e);
        return null;
      }),
      invoke<MediaStatistics>("cmd_get_generate_video_statistics").catch((e) => {
        console.warn("Failed to load video statistics:", e);
        return null;
      }),
    ]);
    setMediaStats({ image, audio, video });
  };
  const loadRealUserData = async () => {
    setLoading(true);
    try {
      let profile: UserProfileType | null = null;
      try {
        profile = await profileCommands.getProfile();
      } catch (e) {
        console.warn("Failed to load profile, using defaults:", e);
      }
      await loadDetailedStatistics();
      const activityByDate: Map<string, number> = new Map();
      const dailyDialogCount: Map<string, number> = new Map();
      const hourlyCount: Map<number, number> = new Map();
      for (let i = 0; i < 24; i++) hourlyCount.set(i, 0);
      const subsystemEntries = await Promise.all(
        SUBSYSTEM_KEYS.map(async (subsystem) => {
          try {
            const stats = await invoke<ChatStatistics>("cmd_get_statistics_by_subsystem", { subsystem });
            return [subsystem, stats] as const;
          } catch {
            return [subsystem, null] as const;
          }
        }),
      );
      let aggregateInputTokens = 0;
      let aggregateOutputTokens = 0;
      let aggregateTaskCount = 0;
      let totalMessages = 0;
      const sessionChatMap = new Map<string, number>();
      const sessionSeen = new Set<string>();
      for (const [, stats] of subsystemEntries) {
        if (!stats) continue;
        aggregateInputTokens += stats.total_input_tokens || 0;
        aggregateOutputTokens += stats.total_output_tokens || 0;
        aggregateTaskCount += stats.total_task_count || 0;
        totalMessages += stats.records.length;
        for (const rec of stats.records) {
          if (rec.session_id) {
            sessionSeen.add(rec.session_id);
            sessionChatMap.set(rec.session_id, (sessionChatMap.get(rec.session_id) || 0) + 1);
          }
        }
      }
      const totalSessions = sessionSeen.size;
      const totalTokensUsed = aggregateInputTokens + aggregateOutputTokens;
      setProfileTokens({ input: aggregateInputTokens, output: aggregateOutputTokens });
      setTotalTokens(totalTokensUsed);
      setTotalTaskCount(aggregateTaskCount);
      setSessionStats({ totalSessions, totalMessages, sessionChatMap });
      // Build per-record activity maps for the heatmap / dialog / hourly charts.
      const allChatRecords: ChatStatisticsRecord[] = [];
      for (const [, stats] of subsystemEntries) {
        if (stats) {
          for (const rec of stats.records) allChatRecords.push(rec);
        }
      }
      for (const rec of allChatRecords) {
        const date = new Date(rec.created_at);
        const dateStr = formatLocalDate(date);
        activityByDate.set(dateStr, (activityByDate.get(dateStr) || 0) + 1);
        dailyDialogCount.set(dateStr, (dailyDialogCount.get(dateStr) || 0) + 1);
        const hour = date.getHours();
        hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + 1);
      }
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
      // Set category data for pie chart using aggregate values
      setCategoryData([
        {
          name: isZh ? "输入" : "Input",
          value: aggregateInputTokens,
          color: "#818cf8",
        },
        {
          name: isZh ? "输出" : "Output",
          value: aggregateOutputTokens,
          color: "#10b981",
        },
      ]);
      // Build dialog data (last 7 days) from the aggregated records
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
      // Build hourly data from the aggregated records
      const hourlyDataArray: any[] = [];
      for (let i = 0; i < 24; i++) {
        hourlyDataArray.push({
          hour: `${i}${isZh ? "时" : "h"}`,
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
      let username = profile?.name || (isZh ? "用户" : "User");
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
      // Set user data. All aggregate numbers come from the statistics files.
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
      showToast(ToastType.ERROR, isZh ? "加载失败" : "Failed to load");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const generateTokenDataFromStatistics = async () => {
      try {
        const totalInput = profileTokens.input;
        const totalOutput = profileTokens.output;
        // Generate chart data based on date range
        const days = dateRange === "year" ? 12 : dateRange === "month" ? 30 : 7;
        const result: any[] = [];
        const now = new Date();
        // Distribute tokens evenly across the period for visualization
        // TODO: For daily breakdown, consider storing daily token usage in each statistics file
        for (let i = days - 1; i >= 0; i--) {
          let label: string;
          if (dateRange === "year") {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            label = `${date.getMonth() + 1}${isZh ? "月" : "M"}`;
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
            name: isZh ? "输入" : "Input",
            value: totalInput,
            color: "#818cf8",
          },
          {
            name: isZh ? "输出" : "Output",
            value: totalOutput,
            color: "#10b981",
          },
        ]);
      } catch (error) {
        console.error("Failed to generate token data from statistics:", error);
      }
    };
    generateTokenDataFromStatistics();
  }, [dateRange, profileTokens, isZh]);
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
    if (hourlyData.length === 0) return isZh ? "暂无" : "N/A";
    const max = Math.max(...hourlyData.map((d) => d.count));
    const peak = hourlyData.find((d) => d.count === max);
    return peak?.hour || (isZh ? "暂无" : "N/A");
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
    showToast(ToastType.SUCCESS, isZh ? "数据已刷新" : "Data refreshed");
  };
  const stats = userData || {
    username: isZh ? "用户" : "User",
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
  /** One row per chat subsystem, sourced from its own statistics.json. */
  const subsystemList = SUBSYSTEM_META.map((meta) => {
    const s = subsystemStats[meta.key];
    const input = s?.total_input_tokens || 0;
    const output = s?.total_output_tokens || 0;
    return {
      ...meta,
      input,
      output,
      total: input + output,
      tasks: s?.total_task_count || 0,
      records: s?.records?.length || 0,
    };
  });
  /** Aggregate totals across all chat subsystems. */
  const subsystemTotals = subsystemList.reduce(
    (acc, s) => {
      acc.input += s.input;
      acc.output += s.output;
      acc.tasks += s.tasks;
      return acc;
    },
    { input: 0, output: 0, tasks: 0 },
  );
  /**
   * Chart data for the selected subsystem's daily token trend.
   */
  const buildSubsystemChartData = (): { label: string; input: number; output: number; total: number }[] => {
    const days = dateRange === "year" ? 12 : dateRange === "month" ? 30 : 7;
    const records = subsystemStats[chartSubsystem]?.records || [];
    // Bucket the records by day (or by month when the range is "year").
    const byBucket = new Map<string, { input: number; output: number }>();
    records.forEach((rec) => {
      const d = new Date(rec.created_at);
      const key = dateRange === "year" ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : formatLocalDate(d);
      const bucket = byBucket.get(key) || { input: 0, output: 0 };
      bucket.input += rec.input_tokens || 0;
      bucket.output += rec.output_tokens || 0;
      byBucket.set(key, bucket);
    });
    const now = new Date();
    const result: { label: string; input: number; output: number; total: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      let label: string;
      let key: string;
      if (dateRange === "year") {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        label = `${date.getMonth() + 1}${isZh ? "月" : "M"}`;
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        const date = new Date();
        date.setDate(now.getDate() - i);
        label = `${date.getMonth() + 1}/${date.getDate()}`;
        key = formatLocalDate(date);
      }
      const bucket = byBucket.get(key) || { input: 0, output: 0 };
      result.push({
        label,
        input: bucket.input,
        output: bucket.output,
        total: bucket.input + bucket.output,
      });
    }
    return result;
  };
  const subsystemChartData = buildSubsystemChartData();
  /**
   * Aggregate chat records by (provider, model) for a single subsystem.
   */
  const buildModelBreakdown = (records: ChatStatisticsRecord[]): { key: string; provider: string; model: string; input: number; output: number; tasks: number }[] => {
    const map = new Map<string, { provider: string; model: string; input: number; output: number; tasks: Set<string> }>();
    for (const r of records) {
      const provider = r.provider || (isZh ? "未知" : "unknown");
      const model = r.model || (isZh ? "未知" : "unknown");
      const key = `${provider}::${model}`;
      if (!map.has(key)) {
        map.set(key, { provider, model, input: 0, output: 0, tasks: new Set() });
      }
      const entry = map.get(key)!;
      entry.input += r.input_tokens || 0;
      entry.output += r.output_tokens || 0;
      entry.tasks.add(r.task_id);
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({
        key,
        provider: v.provider,
        model: v.model,
        input: v.input,
        output: v.output,
        tasks: v.tasks.size,
      }))
      .sort((a, b) => b.input + b.output - (a.input + a.output));
  };
  /** Pre-compute the per-model breakdown for every subsystem. */
  const subsystemModelBreakdown: Record<SubsystemKey, ReturnType<typeof buildModelBreakdown>> = {
    general: buildModelBreakdown(subsystemStats.general?.records || []),
    finance: buildModelBreakdown(subsystemStats.finance?.records || []),
    map: buildModelBreakdown(subsystemStats.map?.records || []),
    code_editor: buildModelBreakdown(subsystemStats.code_editor?.records || []),
    video: buildModelBreakdown(subsystemStats.video?.records || []),
    sandbox3d: buildModelBreakdown(subsystemStats.sandbox3d?.records || []),
    block_chain: buildModelBreakdown(subsystemStats.block_chain?.records || []),
  };
  /**
   * One row per media modality.
   */
  const mediaList = [
    {
      key: "image",
      label: isZh ? "图片" : "Image",
      unit: isZh ? "张" : "imgs",
      color: "#818cf8",
      icon: <SubsystemImageIcon />,
      s: mediaStats.image,
      // image usage = total produced images across all successful tasks
      usage: (mediaStats.image?.records || []).reduce((sum, r) => sum + (r.file_count ?? r.file_paths?.length ?? 0), 0),
    },
    {
      key: "audio",
      label: isZh ? "音频" : "Audio",
      unit: isZh ? "秒" : "s",
      color: "#10b981",
      icon: <MusicIcon />,
      s: mediaStats.audio,
      // audio usage = total produced duration in seconds
      usage: (mediaStats.audio?.records || []).reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0),
    },
    {
      key: "video",
      label: isZh ? "视频" : "Video",
      unit: isZh ? "秒" : "s",
      color: "#f59e0b",
      icon: <VideoIcon />,
      s: mediaStats.video,
      // video usage = total produced duration in seconds
      usage: (mediaStats.video?.records || []).reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0),
    },
  ].map((m) => ({
    ...m,
    tasks: m.s?.total_task_count || 0,
    records: m.s?.records?.length || 0,
    // token usage = the ledger's own aggregate, plus a per-record fallback sum
    tokens: m.s?.total_output_tokens ?? (m.s?.records || []).reduce((sum, r) => sum + (r.output_tokens ?? 0), 0),
  }));
  /** Aggregate totals across all media modalities. */
  const mediaTotals = mediaList.reduce(
    (acc, m) => {
      acc.tasks += m.tasks;
      acc.records += m.records;
      acc.tokens += m.tokens;
      return acc;
    },
    { tasks: 0, records: 0, tokens: 0 },
  );
  /**
   * Per-modality token distribution data for the three separate pies.
   */
  const buildUsagePie = (records: MediaTaskRecord[], label: string, color: string, getUsage: (r: MediaTaskRecord) => number): { name: string; value: number; color: string }[] => {
    const byProvider = new Map<string, number>();
    for (const r of records) {
      const v = getUsage(r);
      if (!v) continue;
      const key = r.provider || label;
      byProvider.set(key, (byProvider.get(key) || 0) + v);
    }
    if (byProvider.size === 0) return [];
    // When only one provider exists, still show a single visible slice.
    const palette = ["#818cf8", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#f43f5e"];
    const entries = Array.from(byProvider.entries());
    return entries.map(([name, value], idx) => ({
      name,
      value,
      color: entries.length === 1 ? color : palette[idx % palette.length],
    }));
  };
  /** Image usage distribution (unit: 张). */
  const imagePieData = buildUsagePie(mediaStats.image?.records || [], isZh ? "图片" : "Image", "#818cf8", (r) => r.file_count ?? r.file_paths?.length ?? 0);
  /** Audio usage distribution (unit: seconds). */
  const audioPieData = buildUsagePie(mediaStats.audio?.records || [], isZh ? "音频" : "Audio", "#10b981", (r) => r.duration_seconds ?? 0);
  /** Video usage distribution (unit: seconds). */
  const videoPieData = buildUsagePie(mediaStats.video?.records || [], isZh ? "视频" : "Video", "#f59e0b", (r) => r.duration_seconds ?? 0);
  /**
   * Aggregate media records by (provider, model) for a single modality.
   * Used to render the per-model breakdown under each media card.
   */
  const buildMediaModelBreakdown = (records: MediaTaskRecord[], getUsage: (r: MediaTaskRecord) => number): { key: string; provider: string; model: string; tokens: number; usage: number; tasks: number }[] => {
    const map = new Map<string, { provider: string; model: string; tokens: number; usage: number; tasks: Set<string> }>();
    for (const r of records) {
      const provider = r.provider || (isZh ? "未知" : "unknown");
      const model = r.model || (isZh ? "未知" : "unknown");
      const key = `${provider}::${model}`;
      if (!map.has(key)) {
        map.set(key, { provider, model, tokens: 0, usage: 0, tasks: new Set() });
      }
      const entry = map.get(key)!;
      entry.tokens += r.output_tokens || 0;
      entry.usage += getUsage(r);
      entry.tasks.add(r.task_id);
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({
        key,
        provider: v.provider,
        model: v.model,
        tokens: v.tokens,
        usage: v.usage,
        tasks: v.tasks.size,
      }))
      .sort((a, b) => b.tokens - a.tokens || b.usage - a.usage);
  };
  /** Pre-compute the per-model breakdown for each media modality. */
  const imageModelBreakdown = buildMediaModelBreakdown(mediaStats.image?.records || [], (r) => r.file_count ?? r.file_paths?.length ?? 0);
  const audioModelBreakdown = buildMediaModelBreakdown(mediaStats.audio?.records || [], (r) => r.duration_seconds ?? 0);
  const videoModelBreakdown = buildMediaModelBreakdown(mediaStats.video?.records || [], (r) => r.duration_seconds ?? 0);
  /** Map a media modality key to its pre-computed per-model breakdown. */
  const mediaBreakdownMap = {
    image: imageModelBreakdown,
    audio: audioModelBreakdown,
    video: videoModelBreakdown,
  } as const;
  /** Format a duration in seconds into a compact human-readable string. */
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "0";
    if (seconds < 60) return `${seconds.toFixed(1)}${isZh ? "秒" : "s"}`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m < 60) return `${m}${isZh ? "分" : "m"}${s}${isZh ? "秒" : "s"}`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}${isZh ? "时" : "h"}${mm}${isZh ? "分" : "m"}`;
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
            {isZh ? "个人资料" : "Profile"}
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
              showTooltip(isZh ? "刷新" : "Refresh", e.currentTarget);
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
              showTooltip(isZh ? "关闭" : "Close", e.currentTarget);
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <X />
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
            onMouseEnter={(e) => showTooltip(stats.username || (isZh ? "用户" : "User"), e.currentTarget)}
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
                {stats.username || (isZh ? "用户" : "User")}
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
                    onMouseEnter={(e) => showTooltip(ach.unlocked ? ach.name : `${ach.name} (${isZh ? "未解锁" : "Locked"})`, e.currentTarget)}
                  >
                    {ach.icon}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{stats.email || ""}</div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {isZh ? "加入于" : "Joined"} {stats.joinDate?.toLocaleDateString()}
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
              onMouseEnter={(e) => showTooltip(isZh ? "总会话数" : "Total sessions", e.currentTarget)}
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
                  {isZh ? "会话" : "Sessions"}
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
              onMouseEnter={(e) => showTooltip(isZh ? "总消息数" : "Total messages", e.currentTarget)}
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
                  {isZh ? "消息" : "Messages"}
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
              onMouseEnter={(e) => showTooltip(isZh ? "总 Token 数" : "Total tokens", e.currentTarget)}
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
                  Token
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
              onMouseEnter={(e) => showTooltip(isZh ? "总任务数" : "Total tasks", e.currentTarget)}
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
                  {isZh ? "任务" : "Tasks"}
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
              onMouseEnter={(e) => showTooltip(isZh ? "当前连续天数" : "Current streak", e.currentTarget)}
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
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{isZh ? "天" : "d"}</span>
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isZh ? "连续" : "Streak"}
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
              onMouseEnter={(e) => showTooltip(isZh ? "最长连续天数" : "Longest streak", e.currentTarget)}
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
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{isZh ? "天" : "d"}</span>
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isZh ? "最长" : "Longest"}
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
                {isZh ? "活动热力图" : "Activity Heatmap"}
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
            <span onMouseEnter={(e) => showTooltip(isZh ? "总活动次数" : "Total activities", e.currentTarget)}>
              {isZh ? "总活动" : "Total"}: {activityData.reduce((s, d) => s + d.count, 0)}
              {isZh ? "次" : ""}
            </span>
            <span onMouseEnter={(e) => showTooltip(isZh ? "日均活动" : "Avg daily", e.currentTarget)}>
              {isZh ? "日均" : "Avg"}: {(activityData.reduce((s, d) => s + d.count, 0) / 365).toFixed(1)}
              {isZh ? "次" : ""}
            </span>
            <span onMouseEnter={(e) => showTooltip(isZh ? "单日最高" : "Max daily", e.currentTarget)}>
              {isZh ? "最高" : "Max"}: {Math.max(...activityData.map((d) => d.count), 0)}
              {isZh ? "次" : ""}
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
                  {isZh ? "Token 统计" : "Token Statistics"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {(["week", "month", "year"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setDateRange(range);
                      showToast(ToastType.INFO, `${isZh ? "切换到" : "Switched to"} ${range === "week" ? (isZh ? "周" : "week") : range === "month" ? (isZh ? "月" : "month") : isZh ? "年" : "year"}`);
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
                    onMouseEnter={(e) => showTooltip(`${range === "week" ? (isZh ? "周" : "week") : range === "month" ? (isZh ? "月" : "month") : isZh ? "年" : "year"} ${isZh ? "时间范围" : "range"}`, e.currentTarget)}
                  >
                    {range === "week" ? (isZh ? "周" : "Week") : range === "month" ? (isZh ? "月" : "Month") : isZh ? "年" : "Year"}
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
                  <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>{isZh ? "Token 统计" : "Token Statistics"}</div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "var(--accent-color)",
                    }}
                  >
                    {formatNumber(totalTokens)}
                  </div>
                  <div style={{ fontSize: "7px", color: "var(--text-muted)" }}>{isZh ? "总 Token 使用" : "Total tokens used"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "20px", textAlign: "right" }}>
                <div onMouseEnter={(e) => showTooltip(isZh ? "输入 Token" : "Input tokens", e.currentTarget)}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#818cf8",
                    }}
                  >
                    {formatNumber(profileTokens.input)}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>{isZh ? "输入" : "Input"}</div>
                </div>
                <div onMouseEnter={(e) => showTooltip(isZh ? "输出 Token" : "Output tokens", e.currentTarget)}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#10b981",
                    }}
                  >
                    {formatNumber(profileTokens.output)}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>{isZh ? "输出" : "Output"}</div>
                </div>
                <div onMouseEnter={(e) => showTooltip(isZh ? "日均 Token" : "Avg daily tokens", e.currentTarget)}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {formatNumber(Math.floor(totalTokens / Math.max(tokenData.length, 1)))}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>{isZh ? "日均" : "Avg/day"}</div>
                </div>
                <div onMouseEnter={(e) => showTooltip(isZh ? "单日最高" : "Peak day", e.currentTarget)}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {formatNumber(Math.max(...tokenData.map((d) => d.total), 0))}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>{isZh ? "峰值" : "Peak"}</div>
                </div>
                <div onMouseEnter={(e) => showTooltip(isZh ? "输入输出比" : "Input/output ratio", e.currentTarget)}>
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
                  <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>{isZh ? "比例" : "Ratio"}</div>
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
                  {isZh ? "Token 趋势" : "Token Trend"}
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
                  {isZh ? "每日对话数" : "Daily Dialog Count"}
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
                  <span onMouseEnter={(e) => showTooltip(isZh ? "总对话数" : "Total dialogs", e.currentTarget)}>
                    {isZh ? "总数" : "Total"}: {dialogData.reduce((s, d) => s + d.count, 0)}
                  </span>
                  <span onMouseEnter={(e) => showTooltip(isZh ? "日均对话" : "Avg daily dialogs", e.currentTarget)}>
                    {isZh ? "日均" : "Avg"}: {(dialogData.reduce((s, d) => s + d.count, 0) / Math.max(dialogData.length, 1)).toFixed(1)}
                  </span>
                  <span onMouseEnter={(e) => showTooltip(isZh ? "单日峰值" : "Peak dialogs", e.currentTarget)}>
                    {isZh ? "峰值" : "Peak"}: {Math.max(...dialogData.map((d) => d.count), 0)}
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
                  {isZh ? "Token 分布" : "Token Distribution"}
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
                        onMouseEnter={(e) => showTooltip(`${item.name}: ${formatNumber(item.value)} Token (${Math.round((item.value / Math.max(totalTokens, 1)) * 100)}%)`, e.currentTarget)}
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
                  {isZh ? "时段分布" : "Hourly Distribution"}
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
              <span onMouseEnter={(e) => showTooltip(isZh ? "高峰时段" : "Peak hour", e.currentTarget)}>
                {isZh ? "高峰" : "Peak"}: {getPeakHour()}
              </span>
              <span onMouseEnter={(e) => showTooltip(isZh ? "上午占比" : "Morning share", e.currentTarget)}>
                {isZh ? "上午" : "AM"}: {getMorningPercent()}%
              </span>
              <span onMouseEnter={(e) => showTooltip(isZh ? "夜间占比" : "Night share", e.currentTarget)}>
                {isZh ? "夜间" : "PM"}: {getNightPercent()}%
              </span>
            </div>
          </div>
        </div>
        {/* Subsystem Statistics Section (per-subsystem statistics.json) */}
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
                <LayersIcon />
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                {isZh ? "子系统统计" : "Subsystem Statistics"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "9px", color: "var(--text-muted)" }}>
              <span onMouseEnter={(e) => showTooltip(isZh ? "所有子系统 Token 总和" : "Total tokens across all subsystems", e.currentTarget)}>Token: {formatNumber(subsystemTotals.input + subsystemTotals.output)}</span>
              <span>
                {isZh ? "任务" : "Tasks"}: {formatNumber(subsystemTotals.tasks)}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "8px",
              marginTop: "10px",
            }}
          >
            {subsystemList.map((s) => {
              const isExpanded = expandedSubsystem === s.key;
              const isChartSelected = chartSubsystem === s.key;
              const breakdown = subsystemModelBreakdown[s.key] || [];
              return (
                <div
                  key={s.key}
                  style={{
                    background: "var(--bg-tertiary)",
                    borderRadius: "6px",
                    padding: "8px",
                    borderLeft: `3px solid ${s.color}`,
                    cursor: "pointer",
                    outline: isChartSelected ? `1px solid ${s.color}` : isExpanded ? `1px solid ${s.color}` : "none",
                  }}
                  onClick={() => {
                    setChartSubsystem(s.key);
                    setExpandedSubsystem(isExpanded ? null : s.key);
                  }}
                  onMouseEnter={(e) =>
                    showTooltip(
                      `${s.label}\n${isZh ? "输入" : "Input"}: ${formatNumber(s.input)}\n${isZh ? "输出" : "Output"}: ${formatNumber(s.output)}\n${isZh ? "任务" : "Tasks"}: ${s.tasks}\n${isZh ? "记录" : "Records"}: ${s.records}\n${isZh ? "点击查看曲线与按模型细分" : "Click to view trend and per-model breakdown"}`,
                      e.currentTarget,
                    )
                  }
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{s.label}</span>
                    <span style={{ fontSize: "8px", color: "var(--text-muted)" }}>{isExpanded ? "▾" : "▸"}</span>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: s.color,
                      lineHeight: 1.2,
                    }}
                  >
                    {formatNumber(s.total)}
                  </div>
                  <div
                    style={{
                      fontSize: "8px",
                      color: "var(--text-muted)",
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "4px",
                    }}
                  >
                    <span style={{ color: "#818cf8" }}>↑{formatNumber(s.input)}</span>
                    <span style={{ color: "#10b981" }}>↓{formatNumber(s.output)}</span>
                  </div>
                  <div
                    style={{
                      fontSize: "8px",
                      color: "var(--text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {s.tasks} {isZh ? "任务" : "tasks"} · {s.records} {isZh ? "记录" : "records"}
                  </div>
                </div>
              );
            })}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={subsystemChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="subsystemChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={SUBSYSTEM_META.find((m) => m.key === chartSubsystem)?.color || "#818cf8"} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={SUBSYSTEM_META.find((m) => m.key === chartSubsystem)?.color || "#818cf8"} stopOpacity={0.02} />
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
              <Area type="monotone" dataKey="total" stroke={SUBSYSTEM_META.find((m) => m.key === chartSubsystem)?.color || "#818cf8"} strokeWidth={1.5} fill="url(#subsystemChartGradient)" />
            </AreaChart>
          </ResponsiveContainer>
          {expandedSubsystem !== null && (
            <div
              style={{
                marginTop: "10px",
                background: "var(--bg-tertiary)",
                borderRadius: "6px",
                padding: "8px",
                borderLeft: `3px solid ${SUBSYSTEM_META.find((m) => m.key === expandedSubsystem)?.color || "var(--border-color)"}`,
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "6px",
                }}
              >
                {isZh ? "按模型细分" : "Per-model breakdown"} · {SUBSYSTEM_META.find((m) => m.key === expandedSubsystem)?.label}
              </div>
              {(subsystemModelBreakdown[expandedSubsystem] || []).length === 0 ? (
                <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>{isZh ? "暂无数据" : "No data"}</div>
              ) : (
                <div
                  style={{
                    maxHeight: `${MODEL_BREAKDOWN_MAX_HEIGHT}px`,
                    overflowY: "auto",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {/* Header row */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1.6fr 0.8fr 0.8fr 0.6fr",
                        fontSize: "8px",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        paddingBottom: "2px",
                        borderBottom: "1px solid var(--border-color)",
                        position: "sticky",
                        top: 0,
                        background: "var(--bg-tertiary)",
                      }}
                    >
                      <span>{isZh ? "Provider" : "Provider"}</span>
                      <span>{isZh ? "模型" : "Model"}</span>
                      <span style={{ textAlign: "right", color: "#818cf8" }}>{isZh ? "输入" : "Input"}</span>
                      <span style={{ textAlign: "right", color: "#10b981" }}>{isZh ? "输出" : "Output"}</span>
                      <span style={{ textAlign: "right" }}>{isZh ? "任务" : "Tasks"}</span>
                    </div>
                    {(subsystemModelBreakdown[expandedSubsystem] || []).map((row) => (
                      <div
                        key={row.key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1.6fr 0.8fr 0.8fr 0.6fr",
                          fontSize: "9px",
                          color: "var(--text-primary)",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.provider}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.model}</span>
                        <span style={{ textAlign: "right", color: "#818cf8" }}>{formatNumber(row.input)}</span>
                        <span style={{ textAlign: "right", color: "#10b981" }}>{formatNumber(row.output)}</span>
                        <span style={{ textAlign: "right", color: "var(--text-muted)" }}>{formatNumber(row.tasks)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Media Generation Statistics Section (per-modality statistics.json) */}
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
                <SubsystemImageIcon />
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                {isZh ? "媒体生成统计" : "Media Generation Statistics"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "9px", color: "var(--text-muted)" }}>
              <span>Token: {formatNumber(mediaTotals.tokens)}</span>
              <span>
                {isZh ? "任务" : "Tasks"}: {formatNumber(mediaTotals.tasks)}
              </span>
              <span>
                {isZh ? "记录" : "Records"}: {formatNumber(mediaTotals.records)}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* Media cards: show BOTH tokens and the modality-specific usage. */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {mediaList.map((m) => {
                const isExpanded = expandedMedia === m.key;
                return (
                  <div
                    key={m.key}
                    style={{
                      background: "var(--bg-tertiary)",
                      borderRadius: "6px",
                      padding: "8px",
                      borderLeft: `3px solid ${m.color}`,
                      cursor: "pointer",
                      outline: isExpanded ? `1px solid ${m.color}` : "none",
                    }}
                    onClick={() => setExpandedMedia(isExpanded ? null : (m.key as "image" | "audio" | "video"))}
                    onMouseEnter={(e) =>
                      showTooltip(
                        `${m.label}\nToken: ${formatNumber(m.tokens)}\n${isZh ? "用量" : "Usage"}: ${m.key === "image" ? `${m.usage} ${m.unit}` : formatDuration(m.usage)}\n${isZh ? "任务" : "Tasks"}: ${m.tasks}\n${isZh ? "记录" : "Records"}: ${m.records}\n${isZh ? "点击查看按模型细分" : "Click to view per-model breakdown"}`,
                        e.currentTarget,
                      )
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ color: m.color }}>{m.icon}</span>
                      <span style={{ flex: 1 }}>{m.label}</span>
                      <span style={{ fontSize: "8px", color: "var(--text-muted)" }}>{isExpanded ? "▾" : "▸"}</span>
                    </div>
                    {/* Token line */}
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        lineHeight: 1.2,
                      }}
                    >
                      {formatNumber(m.tokens)}
                      <span style={{ fontSize: "8px", color: "var(--text-muted)", marginLeft: "3px" }}>Token</span>
                    </div>
                    {/* Modality usage line: 张数 for image, 时长 for audio/video */}
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: m.color,
                        lineHeight: 1.3,
                        marginTop: "2px",
                      }}
                    >
                      {m.key === "image" ? `${formatNumber(m.usage)} ${m.unit}` : formatDuration(m.usage)}
                    </div>
                    <div
                      style={{
                        fontSize: "8px",
                        color: "var(--text-muted)",
                        marginTop: "2px",
                      }}
                    >
                      {m.tasks} {isZh ? "任务" : "tasks"} · {m.records} {isZh ? "记录" : "records"}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Three separate usage pies: image (count), audio (seconds), video (seconds). */}
            <div style={{ width: 260, display: "flex", gap: "8px", alignItems: "flex-start" }}>
              {/* Image count pie */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: "9px", color: "var(--text-secondary)", marginBottom: "4px" }}>{isZh ? "图片用量" : "Image Usage"}</div>
                {imagePieData.length > 0 ? (
                  <ResponsiveContainer width={70} height={70}>
                    <PieChart>
                      <Pie data={imagePieData} cx="50%" cy="50%" innerRadius={16} outerRadius={30} dataKey="value" stroke="none">
                        {imagePieData.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ fontSize: "9px", color: "var(--text-muted)", padding: "20px 0" }}>{isZh ? "暂无" : "N/A"}</div>
                )}
              </div>
              {/* Audio duration pie */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: "9px", color: "var(--text-secondary)", marginBottom: "4px" }}>{isZh ? "音频时长" : "Audio Duration"}</div>
                {audioPieData.length > 0 ? (
                  <ResponsiveContainer width={70} height={70}>
                    <PieChart>
                      <Pie data={audioPieData} cx="50%" cy="50%" innerRadius={16} outerRadius={30} dataKey="value" stroke="none">
                        {audioPieData.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ fontSize: "9px", color: "var(--text-muted)", padding: "20px 0" }}>{isZh ? "暂无" : "N/A"}</div>
                )}
              </div>
              {/* Video duration pie */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: "9px", color: "var(--text-secondary)", marginBottom: "4px" }}>{isZh ? "视频时长" : "Video Duration"}</div>
                {videoPieData.length > 0 ? (
                  <ResponsiveContainer width={70} height={70}>
                    <PieChart>
                      <Pie data={videoPieData} cx="50%" cy="50%" innerRadius={16} outerRadius={30} dataKey="value" stroke="none">
                        {videoPieData.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ fontSize: "9px", color: "var(--text-muted)", padding: "20px 0" }}>{isZh ? "暂无" : "N/A"}</div>
                )}
              </div>
            </div>
          </div>
          {/* Expanded per-model breakdown for the selected media modality. */}
          {expandedMedia !== null && (
            <div
              style={{
                marginTop: "10px",
                background: "var(--bg-tertiary)",
                borderRadius: "6px",
                padding: "8px",
                borderLeft: `3px solid ${mediaList.find((m) => m.key === expandedMedia)?.color || "var(--border-color)"}`,
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "6px",
                }}
              >
                {isZh ? "按模型细分" : "Per-model breakdown"} · {mediaList.find((m) => m.key === expandedMedia)?.label}
              </div>
              {(mediaBreakdownMap[expandedMedia] || []).length === 0 ? (
                <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>{isZh ? "暂无数据" : "No data"}</div>
              ) : (
                <div
                  style={{
                    maxHeight: `${MODEL_BREAKDOWN_MAX_HEIGHT}px`,
                    overflowY: "auto",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {/* Header row */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1.6fr 0.8fr 1fr 0.6fr",
                        fontSize: "8px",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        paddingBottom: "2px",
                        borderBottom: "1px solid var(--border-color)",
                        position: "sticky",
                        top: 0,
                        background: "var(--bg-tertiary)",
                      }}
                    >
                      <span>Provider</span>
                      <span>{isZh ? "模型" : "Model"}</span>
                      <span style={{ textAlign: "right" }}>Token</span>
                      <span style={{ textAlign: "right" }}>{isZh ? "用量" : "Usage"}</span>
                      <span style={{ textAlign: "right" }}>{isZh ? "任务" : "Tasks"}</span>
                    </div>
                    {(mediaBreakdownMap[expandedMedia] || []).map((row) => (
                      <div
                        key={row.key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1.6fr 0.8fr 1fr 0.6fr",
                          fontSize: "9px",
                          color: "var(--text-primary)",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.provider}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.model}</span>
                        <span style={{ textAlign: "right" }}>{formatNumber(row.tokens)}</span>
                        <span style={{ textAlign: "right", color: mediaList.find((m) => m.key === expandedMedia)?.color }}>{expandedMedia === "image" ? `${formatNumber(row.usage)} ${isZh ? "张" : "imgs"}` : formatDuration(row.usage)}</span>
                        <span style={{ textAlign: "right", color: "var(--text-muted)" }}>{formatNumber(row.tasks)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default UserProfile;
