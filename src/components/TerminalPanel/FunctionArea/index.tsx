import React, { useState, useEffect, useRef, useMemo } from "react";
import { ModuleTabs } from "./components/ModuleTabs";
import { ModuleContent } from "./components/ModuleContent";
import { useFunctionArea } from "./hooks/useFunctionArea";
import { FunctionAreaProps, FunctionInstance, FunctionModule } from "./types";
import { getAllModules } from "./constants";
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
}) => {
  const earthViewRef = useRef<any>(null);
  const {
    activeModule,
    setActiveModule,
    openModules,
    showLeftScroll,
    showRightScroll,
    tabsContainerRef,
    checkScrollPosition,
    handleScroll,
    handleCloseModule,
    openModule,
  } = useFunctionArea(defaultModule);
  const handleEarthViewLoad = (earthView: any) => {
    earthViewRef.current = earthView;
  };
  const integratedEarthView = useMemo(
    () => (
      <IntegratedEarthView
        theme={theme}
        i18n={i18n}
        onLoad={handleEarthViewLoad}
        onMapClick={(event) => {
          console.log("Map click in function area:", event);
        }}
        onMoveEnd={(center, zoom) => {
          console.log("Map moved:", center, zoom);
        }}
      />
    ),
    [theme, i18n],
  );
  const integratedCandleView = useMemo(
    () => (
      <IntegratedCandleView
        theme={theme}
        i18n={i18n}
        currentSessionId={currentSessionId}
        symbol="BTC/USDT"
      />
    ),
    [theme, i18n, currentSessionId],
  );
  const allModules = useMemo(
    () =>
      getAllModules({
        cachedCandleView: integratedCandleView,
        cachedEarthView: integratedEarthView,
        t,
      }),
    [integratedCandleView, integratedEarthView, t],
  );
  useEffect(() => {
    if (defaultModule === FunctionInstance.Earthview) {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("earthview-locate", {
            detail: { center: [-74.006, 40.7128], zoom: 12 },
          }),
        );
      }, 500);
    }
  }, [defaultModule]);
  useEffect(() => {
    const handleOpenEarthView = (event: CustomEvent) => {
      console.log("handleOpenEarthView called", event.detail);
      const { center, zoom } = event.detail;
      openModule(FunctionInstance.Earthview);
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("earthview-locate", { detail: { center, zoom } }),
        );
      }, 500);
    };
    window.addEventListener(
      "open-earthview",
      handleOpenEarthView as EventListener,
    );
    return () =>
      window.removeEventListener(
        "open-earthview",
        handleOpenEarthView as EventListener,
      );
  }, [openModule]);
  const modules = allModules.filter((m) => openModules.has(m.id));
  const activeModuleContent = modules.find(
    (m) => m.id === activeModule,
  )?.component;
  const handleModuleClose = (moduleId: FunctionModule, e: React.MouseEvent) => {
    const shouldClose = handleCloseModule(moduleId, e);
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
      }}
    >
      <ModuleTabs
        modules={modules}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        onCloseModule={handleModuleClose}
        showLeftScroll={showLeftScroll}
        showRightScroll={showRightScroll}
        onScrollLeft={() => handleScroll("left")}
        onScrollRight={() => handleScroll("right")}
        onClosePanel={onClose}
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
