import React, { useState, useCallback } from "react";
import DockerClientSidebar, { DockerClientSidebarView } from "./components/DockerClientSidebar";
import DockerListPanel, { DockerColumn } from "./components/DockerListPanel";
interface DockerClientDashboardProps {
  theme?: "light" | "dark";
  i18n?: "en" | "zh-cn";
  /** Toggle the history drawer (forwarded to the sidebar's bottom button) */
  onToggleHistory?: () => void;
  /** Whether the history drawer is currently open */
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
/**
 * Demo data — replace with real backend data later.
 */
const DEMO_CONTAINERS: ContainerRow[] = [
  {
    id: "c1",
    name: "hippox-postgres",
    containerId: "a1b2c3d4e5f6",
    image: "postgres:16",
    port: "5432:5432",
    cpu: "0.4%",
    lastStarted: "2 hours ago",
    statusColor: "#22c55e",
  },
  {
    id: "c2",
    name: "hippox-redis",
    containerId: "b2c3d4e5f6a1",
    image: "redis:7-alpine",
    port: "6379:6379",
    cpu: "0.1%",
    lastStarted: "2 hours ago",
    statusColor: "#22c55e",
  },
  {
    id: "c3",
    name: "hippox-mongo",
    containerId: "c3d4e5f6a1b2",
    image: "mongo:6",
    port: "27017:27017",
    cpu: "0.0%",
    lastStarted: "3 days ago",
    statusColor: "#ef4444",
  },
];
const DEMO_IMAGES: ImageRow[] = [
  {
    id: "i1",
    name: "postgres:16",
    containerId: "sha256:1a2b3c4d",
    image: "postgres",
    port: "-",
    cpu: "-",
    lastStarted: "5 days ago",
    statusColor: "#58a6ff",
  },
  {
    id: "i2",
    name: "redis:7-alpine",
    containerId: "sha256:4d5e6f7g",
    image: "redis",
    port: "-",
    cpu: "-",
    lastStarted: "5 days ago",
    statusColor: "#58a6ff",
  },
  {
    id: "i3",
    name: "mongo:6",
    containerId: "sha256:7g8h9i0j",
    image: "mongo",
    port: "-",
    cpu: "-",
    lastStarted: "10 days ago",
    statusColor: "#6e7681",
  },
];
const DEMO_VOLUMES: VolumeRow[] = [
  {
    id: "v1",
    name: "hippox_pg_data",
    containerId: "-",
    image: "-",
    port: "-",
    cpu: "-",
    lastStarted: "5 days ago",
    statusColor: "#58a6ff",
  },
  {
    id: "v2",
    name: "hippox_redis_data",
    containerId: "-",
    image: "-",
    port: "-",
    cpu: "-",
    lastStarted: "5 days ago",
    statusColor: "#58a6ff",
  },
  {
    id: "v3",
    name: "hippox_mongo_data",
    containerId: "-",
    image: "-",
    port: "-",
    cpu: "-",
    lastStarted: "10 days ago",
    statusColor: "#6e7681",
  },
];
export const DockerClientDashboard: React.FC<DockerClientDashboardProps> = ({ theme = "dark", i18n = "en", onToggleHistory, isHistoryOpen = false }) => {
  const isZh = i18n === "zh-cn";
  const [activeView, setActiveView] = useState<DockerClientSidebarView>("containers");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedContainerKeys, setSelectedContainerKeys] = useState<Set<string>>(new Set());
  const [selectedImageKeys, setSelectedImageKeys] = useState<Set<string>>(new Set());
  const [selectedVolumeKeys, setSelectedVolumeKeys] = useState<Set<string>>(new Set());
  /**
   * Column definitions shared by containers and images.
   */
  const COMMON_COLUMNS: DockerColumn<ContainerRow | ImageRow>[] = [
    {
      key: "name",
      label: isZh ? "名称" : "Name",
      // No fixed width → grows to fill remaining space.
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Status dot */}
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
  const handleContainerBatchAction = useCallback((actionKey: string, selectedKeys: string[]) => {
    setSelectedContainerKeys(new Set());
  }, []);
  const handleImageBatchAction = useCallback((actionKey: string, selectedKeys: string[]) => {
    setSelectedImageKeys(new Set());
  }, []);
  const handleVolumeBatchAction = useCallback((actionKey: string, selectedKeys: string[]) => {
    setSelectedVolumeKeys(new Set());
  }, []);
  /**
   * Render the list panel for the currently active category.
   */
  const renderActivePanel = () => {
    switch (activeView) {
      case "containers":
        return (
          <DockerListPanel<ContainerRow>
            title={isZh ? "容器" : "Containers"}
            searchPlaceholder={isZh ? "搜索容器…" : "Search containers…"}
            columns={COMMON_COLUMNS as DockerColumn<ContainerRow>[]}
            rows={filterContainers(DEMO_CONTAINERS)}
            getRowKey={(row) => row.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            primaryActionLabel={isZh ? "运行" : "Run"}
            onPrimaryAction={() => {
              // eslint-disable-next-line no-console
              console.log("[DockerClientDashboard] run new container");
            }}
            emptyText={isZh ? "暂无容器" : "No containers"}
            rowActionPreset="containers"
            selectedRowKeys={selectedContainerKeys}
            onSelectionChange={setSelectedContainerKeys}
            onBatchAction={handleContainerBatchAction}
          />
        );
      case "images":
        return (
          <DockerListPanel<ImageRow>
            title={isZh ? "镜像" : "Images"}
            searchPlaceholder={isZh ? "搜索镜像…" : "Search images…"}
            columns={COMMON_COLUMNS as DockerColumn<ImageRow>[]}
            rows={filterImages(DEMO_IMAGES)}
            getRowKey={(row) => row.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            primaryActionLabel={isZh ? "拉取" : "Pull"}
            onPrimaryAction={() => {
              // eslint-disable-next-line no-console
              console.log("[DockerClientDashboard] pull new image");
            }}
            emptyText={isZh ? "暂无镜像" : "No images"}
            rowActionPreset="images"
            selectedRowKeys={selectedImageKeys}
            onSelectionChange={setSelectedImageKeys}
            onBatchAction={handleImageBatchAction}
          />
        );
      case "volumes":
        return (
          <DockerListPanel<VolumeRow>
            title={isZh ? "数据卷" : "Volumes"}
            searchPlaceholder={isZh ? "搜索数据卷…" : "Search volumes…"}
            columns={VOLUME_COLUMNS}
            rows={filterVolumes(DEMO_VOLUMES)}
            getRowKey={(row) => row.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            primaryActionLabel={isZh ? "创建" : "Create"}
            onPrimaryAction={() => {
              // eslint-disable-next-line no-console
              console.log("[DockerClientDashboard] create new volume");
            }}
            emptyText={isZh ? "暂无数据卷" : "No volumes"}
            rowActionPreset="volumes"
            selectedRowKeys={selectedVolumeKeys}
            onSelectionChange={setSelectedVolumeKeys}
            onBatchAction={handleVolumeBatchAction}
          />
        );
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
      {/* Left sidebar — Docker Desktop style, only three categories */}
      <DockerClientSidebar
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          // Reset search when switching category.
          setSearchQuery("");
        }}
        i18n={i18n}
        onToggleHistory={onToggleHistory}
        isHistoryOpen={isHistoryOpen}
      />
      {/* Active panel content — a list panel per category */}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>{renderActivePanel()}</div>
    </div>
  );
};
export default DockerClientDashboard;
