import { useState, useRef, useCallback, useEffect } from "react";
import { FunctionModule } from "../types";

const getModuleKey = (moduleId: FunctionModule, taskId?: string, fileId?: string): string => {
  if (moduleId === "preview" && fileId) {
    return `preview_${fileId}`;
  }
  return taskId ? `${moduleId}_${taskId}` : moduleId;
};

const parseModuleKey = (key: string): { moduleId: FunctionModule; taskId?: string; fileId?: string } => {
  const parts = key.split('_');
  if (parts.length === 1) {
    return { moduleId: parts[0] as FunctionModule };
  }
  const moduleId = parts[0] as FunctionModule;
  const rest = parts.slice(1).join('_');
  if (moduleId === "preview") {
    return { moduleId, fileId: rest };
  }
  return { moduleId, taskId: rest };
};

export const useFunctionPanel = () => {
  const [openModulesMap, setOpenModulesMap] = useState<Map<string, Set<string>>>(new Map());
  const [activeModuleKey, setActiveModuleKey] = useState<string | null>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const getOpenModuleKeys = useCallback((): string[] => {
    const keys: string[] = [];
    openModulesMap.forEach((taskIds, moduleId) => {
      if (taskIds.size === 0 || (taskIds.size === 1 && taskIds.has(''))) {
        keys.push(moduleId);
      } else {
        taskIds.forEach((id) => {
          if (id !== '') {
            keys.push(getModuleKey(moduleId as FunctionModule, id, id));
          }
        });
      }
    });
    return keys;
  }, [openModulesMap]);

  const openModule = useCallback((
    moduleId: FunctionModule,
    taskId?: string,
    fileId?: string,
  ) => {
    const key = getModuleKey(moduleId, taskId, fileId);
    setOpenModulesMap(prev => {
      const newMap = new Map(prev);
      const moduleKey = moduleId;
      const taskIds = newMap.get(moduleKey) || new Set<string>();
      const id = fileId || taskId || '';
      if (!taskIds.has(id)) {
        taskIds.add(id);
        newMap.set(moduleKey, taskIds);
      }
      return newMap;
    });
    setActiveModuleKey(key);
    return key;
  }, []);

  const switchToModule = useCallback((key: string) => {
    setActiveModuleKey(key);
  }, []);

  const handleCloseModule = useCallback((moduleKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { moduleId, taskId, fileId } = parseModuleKey(moduleKey);
    let hasRemaining = false;
    setOpenModulesMap(prev => {
      const newMap = new Map(prev);
      const taskIds = newMap.get(moduleId);
      if (taskIds) {
        const id = fileId || taskId || '';
        taskIds.delete(id);
        if (taskIds.size === 0) {
          newMap.delete(moduleId);
        } else {
          newMap.set(moduleId, taskIds);
        }
      }
      let total = 0;
      newMap.forEach((ids) => {
        total += ids.size;
      });
      hasRemaining = total > 0;
      return newMap;
    });
    if (activeModuleKey === moduleKey) {
      const remainingKeys = getOpenModuleKeys();
      if (remainingKeys.length > 0) {
        setActiveModuleKey(remainingKeys[0]);
      } else {
        setActiveModuleKey(null);
      }
    }
    return hasRemaining;
  }, [activeModuleKey, getOpenModuleKeys]);

  const checkScrollPosition = useCallback(() => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollPosition();
    }, 0);
    return () => clearTimeout(timer);
  }, [openModulesMap, checkScrollPosition]);

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

  return {
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
  };
};