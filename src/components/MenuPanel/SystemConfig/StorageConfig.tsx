import React, { useState, useEffect } from "react";
import { showToast, ToastType } from "../../Toast";
import { showDialog, DialogType } from "../../Dialog";
import { storageCommands } from "../../../command/config";
import { filesCommands } from "../../../command/files";
import { getDataPaths } from "../../../command/paths";
import { HardDrive, FolderOpen, FileText, MessageSquare, Star, Package, Clock, Settings, Folder, ChevronDown, ChevronRight, Image as ImageIcon, Grid3x3, Database, Container, Globe, Video, Box, Code, Map as MapIcon, PieChart } from "lucide-react";
import { NumberInput } from "../../NumberInput";
interface StorageConfigProps {
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
}
const StorageConfig: React.FC<StorageConfigProps> = ({ t, onSave }) => {
  const isZh = t("i18n") === "zh";
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
  const [financeDialogHistoryDir, setFinanceDialogHistoryDir] = useState("");
  const [mapDialogHistoryDir, setMapDialogHistoryDir] = useState("");
  const [codeEditorDialogHistoryDir, setCodeEditorDialogHistoryDir] = useState("");
  const [videoDialogHistoryDir, setVideoDialogHistoryDir] = useState("");
  const [sandbox3dDialogHistoryDir, setSandbox3dDialogHistoryDir] = useState("");
  const [imageEditorDialogHistoryDir, setImageEditorDialogHistoryDir] = useState("");
  const [pixelEditorDialogHistoryDir, setPixelEditorDialogHistoryDir] = useState("");
  const [databaseClientDialogHistoryDir, setDatabaseClientDialogHistoryDir] = useState("");
  const [dockerClientDialogHistoryDir, setDockerClientDialogHistoryDir] = useState("");
  const [apiClientDialogHistoryDir, setApiClientDialogHistoryDir] = useState("");
  const [financeDialogSize, setFinanceDialogSize] = useState<number>(0);
  const [mapDialogSize, setMapDialogSize] = useState<number>(0);
  const [codeEditorDialogSize, setCodeEditorDialogSize] = useState<number>(0);
  const [videoDialogSize, setVideoDialogSize] = useState<number>(0);
  const [sandbox3dDialogSize, setSandbox3dDialogSize] = useState<number>(0);
  const [imageEditorDialogSize, setImageEditorDialogSize] = useState<number>(0);
  const [pixelEditorDialogSize, setPixelEditorDialogSize] = useState<number>(0);
  const [databaseClientDialogSize, setDatabaseClientDialogSize] = useState<number>(0);
  const [dockerClientDialogSize, setDockerClientDialogSize] = useState<number>(0);
  const [apiClientDialogSize, setApiClientDialogSize] = useState<number>(0);
  const [diskInfo, setDiskInfo] = useState<{
    total: number;
    free: number;
    used: number;
  }>({
    total: 0,
    free: 0,
    used: 0,
  });
  const [showBasicDirs, setShowBasicDirs] = useState(true);
  const [showHistoryDirs, setShowHistoryDirs] = useState(true);
  const [showOtherDirs, setShowOtherDirs] = useState(true);
  const l = (zh: string, en: string): string => (isZh ? zh : en);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    setLoading(true);
    try {
      const paths = await getDataPaths();
      const favoritesDirPath = await storageCommands.getFavoritesDir();
      setLogsDir(String(paths.log_dir ?? ""));
      setDialogHistoryDir(String(paths.general_history_dir ?? ""));
      setFavoritesDir(favoritesDirPath);
      setSkillsMarketDir(String(paths.skills_market_dir ?? ""));
      setScheduledTasksDir(String(paths.scheduled_tasks_dir ?? ""));
      setSettingsDir(String(paths.settings_dir ?? ""));
      setAppRootDir(String(paths.app_root_dir ?? ""));
      setFinanceDialogHistoryDir(String((paths as any).finance_dialog_history_dir ?? ""));
      setMapDialogHistoryDir(String((paths as any).map_dialog_history_dir ?? ""));
      setCodeEditorDialogHistoryDir(String((paths as any).codeeditor_dialog_history_dir ?? ""));
      setVideoDialogHistoryDir(String((paths as any).video_editing_system_dialog_history_dir ?? ""));
      setSandbox3dDialogHistoryDir(String((paths as any).sandbox3d_dialog_history_dir ?? ""));
      setImageEditorDialogHistoryDir(String((paths as any).imageeditor_dialog_history_dir ?? ""));
      setPixelEditorDialogHistoryDir(String((paths as any).pixeleditor_dialog_history_dir ?? ""));
      setDatabaseClientDialogHistoryDir(String((paths as any).databaseclient_dialog_history_dir ?? ""));
      setDockerClientDialogHistoryDir(String((paths as any).dockerclient_dialog_history_dir ?? ""));
      setApiClientDialogHistoryDir(String((paths as any).apiclient_dialog_history_dir ?? ""));
      const [
        logsSizeVal,
        dialogSizeVal,
        favoritesSizeVal,
        skillsMarketSizeVal,
        scheduledTasksSizeVal,
        settingsSizeVal,
        maxLogSizeVal,
        maxDialogSizeVal,
        maxFavoritesSizeVal,
        diskInfoVal,
        financeDialogSizeVal,
        mapDialogSizeVal,
        codeEditorDialogSizeVal,
        videoDialogSizeVal,
        sandbox3dDialogSizeVal,
        imageEditorDialogSizeVal,
        pixelEditorDialogSizeVal,
        databaseClientDialogSizeVal,
        dockerClientDialogSizeVal,
        apiClientDialogSizeVal,
      ] = await Promise.all([
        storageCommands.getDirectorySize(paths.log_dir),
        storageCommands.getDirectorySize(paths.general_history_dir),
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
        storageCommands.getDirectorySize(String((paths as any).imageeditor_dialog_history_dir ?? "")),
        storageCommands.getDirectorySize(String((paths as any).pixeleditor_dialog_history_dir ?? "")),
        storageCommands.getDirectorySize(String((paths as any).databaseclient_dialog_history_dir ?? "")),
        storageCommands.getDirectorySize(String((paths as any).dockerclient_dialog_history_dir ?? "")),
        storageCommands.getDirectorySize(String((paths as any).apiclient_dialog_history_dir ?? "")),
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
      setFinanceDialogSize(financeDialogSizeVal);
      setMapDialogSize(mapDialogSizeVal);
      setCodeEditorDialogSize(codeEditorDialogSizeVal);
      setVideoDialogSize(videoDialogSizeVal);
      setSandbox3dDialogSize(sandbox3dDialogSizeVal);
      setImageEditorDialogSize(imageEditorDialogSizeVal);
      setPixelEditorDialogSize(pixelEditorDialogSizeVal);
      setDatabaseClientDialogSize(databaseClientDialogSizeVal);
      setDockerClientDialogSize(dockerClientDialogSizeVal);
      setApiClientDialogSize(apiClientDialogSizeVal);
      const total =
        logsSizeVal +
        dialogSizeVal +
        favoritesSizeVal +
        skillsMarketSizeVal +
        scheduledTasksSizeVal +
        settingsSizeVal +
        financeDialogSizeVal +
        mapDialogSizeVal +
        codeEditorDialogSizeVal +
        videoDialogSizeVal +
        sandbox3dDialogSizeVal +
        imageEditorDialogSizeVal +
        pixelEditorDialogSizeVal +
        databaseClientDialogSizeVal +
        dockerClientDialogSizeVal +
        apiClientDialogSizeVal;
      setAppTotalSize(total);
    } catch (error) {
      showToast(ToastType.ERROR, l("加载存储数据失败", "Failed to load storage data"));
    } finally {
      setLoading(false);
    }
  };
  const handleSaveMaxLogSize = async () => {
    if (maxLogSize < 500) {
      showToast(ToastType.WARNING, l("最小大小为 500MB", "Minimum size is 500MB"));
      return;
    }
    setSavingLogs(true);
    try {
      await storageCommands.setMaxLogSize(maxLogSize);
      if (onSave) onSave({ action: "setMaxLogSize", maxLogSize });
      showToast(ToastType.SUCCESS, l("设置已保存", "Settings saved"));
    } catch (error) {
      showToast(ToastType.ERROR, l("保存设置失败", "Failed to save settings"));
    } finally {
      setSavingLogs(false);
    }
  };
  const handleSaveMaxDialogSize = async () => {
    if (maxDialogSize < 500) {
      showToast(ToastType.WARNING, l("最小大小为 500MB", "Minimum size is 500MB"));
      return;
    }
    setSavingDialog(true);
    try {
      await storageCommands.setMaxDialogSize(maxDialogSize);
      if (onSave) onSave({ action: "setMaxDialogSize", maxDialogSize });
      showToast(ToastType.SUCCESS, l("设置已保存", "Settings saved"));
    } catch (error) {
      showToast(ToastType.ERROR, l("保存设置失败", "Failed to save settings"));
    } finally {
      setSavingDialog(false);
    }
  };
  const handleSaveMaxFavoritesSize = async () => {
    if (maxFavoritesSize < 500) {
      showToast(ToastType.WARNING, l("最小大小为 500MB", "Minimum size is 500MB"));
      return;
    }
    setSavingFavorites(true);
    try {
      await storageCommands.setMaxFavoritesSize(maxFavoritesSize);
      if (onSave) onSave({ action: "setMaxFavoritesSize", maxFavoritesSize });
      showToast(ToastType.SUCCESS, l("设置已保存", "Settings saved"));
    } catch (error) {
      showToast(ToastType.ERROR, l("保存设置失败", "Failed to save settings"));
    } finally {
      setSavingFavorites(false);
    }
  };
  const handleClearDialogHistory = async () => {
    showDialog(
      DialogType.WARNING,
      l("确认", "Confirm"),
      l("确定要清空所有对话历史吗？此操作无法撤销。", "Are you sure you want to clear all dialog history? This action cannot be undone."),
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
          showToast(ToastType.SUCCESS, l("对话历史已清空", "Dialog history cleared"));
        } catch (error) {
          showToast(ToastType.ERROR, l("清空失败", "Failed to clear"));
        } finally {
          setCleaningDialog(false);
        }
      },
      undefined,
      l("确认", "Confirm"),
      l("取消", "Cancel"),
    );
  };
  const handleClearFavorites = async () => {
    showDialog(
      DialogType.WARNING,
      l("确认", "Confirm"),
      l("确定要清空所有收藏吗？此操作无法撤销。", "Are you sure you want to clear all favorites? This action cannot be undone."),
      async () => {
        setCleaningFavorites(true);
        try {
          const { skillsMarketCommands } = await import("../../../command/skills");
          const favoritedIds = await skillsMarketCommands.getFavoritedSkills();
          for (const id of favoritedIds) {
            await skillsMarketCommands.unfavoriteSkill(id);
          }
          await loadData();
          showToast(ToastType.SUCCESS, l("收藏已清空", "Favorites cleared"));
        } catch (error) {
          showToast(ToastType.ERROR, l("清空失败", "Failed to clear"));
        } finally {
          setCleaningFavorites(false);
        }
      },
      undefined,
      l("确认", "Confirm"),
      l("取消", "Cancel"),
    );
  };
  const handleClearLogs = async () => {
    showDialog(
      DialogType.WARNING,
      l("确认", "Confirm"),
      l("确定要清空所有日志吗？此操作无法撤销。", "Are you sure you want to clear all logs? This action cannot be undone."),
      async () => {
        setCleaningLogs(true);
        try {
          await storageCommands.clearLogs();
          await loadData();
          showToast(ToastType.SUCCESS, l("日志已清空", "Logs cleared"));
        } catch (error) {
          showToast(ToastType.ERROR, l("清空失败", "Failed to clear"));
        } finally {
          setCleaningLogs(false);
        }
      },
      undefined,
      l("确认", "Confirm"),
      l("取消", "Cancel"),
    );
  };
  const handleOpenDirectory = async (path: string) => {
    if (path) {
      try {
        await filesCommands.openPath(path);
      } catch (error) {
        showToast(ToastType.ERROR, l("打开目录失败", "Failed to open directory"));
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
  const iconTextRowStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
    flexShrink: 1,
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
          flexWrap: "nowrap",
        }}
      >
        <span style={{ ...iconTextRowStyle, flexShrink: 1, minWidth: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>{icon}</span>
          <span style={{ ...ellipsisStyle, minWidth: 0 }}>{title}</span>
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
            {clearing ? l("清理中...", "Cleaning...") : l("清理", "Clear")}
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
          {l("当前大小", "Current Size")}: {formatSize(currentSize)}
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
            {l("最大限制", "Max Limit")}: {maxSize} MB
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
            <label style={{ ...labelStyleSmall, flexShrink: 0 }}>{l("最大大小", "Max Size")}</label>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flex: 1,
                minWidth: 0,
              }}
            >
              {/* Use NumberInput component for numeric max size input */}
              <NumberInput value={String(maxSizeValue ?? "")} onChange={(val) => onMaxSizeChange(parseInt(val) || 500)} min={500} step={100} width={120} align="right" />
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
                {saving ? l("保存中...", "Saving...") : l("保存", "Save")}
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
  const DirectoryRow: React.FC<{
    icon?: React.ReactNode;
    label: string;
    path: string;
  }> = ({ icon, label, path }) => {
    if (!path) return null;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 8px",
          borderRadius: "6px",
          background: "var(--bg-tertiary)",
          marginBottom: "6px",
          minWidth: 0,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            color: "var(--text-secondary)",
            flexShrink: 0,
          }}
        >
          {icon ?? <Folder size={14} />}
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-primary)",
            minWidth: "110px",
            flexShrink: 0,
            ...ellipsisStyle,
          }}
          title={label}
        >
          {label}
        </span>
        <input
          style={{
            ...inputStyle,
            flex: 1,
            minWidth: 0,
            padding: "5px 8px",
            fontSize: "11px",
            background: "var(--bg-secondary)",
          }}
          value={path}
          disabled
          readOnly
          title={path}
        />
        <button style={folderButtonStyle} onClick={() => handleOpenDirectory(path)}>
          <Folder size={12} style={{ display: "inline", marginRight: "4px" }} />
          {l("打开", "Open")}
        </button>
      </div>
    );
  };
  const GroupHeader: React.FC<{
    title: string;
    expanded: boolean;
    onToggle: () => void;
    count?: number;
  }> = ({ title, expanded, onToggle, count }) => (
    <div
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        userSelect: "none",
        padding: "8px 4px",
        marginTop: "4px",
        borderTop: "1px solid var(--border-color)",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", color: "var(--text-secondary)", flexShrink: 0 }}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          ...ellipsisStyle,
        }}
      >
        {title}
      </span>
      {count !== undefined && (
        <span
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginLeft: "auto",
            flexShrink: 0,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
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
        {l("加载中...", "Loading...")}
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
              ...iconTextRowStyle,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
              <HardDrive size={16} />
            </span>
            <span style={{ ...ellipsisStyle, minWidth: 0 }}>{l("磁盘统计", "Disk Statistics")}</span>
          </div>
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
              <span style={{ color: "var(--text-secondary)", ...ellipsisStyle }}>{l("总空间", "Total Space")}</span>
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
              <span style={{ color: "var(--text-secondary)", ...ellipsisStyle }}>{l("可用空间", "Free Space")}</span>
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
              <span style={{ color: "var(--text-secondary)", ...ellipsisStyle }}>{l("已用空间", "Used Space")}</span>
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
              {((diskInfo.used / diskInfo.total) * 100).toFixed(1)}% {l("已使用", "used")}
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
              {l("应用总大小", "Application Total Size")}: {formatSize(appTotalSize)}
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                ...ellipsisStyle,
                flexShrink: 0,
              }}
            >
              {l("明细", "Breakdown")}:
            </span>
          </div>
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
              <span style={{ color: "var(--text-secondary)", ...iconTextRowStyle }}>
                <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                  <FileText size={14} />
                </span>
                <span style={{ ...ellipsisStyle, minWidth: 0 }}>{l("日志", "Logs")}</span>
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
              <span style={{ ...iconTextRowStyle, minWidth: 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                  <MessageSquare size={14} />
                </span>
                <span style={{ ...ellipsisStyle, minWidth: 0 }}>{l("历史对话", "Historical Conversations")}</span>
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(dialogSize + financeDialogSize + mapDialogSize + codeEditorDialogSize + videoDialogSize + sandbox3dDialogSize + imageEditorDialogSize + pixelEditorDialogSize + databaseClientDialogSize + dockerClientDialogSize + apiClientDialogSize)}
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
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {l("对话历史", "Dialog History")}</span>
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
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {l("图表", "Chart")}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(financeDialogSize)}
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
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {l("地图", "Map")}</span>
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
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {l("代码编辑器", "Code Editor")}</span>
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
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {l("视频编辑器", "Video Editor")}</span>
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
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {l("3D 沙盒", "3D Sandbox")}</span>
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
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {l("图片编辑器", "Image Editor")}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(imageEditorDialogSize)}
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
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {l("像素编辑器", "Pixel Editor")}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(pixelEditorDialogSize)}
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
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {l("数据库客户端", "Database Client")}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(databaseClientDialogSize)}
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
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>├─ {l("Docker 客户端", "Docker Client")}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(dockerClientDialogSize)}
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
              <span style={{ color: "var(--text-tertiary)", ...ellipsisStyle }}>└─ {l("API 客户端", "API Client")}</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  ...ellipsisStyle,
                  flexShrink: 0,
                }}
              >
                {formatSize(apiClientDialogSize)}
              </span>
            </div>
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
              <span style={{ color: "var(--text-secondary)", ...iconTextRowStyle }}>
                <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                  <Star size={14} />
                </span>
                <span style={{ ...ellipsisStyle, minWidth: 0 }}>{l("收藏", "Favorites")}</span>
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
              <span style={{ color: "var(--text-secondary)", ...iconTextRowStyle }}>
                <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                  <Package size={14} />
                </span>
                <span style={{ ...ellipsisStyle, minWidth: 0 }}>{l("技能市场", "Skills Market")}</span>
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
              <span style={{ color: "var(--text-secondary)", ...iconTextRowStyle }}>
                <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                  <Clock size={14} />
                </span>
                <span style={{ ...ellipsisStyle, minWidth: 0 }}>{l("定时任务", "Scheduled Tasks")}</span>
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
              <span style={{ color: "var(--text-secondary)", ...iconTextRowStyle }}>
                <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                  <Settings size={14} />
                </span>
                <span style={{ ...ellipsisStyle, minWidth: 0 }}>{l("设置", "Settings")}</span>
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
          title={l("日志统计", "Logs Statistics")}
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
          title={l("对话历史统计", "Dialog History Statistics")}
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
          title={l("收藏统计", "Favorites Statistics")}
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
              ...iconTextRowStyle,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
              <FolderOpen size={16} />
            </span>
            <span style={{ ...ellipsisStyle, minWidth: 0 }}>{l("数据目录", "Data Directories")}</span>
          </div>
          <GroupHeader title={l("基础目录", "Basic Directories")} expanded={showBasicDirs} onToggle={() => setShowBasicDirs((v) => !v)} count={3} />
          {showBasicDirs && (
            <div style={{ paddingLeft: "8px" }}>
              <DirectoryRow icon={<Folder size={14} />} label={l("应用根目录", "Application Root")} path={appRootDir} />
              <DirectoryRow icon={<FileText size={14} />} label={l("日志目录", "Logs Directory")} path={logsDir} />
              <DirectoryRow icon={<Settings size={14} />} label={l("设置目录", "Settings Directory")} path={settingsDir} />
            </div>
          )}
          <GroupHeader title={l("对话历史目录", "Dialog History Directories")} expanded={showHistoryDirs} onToggle={() => setShowHistoryDirs((v) => !v)} count={11} />
          {showHistoryDirs && (
            <div style={{ paddingLeft: "8px" }}>
              <DirectoryRow icon={<MessageSquare size={14} />} label={l("通用对话历史", "General Chat History")} path={dialogHistoryDir} />
              <DirectoryRow icon={<PieChart size={14} />} label={l("图表对话历史", "Chart Dialog History")} path={financeDialogHistoryDir} />
              <DirectoryRow icon={<MapIcon size={14} />} label={l("地图对话历史", "Map Dialog History")} path={mapDialogHistoryDir} />
              <DirectoryRow icon={<Code size={14} />} label={l("代码编辑器对话历史", "Code Editor Dialog History")} path={codeEditorDialogHistoryDir} />
              <DirectoryRow icon={<Video size={14} />} label={l("视频编辑器对话历史", "Video Editor Dialog History")} path={videoDialogHistoryDir} />
              <DirectoryRow icon={<Box size={14} />} label={l("3D 沙盒对话历史", "3D Sandbox Dialog History")} path={sandbox3dDialogHistoryDir} />
              <DirectoryRow icon={<ImageIcon size={14} />} label={l("图片编辑器对话历史", "Image Editor Dialog History")} path={imageEditorDialogHistoryDir} />
              <DirectoryRow icon={<Grid3x3 size={14} />} label={l("像素编辑器对话历史", "Pixel Editor Dialog History")} path={pixelEditorDialogHistoryDir} />
              <DirectoryRow icon={<Database size={14} />} label={l("数据库客户端对话历史", "Database Client Dialog History")} path={databaseClientDialogHistoryDir} />
              <DirectoryRow icon={<Container size={14} />} label={l("Docker 客户端对话历史", "Docker Client Dialog History")} path={dockerClientDialogHistoryDir} />
              <DirectoryRow icon={<Globe size={14} />} label={l("API 客户端对话历史", "API Client Dialog History")} path={apiClientDialogHistoryDir} />
            </div>
          )}
          <GroupHeader title={l("其他目录", "Other Directories")} expanded={showOtherDirs} onToggle={() => setShowOtherDirs((v) => !v)} count={3} />
          {showOtherDirs && (
            <div style={{ paddingLeft: "8px" }}>
              <DirectoryRow icon={<Star size={14} />} label={l("收藏目录", "Favorites Directory")} path={favoritesDir} />
              <DirectoryRow icon={<Package size={14} />} label={l("技能市场目录", "Skills Market Directory")} path={skillsMarketDir} />
              <DirectoryRow icon={<Clock size={14} />} label={l("定时任务目录", "Scheduled Tasks Directory")} path={scheduledTasksDir} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default StorageConfig;
