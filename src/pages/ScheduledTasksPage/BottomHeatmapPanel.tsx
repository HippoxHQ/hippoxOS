import React, { useState, useEffect } from "react";
import { scheduledTasksCommands } from "../../command/scheduledtasks";
import Heatmap from "../../components/Heatmap";
import { showToast, ToastType } from "../../components/Toast";
const FireIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
const RefreshCwIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
    <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
  </svg>
);
const ChevronUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
interface BottomHeatmapPanelProps {
  t: (key: string, params?: any) => string;
  tasks?: any[];
}
const BottomHeatmapPanel: React.FC<BottomHeatmapPanelProps> = ({ t, tasks = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const generateHeatmapData = (taskList: any[]) => {
    const countMap = new Map<string, number>();
    taskList.forEach((task) => {
      if (task.last_executed_at) {
        const date = new Date(task.last_executed_at);
        if (date.getFullYear() === currentYear) {
          const dateStr = formatLocalDate(date);
          countMap.set(dateStr, (countMap.get(dateStr) || 0) + 1);
        }
      }
    });
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);
    const result: any[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = formatLocalDate(currentDate);
      result.push({
        date: dateStr,
        count: countMap.get(dateStr) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return result;
  };
  const loadRealData = async () => {
    setLoading(true);
    try {
      const scheduledTasks = await scheduledTasksCommands.list();
      const data = generateHeatmapData(scheduledTasks);
      setHeatmapData(data);
    } catch (error) {
      console.error("Failed to load scheduled tasks:", error);
      showToast(ToastType.ERROR, t("scheduled.loadFailed"));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isExpanded && heatmapData.length === 0) {
      loadRealData();
    }
  }, [isExpanded]);
  useEffect(() => {
    if (tasks.length > 0) {
      const data = generateHeatmapData(tasks);
      setHeatmapData(data);
    }
  }, [tasks]);
  const handleRefresh = () => {
    loadRealData();
  };
  return (
    <div
      className="bottom-heatmap-panel"
      style={{
        height: isExpanded ? "220px" : "33px",
        flexShrink: 0,
        overflow: "hidden",
        transition: "height 0.3s ease",
        paddingTop: "5px",
      }}
    >
      <div
        className="bottom-heatmap-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="bottom-heatmap-icon" style={{ color: "var(--text-secondary)" }}>
            <FireIcon />
          </span>
          <span className="bottom-heatmap-title" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            {t("scheduled.executionHeatmap")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            onClick={handleRefresh}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "4px 6px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            title={t("user.refreshTooltip")}
          >
            <RefreshCwIcon />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              color: "var(--text-muted)",
              padding: "4px 8px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            {isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
            <span style={{ fontSize: "11px" }}>{isExpanded ? t("scheduled.collapse") : t("scheduled.expand")}</span>
          </button>
        </div>
      </div>
      {isExpanded && (
        <div
          style={{
            marginTop: "8px",
            overflowX: "auto",
            overflowY: "hidden",
            paddingBottom: "8px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "150px",
                color: "var(--text-muted)",
                fontSize: "12px",
              }}
            >
              {t("common.loading")}
            </div>
          ) : (
            <div style={{ display: "inline-block" }}>
              <Heatmap data={heatmapData} t={t} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default BottomHeatmapPanel;
