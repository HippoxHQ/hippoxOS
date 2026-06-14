import React, { useState, useEffect, useCallback } from "react";
import { ModuleTabs } from "./components/ModuleTabs";
import { ModuleContent } from "./components/ModuleContent";
import { useFunctionArea } from "./hooks/useFunctionArea";
import { FunctionAreaProps, FunctionInstance, ModuleConfig } from "./types";
import IntegratedCandleView from "./integrations/IntegratedCandleView";
import { IntegratedEarthView } from "./integrations/IntegratedEarthView";

const FunctionArea: React.FC<FunctionAreaProps> = ({
  theme,
  i18n,
  t,
  currentSessionId,
  onClose,
  containerHeight,
  defaultModule,
  defaultTaskId,
  onFullscreenChange,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    activeModule,
    activeTaskId,
    getOpenModuleKeys,
    switchToModule,
    showLeftScroll,
    showRightScroll,
    tabsContainerRef,
    checkScrollPosition,
    handleScroll,
    handleCloseModule,
    openModule,
    parseModuleKey,
  } = useFunctionArea(defaultModule || undefined, defaultTaskId);

  const [modulesComponents, setModulesComponents] = useState<
    Map<string, React.ReactNode>
  >(new Map());

  const createCandleViewForTask = useCallback(
    (taskId?: string, chartData?: any) => {
      return (
        <IntegratedCandleView
          key={`candleview_${taskId || "default"}`}
          theme={theme}
          i18n={i18n}
          currentSessionId={currentSessionId}
          symbol={taskId ? `Task ${taskId.slice(-6)}` : "BTC/USDT"}
          taskId={taskId}
          chartData={chartData}
        />
      );
    },
    [theme, i18n, currentSessionId],
  );

  const createEarthViewForTask = useCallback(
    (taskId?: string, mapData?: any) => {
      return (
        <IntegratedEarthView
          key={`earthview_${taskId || "default"}`}
          theme={theme}
          i18n={i18n}
          taskId={taskId}
          mapData={mapData}
        />
      );
    },
    [theme, i18n],
  );

  const handleToggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    if (onFullscreenChange) {
      onFullscreenChange(newFullscreenState);
    }
  };

  useEffect(() => {
    const moduleKeys = getOpenModuleKeys();
    if (moduleKeys.length === 0) return;
    setModulesComponents((prev) => {
      const newMap = new Map(prev);
      for (const moduleKey of moduleKeys) {
        const existingComponent = newMap.get(moduleKey);
        if (existingComponent) {
          const { moduleId, taskId } = parseModuleKey(moduleKey);
          const newComponent =
            moduleId === FunctionInstance.Canldeview
              ? createCandleViewForTask(taskId, undefined)
              : createEarthViewForTask(taskId, undefined);
          newMap.set(moduleKey, newComponent);
        }
      }
      return newMap;
    });
  }, [
    theme,
    i18n,
    getOpenModuleKeys,
    parseModuleKey,
    createCandleViewForTask,
    createEarthViewForTask,
  ]);

  useEffect(() => {
    const handleOpenModule = (event: CustomEvent) => {
      const { moduleType, taskId, center, zoom, chartData, mapData } =
        event.detail;
      openModule(moduleType, taskId);
      const moduleKey = taskId ? `${moduleType}_${taskId}` : moduleType;
      setModulesComponents((prev) => {
        if (prev.has(moduleKey)) {
          return prev;
        }
        const newMap = new Map(prev);
        const component =
          moduleType === FunctionInstance.Canldeview
            ? createCandleViewForTask(taskId, chartData)
            : createEarthViewForTask(taskId, mapData);
        newMap.set(moduleKey, component);
        return newMap;
      });
      if (moduleType === FunctionInstance.Earthview && center) {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("earthview-locate", {
              detail: { center, zoom, taskId, mapData },
            }),
          );
        }, 500);
      }
    };
    window.addEventListener(
      "function-area-open-module",
      handleOpenModule as EventListener,
    );
    return () => {
      window.removeEventListener(
        "function-area-open-module",
        handleOpenModule as EventListener,
      );
    };
  }, [openModule, createCandleViewForTask, createEarthViewForTask]);

  const buildModules = (): ModuleConfig[] => {
    const moduleKeys = getOpenModuleKeys();
    const result: ModuleConfig[] = [];
    for (const moduleKey of moduleKeys) {
      const { moduleId, taskId } = parseModuleKey(moduleKey);
      const component = modulesComponents.get(moduleKey);
      if (component) {
        result.push({
          id: moduleId,
          name:
            moduleId === FunctionInstance.Canldeview
              ? `${t("functionArea.candleChart")}${taskId ? ` (${taskId.slice(-6)})` : ""}`
              : `${t("functionArea.earthMap")}${taskId ? ` (${taskId.slice(-6)})` : ""}`,
          icon: moduleId === FunctionInstance.Canldeview ? "📊" : "🗺️",
          closable: true,
          component: component,
          taskId: taskId,
        });
      }
    }
    return result;
  };

  const modules = buildModules();
  const activeModuleContent = modules.find((m) => {
    if (m.id !== activeModule) return false;
    if (activeTaskId) {
      return m.taskId === activeTaskId;
    }
    return !m.taskId;
  })?.component;

  const handleModuleChange = (moduleId: FunctionInstance, taskId?: string) => {
    switchToModule(moduleId, taskId);
  };

  const handleModuleCloseWrapper = (moduleKey: string, e: React.MouseEvent) => {
    const shouldClose = handleCloseModule(moduleKey, e);
    setModulesComponents((prev) => {
      const newMap = new Map(prev);
      newMap.delete(moduleKey);
      return newMap;
    });
    if (shouldClose) {
      onClose();
    }
  };

  return (
    <div
      className="function-area-container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--bg-secondary)",
        ...(isFullscreen && {
          position: "absolute" as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
        }),
      }}
    >
      <ModuleTabs
        modules={modules}
        activeModule={activeModule}
        activeTaskId={activeTaskId}
        onModuleChange={handleModuleChange}
        onCloseModule={handleModuleCloseWrapper}
        showLeftScroll={showLeftScroll}
        showRightScroll={showRightScroll}
        onScrollLeft={() => handleScroll("left")}
        onScrollRight={() => handleScroll("right")}
        onClosePanel={onClose}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        tabsContainerRef={tabsContainerRef}
        checkScrollPosition={checkScrollPosition}
        t={t}
      />
      <ModuleContent
        activeModuleContent={activeModuleContent}
        activeModule={activeModule}
        t={t}
      />
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .function-content::-webkit-scrollbar {
          width: 6px;
        }
        .function-content::-webkit-scrollbar-track {
          background: var(--bg-secondary);
          border-radius: 3px;
        }
        .function-content::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }
        .function-content::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
};

export default FunctionArea;