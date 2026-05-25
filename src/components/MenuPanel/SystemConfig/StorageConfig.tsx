import React, { useState, useEffect } from "react";
import {
  getDataPaths,
  getDirectorySize,
  getDiskInfo,
  getMaxDialogSize,
  getMaxLogSize,
} from "../../../api/paths";
import { filesCommands } from "../../../api/files";
import { storageCommands } from "../../../api/config";

interface StorageConfigProps {
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
}

const StorageConfig: React.FC<StorageConfigProps> = ({ t, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [logsSize, setLogsSize] = useState<number>(0);
  const [dialogSize, setDialogSize] = useState<number>(0);
  const [skillsMarketSize, setSkillsMarketSize] = useState<number>(0);
  const [scheduledTasksSize, setScheduledTasksSize] = useState<number>(0);
  const [settingsSize, setSettingsSize] = useState<number>(0);
  const [appTotalSize, setAppTotalSize] = useState<number>(0);
  const [maxLogSize, setMaxLogSize] = useState<number>(500);
  const [maxDialogSize, setMaxDialogSize] = useState<number>(500);
  const [savingLogs, setSavingLogs] = useState(false);
  const [savingDialog, setSavingDialog] = useState(false);
  const [logsDir, setLogsDir] = useState("");
  const [dialogHistoryDir, setDialogHistoryDir] = useState("");
  const [skillsMarketDir, setSkillsMarketDir] = useState("");
  const [scheduledTasksDir, setScheduledTasksDir] = useState("");
  const [settingsDir, setSettingsDir] = useState("");
  const [appRootDir, setAppRootDir] = useState("");
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

      setLogsDir(String(paths.log_dir ?? ""));
      setDialogHistoryDir(String(paths.dialog_history_dir ?? ""));
      setSkillsMarketDir(String(paths.skills_market_dir ?? ""));
      setScheduledTasksDir(String(paths.scheduled_tasks_dir ?? ""));
      setSettingsDir(String(paths.settings_dir ?? ""));
      setAppRootDir(String(paths.app_root_dir ?? ""));
      const [
        logsSizeVal,
        dialogSizeVal,
        skillsMarketSizeVal,
        scheduledTasksSizeVal,
        settingsSizeVal,
        maxLogSizeVal,
        maxDialogSizeVal,
        diskInfoVal,
      ] = await Promise.all([
        storageCommands.getDirectorySize(paths.log_dir),
        storageCommands.getDirectorySize(paths.dialog_history_dir),
        storageCommands.getDirectorySize(paths.skills_market_dir),
        storageCommands.getDirectorySize(paths.scheduled_tasks_dir),
        storageCommands.getDirectorySize(paths.settings_dir),
        storageCommands.getMaxLogSize(),
        storageCommands.getMaxDialogSize(),
        storageCommands.getDiskInfo(paths.app_root_dir),
      ]);
      setLogsSize(logsSizeVal);
      setDialogSize(dialogSizeVal);
      setSkillsMarketSize(skillsMarketSizeVal);
      setScheduledTasksSize(scheduledTasksSizeVal);
      setSettingsSize(settingsSizeVal);
      setMaxLogSize(maxLogSizeVal);
      setMaxDialogSize(maxDialogSizeVal);
      setDiskInfo(diskInfoVal);
      const total =
        logsSizeVal +
        dialogSizeVal +
        skillsMarketSizeVal +
        scheduledTasksSizeVal +
        settingsSizeVal;
      setAppTotalSize(total);
    } catch (error) {
      console.error("Failed to load storage data:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleSaveMaxLogSize = async () => {
    if (maxLogSize < 500) {
      alert(t("storage.maxLogSizeMin") || "Minimum size is 500MB");
      return;
    }
    setSavingLogs(true);
    try {
      await storageCommands.setMaxLogSize(maxLogSize);
      if (onSave) onSave({ action: "setMaxLogSize", maxLogSize });
    } catch (error) {
      console.error("Failed to save max log size:", error);
      alert(t("storage.saveFailed") || "Failed to save settings");
    } finally {
      setSavingLogs(false);
    }
  };
  const handleSaveMaxDialogSize = async () => {
    if (maxDialogSize < 500) {
      alert(t("storage.maxDialogSizeMin") || "Minimum size is 500MB");
      return;
    }
    setSavingDialog(true);
    try {
      await storageCommands.setMaxDialogSize(maxDialogSize);
      if (onSave) onSave({ action: "setMaxDialogSize", maxDialogSize });
    } catch (error) {
      console.error("Failed to save max dialog size:", error);
      alert(t("storage.saveFailed") || "Failed to save settings");
    } finally {
      setSavingDialog(false);
    }
  };
  const handleOpenDirectory = async (path: string) => {
    if (path) {
      try {
        await filesCommands.openPath(path);
      } catch (error) {
        console.error("Failed to open directory:", error);
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
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
  const StatsCard: React.FC<{
    icon: string;
    title: string;
    currentSize: number;
    maxSize?: number;
    percent: number;
    onSave?: () => void;
    saving?: boolean;
    onMaxSizeChange?: (value: number) => void;
    maxSizeValue?: number;
    showSettings?: boolean;
  }> = ({
    icon,
    title,
    currentSize,
    maxSize,
    percent,
    onSave,
    saving,
    onMaxSizeChange,
    maxSizeValue,
    showSettings,
  }) => (
    <div style={cardStyle}>
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: "16px",
        }}
      >
        {icon} {title}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          {t("storage.currentSize") || "Current Size"}:{" "}
          {formatSize(currentSize)}
        </span>
        {maxSize && (
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            {t("storage.maxLimit") || "Max Limit"}: {maxSize} MB
          </span>
        )}
      </div>
      <ProgressBar percent={percent} />
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
        {maxSize && (
          <>
            <span>{Math.round(maxSize / 4)} MB</span>
            <span>{Math.round(maxSize / 2)} MB</span>
            <span>{Math.round(maxSize * 0.75)} MB</span>
            <span>{maxSize} MB</span>
          </>
        )}
      </div>
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
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyleSmall}>
              {t("storage.maxSize") || "Max Size"}
            </label>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flex: 1,
              }}
            >
              <input
                type="number"
                style={{ ...inputStyle, maxWidth: "120px" }}
                value={maxSizeValue}
                onChange={(e) =>
                  onMaxSizeChange(parseInt(e.target.value) || 500)
                }
                min={500}
                step={100}
              />
              <span
                style={{ fontSize: "13px", color: "var(--text-secondary)" }}
              >
                MB
              </span>
              <button
                style={primaryButtonStyle}
                onClick={onSave}
                disabled={saving}
              >
                {saving
                  ? t("storage.saving") || "Saving..."
                  : t("settings.save") || "Save"}
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
    transition: "all 0.2s",
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
  };

  const folderButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    padding: "6px 10px",
    fontSize: "11px",
  };

  const pathRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
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
        {t("atomicSkills.loading") || "Loading..."}
      </div>
    );
  }

  const logsPercent = getPercentage(logsSize, maxLogSize);
  const dialogPercent = getPercentage(dialogSize, maxDialogSize);

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
        }}
      >
        <div style={cardStyle}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "16px",
            }}
          >
            💾 {t("storage.diskStatistics") || "Disk Statistics"}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "12px",
              flexWrap: "wrap",
              gap: "8px",
              paddingBottom: "12px",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {t("storage.totalSpace") || "Total Space"}:{" "}
              {formatSize(diskInfo.total)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {t("storage.freeSpace") || "Free Space"}:{" "}
              {formatSize(diskInfo.free)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {t("storage.usedSpace") || "Used Space"}:{" "}
              {formatSize(diskInfo.used)}
            </span>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <ProgressBar
              percent={
                diskInfo.total > 0 ? (diskInfo.used / diskInfo.total) * 100 : 0
              }
            />
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
              }}
            >
              {((diskInfo.used / diskInfo.total) * 100).toFixed(1)}%{" "}
              {t("storage.used") || "used"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
              paddingTop: "4px",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {t("storage.appTotalSize") || "Application Total Size"}:{" "}
              {formatSize(appTotalSize)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                📊 {t("storage.logsStatistics") || "Logs"}
              </span>
              <span style={{ color: "var(--text-primary)" }}>
                {formatSize(logsSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                💬 {t("storage.dialogStatistics") || "Dialog History"}
              </span>
              <span style={{ color: "var(--text-primary)" }}>
                {formatSize(dialogSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                📦 {t("storage.skillsMarketDir") || "Skills Market"}
              </span>
              <span style={{ color: "var(--text-primary)" }}>
                {formatSize(skillsMarketSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                ⏰ {t("storage.scheduledTasksDir") || "Scheduled Tasks"}
              </span>
              <span style={{ color: "var(--text-primary)" }}>
                {formatSize(scheduledTasksSize)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                ⚙️ {t("storage.settingsDir") || "Settings"}
              </span>
              <span style={{ color: "var(--text-primary)" }}>
                {formatSize(settingsSize)}
              </span>
            </div>
          </div>
        </div>

        <StatsCard
          icon="📊"
          title={t("storage.logsStatistics") || "Logs Statistics"}
          currentSize={logsSize}
          maxSize={maxLogSize}
          percent={logsPercent}
          showSettings={true}
          maxSizeValue={maxLogSize}
          onMaxSizeChange={setMaxLogSize}
          onSave={handleSaveMaxLogSize}
          saving={savingLogs}
        />

        <StatsCard
          icon="💬"
          title={t("storage.dialogStatistics") || "Dialog History Statistics"}
          currentSize={dialogSize}
          maxSize={maxDialogSize}
          percent={dialogPercent}
          showSettings={true}
          maxSizeValue={maxDialogSize}
          onMaxSizeChange={setMaxDialogSize}
          onSave={handleSaveMaxDialogSize}
          saving={savingDialog}
        />

        <div style={cardStyle}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "12px",
            }}
          >
            📂 {t("storage.dataDirectories") || "Data Directories"}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyleSmall}>
              {t("storage.logsDir") || "Logs Directory"}
            </label>
            <div style={pathRowStyle}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={logsDir}
                disabled
                readOnly
              />
              <button
                style={folderButtonStyle}
                onClick={() => handleOpenDirectory(logsDir)}
              >
                📂 {t("settings.open") || "Open"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyleSmall}>
              {t("storage.dialogHistoryDir") || "Dialog History Directory"}
            </label>
            <div style={pathRowStyle}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={dialogHistoryDir}
                disabled
                readOnly
              />
              <button
                style={folderButtonStyle}
                onClick={() => handleOpenDirectory(dialogHistoryDir)}
              >
                📂 {t("settings.open") || "Open"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyleSmall}>
              {t("storage.skillsMarketDir") || "Skills Market Directory"}
            </label>
            <div style={pathRowStyle}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={skillsMarketDir}
                disabled
                readOnly
              />
              <button
                style={folderButtonStyle}
                onClick={() => handleOpenDirectory(skillsMarketDir)}
              >
                📂 {t("settings.open") || "Open"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyleSmall}>
              {t("storage.scheduledTasksDir") || "Scheduled Tasks Directory"}
            </label>
            <div style={pathRowStyle}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={scheduledTasksDir}
                disabled
                readOnly
              />
              <button
                style={folderButtonStyle}
                onClick={() => handleOpenDirectory(scheduledTasksDir)}
              >
                📂 {t("settings.open") || "Open"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyleSmall}>
              {t("storage.settingsDir") || "Settings Directory"}
            </label>
            <div style={pathRowStyle}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={settingsDir}
                disabled
                readOnly
              />
              <button
                style={folderButtonStyle}
                onClick={() => handleOpenDirectory(settingsDir)}
              >
                📂 {t("settings.open") || "Open"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageConfig;
