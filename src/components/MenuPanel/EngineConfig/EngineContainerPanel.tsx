import React, { useState } from "react";

interface EngineContainerPanelProps {
  t: (key: string, params?: any) => string;
  initialConfig?: any;
  onSave?: (config: any) => void;
}

const EngineContainerPanel: React.FC<EngineContainerPanelProps> = ({
  t,
  initialConfig,
  onSave,
}) => {
  const [config, setConfig] = useState({
    docker: initialConfig?.docker || {
      host: "unix:///var/run/docker.sock",
      apiVersion: "",
      tlsVerify: false,
    },
    k8s: initialConfig?.k8s || {
      kubeconfig: "",
      context: "",
      namespace: "default",
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
        <div style={subtitleStyle}>Docker</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Host</label>
          <input
            style={inputStyle}
            value={config.docker.host}
            onChange={(e) =>
              setConfig({
                ...config,
                docker: { ...config.docker, host: e.target.value },
              })
            }
            placeholder="unix:///var/run/docker.sock"
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>API Version</label>
          <input
            style={inputStyle}
            value={config.docker.apiVersion}
            onChange={(e) =>
              setConfig({
                ...config,
                docker: { ...config.docker, apiVersion: e.target.value },
              })
            }
            placeholder="v1.41"
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>TLS Verify</label>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={config.docker.tlsVerify}
            onChange={(e) =>
              setConfig({
                ...config,
                docker: { ...config.docker, tlsVerify: e.target.checked },
              })
            }
          />
        </div>

        <div style={subtitleStyle}>Kubernetes</div>
        <div style={rowStyle}>
          <label style={labelStyle}>Kubeconfig Path</label>
          <input
            style={inputStyle}
            value={config.k8s.kubeconfig}
            onChange={(e) =>
              setConfig({
                ...config,
                k8s: { ...config.k8s, kubeconfig: e.target.value },
              })
            }
            placeholder="~/.kube/config"
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Context</label>
          <input
            style={inputStyle}
            value={config.k8s.context}
            onChange={(e) =>
              setConfig({
                ...config,
                k8s: { ...config.k8s, context: e.target.value },
              })
            }
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Default Namespace</label>
          <input
            style={inputStyle}
            value={config.k8s.namespace}
            onChange={(e) =>
              setConfig({
                ...config,
                k8s: { ...config.k8s, namespace: e.target.value },
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

export default EngineContainerPanel;
