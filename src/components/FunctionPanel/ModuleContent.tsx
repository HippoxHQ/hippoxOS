import React from "react";

interface ModuleContentProps {
  activeModuleContent: React.ReactNode;
  activeModuleKey: string | null;
  t: (key: string) => string;
}

export const ModuleContent: React.FC<ModuleContentProps> = ({
  activeModuleContent,
  activeModuleKey,
  t,
}) => {
  return (
    <div
      className="function-content"
      style={{
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      {activeModuleContent || (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            color: "var(--text-tertiary)",
          }}
        >
          {t("functionArea.selectModule")}
        </div>
      )}
    </div>
  );
};
