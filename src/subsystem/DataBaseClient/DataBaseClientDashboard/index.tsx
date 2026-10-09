import React, { useCallback, useEffect, useRef, useState } from "react";
import DataBaseClientTopBar, { DataBaseClientView } from "./components/DataBaseClientTopBar";
import CreateConnectionDialog, { DatabaseTypeItem } from "./components/CreateConnectionDialog";
interface DataBaseClientDashboardProps {
  theme?: "light" | "dark";
  i18n?: "en" | "zh-cn";
  onToggleHistory?: () => void;
  isHistoryOpen?: boolean;
}
const MIN_LEFT_RATIO = 0.2;
const MAX_LEFT_RATIO = 0.5;
const DEFAULT_LEFT_RATIO = 0.3;
const DIVIDER_HIT_AREA = 8;
export const DataBaseClientDashboard: React.FC<DataBaseClientDashboardProps> = ({ theme = "dark", i18n = "en", onToggleHistory, isHistoryOpen = false }) => {
  const [activeView, setActiveView] = useState<DataBaseClientView>("overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [leftRatio, setLeftRatio] = useState<number>(DEFAULT_LEFT_RATIO);
  const [isResizeHover, setIsResizeHover] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragStartRatio = useRef<number>(DEFAULT_LEFT_RATIO);
  const dragStartContainerRect = useRef<DOMRect | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem("hippox-databaseclient-left-ratio");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!Number.isNaN(parsed)) {
        const clamped = Math.max(MIN_LEFT_RATIO, Math.min(MAX_LEFT_RATIO, parsed));
        setLeftRatio(clamped);
      }
    }
  }, []);
  const saveLeftRatio = (ratio: number) => {
    localStorage.setItem("hippox-databaseclient-left-ratio", ratio.toString());
  };
  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartRatio.current = leftRatio;
      dragStartContainerRect.current = containerRef.current.getBoundingClientRect();
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    },
    [leftRatio],
  );
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerRect = dragStartContainerRect.current || containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    if (containerWidth <= 0) return;
    const deltaX = e.clientX - dragStartX.current;
    // Convert the pixel delta into a ratio delta.
    const ratioDelta = deltaX / containerWidth;
    const nextRatio = dragStartRatio.current + ratioDelta;
    // Clamp between 2:8 and 5:5 (left : right).
    const clamped = Math.max(MIN_LEFT_RATIO, Math.min(MAX_LEFT_RATIO, nextRatio));
    setLeftRatio(clamped);
    saveLeftRatio(clamped);
  }, []);
  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  }, []);
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  const handleNewConnection = (databaseKey?: string) => {
    // eslint-disable-next-line no-console
    console.log("[DataBaseClientDashboard] new connection requested:", databaseKey);
    setIsCreateDialogOpen(true);
  };
  const renderLeftPanel = () => {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-secondary, #161b22)",
          overflow: "hidden",
        }}
      >
        {/* Panel header */}
        <div
          style={{
            height: 32,
            minHeight: 32,
            display: "flex",
            alignItems: "center",
            padding: "0 10px",
            borderBottom: "1px solid var(--border-color, #30363d)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary, #8b949e)",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            flexShrink: 0,
          }}
        >
          {i18n === "zh-cn" ? "连接列表" : "Connections"}
        </div>
        {/* Browser content placeholder */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted, #6e7681)",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          {i18n === "zh-cn" ? "暂无连接，点击左上角 + 新建" : "No connections yet. Click + in the top bar to add one."}
        </div>
      </div>
    );
  };
  const renderRightPanel = () => {
    switch (activeView) {
      case "overview":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "概览" : "Overview"} />;
      case "tables":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "数据表" : "Tables"} />;
      case "query":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "查询" : "Query"} />;
      case "console":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "控制台" : "Console"} />;
      case "settings":
        return <PlaceholderPanel title={i18n === "zh-cn" ? "设置" : "Settings"} />;
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
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-primary, #0d1117)",
        color: "var(--text-primary, #e6edf3)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "13px",
        boxSizing: "border-box",
      }}
    >
      {/* Top bar */}
      <DataBaseClientTopBar activeView={activeView} onViewChange={setActiveView} onNewConnection={handleNewConnection} onToggleHistory={onToggleHistory} isHistoryOpen={isHistoryOpen} i18n={i18n} />
      {/* Main split area: left panel | divider | right panel */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        {/* Left panel (connection list) */}
        <div
          style={{
            width: `${leftRatio * 100}%`,
            height: "100%",
            flexShrink: 0,
            overflow: "hidden",
            borderRight: "1px solid var(--border-color, #30363d)",
          }}
        >
          {renderLeftPanel()}
        </div>
        {/* Divider: 0px wide with an expanded hit area via ::after.
            Matches the same pattern used by the chat panels' resize handles. */}
        <div
          className="database-client-resize-handle"
          onMouseDown={handleDividerMouseDown}
          style={{
            width: "0px",
            flexShrink: 0,
            cursor: "col-resize",
            background: isResizeHover ? "var(--scrollbar-thumb)" : "var(--border-color)",
            position: "relative",
            transition: "background 0.15s",
            zIndex: 1,
          }}
          onMouseEnter={() => setIsResizeHover(true)}
          onMouseLeave={() => setIsResizeHover(false)}
        />
        {/* Right panel */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            overflow: "hidden",
          }}
        >
          {renderRightPanel()}
        </div>
      </div>
      {/* Local style: expand the divider hit area, matching the chat panels */}
      <style>{`
        .database-client-resize-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -${DIVIDER_HIT_AREA}px;
          right: -${DIVIDER_HIT_AREA}px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
      `}</style>
      {/* New connection dialog */}
      <CreateConnectionDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSelectDatabase={(db: DatabaseTypeItem) => {
          // eslint-disable-next-line no-console
          console.log("[DataBaseClientDashboard] database selected:", db.key);
        }}
        onTestConnection={() => {
          // eslint-disable-next-line no-console
          console.log("[DataBaseClientDashboard] test connection");
        }}
        onPrev={() => {
          // eslint-disable-next-line no-console
          console.log("[DataBaseClientDashboard] prev step");
        }}
        onNext={() => {
          // eslint-disable-next-line no-console
          console.log("[DataBaseClientDashboard] next step");
        }}
        onFinish={() => {
          // eslint-disable-next-line no-console
          console.log("[DataBaseClientDashboard] finish");
        }}
        i18n={i18n}
      />
    </div>
  );
};
/**
 * PlaceholderPanel.
 */
const PlaceholderPanel: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-secondary, #8b949e)",
        fontSize: 14,
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 32, opacity: 0.3 }}>🗄️</div>
      <div>{title}</div>
      <div style={{ fontSize: 11, opacity: 0.6 }}>Coming soon</div>
    </div>
  );
};
export default DataBaseClientDashboard;
