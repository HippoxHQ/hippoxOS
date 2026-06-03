import React from "react";
import { FunctionModule } from "../types";

interface ModuleContentProps {
  activeModuleContent: React.ReactNode;
  activeModule: FunctionModule | null;
  t: (key: string) => string;
}

export const ModuleContent: React.FC<ModuleContentProps> = ({
  activeModuleContent,
  activeModule,
  t,
}) => {
  return (
    <div
      className="function-content"
      style={{
        flex: 1,
        overflow: "auto",
        minHeight: 0,
      }}
    >
      {activeModuleContent || (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "var(--text-tertiary)",
          }}
        >
          {t("functionArea.selectModule")}
        </div>
      )}
    </div>
  );
};
