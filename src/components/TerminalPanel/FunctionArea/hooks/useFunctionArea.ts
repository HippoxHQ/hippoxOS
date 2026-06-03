import { useState, useEffect, useRef, useCallback } from "react";
import { FunctionInstance, FunctionModule } from "../types";

export const useFunctionArea = (defaultModule?: FunctionInstance.Canldeview | FunctionInstance.Earthview | null) => {
  const [activeModule, setActiveModule] = useState<FunctionModule>(() => {
    return defaultModule || FunctionInstance.Canldeview;
  });
  const [openModules, setOpenModules] = useState<Set<FunctionModule>>(() => {
    if (defaultModule) {
      return new Set<FunctionModule>([defaultModule]);
    }
    return new Set<FunctionModule>([FunctionInstance.Canldeview]);
  });
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const hasProcessedDefaultModule = useRef(false);
  const checkScrollPosition = useCallback(() => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setShowLeftScroll(scrollLeft > 5);
      setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 5);
    }
  }, []);
  useEffect(() => {
    if (defaultModule && !hasProcessedDefaultModule.current) {
      hasProcessedDefaultModule.current = true;
      setActiveModule(defaultModule);
      setOpenModules((prev) => {
        const newSet = new Set(prev);
        newSet.add(defaultModule);
        return newSet;
      });
    }
  }, [defaultModule]);
  useEffect(() => {
    checkScrollPosition();
    window.addEventListener("resize", checkScrollPosition);
    return () => window.removeEventListener("resize", checkScrollPosition);
  }, [openModules, checkScrollPosition]);
  const handleScroll = useCallback((direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScrollPosition, 100);
    }
  }, [checkScrollPosition]);
  const handleCloseModule = useCallback((moduleId: FunctionModule, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenModules = new Set(openModules);
    newOpenModules.delete(moduleId);
    setOpenModules(newOpenModules);
    if (activeModule === moduleId && newOpenModules.size > 0) {
      const firstModule = Array.from(newOpenModules)[0];
      setActiveModule(firstModule);
    }
    return newOpenModules.size === 0;
  }, [openModules, activeModule]);
  const openModule = useCallback((moduleId: FunctionModule) => {
    setOpenModules((prev) => {
      const newSet = new Set(prev);
      if (!newSet.has(moduleId)) {
        newSet.add(moduleId);
        setTimeout(checkScrollPosition, 100);
      }
      return newSet;
    });
    setActiveModule(moduleId);
  }, [checkScrollPosition]);
  return {
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
  };
};