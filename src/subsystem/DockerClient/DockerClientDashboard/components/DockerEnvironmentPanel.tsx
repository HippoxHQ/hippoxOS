import React, { useMemo } from "react";
import { CheckCircle2, RefreshCw, HardDrive, Boxes, Layers3, Activity, Cpu, Server, Network } from "lucide-react";
/**
 * Environment info data model.
 */
export interface DockerEnvironmentInfo {
  engineType: string;
  engineVersion: string;
  apiVersion: string;
  os: string;
  arch: string;
  kernelVersion: string;
  storageDriver: string;
  loggingDriver: string;
  cgroupVersion: string;
  dockerRootDir: string;
  socketPath: string;
  buildkitEnabled: boolean;
  composeEnabled: boolean;
  ncpu: number;
  memTotal: number;
  memUsed: number;
  diskUsage: {
    images: number;
    containers: number;
    volumes: number;
    buildCache: number;
    total: number;
  };
  counts: {
    containers: number;
    running: number;
    paused: number;
    stopped: number;
    images: number;
    volumes: number;
  };
  goVersion?: string;
  gitCommit?: string;
  buildTime?: string;
  defaultRuntime?: string;
  runtimes?: string[];
  securityOptions?: string[];
  usernsRemap?: boolean;
  rootless?: boolean;
  liveRestoreEnabled?: boolean;
  neventsListener?: number;
  nfd?: number;
  ngoroutines?: number;
  registryMirrors?: string[];
  insecureRegistries?: string[];
  httpProxy?: string;
  httpsProxy?: string;
  noProxy?: string;
  uptimeSeconds?: number;
  swarmLocalNodeState?: string;
  swarmNodes?: number;
  swarmManagers?: number;
  buildkitVersion?: string;
}
interface DockerEnvironmentPanelProps {
  i18n?: "en" | "zh-cn";
  info: DockerEnvironmentInfo;
  onRefresh?: () => void;
}
/** Format a byte count into a human-readable string. */
const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};
/** Format bytes using binary (GiB) semantics. */
const formatGiB = (bytes: number): string => {
  if (bytes <= 0) return "0 GiB";
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GiB`;
};
const formatUptime = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return "-";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};
const CARD_BORDER = "var(--border-color, #30363d)";
const ROW_DIVIDER = "rgba(255,255,255,0.06)";
const FlatCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      border: `1px solid ${CARD_BORDER}`,
      borderRadius: 6,
      background: "transparent",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);
const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}> = ({ icon, label, value, sub, accent }) => (
  <FlatCard style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", color: accent }}>{icon}</span>
      <span style={{ fontSize: 11, color: "var(--text-secondary, #8b949e)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary, #e6edf3)", lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--text-muted, #6e7681)" }}>{sub}</div>}
  </FlatCard>
);
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "8px 0",
      borderBottom: `1px solid ${ROW_DIVIDER}`,
      minHeight: 34,
    }}
  >
    <span style={{ fontSize: 12, color: "var(--text-secondary, #8b949e)", flexShrink: 0 }}>{label}</span>
    <span
      style={{
        fontSize: 12,
        color: "var(--text-primary, #e6edf3)",
        fontFamily: "monospace",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        textAlign: "right",
        minWidth: 0,
      }}
      title={typeof value === "string" ? value : undefined}
    >
      {value}
    </span>
  </div>
);
const CompactList: React.FC<{
  rows: Array<{ key: string; label: string; value: React.ReactNode }>;
}> = ({ rows }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    {rows.map((row) => (
      <div
        key={row.key}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "6px 0",
          borderBottom: `1px solid ${ROW_DIVIDER}`,
          minHeight: 30,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-secondary, #8b949e)", flexShrink: 0 }}>{row.label}</span>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-primary, #e6edf3)",
            fontFamily: "monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "right",
            minWidth: 0,
          }}
          title={typeof row.value === "string" ? row.value : undefined}
        >
          {row.value}
        </span>
      </div>
    ))}
  </div>
);
const PillList: React.FC<{
  items: string[];
  color?: string;
  emptyText: string;
}> = ({ items, color = "#58a6ff", emptyText }) => {
  if (!items || items.length === 0) {
    return <div style={{ fontSize: 12, color: "var(--text-muted, #6e7681)", padding: "6px 0" }}>{emptyText}</div>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 0" }}>
      {items.map((item, idx) => (
        <span
          key={`${item}-${idx}`}
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            color,
            background: `${color}14`,
            border: `1px solid ${color}33`,
            borderRadius: 4,
            padding: "2px 8px",
            whiteSpace: "nowrap",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
};
export const DockerEnvironmentPanel: React.FC<DockerEnvironmentPanelProps> = ({ i18n = "en", info, onRefresh }) => {
  const isZh = i18n === "zh-cn";
  const diskSlices = useMemo(() => {
    const entries: Array<{ key: string; label: string; value: number; color: string }> = [
      { key: "images", label: isZh ? "镜像" : "Images", value: info.diskUsage.images, color: "#58a6ff" },
      { key: "containers", label: isZh ? "容器" : "Containers", value: info.diskUsage.containers, color: "#22c55e" },
      { key: "volumes", label: isZh ? "数据卷" : "Volumes", value: info.diskUsage.volumes, color: "#f59e0b" },
      { key: "buildCache", label: isZh ? "构建缓存" : "Build Cache", value: info.diskUsage.buildCache, color: "#a855f7" },
    ];
    const total = entries.reduce((sum, e) => sum + e.value, 0) || 1;
    return entries.map((e) => ({ ...e, pct: e.value / total }));
  }, [info.diskUsage, isZh]);
  const donutRadius = 44;
  const donutStroke = 14;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutAccumulated = 0;
  const donutArcs = diskSlices.map((slice) => {
    const start = donutAccumulated;
    const length = slice.pct * donutCircumference;
    donutAccumulated += length;
    return { ...slice, start, length };
  });
  const memPct = info.memTotal > 0 ? Math.min(1, info.memUsed / info.memTotal) : 0;
  const memColor = memPct > 0.85 ? "#ef4444" : memPct > 0.65 ? "#f59e0b" : "#58a6ff";
  const containerTotal = Math.max(1, info.counts.containers);
  const runningPct = (info.counts.running / containerTotal) * 100;
  const pausedPct = (info.counts.paused / containerTotal) * 100;
  const stoppedPct = (info.counts.stopped / containerTotal) * 100;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary, #161b22)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          borderBottom: `1px solid ${CARD_BORDER}`,
          flexShrink: 0,
          minHeight: 52,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{isZh ? "Docker 环境" : "Docker Environment"}</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "#22c55e",
              padding: "2px 8px",
              border: "1px solid rgba(34,197,94,0.35)",
              borderRadius: 4,
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={12} />
            {isZh ? "已连接" : "Connected"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {onRefresh && (
            <button
              onClick={onRefresh}
              title={isZh ? "刷新" : "Refresh"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${CARD_BORDER}`,
                background: "transparent",
                color: "var(--text-secondary, #8b949e)",
                cursor: "pointer",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg, #21262d)";
                e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
              }}
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <FlatCard style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, fontSize: 12 }}>
            <Server size={14} color="#58a6ff" />
            <span style={{ fontWeight: 700, color: "var(--text-primary, #e6edf3)" }}>
              {info.engineType} {info.engineVersion}
            </span>
            <span style={{ color: "var(--text-secondary, #8b949e)", fontFamily: "monospace" }}>API {info.apiVersion}</span>
            <span style={{ width: 1, height: 12, background: CARD_BORDER }} />
            <span style={{ color: "var(--text-secondary, #8b949e)" }}>
              {info.os}/{info.arch}
            </span>
            <span style={{ color: "var(--text-secondary, #8b949e)", fontFamily: "monospace" }}>kernel {info.kernelVersion}</span>
            <span style={{ color: "var(--text-secondary, #8b949e)", fontFamily: "monospace" }}>{info.storageDriver}</span>
          </div>
        </FlatCard>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <KpiCard icon={<Boxes size={14} />} label={isZh ? "容器" : "Containers"} value={String(info.counts.containers)} sub={`${info.counts.running} ${isZh ? "运行" : "running"} · ${info.counts.stopped} ${isZh ? "停止" : "stopped"}`} accent="#22c55e" />
          <KpiCard icon={<HardDrive size={14} />} label={isZh ? "镜像" : "Images"} value={String(info.counts.images)} sub={`${formatBytes(info.diskUsage.images)} ${isZh ? "占用" : "used"}`} accent="#58a6ff" />
          <KpiCard icon={<Layers3 size={14} />} label={isZh ? "数据卷" : "Volumes"} value={String(info.counts.volumes)} sub={`${formatBytes(info.diskUsage.volumes)} ${isZh ? "占用" : "used"}`} accent="#f59e0b" />
          <KpiCard icon={<Activity size={14} />} label={isZh ? "构建缓存" : "Build Cache"} value={formatBytes(info.diskUsage.buildCache)} sub={`${isZh ? "总计" : "Total"} ${formatBytes(info.diskUsage.total)}`} accent="#a855f7" />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
            gap: 12,
          }}
        >
          <FlatCard style={{ padding: 14, display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
              <circle cx="60" cy="60" r={donutRadius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={donutStroke} />
              {donutArcs.map((arc) => (
                <circle key={arc.key} cx="60" cy="60" r={donutRadius} fill="none" stroke={arc.color} strokeWidth={donutStroke} strokeDasharray={`${arc.length} ${donutCircumference}`} strokeDashoffset={-arc.start} strokeLinecap="butt" transform="rotate(-90 60 60)" />
              ))}
              <text x="60" y="56" textAnchor="middle" fontSize="10" fill="var(--text-secondary, #8b949e)">
                {isZh ? "总计" : "Total"}
              </text>
              <text x="60" y="74" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text-primary, #e6edf3)">
                {formatGiB(info.diskUsage.total)}
              </text>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #e6edf3)" }}>{isZh ? "磁盘占用分布" : "Disk Usage Distribution"}</div>
              {diskSlices.map((slice) => (
                <div key={slice.key} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: slice.color, flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary, #8b949e)",
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {slice.label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-primary, #e6edf3)", fontFamily: "monospace" }}>{formatBytes(slice.value)}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted, #6e7681)", width: 38, textAlign: "right" }}>{(slice.pct * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </FlatCard>
          {/* Memory + CPU card */}
          <FlatCard style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #e6edf3)" }}>{isZh ? "内存使用" : "Memory Usage"}</span>
              <span style={{ fontSize: 12, color: "var(--text-secondary, #8b949e)", fontFamily: "monospace" }}>{(memPct * 100).toFixed(0)}%</span>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 4,
                background: "rgba(255,255,255,0.05)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${memPct * 100}%`,
                  height: "100%",
                  background: memColor,
                  transition: "width 0.3s, background 0.3s",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted, #6e7681)" }}>
              <span>
                {formatGiB(info.memUsed)} {isZh ? "已用" : "used"}
              </span>
              <span>
                {formatGiB(info.memTotal)} {isZh ? "总计" : "total"}
              </span>
            </div>
            <div style={{ height: 1, background: ROW_DIVIDER, margin: "2px 0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={14} color="#58a6ff" />
              <span style={{ fontSize: 12, color: "var(--text-primary, #e6edf3)" }}>
                {info.ncpu} {isZh ? "CPU 核心" : "CPU cores"}
              </span>
            </div>
          </FlatCard>
        </div>
        <FlatCard style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #e6edf3)" }}>{isZh ? "容器状态分布" : "Container Status Breakdown"}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted, #6e7681)" }}>
              {info.counts.containers} {isZh ? "个容器" : "containers"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 10,
              borderRadius: 5,
              overflow: "hidden",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ width: `${runningPct}%`, background: "#22c55e" }} />
            <div style={{ width: `${pausedPct}%`, background: "#f59e0b" }} />
            <div style={{ width: `${stoppedPct}%`, background: "#6e7681" }} />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#22c55e" }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary, #8b949e)" }}>
                {isZh ? "运行中" : "Running"} · {info.counts.running}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#f59e0b" }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary, #8b949e)" }}>
                {isZh ? "已暂停" : "Paused"} · {info.counts.paused}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#6e7681" }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary, #8b949e)" }}>
                {isZh ? "已停止" : "Stopped"} · {info.counts.stopped}
              </span>
            </div>
          </div>
        </FlatCard>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 12,
          }}
        >
          <FlatCard style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Server size={14} color="#58a6ff" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #e6edf3)" }}>{isZh ? "引擎配置" : "Engine Configuration"}</span>
            </div>
            <InfoRow label={isZh ? "存储驱动" : "Storage driver"} value={info.storageDriver} />
            <InfoRow label={isZh ? "日志驱动" : "Logging driver"} value={info.loggingDriver} />
            <InfoRow label={isZh ? "Cgroup 版本" : "Cgroup version"} value={info.cgroupVersion} />
            <InfoRow label={isZh ? "Docker 根目录" : "Docker root dir"} value={info.dockerRootDir} />
            <InfoRow label="Socket" value={info.socketPath} />
          </FlatCard>
          <FlatCard style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Network size={14} color="#22c55e" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #e6edf3)" }}>{isZh ? "运行时能力" : "Runtime Capabilities"}</span>
            </div>
            <InfoRow label="BuildKit" value={info.buildkitEnabled ? <span style={{ color: "#22c55e" }}>{isZh ? "已启用" : "Enabled"}</span> : <span style={{ color: "#ef4444" }}>{isZh ? "未启用" : "Disabled"}</span>} />
            <InfoRow label="Compose" value={info.composeEnabled ? <span style={{ color: "#22c55e" }}>{isZh ? "已启用" : "Enabled"}</span> : <span style={{ color: "#f59e0b" }}>{isZh ? "不可用" : "Unavailable"}</span>} />
            <InfoRow label="OS / Arch" value={`${info.os}/${info.arch}`} />
            <InfoRow label={isZh ? "内核版本" : "Kernel"} value={info.kernelVersion} />
            <InfoRow label="API" value={info.apiVersion} />
          </FlatCard>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 12,
          }}
        >
          <FlatCard style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <HardDrive size={14} color="#a855f7" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #e6edf3)" }}>{isZh ? "构建与安全" : "Build & Security"}</span>
            </div>
            <CompactList
              rows={[
                { key: "go", label: isZh ? "Go 版本" : "Go version", value: info.goVersion || "-" },
                { key: "git", label: isZh ? "Git 提交" : "Git commit", value: info.gitCommit || "-" },
                { key: "built", label: isZh ? "构建时间" : "Build time", value: info.buildTime || "-" },
                { key: "runtime", label: isZh ? "默认运行时" : "Default runtime", value: info.defaultRuntime || "-" },
                {
                  key: "userns",
                  label: "User Namespace",
                  value: info.usernsRemap ? (isZh ? "已启用" : "Enabled") : isZh ? "未启用" : "Disabled",
                },
                { key: "rootless", label: "Rootless", value: info.rootless ? (isZh ? "是" : "Yes") : isZh ? "否" : "No" },
                {
                  key: "livestore",
                  label: "Live Restore",
                  value: info.liveRestoreEnabled ? (isZh ? "已启用" : "Enabled") : isZh ? "未启用" : "Disabled",
                },
              ]}
            />
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: "var(--text-tertiary, #6e7681)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {isZh ? "可用运行时" : "Available Runtimes"}
            </div>
            <PillList items={info.runtimes ?? []} color="#22c55e" emptyText={isZh ? "无" : "None"} />
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "var(--text-tertiary, #6e7681)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {isZh ? "安全选项" : "Security Options"}
            </div>
            <PillList items={info.securityOptions ?? []} color="#f59e0b" emptyText={isZh ? "无" : "None"} />
          </FlatCard>
          <FlatCard style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Network size={14} color="#22c55e" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #e6edf3)" }}>{isZh ? "网络与守护进程" : "Network & Daemon"}</span>
            </div>
            <CompactList
              rows={[
                { key: "uptime", label: isZh ? "运行时长" : "Uptime", value: formatUptime(info.uptimeSeconds) },
                {
                  key: "events",
                  label: isZh ? "事件监听器" : "Events listeners",
                  value: String(info.neventsListener ?? "-"),
                },
                { key: "nfd", label: "Open FDs", value: String(info.nfd ?? "-") },
                { key: "ngoroutines", label: "Goroutines", value: String(info.ngoroutines ?? "-") },
                {
                  key: "swarm",
                  label: "Swarm",
                  value: info.swarmLocalNodeState || (isZh ? "未启用" : "inactive"),
                },
                {
                  key: "swarmNodes",
                  label: isZh ? "Swarm 节点" : "Swarm nodes",
                  value: info.swarmNodes != null ? String(info.swarmNodes) : "-",
                },
                {
                  key: "swarmManagers",
                  label: isZh ? "Swarm 管理器" : "Swarm managers",
                  value: info.swarmManagers != null ? String(info.swarmManagers) : "-",
                },
                {
                  key: "buildkitVer",
                  label: "BuildKit",
                  value: info.buildkitVersion || (info.buildkitEnabled ? (isZh ? "已启用" : "Enabled") : "-"),
                },
              ]}
            />
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: "var(--text-tertiary, #6e7681)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {isZh ? "Registry 镜像" : "Registry Mirrors"}
            </div>
            <PillList items={info.registryMirrors ?? []} color="#58a6ff" emptyText={isZh ? "无" : "None"} />
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "var(--text-tertiary, #6e7681)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {isZh ? "不安全的 Registry" : "Insecure Registries"}
            </div>
            <PillList items={info.insecureRegistries ?? []} color="#ef4444" emptyText={isZh ? "无" : "None"} />
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: "var(--text-tertiary, #6e7681)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {isZh ? "代理" : "Proxy"}
            </div>
            <CompactList
              rows={[
                { key: "http", label: "HTTP", value: info.httpProxy || "-" },
                { key: "https", label: "HTTPS", value: info.httpsProxy || "-" },
                { key: "no", label: "NO_PROXY", value: info.noProxy || "-" },
              ]}
            />
          </FlatCard>
        </div>
      </div>
    </div>
  );
};
export default DockerEnvironmentPanel;
