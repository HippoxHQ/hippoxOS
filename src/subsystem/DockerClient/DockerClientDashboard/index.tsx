import React, { useState, useCallback, useEffect } from "react";
import DockerClientSidebar, { DockerClientSidebarView } from "./components/DockerClientSidebar";
import DockerListPanel, { DockerColumn } from "./components/DockerListPanel";
import DockerEnvironmentPanel, { DockerEnvironmentInfo } from "./components/DockerEnvironmentPanel";
import DockerContainerDetail from "./components/DockerContainerDetail";
import dockerClientCommands, { DockerEnvironment } from "../../../command/DockerClient/General";
import { showToast, ToastType } from "../../../components/Toast";
import { translateContainerState } from "./components/types";
import { Plus, Trash2, X } from "lucide-react";
import { DOCKER_CLIENT_WINDOW_EVENTS } from "../DockerClientWindowEventManager";
interface DockerClientDashboardProps {
  theme?: "light" | "dark";
  i18n?: "en" | "zh-cn";
  onToggleHistory?: () => void;
  isHistoryOpen?: boolean;
}
/**
 * Row model for the containers list.
 */
interface ContainerRow {
  id: string;
  name: string;
  containerId: string;
  image: string;
  port: string;
  cpu: string;
  lastStarted: string;
  /** Raw container state, e.g. "running" / "exited" / "paused". */
  state: string;
  /** Human-readable status line, e.g. "Up 2 hours". */
  status: string;
  /** Optional status used for colored cells */
  statusColor?: string;
}
/**
 * Row model for the images list.
 */
interface ImageRow {
  id: string;
  name: string;
  containerId: string;
  image: string;
  port: string;
  cpu: string;
  lastStarted: string;
  statusColor?: string;
}
/**
 * Row model for the volumes list.
 */
interface VolumeRow {
  id: string;
  name: string;
  containerId: string;
  image: string;
  port: string;
  cpu: string;
  lastStarted: string;
  statusColor?: string;
}
const EMPTY_ENVIRONMENT: DockerEnvironmentInfo = {
  engineType: "",
  engineVersion: "",
  apiVersion: "",
  os: "",
  arch: "",
  kernelVersion: "",
  storageDriver: "",
  loggingDriver: "",
  cgroupVersion: "",
  dockerRootDir: "",
  socketPath: "",
  buildkitEnabled: false,
  composeEnabled: false,
  ncpu: 0,
  memTotal: 0,
  memUsed: 0,
  diskUsage: {
    images: 0,
    containers: 0,
    volumes: 0,
    buildCache: 0,
    total: 0,
  },
  counts: {
    containers: 0,
    running: 0,
    paused: 0,
    stopped: 0,
    images: 0,
    volumes: 0,
  },
};
const toEnvironmentInfo = (env: DockerEnvironment): DockerEnvironmentInfo => ({
  engineType: env.engineType,
  engineVersion: env.engineVersion,
  apiVersion: env.apiVersion,
  os: env.os,
  arch: env.arch,
  kernelVersion: env.kernelVersion,
  storageDriver: env.storageDriver,
  loggingDriver: env.loggingDriver,
  cgroupVersion: env.cgroupVersion,
  dockerRootDir: env.dockerRootDir,
  socketPath: env.socketPath,
  buildkitEnabled: env.buildkitEnabled,
  composeEnabled: env.composeEnabled,
  ncpu: env.ncpu,
  memTotal: env.memTotal,
  memUsed: env.memUsed,
  diskUsage: {
    images: env.diskUsage.images,
    containers: env.diskUsage.containers,
    volumes: env.diskUsage.volumes,
    buildCache: env.diskUsage.buildCache,
    total: env.diskUsage.total,
  },
  counts: {
    containers: env.counts.containers,
    running: env.counts.running,
    paused: env.counts.paused,
    stopped: env.counts.stopped,
    images: env.counts.images,
    volumes: env.counts.volumes,
  },
  goVersion: env.goVersion,
  gitCommit: env.gitCommit,
  buildTime: env.buildTime,
  defaultRuntime: env.defaultRuntime,
  runtimes: env.runtimes,
  securityOptions: env.securityOptions,
});
/**
 * Compact inline detail block rendered inside an expanded container row.
 */
const InlineContainerDetail: React.FC<{ row: ContainerRow; isZh: boolean }> = ({ row, isZh }) => {
  const rawState = row.state && row.state.trim().length > 0 ? row.state : row.status || "-";
  const stateLabel = translateContainerState(rawState, isZh);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "6px 24px",
        fontSize: 12,
        color: "var(--text-secondary, #8b949e)",
      }}
    >
      <div>
        <span style={{ color: "var(--text-muted, #6e7681)" }}>{isZh ? "容器 ID：" : "Container ID: "}</span>
        <span style={{ fontFamily: "monospace", color: "var(--text-primary, #e6edf3)" }}>{row.containerId}</span>
      </div>
      <div>
        <span style={{ color: "var(--text-muted, #6e7681)" }}>{isZh ? "镜像：" : "Image: "}</span>
        <span style={{ fontFamily: "monospace", color: "var(--text-primary, #e6edf3)" }}>{row.image}</span>
      </div>
      <div>
        <span style={{ color: "var(--text-muted, #6e7681)" }}>{isZh ? "端口：" : "Ports: "}</span>
        <span style={{ fontFamily: "monospace", color: "var(--text-primary, #e6edf3)" }}>{row.port || "-"}</span>
      </div>
      <div>
        <span style={{ color: "var(--text-muted, #6e7681)" }}>{isZh ? "最近启动：" : "Last started: "}</span>
        <span style={{ color: "var(--text-primary, #e6edf3)" }}>{row.lastStarted || "-"}</span>
      </div>
      <div>
        <span style={{ color: "var(--text-muted, #6e7681)" }}>CPU: </span>
        <span style={{ color: "var(--text-primary, #e6edf3)" }}>{row.cpu || "-"}</span>
      </div>
      <div>
        <span style={{ color: "var(--text-muted, #6e7681)" }}>{isZh ? "状态：" : "Status: "}</span>
        {/* Show the localized state text, colored by the status color. */}
        <span style={{ color: row.statusColor ?? "var(--text-primary, #e6edf3)" }}>{stateLabel}</span>
      </div>
    </div>
  );
};
/** A single port mapping row in the run dialog. */
interface PortRowState {
  id: string;
  host: string;
  container: string;
}
/** A single volume mapping row in the run dialog. */
interface VolumeRowState {
  id: string;
  hostPath: string;
  containerPath: string;
}
/** A single environment variable row in the run dialog. */
interface EnvRowState {
  id: string;
  key: string;
  value: string;
}
const RunImageDialog: React.FC<{
  imageName: string;
  isZh: boolean;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: { containerName: string; ports: Array<{ host: string; container: string }>; volumes: Array<{ hostPath: string; containerPath: string }>; env: Array<{ key: string; value: string }> }) => void;
}> = ({ imageName, isZh, busy, onCancel, onSubmit }) => {
  const [containerName, setContainerName] = useState<string>("");
  const [ports, setPorts] = useState<PortRowState[]>([{ id: `p-${Date.now()}`, host: "", container: "" }]);
  const [volumes, setVolumes] = useState<VolumeRowState[]>([{ id: `v-${Date.now()}`, hostPath: "", containerPath: "" }]);
  const [envRows, setEnvRows] = useState<EnvRowState[]>([{ id: `e-${Date.now()}`, key: "", value: "" }]);
  // Simple row-id generator to keep React keys stable while editing.
  const nextId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: "var(--bg-primary, #0d1117)",
    border: "1px solid var(--border-color, #30363d)",
    borderRadius: 5,
    color: "var(--text-primary, #e6edf3)",
    fontSize: 12,
    padding: "6px 8px",
    outline: "none",
    boxSizing: "border-box",
  };
  const rowWrapStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  };
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-secondary, #8b949e)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-secondary, #8b949e)",
    marginBottom: 4,
    display: "block",
  };
  const iconButtonStyle: React.CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: 5,
    border: "1px solid var(--border-color, #30363d)",
    background: "var(--bg-tertiary, #21262d)",
    color: "var(--text-secondary, #8b949e)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
  };
  const handleSubmit = () => {
    const cleanedPorts = ports.map((p) => ({ host: p.host.trim(), container: p.container.trim() })).filter((p) => p.host !== "" && p.container !== "");
    const cleanedVolumes = volumes.map((v) => ({ hostPath: v.hostPath.trim(), containerPath: v.containerPath.trim() })).filter((v) => v.hostPath !== "" && v.containerPath !== "");
    const cleanedEnv = envRows.map((e) => ({ key: e.key.trim(), value: e.value })).filter((e) => e.key !== "");
    onSubmit({
      containerName: containerName.trim(),
      ports: cleanedPorts,
      volumes: cleanedVolumes,
      env: cleanedEnv,
    });
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--bg-secondary, #161b22)",
          border: "1px solid var(--border-color, #30363d)",
          borderRadius: 8,
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          padding: 16,
          boxSizing: "border-box",
          color: "var(--text-primary, #e6edf3)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{isZh ? "运行新容器" : "Run a new container"}</div>
          <button
            onClick={onCancel}
            disabled={busy}
            title={isZh ? "关闭" : "Close"}
            style={{
              ...iconButtonStyle,
              opacity: busy ? 0.5 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted, #6e7681)", fontFamily: "monospace", marginBottom: 8 }}>{imageName}</div>
        {/* Container name */}
        <label style={labelStyle}>{isZh ? "容器名（可选）" : "Container name (optional)"}</label>
        <input type="text" value={containerName} onChange={(e) => setContainerName(e.target.value)} placeholder={isZh ? "留空则自动生成" : "Leave empty to auto-generate"} style={{ ...inputStyle, width: "100%" }} disabled={busy} />
        {/* Port mappings */}
        <div style={sectionTitleStyle}>{isZh ? "端口" : "Ports"}</div>
        {ports.map((row) => (
          <div key={row.id} style={rowWrapStyle}>
            <input type="text" value={row.host} onChange={(e) => setPorts((prev) => prev.map((p) => (p.id === row.id ? { ...p, host: e.target.value } : p)))} placeholder={isZh ? "主机端口" : "Host port"} style={inputStyle} disabled={busy} />
            <span style={{ color: "var(--text-muted, #6e7681)" }}>-</span>
            <input type="text" value={row.container} onChange={(e) => setPorts((prev) => prev.map((p) => (p.id === row.id ? { ...p, container: e.target.value } : p)))} placeholder={isZh ? "容器端口" : "Container port"} style={inputStyle} disabled={busy} />
            <button
              title={isZh ? "删除" : "Remove"}
              onClick={() => setPorts((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== row.id)))}
              disabled={busy || ports.length <= 1}
              style={{ ...iconButtonStyle, opacity: busy || ports.length <= 1 ? 0.4 : 1, cursor: busy || ports.length <= 1 ? "not-allowed" : "pointer" }}
            >
              <Trash2 size={13} />
            </button>
            <button title={isZh ? "添加端口" : "Add port"} onClick={() => setPorts((prev) => [...prev, { id: nextId("p"), host: "", container: "" }])} disabled={busy} style={{ ...iconButtonStyle, opacity: busy ? 0.5 : 1 }}>
              <Plus size={13} />
            </button>
          </div>
        ))}
        {/* Volume mappings */}
        <div style={sectionTitleStyle}>{isZh ? "数据卷" : "Volumes"}</div>
        {volumes.map((row) => (
          <div key={row.id} style={rowWrapStyle}>
            <input type="text" value={row.hostPath} onChange={(e) => setVolumes((prev) => prev.map((v) => (v.id === row.id ? { ...v, hostPath: e.target.value } : v)))} placeholder={isZh ? "主机路径" : "Host path"} style={inputStyle} disabled={busy} />
            <span style={{ color: "var(--text-muted, #6e7681)" }}>-</span>
            <input type="text" value={row.containerPath} onChange={(e) => setVolumes((prev) => prev.map((v) => (v.id === row.id ? { ...v, containerPath: e.target.value } : v)))} placeholder={isZh ? "容器路径" : "Container path"} style={inputStyle} disabled={busy} />
            <button
              title={isZh ? "删除" : "Remove"}
              onClick={() => setVolumes((prev) => (prev.length <= 1 ? prev : prev.filter((v) => v.id !== row.id)))}
              disabled={busy || volumes.length <= 1}
              style={{ ...iconButtonStyle, opacity: busy || volumes.length <= 1 ? 0.4 : 1, cursor: busy || volumes.length <= 1 ? "not-allowed" : "pointer" }}
            >
              <Trash2 size={13} />
            </button>
            <button title={isZh ? "添加数据卷" : "Add volume"} onClick={() => setVolumes((prev) => [...prev, { id: nextId("v"), hostPath: "", containerPath: "" }])} disabled={busy} style={{ ...iconButtonStyle, opacity: busy ? 0.5 : 1 }}>
              <Plus size={13} />
            </button>
          </div>
        ))}
        {/* Environment variables */}
        <div style={sectionTitleStyle}>{isZh ? "环境变量" : "Environment variables"}</div>
        {envRows.map((row) => (
          <div key={row.id} style={rowWrapStyle}>
            <input type="text" value={row.key} onChange={(e) => setEnvRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r)))} placeholder={isZh ? "键" : "Key"} style={inputStyle} disabled={busy} />
            <span style={{ color: "var(--text-muted, #6e7681)" }}>-</span>
            <input type="text" value={row.value} onChange={(e) => setEnvRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)))} placeholder={isZh ? "值" : "Value"} style={inputStyle} disabled={busy} />
            <button
              title={isZh ? "删除" : "Remove"}
              onClick={() => setEnvRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== row.id)))}
              disabled={busy || envRows.length <= 1}
              style={{ ...iconButtonStyle, opacity: busy || envRows.length <= 1 ? 0.4 : 1, cursor: busy || envRows.length <= 1 ? "not-allowed" : "pointer" }}
            >
              <Trash2 size={13} />
            </button>
            <button title={isZh ? "添加环境变量" : "Add environment variable"} onClick={() => setEnvRows((prev) => [...prev, { id: nextId("e"), key: "", value: "" }])} disabled={busy} style={{ ...iconButtonStyle, opacity: busy ? 0.5 : 1 }}>
              <Plus size={13} />
            </button>
          </div>
        ))}
        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--border-color, #30363d)",
              background: "transparent",
              color: "var(--text-primary, #e6edf3)",
              fontSize: 12,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: "var(--accent-color, #58a6ff)",
              color: "white",
              fontSize: 12,
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? (isZh ? "运行中…" : "Running…") : isZh ? "运行" : "Run"}
          </button>
        </div>
      </div>
    </div>
  );
};
export const DockerClientDashboard: React.FC<DockerClientDashboardProps> = ({ theme = "dark", i18n = "en", onToggleHistory, isHistoryOpen = false }) => {
  const isZh = i18n === "zh-cn";
  const [activeView, setActiveView] = useState<DockerClientSidebarView>("containers");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedContainerKeys, setSelectedContainerKeys] = useState<Set<string>>(new Set());
  const [selectedImageKeys, setSelectedImageKeys] = useState<Set<string>>(new Set());
  const [selectedVolumeKeys, setSelectedVolumeKeys] = useState<Set<string>>(new Set());
  const [environmentInfo, setEnvironmentInfo] = useState<DockerEnvironmentInfo>(EMPTY_ENVIRONMENT);
  const [backendEnv, setBackendEnv] = useState<DockerEnvironment | null>(null);
  const [containers, setContainers] = useState<ContainerRow[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [volumes, setVolumes] = useState<VolumeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [available, setAvailable] = useState<boolean>(true);
  const [detailContainer, setDetailContainer] = useState<ContainerRow | null>(null);
  const [runImageName, setRunImageName] = useState<string | null>(null);
  const [runImageBusy, setRunImageBusy] = useState<boolean>(false);
  /**
   * Detect the Docker environment and (re)load every resource list.
   */
  const loadAll = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const env = await dockerClientCommands.detectEnvironment();
        setBackendEnv(env);
        setEnvironmentInfo(toEnvironmentInfo(env));
        if (!env.available || !env.socketPath) {
          setAvailable(false);
          setContainers([]);
          setImages([]);
          setVolumes([]);
          return;
        }
        setAvailable(true);
        // Load all three resource lists in parallel.
        const [containerList, imageList, volumeList] = await Promise.all([dockerClientCommands.listContainers(env.socketPath, true), dockerClientCommands.listImages(env.socketPath), dockerClientCommands.listVolumes(env.socketPath)]);
        setContainers(
          containerList.map((c) => ({
            id: c.id,
            name: c.name,
            containerId: c.containerId,
            image: c.image,
            port: c.port,
            cpu: c.cpu,
            lastStarted: c.lastStarted,
            state: c.state,
            status: c.status,
            statusColor: c.statusColor,
          })),
        );
        setImages(
          imageList.map((i) => ({
            id: i.id,
            name: i.name,
            containerId: i.containerId,
            image: i.image,
            port: i.port,
            cpu: i.cpu,
            lastStarted: i.lastStarted,
            statusColor: i.statusColor,
          })),
        );
        setVolumes(
          volumeList.map((v) => ({
            id: v.id,
            name: v.name,
            containerId: v.containerId,
            image: v.image,
            port: v.port,
            cpu: v.cpu,
            lastStarted: v.lastStarted,
            statusColor: v.statusColor,
          })),
        );
      } catch (error) {
        if (!silent) {
          showToast(ToastType.ERROR, `${isZh ? "加载 Docker 数据失败" : "Failed to load Docker data"}: ${error}`);
        }
        setAvailable(false);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isZh],
  );
  // Initial load.
  useEffect(() => {
    loadAll();
  }, [loadAll]);
  // Refresh the lists whenever the chat panel reports that LLM commands ran.
  useEffect(() => {
    const handleCommandsExecuted = () => {
      loadAll({ silent: true });
    };
    window.addEventListener(DOCKER_CLIENT_WINDOW_EVENTS.COMMAND_EXECUTED, handleCommandsExecuted as EventListener);
    return () => {
      window.removeEventListener(DOCKER_CLIENT_WINDOW_EVENTS.COMMAND_EXECUTED, handleCommandsExecuted as EventListener);
    };
  }, [loadAll]);
  const COMMON_COLUMNS: DockerColumn<ContainerRow | ImageRow>[] = [
    {
      key: "name",
      label: isZh ? "名称" : "Name",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: row.statusColor ?? "#22c55e",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.name}
          </span>
        </div>
      ),
    },
    {
      key: "containerId",
      label: isZh ? "容器 ID" : "Container ID",
      width: 140,
      minWidth: 90,
      render: (row) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: "var(--text-secondary, #8b949e)",
          }}
        >
          {row.containerId}
        </span>
      ),
    },
    {
      key: "image",
      label: isZh ? "镜像" : "Image",
      width: 160,
      minWidth: 100,
    },
    {
      key: "port",
      label: isZh ? "端口" : "Port",
      width: 120,
      minWidth: 80,
      render: (row) => <span style={{ fontFamily: "monospace", fontSize: 11 }}>{row.port}</span>,
    },
    {
      key: "cpu",
      label: isZh ? "CPU" : "CPU",
      width: 70,
      minWidth: 50,
      render: (row) => <span style={{ fontSize: 11 }}>{row.cpu}</span>,
    },
    {
      key: "lastStarted",
      label: isZh ? "最近启动" : "Last Started",
      width: 120,
      minWidth: 80,
      render: (row) => <span style={{ fontSize: 11, color: "var(--text-secondary, #8b949e)" }}>{row.lastStarted}</span>,
    },
  ];
  const VOLUME_COLUMNS: DockerColumn<VolumeRow>[] = [
    {
      key: "name",
      label: isZh ? "名称" : "Name",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: row.statusColor ?? "#22c55e",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.name}
          </span>
        </div>
      ),
    },
    { key: "containerId", label: isZh ? "容器 ID" : "Container ID", width: 140, minWidth: 90 },
    { key: "image", label: isZh ? "镜像" : "Image", width: 160, minWidth: 100 },
    { key: "port", label: isZh ? "端口" : "Port", width: 120, minWidth: 80 },
    { key: "cpu", label: isZh ? "CPU" : "CPU", width: 70, minWidth: 50 },
    { key: "lastStarted", label: isZh ? "最近启动" : "Last Started", width: 120, minWidth: 80 },
  ];
  /**
   * Filter a list of rows by the current search query.
   */
  const filterContainers = (rows: ContainerRow[]): ContainerRow[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.containerId.toLowerCase().includes(q) || r.image.toLowerCase().includes(q) || r.port.toLowerCase().includes(q));
  };
  const filterImages = (rows: ImageRow[]): ImageRow[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.containerId.toLowerCase().includes(q) || r.image.toLowerCase().includes(q));
  };
  const filterVolumes = (rows: VolumeRow[]): VolumeRow[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  };
  /**
   * Batch action handlers.
   */
  const handleContainerBatchAction = useCallback(
    async (actionKey: string, selectedKeys: string[]) => {
      const socket = backendEnv?.socketPath;
      if (!socket || selectedKeys.length === 0) return;
      try {
        switch (actionKey) {
          case "start":
            await dockerClientCommands.startContainers(socket, selectedKeys);
            break;
          case "stop":
            await dockerClientCommands.stopContainers(socket, selectedKeys);
            break;
          case "pause":
            await dockerClientCommands.pauseContainers(socket, selectedKeys);
            break;
          case "restart":
            await dockerClientCommands.restartContainers(socket, selectedKeys);
            break;
          case "delete":
            await dockerClientCommands.removeContainers(socket, selectedKeys, true);
            break;
          default:
            break;
        }
        setSelectedContainerKeys(new Set());
        await loadAll({ silent: true });
      } catch (error) {
        showToast(ToastType.ERROR, `${isZh ? "容器操作失败" : "Container action failed"}: ${error}`);
      }
    },
    [backendEnv, isZh, loadAll],
  );
  const handleImageBatchAction = useCallback(
    async (actionKey: string, selectedKeys: string[]) => {
      const socket = backendEnv?.socketPath;
      if (!socket || selectedKeys.length === 0) return;
      try {
        if (actionKey === "delete") {
          await dockerClientCommands.removeImages(socket, selectedKeys, true);
        }
        setSelectedImageKeys(new Set());
        await loadAll({ silent: true });
      } catch (error) {
        showToast(ToastType.ERROR, `${isZh ? "镜像操作失败" : "Image action failed"}: ${error}`);
      }
    },
    [backendEnv, isZh, loadAll],
  );
  const handleVolumeBatchAction = useCallback(
    async (actionKey: string, selectedKeys: string[]) => {
      const socket = backendEnv?.socketPath;
      if (!socket || selectedKeys.length === 0) return;
      try {
        if (actionKey === "delete") {
          await dockerClientCommands.removeVolumes(socket, selectedKeys, true);
        }
        setSelectedVolumeKeys(new Set());
        await loadAll({ silent: true });
      } catch (error) {
        showToast(ToastType.ERROR, `${isZh ? "数据卷操作失败" : "Volume action failed"}: ${error}`);
      }
    },
    [backendEnv, isZh, loadAll],
  );
  /**
   * Per-row action handler shared by all three lists.
   */
  const handleRowAction = useCallback(
    async (actionKey: string, row: ContainerRow | ImageRow | VolumeRow) => {
      const socket = backendEnv?.socketPath;
      if (!socket) return;
      try {
        if (activeView === "containers") {
          switch (actionKey) {
            case "start":
              await dockerClientCommands.startContainers(socket, [row.id]);
              break;
            case "stop":
              await dockerClientCommands.stopContainers(socket, [row.id]);
              break;
            case "pause":
              await dockerClientCommands.pauseContainers(socket, [row.id]);
              break;
            case "restart":
              await dockerClientCommands.restartContainers(socket, [row.id]);
              break;
            case "delete":
              await dockerClientCommands.removeContainers(socket, [row.id], true);
              break;
            default:
              break;
          }
        } else if (activeView === "images") {
          if (actionKey === "delete") {
            await dockerClientCommands.removeImages(socket, [row.id], true);
          } else if (actionKey === "run") {
            const imageRef = (row as ImageRow).name || (row as ImageRow).image;
            setRunImageName(imageRef);
            return;
          }
        } else if (activeView === "volumes") {
          if (actionKey === "delete") {
            await dockerClientCommands.removeVolumes(socket, [row.id], true);
          }
        }
        await loadAll({ silent: true });
      } catch (error) {
        showToast(ToastType.ERROR, `${isZh ? "操作失败" : "Action failed"}: ${error}`);
      }
    },
    [activeView, backendEnv, isZh, loadAll],
  );
  /**
   * Submit the run-image dialog: start a detached container from the chosen image.
   */
  const handleRunImageSubmit = useCallback(
    async (payload: { containerName: string; ports: Array<{ host: string; container: string }>; volumes: Array<{ hostPath: string; containerPath: string }>; env: Array<{ key: string; value: string }> }) => {
      const socket = backendEnv?.socketPath;
      const imageName = runImageName;
      if (!socket || !imageName) return;
      setRunImageBusy(true);
      try {
        await dockerClientCommands.runImage(socket, imageName, {
          containerName: payload.containerName,
          ports: payload.ports,
          volumes: payload.volumes,
          env: payload.env,
        });
        showToast(ToastType.SUCCESS, isZh ? `容器已从 ${imageName} 启动` : `Container started from ${imageName}`);
        setRunImageName(null);
        // Refresh the container list so the new container shows up immediately.
        await loadAll({ silent: true });
      } catch (error) {
        showToast(ToastType.ERROR, `${isZh ? "启动容器失败" : "Failed to run container"}: ${error}`);
      } finally {
        setRunImageBusy(false);
      }
    },
    [backendEnv, runImageName, isZh, loadAll],
  );
  /**
   * prompts the user for one or more image references and then invokes the backend pull command.
   */
  const handlePullImages = useCallback(() => {
    const socket = backendEnv?.socketPath;
    if (!socket) {
      showToast(ToastType.WARNING, isZh ? "Docker 不可用" : "Docker is not available");
      return;
    }
    const input = window.prompt(isZh ? "输入镜像名称（逗号分隔）" : "Enter image name(s), comma separated");
    if (!input) return;
    const names = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    dockerClientCommands
      .pullImages(socket, names)
      .then(() => {
        showToast(ToastType.SUCCESS, isZh ? "镜像拉取完成" : "Image pull completed");
        return loadAll({ silent: true });
      })
      .catch((error) => {
        showToast(ToastType.ERROR, `${isZh ? "镜像拉取失败" : "Image pull failed"}: ${error}`);
      });
  }, [backendEnv, isZh, loadAll]);
  const handleRunContainer = useCallback(() => {
    const socket = backendEnv?.socketPath;
    if (!socket) {
      showToast(ToastType.WARNING, isZh ? "Docker 不可用" : "Docker is not available");
      return;
    }
    const input = window.prompt(isZh ? "输入要运行的镜像名称" : "Enter the image name to run");
    if (!input) return;
    showToast(ToastType.INFO, isZh ? `请使用容器创建向导运行 ${input}` : `Use the container wizard to run ${input}`);
  }, [backendEnv, isZh]);
  /**
   * Create a new volume — prompts for a name and delegates to the backend.
   */
  const handleCreateVolume = useCallback(() => {
    const socket = backendEnv?.socketPath;
    if (!socket) {
      showToast(ToastType.WARNING, isZh ? "Docker 不可用" : "Docker is not available");
      return;
    }
    const input = window.prompt(isZh ? "输入数据卷名称" : "Enter volume name");
    if (!input) return;
    showToast(ToastType.INFO, isZh ? `请使用数据卷创建向导创建 ${input}` : `Use the volume wizard to create ${input}`);
  }, [backendEnv, isZh]);
  /**
   * Refresh environment info and reload all lists from the backend.
   */
  const handleRefreshEnvironment = useCallback(() => {
    loadAll();
  }, [loadAll]);
  /**
   * Render a friendly placeholder when the engine cannot be reached.
   */
  const renderUnavailable = () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 10,
        color: "var(--text-muted, #6e7681)",
        fontSize: 13,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary, #8b949e)" }}>{isZh ? "未检测到 Docker 环境" : "No Docker environment detected"}</div>
      <div>{isZh ? "请确认 Docker / Colima / Podman 已启动，然后点击刷新。" : "Make sure Docker / Colima / Podman is running, then click Refresh."}</div>
      <button
        onClick={handleRefreshEnvironment}
        style={{
          marginTop: 6,
          padding: "6px 14px",
          borderRadius: 6,
          border: "1px solid var(--border-color, #30363d)",
          background: "var(--bg-tertiary, #21262d)",
          color: "var(--text-primary, #e6edf3)",
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        {isZh ? "刷新" : "Refresh"}
      </button>
    </div>
  );
  /**
   * Container detail page (shown when a container name is clicked).
   */
  const renderContainerDetail = () => {
    if (!detailContainer) return null;
    const socket = backendEnv?.socketPath;
    if (!socket) {
      return renderUnavailable();
    }
    return (
      <DockerContainerDetail
        socket={socket}
        containerId={detailContainer.id}
        containerName={detailContainer.name}
        containerImage={detailContainer.image}
        i18n={i18n}
        onBack={() => setDetailContainer(null)}
        onActionCompleted={() => {
          loadAll({ silent: true });
        }}
      />
    );
  };
  const renderActivePanel = () => {
    if (activeView === "containers" && detailContainer) {
      return renderContainerDetail();
    }
    switch (activeView) {
      case "containers":
        return (
          <DockerListPanel<ContainerRow>
            title={isZh ? "容器" : "Containers"}
            searchPlaceholder={isZh ? "搜索容器…" : "Search containers…"}
            columns={COMMON_COLUMNS as DockerColumn<ContainerRow>[]}
            rows={filterContainers(containers)}
            getRowKey={(row) => row.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            primaryActionLabel={isZh ? "运行" : "Run"}
            onPrimaryAction={handleRunContainer}
            emptyText={isZh ? "暂无容器" : "No containers"}
            rowActionPreset="containers"
            selectedRowKeys={selectedContainerKeys}
            onSelectionChange={setSelectedContainerKeys}
            onBatchAction={handleContainerBatchAction}
            onRowAction={handleRowAction}
            // Feature 1: click a row to expand an inline detail block.
            expandable
            renderExpanded={(row) => <InlineContainerDetail row={row} isZh={isZh} />}
            // Feature 2: click the name to open the full detail page.
            onNameClick={(row) => setDetailContainer(row)}
          />
        );
      case "images":
        return (
          <DockerListPanel<ImageRow>
            title={isZh ? "镜像" : "Images"}
            searchPlaceholder={isZh ? "搜索镜像…" : "Search images…"}
            columns={COMMON_COLUMNS as DockerColumn<ImageRow>[]}
            rows={filterImages(images)}
            getRowKey={(row) => row.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            primaryActionLabel={isZh ? "拉取" : "Pull"}
            onPrimaryAction={handlePullImages}
            emptyText={isZh ? "暂无镜像" : "No images"}
            rowActionPreset="images"
            selectedRowKeys={selectedImageKeys}
            onSelectionChange={setSelectedImageKeys}
            onBatchAction={handleImageBatchAction}
            onRowAction={handleRowAction}
            actionsWidth={60}
          />
        );
      case "volumes":
        return (
          <DockerListPanel<VolumeRow>
            title={isZh ? "数据卷" : "Volumes"}
            searchPlaceholder={isZh ? "搜索数据卷…" : "Search volumes…"}
            columns={VOLUME_COLUMNS}
            rows={filterVolumes(volumes)}
            getRowKey={(row) => row.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            primaryActionLabel={isZh ? "创建" : "Create"}
            onPrimaryAction={handleCreateVolume}
            emptyText={isZh ? "暂无数据卷" : "No volumes"}
            rowActionPreset="volumes"
            selectedRowKeys={selectedVolumeKeys}
            onSelectionChange={setSelectedVolumeKeys}
            onBatchAction={handleVolumeBatchAction}
            onRowAction={handleRowAction}
          />
        );
      case "environment":
        return <DockerEnvironmentPanel i18n={i18n} info={environmentInfo} onRefresh={handleRefreshEnvironment} />;
      default:
        return null;
    }
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
        background: "var(--bg-secondary, #161b22)",
        color: "var(--text-primary, #e6edf3)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "13px",
        boxSizing: "border-box",
      }}
    >
      <DockerClientSidebar
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          setSearchQuery("");
          if (view !== "containers") {
            setDetailContainer(null);
          }
        }}
        i18n={i18n}
        onToggleHistory={onToggleHistory}
        isHistoryOpen={isHistoryOpen}
      />
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>{!available ? renderUnavailable() : renderActivePanel()}</div>
      {runImageName && (
        <RunImageDialog
          imageName={runImageName}
          isZh={isZh}
          busy={runImageBusy}
          onCancel={() => {
            if (!runImageBusy) setRunImageName(null);
          }}
          onSubmit={handleRunImageSubmit}
        />
      )}
    </div>
  );
};
export default DockerClientDashboard;
