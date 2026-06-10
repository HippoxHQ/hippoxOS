import { useState, useRef, useCallback, useEffect } from "react";
import { FunctionModule, FunctionInstance } from "../types";
const getModuleKey = (moduleId: FunctionModule, taskId?: string): string => {
  return taskId ? `${moduleId}_${taskId}` : moduleId;
};
const parseModuleKey = (key: string): { moduleId: FunctionModule; taskId?: string } => {
  const parts = key.split('_');
  if (parts.length === 1) {
    return { moduleId: parts[0] as FunctionModule };
  }
  const moduleId = parts[0] as FunctionModule;
  const taskId = parts.slice(1).join('_');
  return { moduleId, taskId };
};
export const useFunctionArea = (defaultModule?: FunctionModule, defaultTaskId?: string) => {
  const [openModulesMap, setOpenModulesMap] = useState<Map<FunctionModule, Set<string>>>(new Map());
  const [activeModule, setActiveModule] = useState<FunctionModule | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const getActiveKey = useCallback(() => {
    if (!activeModule) return null;
    return activeTaskId ? `${activeModule}_${activeTaskId}` : activeModule;
  }, [activeModule, activeTaskId]);
  const getOpenModuleKeys = useCallback((): string[] => {
    const keys: string[] = [];
    Array.from(openModulesMap.entries()).forEach(([moduleId, taskIds]) => {
      if (taskIds.size === 0 || (taskIds.size === 1 && taskIds.has(''))) {
        keys.push(moduleId);
      } else {
        Array.from(taskIds).forEach((taskId) => {
          if (taskId !== '') {
            keys.push(getModuleKey(moduleId, taskId));
          }
        });
      }
    });
    return keys;
  }, [openModulesMap]);
  const openModule = useCallback((
    moduleId: FunctionModule,
    taskId?: string,
  ): { moduleId: FunctionModule; taskId?: string } => {
    setOpenModulesMap(prev => {
      const newMap = new Map(prev);
      const taskIds = newMap.get(moduleId) || new Set<string>();
      const targetTaskId = taskId || '';
      if (!taskIds.has(targetTaskId)) {
        taskIds.add(targetTaskId);
        newMap.set(moduleId, taskIds);
      }
      return newMap;
    });
    setActiveModule(moduleId);
    setActiveTaskId(taskId || null);
    return { moduleId, taskId };
  }, []);
  const switchToModuleByKey = useCallback((moduleKey: string) => {
    const { moduleId, taskId } = parseModuleKey(moduleKey);
    setActiveModule(moduleId);
    setActiveTaskId(taskId || null);
  }, []);
  const switchToModule = useCallback((moduleId: FunctionModule, taskId?: string) => {
    setActiveModule(moduleId);
    setActiveTaskId(taskId || null);
  }, []);
  const handleCloseModule = useCallback((moduleKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { moduleId, taskId } = parseModuleKey(moduleKey);
    setOpenModulesMap(prev => {
      const newMap = new Map(prev);
      const taskIds = newMap.get(moduleId);
      if (taskIds) {
        taskIds.delete(taskId || '');
        if (taskIds.size === 0) {
          newMap.delete(moduleId);
        } else {
          newMap.set(moduleId, taskIds);
        }
      }
      return newMap;
    });
    const currentActiveKey = getActiveKey();
    if (currentActiveKey === moduleKey) {
      const remainingKeys = getOpenModuleKeys();
      if (remainingKeys.length > 0) {
        const { moduleId: nextModuleId, taskId: nextTaskId } = parseModuleKey(remainingKeys[0]);
        setActiveModule(nextModuleId);
        setActiveTaskId(nextTaskId || null);
      } else {
        setActiveModule(null);
        setActiveTaskId(null);
      }
    }
    return openModulesMap.size === 1;
  }, [openModulesMap, getActiveKey, getOpenModuleKeys]);
  const isModuleOpen = useCallback((moduleId: FunctionModule, taskId?: string): boolean => {
    const taskIds = openModulesMap.get(moduleId);
    if (!taskIds) return false;
    if (taskId === undefined) return true;
    return taskIds.has(taskId || '');
  }, [openModulesMap]);
  const checkScrollPosition = useCallback(() => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, []);
  const handleScroll = useCallback((direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = tabsContainerRef.current.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);
      tabsContainerRef.current.scrollTo({ left: newScrollLeft, behavior: "smooth" });
      setTimeout(checkScrollPosition, 200);
    }
  }, [checkScrollPosition]);
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollPosition);
      checkScrollPosition();
      return () => container.removeEventListener("scroll", checkScrollPosition);
    }
  }, [checkScrollPosition]);
  useEffect(() => {
    if (defaultModule) {
      openModule(defaultModule, defaultTaskId);
    }
  }, [defaultModule, defaultTaskId, openModule]);
  return {
    openModulesMap,
    activeModule,
    activeTaskId,
    getActiveKey,
    getOpenModuleKeys,
    switchToModule,
    switchToModuleByKey,
    setActiveModule: switchToModule,
    showLeftScroll,
    showRightScroll,
    tabsContainerRef,
    checkScrollPosition,
    handleScroll,
    handleCloseModule,
    openModule,
    isModuleOpen,
    parseModuleKey,
  };
};