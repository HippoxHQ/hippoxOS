import React from "react";

interface SandBox3DAreaProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
}

const SandBox3DArea: React.FC<SandBox3DAreaProps> = ({
  theme,
  i18n,
  t,
  currentSessionId,
}) => {
  const isZh = i18n === "zh-cn";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        padding: "40px",
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          maxWidth: "600px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "72px",
            lineHeight: 1,
            opacity: 0.6,
          }}
        >
          🧊
        </div>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 600,
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          {isZh ? "3D 沙盒" : "3D Sandbox"}
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "var(--text-secondary)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {isZh
            ? "3D 沙盒功能正在开发中，敬请期待..."
            : "3D sandbox features are under development, stay tuned..."}
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "12px",
            padding: "16px 24px",
            background: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            fontSize: "13px",
            color: "var(--text-secondary)",
            fontFamily: "monospace",
          }}
        >
          <span>🖥️</span>
          <span>{isZh ? "Three.js 已就绪" : "Three.js Ready"}</span>
          <span style={{ color: "var(--accent-color)" }}>✅</span>
        </div>
      </div>
    </div>
  );
};

export default SandBox3DArea;
