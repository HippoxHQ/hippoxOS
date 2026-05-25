import React, { useState } from "react";

interface EngineDatabasePanelProps {
  t: (key: string, params?: any) => string;
  initialConfig?: any;
  onSave?: (config: any) => void;
}

const EngineDatabasePanel: React.FC<EngineDatabasePanelProps> = ({
  t,
  initialConfig,
  onSave,
}) => {
  const [config, setConfig] = useState({
    postgresql: initialConfig?.postgresql || {
      host: "",
      port: 5432,
      database: "",
      username: "",
      password: "",
    },
    mysql: initialConfig?.mysql || {
      host: "",
      port: 3306,
      database: "",
      username: "",
      password: "",
    },
    redis: initialConfig?.redis || {
      host: "",
      port: 6379,
      password: "",
      db: 0,
    },
    sqlite: initialConfig?.sqlite || { path: "" },
  });

  const handleSave = () => {
    if (onSave) onSave(config);
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

  const subtitleStyle: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    margin: "20px 0 12px 0",
    paddingLeft: "8px",
    borderLeft: "3px solid var(--accent-color)",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
    gap: "16px",
    flexWrap: "wrap",
    paddingLeft: "10px",
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
        <div style={subtitleStyle}>PostgreSQL</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Host</label>
          <input
            style={inputStyle}
            value={config.postgresql.host}
            onChange={(e) =>
              setConfig({
                ...config,
                postgresql: { ...config.postgresql, host: e.target.value },
              })
            }
            placeholder="localhost"
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Port</label>
          <input
            type="number"
            style={inputStyle}
            value={config.postgresql.port}
            onChange={(e) =>
              setConfig({
                ...config,
                postgresql: {
                  ...config.postgresql,
                  port: parseInt(e.target.value) || 5432,
                },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Database</label>
          <input
            style={inputStyle}
            value={config.postgresql.database}
            onChange={(e) =>
              setConfig({
                ...config,
                postgresql: { ...config.postgresql, database: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Username</label>
          <input
            style={inputStyle}
            value={config.postgresql.username}
            onChange={(e) =>
              setConfig({
                ...config,
                postgresql: { ...config.postgresql, username: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            style={inputStyle}
            value={config.postgresql.password}
            onChange={(e) =>
              setConfig({
                ...config,
                postgresql: { ...config.postgresql, password: e.target.value },
              })
            }
          />
        </div>

        <div style={subtitleStyle}>MySQL</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Host</label>
          <input
            style={inputStyle}
            value={config.mysql.host}
            onChange={(e) =>
              setConfig({
                ...config,
                mysql: { ...config.mysql, host: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Port</label>
          <input
            type="number"
            style={inputStyle}
            value={config.mysql.port}
            onChange={(e) =>
              setConfig({
                ...config,
                mysql: {
                  ...config.mysql,
                  port: parseInt(e.target.value) || 3306,
                },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Database</label>
          <input
            style={inputStyle}
            value={config.mysql.database}
            onChange={(e) =>
              setConfig({
                ...config,
                mysql: { ...config.mysql, database: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Username</label>
          <input
            style={inputStyle}
            value={config.mysql.username}
            onChange={(e) =>
              setConfig({
                ...config,
                mysql: { ...config.mysql, username: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            style={inputStyle}
            value={config.mysql.password}
            onChange={(e) =>
              setConfig({
                ...config,
                mysql: { ...config.mysql, password: e.target.value },
              })
            }
          />
        </div>

        <div style={subtitleStyle}>Redis</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Host</label>
          <input
            style={inputStyle}
            value={config.redis.host}
            onChange={(e) =>
              setConfig({
                ...config,
                redis: { ...config.redis, host: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Port</label>
          <input
            type="number"
            style={inputStyle}
            value={config.redis.port}
            onChange={(e) =>
              setConfig({
                ...config,
                redis: {
                  ...config.redis,
                  port: parseInt(e.target.value) || 6379,
                },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            style={inputStyle}
            value={config.redis.password}
            onChange={(e) =>
              setConfig({
                ...config,
                redis: { ...config.redis, password: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Database</label>
          <input
            type="number"
            style={inputStyle}
            value={config.redis.db}
            onChange={(e) =>
              setConfig({
                ...config,
                redis: { ...config.redis, db: parseInt(e.target.value) || 0 },
              })
            }
          />
        </div>
        <div style={subtitleStyle}>SQLite</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Database Path</label>
          <input
            style={inputStyle}
            value={config.sqlite.path}
            onChange={(e) =>
              setConfig({ ...config, sqlite: { path: e.target.value } })
            }
            placeholder="/path/to/database.db"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        style={{
          padding: "8px 20px",
          margin: "10px",
          background: "var(--accent-color)",
          border: "none",
          borderRadius: "6px",
          color: "white",
          fontSize: "13px",
          cursor: "pointer",
          alignSelf: "flex-end",
        }}
      >
        {t("settings.save")}
      </button>
    </div>
  );
};

export default EngineDatabasePanel;
