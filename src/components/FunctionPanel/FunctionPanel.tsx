import React, { useState, useRef, useEffect, useCallback } from "react";
import { FunctionPanelProps, FunctionModule, ModuleConfig } from "./types";
import { useFunctionPanel } from "./hooks/useFunctionPanel";
import PreviewContent from "./contents/PreviewContent";
import IntegratedCandleView from "./integrations/IntegratedCandleView";
import IntegratedEarthView from "./integrations/IntegratedEarthView";
import { ModuleContent } from "./ModuleContent";
import { ModuleTabs } from "./ModuleTabs";

const FunctionPanel: React.FC<FunctionPanelProps> = ({
  theme,
  i18n,
  t,
  currentSessionId,
  onClose,
  onSendSkillMessage,
}) => {
  const [width, setWidth] = useState<number>(480);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [modulesComponents, setModulesComponents] = useState<
    Map<string, React.ReactNode>
  >(new Map());

  const {
    openModulesMap,
    setOpenModulesMap,
    activeModuleKey,
    setActiveModuleKey,
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
  } = useFunctionPanel();

  const createCandleView = useCallback(
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

  const createEarthView = useCallback(
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

  const createPreview = useCallback(
    (file: any) => {
      return (
        <PreviewContent
          key={file.id || file.path}
          file={file}
          onClose={onClose}
          onSendSkillMessage={onSendSkillMessage}
          t={t}
        />
      );
    },
    [onClose, onSendSkillMessage, t],
  );

  useEffect(() => {
    const savedWidth = localStorage.getItem("hippox-function-panel-width");
    if (savedWidth) {
      setWidth(parseFloat(savedWidth));
    }
  }, []);

  const saveWidth = (w: number) => {
    localStorage.setItem("hippox-function-panel-width", w.toString());
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging.current) {
        const delta = startXRef.current - e.clientX;
        const newWidth = Math.min(
          800,
          Math.max(320, startWidthRef.current + delta),
        );
        if (newWidth !== width) {
          setWidth(newWidth);
          saveWidth(newWidth);
        }
      }
    },
    [width],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleOpenPreview = (event: CustomEvent) => {
      const { file } = event.detail;
      if (file) {
        const fileId = file.id || file.path || file.name;
        const moduleKey = `preview_${fileId}`;
        setOpenModulesMap((prev) => {
          const newMap = new Map(prev);
          const taskIds = newMap.get("preview") || new Set<string>();
          if (!taskIds.has(fileId)) {
            taskIds.add(fileId);
            newMap.set("preview", taskIds);
          }
          return newMap;
        });
        setActiveModuleKey(moduleKey);
        setModulesComponents((prev) => {
          if (prev.has(moduleKey)) {
            return prev;
          }
          const newMap = new Map(prev);
          newMap.set(moduleKey, createPreview(file));
          return newMap;
        });
      }
    };

    const handleOpenMap = (event: CustomEvent) => {
      const { mapData, taskId } = event.detail;
      if (taskId) {
        const moduleKey = `earthview_${taskId}`;
        setOpenModulesMap((prev) => {
          const newMap = new Map(prev);
          const taskIds = newMap.get("earthview") || new Set<string>();
          if (!taskIds.has(taskId)) {
            taskIds.add(taskId);
            newMap.set("earthview", taskIds);
          }
          return newMap;
        });
        setActiveModuleKey(moduleKey);
        setModulesComponents((prev) => {
          if (prev.has(moduleKey)) {
            return prev;
          }
          const newMap = new Map(prev);
          newMap.set(moduleKey, createEarthView(taskId, mapData));
          return newMap;
        });
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("earthview-locate", {
              detail: {
                center: mapData?.view?.center,
                zoom: mapData?.view?.zoom,
                taskId,
                mapData,
              },
            }),
          );
        }, 500);
      }
    };

    const handleOpenChart = (event: CustomEvent) => {
      const { chartData, taskId } = event.detail;
      if (taskId) {
        const moduleKey = `candleview_${taskId}`;
        setOpenModulesMap((prev) => {
          const newMap = new Map(prev);
          const taskIds = newMap.get("candleview") || new Set<string>();
          if (!taskIds.has(taskId)) {
            taskIds.add(taskId);
            newMap.set("candleview", taskIds);
          }
          return newMap;
        });
        setActiveModuleKey(moduleKey);
        setModulesComponents((prev) => {
          if (prev.has(moduleKey)) {
            return prev;
          }
          const newMap = new Map(prev);
          newMap.set(moduleKey, createCandleView(taskId, chartData));
          return newMap;
        });
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("open-chart-with-data", {
              detail: { taskId, taskData: chartData },
            }),
          );
        }, 100);
      }
    };

    window.addEventListener(
      "open-preview-in-panel-internal",
      handleOpenPreview as EventListener,
    );
    window.addEventListener(
      "open-map-in-panel-internal",
      handleOpenMap as EventListener,
    );
    window.addEventListener(
      "open-chart-in-panel-internal",
      handleOpenChart as EventListener,
    );

    return () => {
      window.removeEventListener(
        "open-preview-in-panel-internal",
        handleOpenPreview as EventListener,
      );
      window.removeEventListener(
        "open-map-in-panel-internal",
        handleOpenMap as EventListener,
      );
      window.removeEventListener(
        "open-chart-in-panel-internal",
        handleOpenChart as EventListener,
      );
    };
  }, [
    createPreview,
    createEarthView,
    createCandleView,
    setOpenModulesMap,
    setActiveModuleKey,
  ]);

  const buildModules = (): ModuleConfig[] => {
    const moduleKeys = getOpenModuleKeys();
    const result: ModuleConfig[] = [];
    for (const moduleKey of moduleKeys) {
      const { moduleId, taskId, fileId } = parseModuleKey(moduleKey);
      const component = modulesComponents.get(moduleKey);
      if (component) {
        let name = "";
        let icon = "";
        if (moduleId === "preview") {
          name = `预览`;
          icon = "📄";
        } else if (moduleId === "candleview") {
          name = `${t("functionArea.candleChart")}${taskId ? ` (${taskId.slice(-6)})` : ""}`;
          icon = "📊";
        } else if (moduleId === "earthview") {
          name = `${t("functionArea.earthMap")}${taskId ? ` (${taskId.slice(-6)})` : ""}`;
          icon = "🗺️";
        }
        result.push({
          id: moduleId,
          name,
          icon,
          closable: true,
          component,
          taskId,
          fileId,
        });
      }
    }
    return result;
  };

  const modules = buildModules();
  const activeModuleContent = modules.find((m) => {
    const key = m.fileId
      ? `preview_${m.fileId}`
      : m.taskId
        ? `${m.id}_${m.taskId}`
        : m.id;
    return key === activeModuleKey;
  })?.component;

  const handleModuleChange = (moduleKey: string) => {
    switchToModule(moduleKey);
  };

  const handleModuleCloseWrapper = (moduleKey: string, e: React.MouseEvent) => {
    const hasRemaining = handleCloseModule(moduleKey, e);
    setModulesComponents((prev) => {
      const newMap = new Map(prev);
      newMap.delete(moduleKey);
      return newMap;
    });
    if (!hasRemaining) {
      onClose();
    }
  };

  if (modules.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width: width,
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
        <div
          style={{
            width: "4px",
            height: "100%",
            position: "absolute",
            left: "-2px",
            top: 0,
            cursor: "col-resize",
            zIndex: 10,
            background: "transparent",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--border-color)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
          onMouseDown={handleMouseDown}
        />
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📂</div>
          <div style={{ fontSize: "14px" }}>No function module open</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: width,
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
      <div
        style={{
          width: "4px",
          height: "100%",
          position: "absolute",
          left: "-2px",
          top: 0,
          cursor: "col-resize",
          zIndex: 10,
          background: "transparent",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--border-color)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
        onMouseDown={handleMouseDown}
      />
      <ModuleTabs
        modules={modules}
        activeModuleKey={activeModuleKey}
        onModuleChange={handleModuleChange}
        onCloseModule={handleModuleCloseWrapper}
        showLeftScroll={showLeftScroll}
        showRightScroll={showRightScroll}
        onScrollLeft={() => handleScroll("left")}
        onScrollRight={() => handleScroll("right")}
        onClosePanel={onClose}
        tabsContainerRef={tabsContainerRef}
        checkScrollPosition={checkScrollPosition}
        t={t}
      />
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
          height: "100%",
          width: "100%",
        }}
      >
        <ModuleContent
          activeModuleContent={activeModuleContent}
          activeModuleKey={activeModuleKey}
          t={t}
        />
      </div>
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

export default FunctionPanel;
