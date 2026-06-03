import React, { useState, useEffect, useRef, useMemo } from "react";
import CandleView from "candleview";
import { ModuleTabs } from "./components/ModuleTabs";
import { ModuleContent } from "./components/ModuleContent";
import { TEST_CANDLEVIEW_DATA8 } from "../../../test/TestData_3";
import { useFunctionArea } from "./hooks/useFunctionArea";
import { FunctionAreaProps, FunctionInstance, FunctionModule } from "./types";
import { getAllModules } from "./constants";
import {
  EarthView,
  BasemapTypeEnum,
  CoordinateSystemTypeEnum,
} from "../../../earthview";

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
  } = useFunctionArea(defaultModule);
  const earthViewLocale = i18n === "zh-cn" ? "zh" : "en";
  const earthViewTheme = theme;
  // layer list
  const layers = useMemo(() => [], []);
  // map
  const EarthViewComponent = useMemo(
    () => (
      <EarthView
        center={[116.397428, 39.90923]}
        basemap={BasemapTypeEnum.SATELLITE}
        coordinateSystem={CoordinateSystemTypeEnum.WGS84}
        style={{ width: "100%", height: "100%" }}
        layers={layers}
        enableDrawing={true}
        i18n={earthViewLocale}
        theme={earthViewTheme}
        onCircleDrawn={(data) => {}}
        onLoad={(layerManager, view) => {}}
        onMapClick={(event) => {}}
      />
    ),
    [earthViewLocale, earthViewTheme, layers],
  );

  const cachedEarthView = useMemo(
    () => EarthViewComponent,
    [EarthViewComponent],
  );

  // chat
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
    () => getAllModules({ cachedCandleView, cachedEarthView, t }),
    [cachedCandleView, cachedEarthView, t],
  );

  useEffect(() => {
    if (defaultModule === FunctionInstance.Earthview) {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("earthview-locate", {
            detail: { center: [116.397428, 39.90923], zoom: 10 },
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
          new CustomEvent("EarthView-locate", { detail: { center, zoom } }),
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
