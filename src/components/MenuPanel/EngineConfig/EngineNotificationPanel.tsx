import React, { useState } from "react";

interface EngineNotificationPanelProps {
  t: (key: string, params?: any) => string;
  initialConfig?: any;
  onSave?: (config: any) => void;
}

const EngineNotificationPanel: React.FC<EngineNotificationPanelProps> = ({
  t,
  initialConfig,
  onSave,
}) => {
  const [config, setConfig] = useState({
    smtp: initialConfig?.smtp || {
      host: "",
      port: 587,
      username: "",
      password: "",
      from: "",
    },
    telegram: initialConfig?.telegram || { botToken: "" },
    dingtalk: initialConfig?.dingtalk || { accessToken: "" },
    feishu: initialConfig?.feishu || { webhook: "" },
    wecom: initialConfig?.wecom || { webhook: "" },
    github: initialConfig?.github || {
      token: "",
      apiUrl: "https://api.github.com",
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
        <div style={subtitleStyle}>SMTP Email</div>
        <div style={rowStyle}>
          <label style={labelStyle}>SMTP Host</label>
          <input
            style={inputStyle}
            value={config.smtp.host}
            onChange={(e) =>
              setConfig({
                ...config,
                smtp: { ...config.smtp, host: e.target.value },
              })
            }
            placeholder="smtp.gmail.com"
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>SMTP Port</label>
          <input
            type="number"
            style={inputStyle}
            value={config.smtp.port}
            onChange={(e) =>
              setConfig({
                ...config,
                smtp: { ...config.smtp, port: parseInt(e.target.value) || 587 },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Username</label>
          <input
            style={inputStyle}
            value={config.smtp.username}
            onChange={(e) =>
              setConfig({
                ...config,
                smtp: { ...config.smtp, username: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            style={inputStyle}
            value={config.smtp.password}
            onChange={(e) =>
              setConfig({
                ...config,
                smtp: { ...config.smtp, password: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>From Email</label>
          <input
            style={inputStyle}
            value={config.smtp.from}
            onChange={(e) =>
              setConfig({
                ...config,
                smtp: { ...config.smtp, from: e.target.value },
              })
            }
          />
        </div>
        <div style={subtitleStyle}>Telegram</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Bot Token</label>
          <input
            type="password"
            style={inputStyle}
            value={config.telegram.botToken}
            onChange={(e) =>
              setConfig({ ...config, telegram: { botToken: e.target.value } })
            }
          />
        </div>
        <div style={subtitleStyle}>DingTalk</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Access Token</label>
          <input
            type="password"
            style={inputStyle}
            value={config.dingtalk.accessToken}
            onChange={(e) =>
              setConfig({
                ...config,
                dingtalk: { accessToken: e.target.value },
              })
            }
          />
        </div>
        <div style={subtitleStyle}>Feishu</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Webhook URL</label>
          <input
            style={inputStyle}
            value={config.feishu.webhook}
            onChange={(e) =>
              setConfig({ ...config, feishu: { webhook: e.target.value } })
            }
          />
        </div>
        <div style={subtitleStyle}>WeCom</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Webhook URL</label>
          <input
            style={inputStyle}
            value={config.wecom.webhook}
            onChange={(e) =>
              setConfig({ ...config, wecom: { webhook: e.target.value } })
            }
          />
        </div>
        <div style={subtitleStyle}>GitHub</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Access Token</label>
          <input
            type="password"
            style={inputStyle}
            value={config.github.token}
            onChange={(e) =>
              setConfig({
                ...config,
                github: { ...config.github, token: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>API URL</label>
          <input
            style={inputStyle}
            value={config.github.apiUrl}
            onChange={(e) =>
              setConfig({
                ...config,
                github: { ...config.github, apiUrl: e.target.value },
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

export default EngineNotificationPanel;
