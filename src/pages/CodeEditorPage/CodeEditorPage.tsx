import React from "react";

interface CodeEditorPageProps {
  t: (key: string) => string;
}

const CodeEditorPage: React.FC<CodeEditorPageProps> = ({ t }) => {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontSize: "24px",
          fontWeight: 600,
          marginBottom: "16px",
          opacity: 0.6,
        }}
      >
        {t("menu.codeEditor") || "Code Editor"}
      </div>
      <div
        style={{
          fontSize: "14px",
          color: "var(--text-secondary)",
          opacity: 0.5,
        }}
      >
        Hello World
      </div>
    </div>
  );
};

export default CodeEditorPage;
