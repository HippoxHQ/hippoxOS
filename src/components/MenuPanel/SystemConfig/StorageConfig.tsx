import React, { useState, useEffect } from "react";
import { showToast, ToastType } from "../../Toast";
import { showDialog, DialogType } from "../../Dialog";
import { storageCommands } from "../../../command/config";
import { filesCommands } from "../../../command/files";
import { getDataPaths } from "../../../command/paths";
import { HardDrive, FolderOpen, FileText, MessageSquare, Star, Package, Clock, Settings, Trash2, Folder, Save, LoaderCircle, AlertCircle, CheckCircle } from "lucide-react";
interface StorageConfigProps {
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
}
const StorageConfig: React.FC<StorageConfigProps> = ({ t, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [logsSize, setLogsSize] = useState<number>(0);
  const [dialogSize, setDialogSize] = useState<number>(0);
  const [favoritesSize, setFavoritesSize] = useState<number>(0);
  const [skillsMarketSize, setSkillsMarketSize] = useState<number>(0);
  const [scheduledTasksSize, setScheduledTasksSize] = useState<number>(0);
  const [settingsSize, setSettingsSize] = useState<number>(0);
  const [appTotalSize, setAppTotalSize] = useState<number>(0);
  const [maxLogSize, setMaxLogSize] = useState<number>(500);
  const [maxDialogSize, setMaxDialogSize] = useState<number>(500);
  const [maxFavoritesSize, setMaxFavoritesSize] = useState<number>(500);
  const [savingLogs, setSavingLogs] = useState(false);
  const [savingDialog, setSavingDialog] = useState(false);
  const [savingFavorites, setSavingFavorites] = useState(false);
  const [cleaningDialog, setCleaningDialog] = useState(false);
  const [cleaningFavorites, setCleaningFavorites] = useState(false);
  const [cleaningLogs, setCleaningLogs] = useState(false);
  const [logsDir, setLogsDir] = useState("");
  const [dialogHistoryDir, setDialogHistoryDir] = useState("");
  const [favoritesDir, setFavoritesDir] = useState("");
  const [skillsMarketDir, setSkillsMarketDir] = useState("");
  const [scheduledTasksDir, setScheduledTasksDir] = useState("");
  const [settingsDir, setSettingsDir] = useState("");
  const [appRootDir, setAppRootDir] = useState("");
  // Sub-system dialog history directories
  const [chartDialogHistoryDir, setChartDialogHistoryDir] = useState("");
  const [mapDialogHistoryDir, setMapDialogHistoryDir] = useState("");
  const [codeEditorDialogHistoryDir, setCodeEditorDialogHistoryDir] = useState("");
  const [videoDialogHistoryDir, setVideoDialogHistoryDir] = useState("");
  const [sandbox3dDialogHistoryDir, setSandbox3dDialogHistoryDir] = useState("");
  // Sub-system directory sizes
  const [chartDialogSize, setChartDialogSize] = useState<number>(0);
  const [mapDialogSize, setMapDialogSize] = useState<number>(0);
  const [codeEditorDialogSize, setCodeEditorDialogSize] = useState<number>(0);
  const [videoDialogSize, setVideoDialogSize] = useState<number>(0);
  const [sandbox3dDialogSize, setSandbox3dDialogSize] = useState<number>(0);
  const [diskInfo, setDiskInfo] = useState<{
    total: number;
    free: number;
    used: number;
  }>({
    total: 0,
    free: 0,
    used: 0,
  });
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    setLoading(true);
    try {
      const paths = await getDataPaths();
      const favoritesDirPath = await storageCommands.getFavoritesDir();
      setLogsDir(String(paths.log_dir ?? ""));
      setDialogHistoryDir(String(paths.dialog_history_dir ?? ""));
      setFavoritesDir(favoritesDirPath);
      setSkillsMarketDir(String(paths.skills_market_dir ?? ""));
      setScheduledTasksDir(String(paths.scheduled_tasks_dir ?? ""));
      setSettingsDir(String(paths.settings_dir ?? ""));
      setAppRootDir(String(paths.app_root_dir ?? ""));
      // Set sub-system dialog history directories
      setChartDialogHistoryDir(String((paths as any).chart_dialog_history_dir ?? ""));
      setMapDialogHistoryDir(String((paths as any).map_dialog_history_dir ?? ""));
      setCodeEditorDialogHistoryDir(String((paths as any).codeeditor_dialog_history_dir ?? ""));
      setVideoDialogHistoryDir(String((paths as any).video_editing_system_dialog_history_dir ?? ""));
      setSandbox3dDialogHistoryDir(String((paths as any).sandbox3d_dialog_history_dir ?? ""));
      const [logsSizeVal, dialogSizeVal, favoritesSizeVal, skillsMarketSizeVal, scheduledTasksSizeVal, settingsSizeVal, maxLogSizeVal, maxDialogSizeVal, maxFavoritesSizeVal, diskInfoVal, chartDialogSizeVal, mapDialogSizeVal, codeEditorDialogSizeVal, videoDialogSizeVal, sandbox3dDialogSizeVal] =
        await Promise.all([
          storageCommands.getDirectorySize(paths.log_dir),
          storageCommands.getDirectorySize(paths.dialog_history_dir),
          storageCommands.getDirectorySize(favoritesDirPath),
          storageCommands.getDirectorySize(paths.skills_market_dir),
          storageCommands.getDirectorySize(paths.scheduled_tasks_dir),
          storageCommands.getDirectorySize(paths.settings_dir),
          storageCommands.getMaxLogSize(),
          storageCommands.getMaxDialogSize(),
          storageCommands.getMaxFavoritesSize(),
          storageCommands.getDiskInfo(paths.app_root_dir),
          storageCommands.getDirectorySize(String((paths as any).chart_dialog_history_dir ?? "")),
          storageCommands.getDirectorySize(String((paths as any).map_dialog_history_dir ?? "")),
          storageCommands.getDirectorySize(String((paths as any).codeeditor_dialog_history_dir ?? "")),
          storageCommands.getDirectorySize(String((paths as any).video_editing_system_dialog_history_dir ?? "")),
          storageCommands.getDirectorySize(String((paths as any).sandbox3d_dialog_history_dir ?? "")),
        ]);
      setLogsSize(logsSizeVal);
      setDialogSize(dialogSizeVal);
      setFavoritesSize(favoritesSizeVal);
      setSkillsMarketSize(skillsMarketSizeVal);
      setScheduledTasksSize(scheduledTasksSizeVal);
      setSettingsSize(settingsSizeVal);
      setMaxLogSize(maxLogSizeVal);
      setMaxDialogSize(maxDialogSizeVal);
      setMaxFavoritesSize(maxFavoritesSizeVal);
      setDiskInfo(diskInfoVal);
      setChartDialogSize(chartDialogSizeVal);
      setMapDialogSize(mapDialogSizeVal);
      setCodeEditorDialogSize(codeEditorDialogSizeVal);
      setVideoDialogSize(videoDialogSizeVal);
      setSandbox3dDialogSize(sandbox3dDialogSizeVal);
      const total = logsSizeVal + dialogSizeVal + favoritesSizeVal + skillsMarketSizeVal + scheduledTasksSizeVal + settingsSizeVal + chartDialogSizeVal + mapDialogSizeVal + codeEditorDialogSizeVal + videoDialogSizeVal + sandbox3dDialogSizeVal;
      setAppTotalSize(total);
    } catch (error) {
      console.error("Failed to load storage data:", error);
      showToast(ToastType.ERROR, t("storage.loadFailed") || "Failed to load storage data");
    } finally {
      setLoading(false);
    }
  };
  const handleSaveMaxLogSize = async () => {
    if (maxLogSize < 500) {
      showToast(ToastType.WARNING, t("storage.maxLogSizeMin") || "Minimum size is 500MB");
      return;
    }
    setSavingLogs(true);
    try {
      await storageCommands.setMaxLogSize(maxLogSize);
      if (onSave) onSave({ action: "setMaxLogSize", maxLogSize });
      showToast(ToastType.SUCCESS, t("storage.saveSuccess") || "Settings saved");
    } catch (error) {
      console.error("Failed to save max log size:", error);
      showToast(ToastType.ERROR, t("storage.saveFailed") || "Failed to save settings");
    } finally {
      setSavingLogs(false);
    }
  };
  const handleSaveMaxDialogSize = async () => {
    if (maxDialogSize < 500) {
      showToast(ToastType.WARNING, t("storage.maxDialogSizeMin") || "Minimum size is 500MB");
      return;
    }
    setSavingDialog(true);
    try {
      await storageCommands.setMaxDialogSize(maxDialogSize);
      if (onSave) onSave({ action: "setMaxDialogSize", maxDialogSize });
      showToast(ToastType.SUCCESS, t("storage.saveSuccess") || "Settings saved");
    } catch (error) {
      console.error("Failed to save max dialog size:", error);
      showToast(ToastType.ERROR, t("storage.saveFailed") || "Failed to save settings");
    } finally {
      setSavingDialog(false);
    }
  };
  const handleSaveMaxFavoritesSize = async () => {
    if (maxFavoritesSize < 500) {
      showToast(ToastType.WARNING, t("storage.maxFavoritesSizeMin") || "Minimum size is 500MB");
      return;
    }
    setSavingFavorites(true);
    try {
      await storageCommands.setMaxFavoritesSize(maxFavoritesSize);
      if (onSave) onSave({ action: "setMaxFavoritesSize", maxFavoritesSize });
      showToast(ToastType.SUCCESS, t("storage.saveSuccess") || "Settings saved");
    } catch (error) {
      console.error("Failed to save max favorites size:", error);
      showToast(ToastType.ERROR, t("storage.saveFailed") || "Failed to save settings");
    } finally {
      setSavingFavorites(false);
    }
  };
  const handleClearDialogHistory = async () => {
    showDialog(
      DialogType.WARNING,
      t("storage.confirmTitle") || "Confirm",
      t("storage.confirmClearDialog") || "Are you sure you want to clear all dialog history? This action cannot be undone.",
      async () => {
        setCleaningDialog(true);
        try {
          const { sessionCommands } = await import("../../../command/session/general");
          const sessions = await sessionCommands.listSessions();
          for (const session of sessions) {
            const sessionId = session.session_id;
            if (sessionId && sessionId !== "welcome") {
              await sessionCommands.deleteSession(sessionId);
            }
          }
          await loadData();
          showToast(ToastType.SUCCESS, t("storage.dialogCleared") || "Dialog history cleared");
        } catch (error) {
          console.error("Failed to clear dialog history:", error);
          showToast(ToastType.ERROR, t("storage.clearFailed") || "Failed to clear");
        } finally {
          setCleaningDialog(false);
        }
      },
      undefined,
      t("storage.confirm") || "Confirm",
      t("storage.cancel") || "Cancel",
    );
  };
  const handleClearFavorites = async () => {
    showDialog(
      DialogType.WARNING,
      t("storage.confirmTitle") || "Confirm",
      t("storage.confirmClearFavorites") || "Are you sure you want to clear all favorites? This action cannot be undone.",
      async () => {
        setCleaningFavorites(true);
        try {
          const { skillsMarketCommands } = await import("../../../command/skills");
          const favoritedIds = await skillsMarketCommands.getFavoritedSkills();
          for (const id of favoritedIds) {
            await skillsMarketCommands.unfavoriteSkill(id);
          }
          await loadData();
          showToast(ToastType.SUCCESS, t("storage.favoritesCleared") || "Favorites cleared");
        } catch (error) {
          console.error("Failed to clear favorites:", error);
          showToast(ToastType.ERROR, t("storage.clearFailed") || "Failed to clear");
        } finally {
          setCleaningFavorites(false);
        }
      },
      undefined,
      t("storage.confirm") || "Confirm",
      t("storage.cancel") || "Cancel",
    );
  };
  const handleClearLogs = async () => {
    showDialog(
      DialogType.WARNING,
      t("storage.confirmTitle") || "Confirm",
      t("storage.confirmClearLogs") || "Are you sure you want to clear all logs? This action cannot be undone.",
      async () => {
        setCleaningLogs(true);
        try {
          await storageCommands.clearLogs();
          await loadData();
          showToast(ToastType.SUCCESS, t("storage.logsCleared") || "Logs cleared");
        } catch (error) {
          console.error("Failed to clear logs:", error);
          showToast(ToastType.ERROR, t("storage.clearFailed") || "Failed to clear");
        } finally {
          setCleaningLogs(false);
        }
      },
      undefined,
      t("storage.confirm") || "Confirm",
      t("storage.cancel") || "Cancel",
    );
  };
  const handleOpenDirectory = async (path: string) => {
    if (path) {
      try {
        await filesCommands.openPath(path);
      } catch (error) {
        console.error("Failed to open directory:", error);
        showToast(ToastType.ERROR, t("storage.openFailed") || "Failed to open directory");
      }
    }
  };
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  const getPercentage = (current: number, max: number): number => {
    if (max === 0) return 0;
    return Math.min(100, (current / (max * 1024 * 1024)) * 100);
  };
  const getProgressColor = (percent: number): string => {
    if (percent >= 90) return "#dc2626";
    if (percent >= 70) return "#f59e0b";
    return "#10b981";
  };
  const ProgressBar: React.FC<{
    percent: number;
    color?: string;
    height?: number;
  }> = ({ percent, color, height = 8 }) => (
    <div
      style={{
        width: "100%",
        height: `${height}px`,
        background: "var(--bg-tertiary)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: color || getProgressColor(percent),
          borderRadius: "4px",
        }}
      />
    </div>
  );
  const ellipsisStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  const StatsCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    currentSize: number;
    maxSize?: number;
    percent?: number;
    onSave?: () => void;
    saving?: boolean;
    onMaxSizeChange?: (value: number) => void;
    maxSizeValue?: number;
    showSettings?: boolean;
    onClear?: () => void;
    clearing?: boolean;
    showClear?: boolean;
  }> = ({ icon, title, currentSize, maxSize, percent, onSave, saving, onMaxSizeChange, maxSizeValue, showSettings, onClear, clearing, showClear }) => (
    <div style={cardStyle}>
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minWidth: 0,
        }}
      >
        <span style={{ ...ellipsisStyle, flexShrink: 1, minWidth: 0 }}>
          {icon} {title}
        </span>
        {showClear && onClear && (
          <button
            style={{
              ...buttonStyle,
              padding: "4px 12px",
              fontSize: "11px",
              color: "#ef4444",
              borderColor: "#ef4444",
              flexShrink: 0,
            }}
            onClick={onClear}
            disabled={clearing}
          >
            {clearing ? t("storage.cleaning") || "Cleaning..." : t("storage.clear") || "Clear"}
          </button>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            ...ellipsisStyle,
          }}
        >
          {t("storage.currentSize") || "Current Size"}: {formatSize(currentSize)}
        </span>
        {maxSize && (
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              ...ellipsisStyle,
              flexShrink: 0,
            }}
          >
            {t("storage.maxLimit") || "Max Limit"}: {maxSize} MB
          </span>
        )}
      </div>
      {percent !== undefined && <ProgressBar percent={percent} />}
      {maxSize && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "6px",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          <span>0</span>
          <span>{Math.round(maxSize / 4)} MB</span>
          <span>{Math.round(maxSize / 2)} MB</span>
          <span>{Math.round(maxSize * 0.75)} MB</span>
          <span>{maxSize} MB</span>
        </div>
      )}
      {showSettings && maxSize && onMaxSizeChange && onSave && (
        <div
          style={{
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "nowrap",
              minWidth: 0,
            }}
          >
            <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.maxSize") || "Max Size"}</label>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flex: 1,
                minWidth: 0,
              }}
            >
              <input type="number" style={{ ...inputStyle, maxWidth: "120px", flexShrink: 0 }} value={maxSizeValue} onChange={(e) => onMaxSizeChange(parseInt(e.target.value) || 500)} min={500} step={100} />
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                }}
              >
                MB
              </span>
              <button style={{ ...primaryButtonStyle, flexShrink: 0 }} onClick={onSave} disabled={saving}>
                {saving ? t("storage.saving") || "Saving..." : t("settings.save") || "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  const labelStyleSmall: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-primary)",
    minWidth: "70px",
    flexShrink: 0,
    userSelect: "none",
    ...ellipsisStyle,
  };
  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "6px 16px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    cursor: "pointer",
  };
  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "var(--accent-color, #0066cc)",
    color: "white",
    border: "none",
  };
  const cardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    padding: "16px",
    border: "1px solid var(--border-color)",
    overflow: "hidden",
  };
  const folderButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    padding: "6px 10px",
    fontSize: "11px",
    flexShrink: 0,
  };
  const pathRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  };
  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {t("settings.loading") || "Loading..."}
      </div>
    );
  }
  const logsPercent = getPercentage(logsSize, maxLogSize);
  const dialogPercent = getPercentage(dialogSize, maxDialogSize);
  const favoritesPercent = getPercentage(favoritesSize, maxFavoritesSize);
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <div style={cardStyle}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "16px",
              ...ellipsisStyle,
            }}
          >
            <HardDrive size={16} style={{ display: "inline", marginRight: "6px" }} />
            {t("storage.diskStatistics") || "Disk Statistics"}
          </div>
          {/* Disk space metrics - vertical layout */}
          <div
            style={{
              marginTop: "8px",
              paddingTop: "8px",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
                minWidth: 0,
              }}
            >
              <span style={{ color: "var(--text-secondary)", ...ellipsisStyle }}>{t("storage.totalSpace") || "Total Space"}</span>
              <span
                style={{
                  color: "var(--text-primary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(diskInfo.total)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
                minWidth: 0,
              }}
            >
              <span style={{ color: "var(--text-secondary)", ...ellipsisStyle }}>{t("storage.freeSpace") || "Free Space"}</span>
              <span
                style={{
                  color: "#10b981",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(diskInfo.free)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
                minWidth: 0,
              }}
            >
              <span style={{ color: "var(--text-secondary)", ...ellipsisStyle }}>{t("storage.usedSpace") || "Used Space"}</span>
              <span
                style={{
                  color: "#f59e0b",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(diskInfo.used)}
              </span>
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <ProgressBar percent={diskInfo.total > 0 ? (diskInfo.used / diskInfo.total) * 100 : 0} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "6px",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <span>0</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "11px",
                color: "var(--text-muted)",
                textAlign: "right",
                ...ellipsisStyle,
              }}
            >
              {((diskInfo.used / diskInfo.total) * 100).toFixed(1)}% {t("storage.used") || "used"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
              paddingTop: "4px",
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                ...ellipsisStyle,
              }}
            >
              {t("storage.appTotalSize") || "Application Total Size"}: {formatSize(appTotalSize)}
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                ...ellipsisStyle,
                flexShrink: 0,
              }}
            >
              {t("storage.breakdown") || "Breakdown"}:
            </span>
          </div>
          <div
            style={{
              marginTop: "8px",
              paddingTop: "8px",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            {/* Logs */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
                minWidth: 0,
              }}
            >
              <span style={{ color: "var(--text-secondary)", ...ellipsisStyle }}>
                <FileText size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("storage.logsStatistics") || "Logs"}
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(logsSize)}
              </span>
            </div>
            {/* Historical Conversations - Group Title */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
                minWidth: 0,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              <span style={{ ...ellipsisStyle }}>
                <MessageSquare size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("storage.historicalConversations") || "Historical Conversations"}
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(dialogSize + chartDialogSize + mapDialogSize + codeEditorDialogSize + videoDialogSize + sandbox3dDialogSize)}
              </span>
            </div>
            {/* Sub-items indented under Historical Conversations */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2px",
                fontSize: "11px",
                minWidth: 0,
                paddingLeft: "24px",
              }}
            >
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {t("storage.dialogHistory") || "Dialog History"}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(dialogSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2px",
                fontSize: "11px",
                minWidth: 0,
                paddingLeft: "24px",
              }}
            >
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {t("storage.chartDialogHistory") || "Chart"}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(chartDialogSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2px",
                fontSize: "11px",
                minWidth: 0,
                paddingLeft: "24px",
              }}
            >
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {t("storage.mapDialogHistory") || "Map"}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(mapDialogSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2px",
                fontSize: "11px",
                minWidth: 0,
                paddingLeft: "24px",
              }}
            >
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {t("storage.codeEditorDialogHistory") || "Code Editor"}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(codeEditorDialogSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2px",
                fontSize: "11px",
                minWidth: 0,
                paddingLeft: "24px",
              }}
            >
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {t("storage.videoEditorDialogHistory") || "Video Editor"}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(videoDialogSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2px",
                fontSize: "11px",
                minWidth: 0,
                paddingLeft: "24px",
              }}
            >
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>└─ {t("storage.sandbox3dDialogHistory") || "3D Sandbox"}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(sandbox3dDialogSize)}
              </span>
            </div>
            {/* Favorites */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
                minWidth: 0,
                marginTop: "4px",
              }}
            >
              <span style={{ color: "var(--text-secondary)", ...ellipsisStyle }}>
                <Star size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("storage.favoritesStatistics") || "Favorites"}
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(favoritesSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
                minWidth: 0,
              }}
            >
              <span style={{ color: "var(--text-secondary)", ...ellipsisStyle }}>
                <Package size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("storage.skillsMarketDir") || "Skills Market"}
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(skillsMarketSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
                minWidth: 0,
              }}
            >
              <span style={{ color: "var(--text-secondary)", ...ellipsisStyle }}>
                <Clock size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("storage.scheduledTasksDir") || "Scheduled Tasks"}
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(scheduledTasksSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
                minWidth: 0,
              }}
            >
              <span style={{ color: "var(--text-secondary)", ...ellipsisStyle }}>
                <Settings size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("storage.settingsDir") || "Settings"}
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(settingsSize)}
              </span>
            </div>
          </div>
        </div>
        <StatsCard
          icon={<FileText size={16} />}
          title={t("storage.logsStatistics") || "Logs Statistics"}
          currentSize={logsSize}
          maxSize={maxLogSize}
          percent={logsPercent}
          showSettings={true}
          maxSizeValue={maxLogSize}
          onMaxSizeChange={setMaxLogSize}
          onSave={handleSaveMaxLogSize}
          saving={savingLogs}
          showClear={true}
          onClear={handleClearLogs}
          clearing={cleaningLogs}
        />
        <StatsCard
          icon={<MessageSquare size={16} />}
          title={t("storage.dialogStatistics") || "Dialog History Statistics"}
          currentSize={dialogSize}
          maxSize={maxDialogSize}
          percent={dialogPercent}
          showSettings={true}
          maxSizeValue={maxDialogSize}
          onMaxSizeChange={setMaxDialogSize}
          onSave={handleSaveMaxDialogSize}
          saving={savingDialog}
          showClear={true}
          onClear={handleClearDialogHistory}
          clearing={cleaningDialog}
        />
        <StatsCard
          icon={<Star size={16} />}
          title={t("storage.favoritesStatistics") || "Favorites Statistics"}
          currentSize={favoritesSize}
          maxSize={maxFavoritesSize}
          percent={favoritesPercent}
          showSettings={true}
          maxSizeValue={maxFavoritesSize}
          onMaxSizeChange={setMaxFavoritesSize}
          onSave={handleSaveMaxFavoritesSize}
          saving={savingFavorites}
          showClear={true}
          onClear={handleClearFavorites}
          clearing={cleaningFavorites}
        />
        <div style={cardStyle}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "12px",
              ...ellipsisStyle,
            }}
          >
            <FolderOpen size={16} style={{ display: "inline", marginRight: "6px" }} />
            {t("storage.dataDirectories") || "Data Directories"}
          </div>
          {/* Application Root Directory */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "nowrap",
              minWidth: 0,
            }}
          >
            <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.appRootDir") || "Application Root"}</label>
            <div style={pathRowStyle}>
              <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={appRootDir} disabled readOnly />
              <button style={folderButtonStyle} onClick={() => handleOpenDirectory(appRootDir)}>
                <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("settings.open") || "Open"}
              </button>
            </div>
          </div>
          {/* Logs Directory */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "nowrap",
              minWidth: 0,
            }}
          >
            <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.logsDir") || "Logs Directory"}</label>
            <div style={pathRowStyle}>
              <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={logsDir} disabled readOnly />
              <button style={folderButtonStyle} onClick={() => handleOpenDirectory(logsDir)}>
                <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("settings.open") || "Open"}
              </button>
            </div>
          </div>
          {/* Settings Directory */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "nowrap",
              minWidth: 0,
            }}
          >
            <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.settingsDir") || "Settings Directory"}</label>
            <div style={pathRowStyle}>
              <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={settingsDir} disabled readOnly />
              <button style={folderButtonStyle} onClick={() => handleOpenDirectory(settingsDir)}>
                <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("settings.open") || "Open"}
              </button>
            </div>
          </div>
          {/* Dialog History Directory */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "nowrap",
              minWidth: 0,
            }}
          >
            <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.dialogHistoryDir") || "Dialog History Directory"}</label>
            <div style={pathRowStyle}>
              <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={dialogHistoryDir} disabled readOnly />
              <button style={folderButtonStyle} onClick={() => handleOpenDirectory(dialogHistoryDir)}>
                <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("settings.open") || "Open"}
              </button>
            </div>
          </div>
          {/* Video Editor Dialog History Directory */}
          {videoDialogHistoryDir && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "nowrap",
                minWidth: 0,
              }}
            >
              <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.videoDialogHistoryDir") || "Video Editor Dialog History"}</label>
              <div style={pathRowStyle}>
                <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={videoDialogHistoryDir} disabled readOnly />
                <button style={folderButtonStyle} onClick={() => handleOpenDirectory(videoDialogHistoryDir)}>
                  <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                  {t("settings.open") || "Open"}
                </button>
              </div>
            </div>
          )}
          {/* Chart Dialog History Directory */}
          {chartDialogHistoryDir && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "nowrap",
                minWidth: 0,
              }}
            >
              <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.chartDialogHistoryDir") || "Chart Dialog History"}</label>
              <div style={pathRowStyle}>
                <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={chartDialogHistoryDir} disabled readOnly />
                <button style={folderButtonStyle} onClick={() => handleOpenDirectory(chartDialogHistoryDir)}>
                  <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                  {t("settings.open") || "Open"}
                </button>
              </div>
            </div>
          )}
          {/* Code Editor Dialog History Directory */}
          {codeEditorDialogHistoryDir && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "nowrap",
                minWidth: 0,
              }}
            >
              <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.codeEditorDialogHistoryDir") || "Code Editor Dialog History"}</label>
              <div style={pathRowStyle}>
                <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={codeEditorDialogHistoryDir} disabled readOnly />
                <button style={folderButtonStyle} onClick={() => handleOpenDirectory(codeEditorDialogHistoryDir)}>
                  <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                  {t("settings.open") || "Open"}
                </button>
              </div>
            </div>
          )}
          {/* Map Dialog History Directory */}
          {mapDialogHistoryDir && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "nowrap",
                minWidth: 0,
              }}
            >
              <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.mapDialogHistoryDir") || "Map Dialog History"}</label>
              <div style={pathRowStyle}>
                <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={mapDialogHistoryDir} disabled readOnly />
                <button style={folderButtonStyle} onClick={() => handleOpenDirectory(mapDialogHistoryDir)}>
                  <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                  {t("settings.open") || "Open"}
                </button>
              </div>
            </div>
          )}
          {/* 3D Sandbox Dialog History Directory */}
          {sandbox3dDialogHistoryDir && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "nowrap",
                minWidth: 0,
              }}
            >
              <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.sandbox3dDialogHistoryDir") || "3D Sandbox Dialog History"}</label>
              <div style={pathRowStyle}>
                <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={sandbox3dDialogHistoryDir} disabled readOnly />
                <button style={folderButtonStyle} onClick={() => handleOpenDirectory(sandbox3dDialogHistoryDir)}>
                  <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                  {t("settings.open") || "Open"}
                </button>
              </div>
            </div>
          )}
          {/* Favorites Directory */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "nowrap",
              minWidth: 0,
            }}
          >
            <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.favoritesDir") || "Favorites Directory"}</label>
            <div style={pathRowStyle}>
              <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={favoritesDir} disabled readOnly />
              <button style={folderButtonStyle} onClick={() => handleOpenDirectory(favoritesDir)}>
                <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("settings.open") || "Open"}
              </button>
            </div>
          </div>
          {/* Skills Market Directory */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "nowrap",
              minWidth: 0,
            }}
          >
            <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.skillsMarketDir") || "Skills Market Directory"}</label>
            <div style={pathRowStyle}>
              <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={skillsMarketDir} disabled readOnly />
              <button style={folderButtonStyle} onClick={() => handleOpenDirectory(skillsMarketDir)}>
                <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("settings.open") || "Open"}
              </button>
            </div>
          </div>
          {/* Scheduled Tasks Directory */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "nowrap",
              minWidth: 0,
            }}
          >
            <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{t("storage.scheduledTasksDir") || "Scheduled Tasks Directory"}</label>
            <div style={pathRowStyle}>
              <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={scheduledTasksDir} disabled readOnly />
              <button style={folderButtonStyle} onClick={() => handleOpenDirectory(scheduledTasksDir)}>
                <Folder size={14} style={{ display: "inline", marginRight: "4px" }} />
                {t("settings.open") || "Open"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default StorageConfig;
