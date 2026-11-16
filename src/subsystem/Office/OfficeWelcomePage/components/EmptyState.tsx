import React from "react";
import { Image as ImageIcon } from "lucide-react";
interface EmptyStateProps {
  t: (key: string, params?: any) => string;
}
export const EmptyState: React.FC<EmptyStateProps> = ({ t }) => {
  const isZh = t("i18n") === "zh";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "var(--text-muted)",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "var(--bg-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid var(--border-color)",
        }}
      >
        <ImageIcon size={32} color="var(--text-muted)" />
      </div>
      <div style={{ fontSize: "14px", fontWeight: 500 }}>{isZh ? "还没有项目" : "No projects yet"}</div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          textAlign: "center",
          maxWidth: "400px",
        }}
      >
        {isZh ? "点击「新建项目」开始创作，或导入文件开始编辑" : "Click 'New Project' to start creating, or import a file to start editing"}
      </div>
    </div>
  );
};