import React from "react";

interface ModuleContentProps {
  content: React.ReactNode;
  isEmpty: boolean;
  t: (key: string, params?: any) => string;
}
export const ModuleContent: React.FC<ModuleContentProps> = ({
  content,
  isEmpty,
  t,
}) => {
  if (isEmpty || !content) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          color: "var(--text-tertiary)",
          fontSize: 14,
          background: "var(--bg-primary)",
        }}
      >
        {t("functionArea.selectModule") || "Select a module to view"}
      </div>
    );
  }
  return (
    <div
      className="function-panel-content"
      style={{
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
        width: "100%",
        height: "100%",
        position: "relative",
        background: "var(--bg-primary)",
      }}
    >
      {content}
    </div>
  );
};
