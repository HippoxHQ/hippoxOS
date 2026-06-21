import React from "react";
import { ModuleConfig } from "./types";

interface ModuleTabsProps {
  modules: ModuleConfig[];
  activeModuleKey: string | null;
  onModuleChange: (moduleKey: string) => void;
  onCloseModule: (moduleKey: string, e: React.MouseEvent) => void;
  showLeftScroll: boolean;
  showRightScroll: boolean;
  onScrollLeft: () => void;
  onScrollRight: () => void;
  onClosePanel: () => void;
  tabsContainerRef: React.RefObject<HTMLDivElement | null>;
  checkScrollPosition: () => void;
  t: (key: string) => string;
}

export const ModuleTabs: React.FC<ModuleTabsProps> = ({
  modules,
  activeModuleKey,
  onModuleChange,
  onCloseModule,
  showLeftScroll,
  showRightScroll,
  onScrollLeft,
  onScrollRight,
  onClosePanel,
  tabsContainerRef,
  checkScrollPosition,
  t,
}) => {
  const getModuleKey = (module: ModuleConfig): string => {
    if (module.fileId) {
      return `preview_${module.fileId}`;
    }
    return module.taskId ? `${module.id}_${module.taskId}` : module.id;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px 0 12px",
        borderBottom: "1px solid var(--border-color)",
        flexShrink: 0,
        gap: "8px",
        background: "var(--bg-secondary)",
      }}
    >
      {showLeftScroll && (
        <button
          onClick={onScrollLeft}
          style={{
            flexShrink: 0,
            width: "24px",
            height: "28px",
            borderRadius: "4px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            marginTop: "-10px",
          }}
        >
          ◀
        </button>
      )}

      <div
        ref={tabsContainerRef}
        onScroll={checkScrollPosition}
        style={{
          flex: 1,
          display: "flex",
          gap: "4px",
          overflowX: "auto",
          overflowY: "hidden",
          minHeight: "30px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className="hide-scrollbar"
      >
        {modules.map((module) => {
          const moduleKey = getModuleKey(module);
          const isActive = activeModuleKey === moduleKey;
          return (
            <div
              key={moduleKey}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "0px 8px 0px 14px",
                background: isActive ? "var(--bg-tertiary)" : "transparent",
                borderRadius: "8px 8px 0 0",
                color: isActive
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: isActive ? 500 : 400,
                transition: "all 0.2s ease",
                borderBottom: isActive
                  ? "2px solid var(--accent-color)"
                  : "2px solid transparent",
                marginBottom: "-1px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                height: "30px",
              }}
              onClick={() => onModuleChange(moduleKey)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--hover-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <span>{module.icon}</span>
              <span>{module.name}</span>
              {module.closable && (
                <span
                  onClick={(e) => onCloseModule(moduleKey, e)}
                  style={{
                    marginLeft: "4px",
                    fontSize: "12px",
                    opacity: 0.7,
                    cursor: "pointer",
                    padding: "2px",
                    borderRadius: "2px",
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    e.currentTarget.style.background = "var(--bg-secondary)";
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.opacity = "0.7";
                  }}
                >
                  ✕
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: "4px",
          flexShrink: 0,
          marginTop: "-10px",
        }}
      >
        {showRightScroll && (
          <button
            onClick={onScrollRight}
            style={{
              width: "24px",
              height: "28px",
              borderRadius: "4px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
            }}
          >
            ▶
          </button>
        )}

        <button
          onClick={onClosePanel}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "4px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
          }}
          title={t("functionArea.closePanel") || "Close"}
        >
          ✕
        </button>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};
