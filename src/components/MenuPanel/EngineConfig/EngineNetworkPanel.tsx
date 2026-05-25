import React, { useState } from "react";

interface EngineNetworkPanelProps {
  t: (key: string, params?: any) => string;
  initialConfig?: any;
  onSave?: (config: any) => void;
}

const EngineNetworkPanel: React.FC<EngineNetworkPanelProps> = ({
  t,
  initialConfig,
  onSave,
}) => {
  const [config, setConfig] = useState({
    tcp: initialConfig?.tcp || {
      host: "127.0.0.1",
      port: 8888,
      encoding: "utf8",
    },
    udp: initialConfig?.udp || {
      host: "127.0.0.1",
      port: 9999,
      encoding: "utf8",
      broadcast: false,
    },
    ftp: initialConfig?.ftp || {
      host: "",
      port: 21,
      username: "anonymous",
      password: "",
      remoteDir: "/",
    },
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

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const checkboxStyle: React.CSSProperties = {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    flexShrink: 0,
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
        <div style={subtitleStyle}>TCP</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Host</label>
          <input
            style={inputStyle}
            value={config.tcp.host}
            onChange={(e) =>
              setConfig({
                ...config,
                tcp: { ...config.tcp, host: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Port</label>
          <input
            type="number"
            style={inputStyle}
            value={config.tcp.port}
            onChange={(e) =>
              setConfig({
                ...config,
                tcp: { ...config.tcp, port: parseInt(e.target.value) || 8888 },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Encoding</label>
          <select
            style={selectStyle}
            value={config.tcp.encoding}
            onChange={(e) =>
              setConfig({
                ...config,
                tcp: { ...config.tcp, encoding: e.target.value },
              })
            }
          >
            <option>utf8</option>
            <option>gbk</option>
            <option>ascii</option>
          </select>
        </div>

        <div style={subtitleStyle}>UDP</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Host</label>
          <input
            style={inputStyle}
            value={config.udp.host}
            onChange={(e) =>
              setConfig({
                ...config,
                udp: { ...config.udp, host: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Port</label>
          <input
            type="number"
            style={inputStyle}
            value={config.udp.port}
            onChange={(e) =>
              setConfig({
                ...config,
                udp: { ...config.udp, port: parseInt(e.target.value) || 9999 },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Encoding</label>
          <select
            style={selectStyle}
            value={config.udp.encoding}
            onChange={(e) =>
              setConfig({
                ...config,
                udp: { ...config.udp, encoding: e.target.value },
              })
            }
          >
            <option>utf8</option>
            <option>gbk</option>
            <option>ascii</option>
          </select>
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Broadcast</label>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={config.udp.broadcast}
            onChange={(e) =>
              setConfig({
                ...config,
                udp: { ...config.udp, broadcast: e.target.checked },
              })
            }
          />
        </div>
        <div style={subtitleStyle}>FTP</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Host</label>
          <input
            style={inputStyle}
            value={config.ftp.host}
            onChange={(e) =>
              setConfig({
                ...config,
                ftp: { ...config.ftp, host: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Port</label>
          <input
            type="number"
            style={inputStyle}
            value={config.ftp.port}
            onChange={(e) =>
              setConfig({
                ...config,
                ftp: { ...config.ftp, port: parseInt(e.target.value) || 21 },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Username</label>
          <input
            style={inputStyle}
            value={config.ftp.username}
            onChange={(e) =>
              setConfig({
                ...config,
                ftp: { ...config.ftp, username: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            style={inputStyle}
            value={config.ftp.password}
            onChange={(e) =>
              setConfig({
                ...config,
                ftp: { ...config.ftp, password: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Remote Directory</label>
          <input
            style={inputStyle}
            value={config.ftp.remoteDir}
            onChange={(e) =>
              setConfig({
                ...config,
                ftp: { ...config.ftp, remoteDir: e.target.value },
              })
            }
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

export default EngineNetworkPanel;
