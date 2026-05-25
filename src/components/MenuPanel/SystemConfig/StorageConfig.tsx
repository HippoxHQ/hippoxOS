import React, { useState, useEffect } from "react";
import { getDataPaths } from "../../../api/paths";
import { filesCommands } from "../../../api/files";

interface StorageConfigProps {
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
}

const StorageConfig: React.FC<StorageConfigProps> = ({ t, onSave }) => {
  const [dataDir, setDataDir] = useState("");
  const [logsDir, setLogsDir] = useState("");
  const [tempDir, setTempDir] = useState("");
  const [backupsDir, setBackupsDir] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    try {
      const paths = await getDataPaths();
      setDataDir(String(paths.data_dir ?? ""));
      setLogsDir(String(paths.logs_dir ?? ""));
      setTempDir(String(paths.temp_dir ?? ""));
      setBackupsDir(String(paths.backups_dir ?? ""));
    } catch (error) {
      console.error("Failed to load paths:", error);
    } finally {
      setLoading(false);
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

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-primary)",
    minWidth: "120px",
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

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "12px",
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

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "0 10px",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingTop: "10px",
          paddingBottom: "10px",
        }}
      >
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
            <label style={labelStyle}>
              {t("storage.dataDir") || "Data Directory"}
            </label>
            <div style={pathRowStyle}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={dataDir}
                disabled
                readOnly
              />
              <button
                style={folderButtonStyle}
                onClick={() => handleOpenDirectory(dataDir)}
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
            <label style={labelStyle}>
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
            <label style={labelStyle}>
              {t("storage.tempDir") || "Temp Directory"}
            </label>
            <div style={pathRowStyle}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={tempDir}
                disabled
                readOnly
              />
              <button
                style={folderButtonStyle}
                onClick={() => handleOpenDirectory(tempDir)}
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
            <label style={labelStyle}>
              {t("storage.backupsDir") || "Backups Directory"}
            </label>
            <div style={pathRowStyle}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={backupsDir}
                disabled
                readOnly
              />
              <button
                style={folderButtonStyle}
                onClick={() => handleOpenDirectory(backupsDir)}
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
