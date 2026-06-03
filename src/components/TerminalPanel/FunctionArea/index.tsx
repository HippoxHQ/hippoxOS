import React, { useState, useEffect, useRef, useMemo } from "react";
import CandleView from "candleview";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ModuleTabs } from "./components/ModuleTabs";
import { ModuleContent } from "./components/ModuleContent";
import { EarthOS } from "../../../earthOS";
import { TEST_CANDLEVIEW_DATA8 } from "../../../test/TestData_3";
import { useFunctionArea } from "./hooks/useFunctionArea";
import { FunctionAreaProps, FunctionModule } from "./types";
import { getAllModules } from "./constants";

const FunctionArea: React.FC<FunctionAreaProps> = ({
  theme,
  i18n,
  t,
  currentSessionId,
  onClose,
  containerHeight,
  defaultModule,
}) => {
  const [candleKey, setCandleKey] = useState(0);

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
    addTestModule,
  } = useFunctionArea(defaultModule);

  const [earthOSLoading, setEarthOSLoading] = useState(true);
  const earthOSRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeModule === "earthos") {
      setEarthOSLoading(true);
      const timer = setTimeout(() => {
        setEarthOSLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeModule]);

  useEffect(() => {
    if (openModules.has("earthos")) {
      setEarthOSLoading(true);
    }
  }, [openModules]);

  const EarthOSWithLoading = useMemo(
    () => (
      <div ref={earthOSRef} style={{ width: "100%", height: "100%" }}>
        {earthOSLoading && (
          <LoadingSpinner message={t("functionArea.loadingMap")} />
        )}
        <div
          style={{
            display: earthOSLoading ? "none" : "block",
            width: "100%",
            height: "100%",
          }}
        >
          <EarthOS
            basemap="satellite"
            center={[116.397428, 39.90923]}
            zoom={10}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
    ),
    [earthOSLoading],
  );

  const cachedEarthOS = useMemo(() => EarthOSWithLoading, [EarthOSWithLoading]);

  const cachedCandleView = useMemo(
    () => (
      <CandleView
        key={`candle-${currentSessionId}-${candleKey}`}
        data={TEST_CANDLEVIEW_DATA8}
        title="BTC/USDT Candlestick Chart"
        theme={theme}
        i18n={i18n}
        height={"100%"}
        width={"100%"}
        leftpanel={true}
        toppanel={true}
        terminal={false}
        ai={false}
        timezone="Asia/Shanghai"
        timeframe="1s"
      />
    ),
    [theme, i18n, currentSessionId, candleKey],
  );

  const allModules = useMemo(
    () => getAllModules({ cachedCandleView, cachedEarthOS, t }),
    [cachedCandleView, cachedEarthOS, t],
  );

  useEffect(() => {
    if (defaultModule === "earthos") {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("earthos-locate", {
            detail: { center: [116.397428, 39.90923], zoom: 10 },
          }),
        );
      }, 500);
    }
  }, [defaultModule]);

  useEffect(() => {
    const handleOpenEarthOS = (event: CustomEvent) => {
      console.log("handleOpenEarthOS called", event.detail);
      const { center, zoom } = event.detail;
      openModule("earthos");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("earthos-locate", { detail: { center, zoom } }),
        );
      }, 500);
    };
    window.addEventListener("open-earthos", handleOpenEarthOS as EventListener);
    return () =>
      window.removeEventListener(
        "open-earthos",
        handleOpenEarthOS as EventListener,
      );
  }, [openModule]);

  useEffect(() => {
    setCandleKey((prev) => prev + 1);
  }, [currentSessionId]);

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
        onAddModule={addTestModule}
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
