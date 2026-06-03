import React from "react";
import { ModuleConfig, FunctionModule } from "../types";

interface ModuleTabsProps {
  modules: ModuleConfig[];
  activeModule: FunctionModule;
  onModuleChange: (moduleId: FunctionModule) => void;
  onCloseModule: (moduleId: FunctionModule, e: React.MouseEvent) => void;
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
  activeModule,
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
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px 0 12px",
        borderBottom: "1px solid var(--border-color, #333)",
        flexShrink: 0,
        gap: "8px",
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
          minHeight: "40px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className="hide-scrollbar"
      >
        {modules.map((module) => (
          <div
            key={module.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 8px 6px 14px",
              background:
                activeModule === module.id
                  ? "var(--bg-tertiary, #2d2d2d)"
                  : "transparent",
              borderRadius: "8px 8px 0 0",
              color:
                activeModule === module.id
                  ? "var(--text-primary, #fff)"
                  : "var(--text-secondary, #aaa)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: activeModule === module.id ? 500 : 400,
              transition: "all 0.2s ease",
              borderBottom:
                activeModule === module.id
                  ? "2px solid var(--accent-color, #00aaff)"
                  : "2px solid transparent",
              marginBottom: "-1px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            onClick={() => onModuleChange(module.id)}
            onMouseEnter={(e) => {
              if (activeModule !== module.id) {
                e.currentTarget.style.background = "var(--hover-bg, #2a2a2a)";
                e.currentTarget.style.color = "var(--text-primary, #fff)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeModule !== module.id) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary, #aaa)";
              }
            }}
          >
            <span>{module.icon}</span>
            <span>{module.name}</span>
            {module.closable && (
              <span
                onClick={(e) => onCloseModule(module.id, e)}
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
        ))}
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
          title={t("functionArea.closePanel")}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
