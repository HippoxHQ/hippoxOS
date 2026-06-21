import React, { useRef, useMemo, useCallback } from "react";
import PreviewContent from "./integrations/IntegratedPreviewContent/IntegratedPreviewContent";
import IntegratedCandleView from "./integrations/IntegratedCandleView";
import IntegratedEarthView from "./integrations/IntegratedEarthView";
import { ModuleTabs } from "./ModuleTabs";
import { ModuleContent } from "./ModuleContent";
import { FunctionPanelController } from "./hooks/useFunctionPanelController";

interface FunctionPanelProps {
  controller: FunctionPanelController;
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
  onSendSkillMessage?: (message: string, files?: any[]) => void;
  width?: number;
}

const FunctionPanel: React.FC<FunctionPanelProps> = ({
  controller,
  theme,
  i18n,
  t,
  currentSessionId,
  onSendSkillMessage,
  width = 480,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderItemContent = useCallback(
    (item: any) => {
      if (!item) return null;

      switch (item.type) {
        case "preview":
          return (
            <PreviewContent
              key={item.id}
              file={item.data}
              onClose={() => controller.closeItem(item.id)}
              onSendSkillMessage={onSendSkillMessage}
              t={t}
            />
          );
        case "map":
          return (
            <IntegratedEarthView
              key={item.id}
              theme={theme}
              i18n={i18n}
              taskId={item.data?.taskId}
              mapData={item.data?.mapData}
            />
          );
        case "chart":
          return (
            <IntegratedCandleView
              key={item.id}
              theme={theme}
              i18n={i18n}
              currentSessionId={currentSessionId}
              taskId={item.data?.taskId}
              chartData={item.data?.chartData}
            />
          );
        default:
          return null;
      }
    },
    [theme, i18n, currentSessionId, onSendSkillMessage, t, controller],
  );

  const activeItem = controller.getActiveItem?.() || null;
  const activeContent = useMemo(() => {
    return activeItem ? renderItemContent(activeItem) : null;
  }, [activeItem, renderItemContent]);

  if (!controller.isOpen || controller.items.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width,
          flexShrink: 0,
          overflow: "hidden",
          background: "var(--bg-primary)",
          borderLeft: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-tertiary)",
        }}
      >
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 14 }}>
            {t("functionArea.noModule") || "No module open"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width,
        flexShrink: 0,
        overflow: "hidden",
        background: "var(--bg-primary)",
        borderLeft: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        height: "100%",
      }}
    >
      <ModuleTabs
        items={controller.items}
        activeItemId={controller.activeItemId}
        onSwitch={controller.switchTo}
        onClose={controller.closeItem}
        onClosePanel={controller.closePanel}
        t={t}
      />
      <ModuleContent content={activeContent} isEmpty={!activeContent} t={t} />
      <style>{`
        .function-panel-content::-webkit-scrollbar {
          width: 6px;
        }
        .function-panel-content::-webkit-scrollbar-track {
          background: var(--bg-secondary);
          border-radius: 3px;
        }
        .function-panel-content::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }
        .function-panel-content::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
};

export default FunctionPanel;
