import React from "react";

interface WorkspacePanelProps {
  t: (key: string, params?: any) => string;
}

const WorkspacePanel: React.FC<WorkspacePanelProps> = ({ t }) => {
  return (
    <div style={{ padding: "16px", color: "var(--text-primary)" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 500, marginBottom: "12px" }}>
        📁 {t("workspace.title")}
      </h3>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
        {t("workspace.placeholder")}
      </p>
    </div>
  );
};

export default WorkspacePanel;
