import React, { useState, useRef, useCallback, useEffect } from "react";
import { MessageSquare, MapPin, BarChart3 } from "lucide-react";
import CustomDragCursor from "../../components/CustomDragCursor";
import GlobalDragOverlay from "../../components/GlobalDragOverlay";
import BottomBar from "../../components/BottomBar";
import Dialog from "../../components/Dialog";
import MenuPanel from "../../components/MenuPanel";
import Sidebar from "../../components/Sidebar";
import Toast from "../../components/Toast";
import TopBar from "../../components/TopBar";
import WelcomePage from "../../pages/WelcomePage";
import { ContentPanelView } from "../hooks/useMenuPanel";
import TaskQueuePanel from "../../components/MenuPanel/TaskQueuePanel";
import WorkspacePanel from "../../components/MenuPanel/Workspace";
import WorkspaceConfig from "../../components/MenuPanel/SystemConfig/WorkspaceConfig";
import LogsPanel from "../../components/MenuPanel/LogsPanel";
import StorageConfig from "../../components/MenuPanel/SystemConfig/StorageConfig";
import SettingsPanel, { SettingsSubView } from "../../components/MenuPanel/SettingsPanel";
import EngineContainerPanel from "../../components/MenuPanel/EngineConfig/EngineContainerPanel";
import EngineDatabasePanel from "../../components/MenuPanel/EngineConfig/EngineDatabasePanel";
import EngineNetworkPanel from "../../components/MenuPanel/EngineConfig/EngineNetworkPanel";
import EngineNotificationPanel from "../../components/MenuPanel/EngineConfig/EngineNotificationPanel";
import { Language, Theme } from "../../types/types";
import { UploadFile } from "../../core/types";
import ScheduledTasksManager from "../../pages/ScheduledTasksPage";
import SkillsManager from "../../pages/SkillsManagerPage";
import UserProfile from "../../pages/UserProfilePage";
import FunctionPanel from "../../components/FunctionPanel/FunctionPanel";
import { FunctionPanelController } from "../../components/FunctionPanel/hooks/useFunctionPanelController";
import CodeEditorPage from "../../subsystem/CodeEditor";
import GeneralChatPage from "../../subsystem/GeneralChat";
import MapsPage from "../../subsystem/Maps";
import SandBox3DPage from "../../subsystem/SandBox3D";
import VideoEditorPage from "../../subsystem/VideoEditor";
import ChartPage from "../../subsystem/Finance";
declare global {
  interface Window {
    __pageResources: {
      [pageKey: string]: {
        wsConnections: WebSocket[];
        timers: (number | NodeJS.Timeout)[];
        eventListeners: Array<{
          target: EventTarget;
          event: string;
          handler: EventListenerOrEventListenerObject;
        }>;
        destroyableInstances: Array<{ destroy: () => void; name?: string }>;
        cleanupCallbacks: Array<() => void>;
        isDestroying: boolean;
        destroyStartTime: number;
      };
    };
    __pageCleanupInProgress: Record<string, boolean>;
    __pendingPageSwitch: string | null;
    __pageSwitchLock: boolean;
    // Global chart instance for cleanup
    __chartInstance: any;
    __chartStateManager: any;
    __chartDataCache: any;
    // Global map instance for cleanup
    __mapInstance: any;
    // Global code editor instance for cleanup
    __codeEditorInstance: any;
    // Global video editor instance for cleanup
    __videoEditorInstance: any;
    // Global sandbox3d instance for cleanup
    __sandbox3dInstance: any;
    // Global general chat instance for cleanup
    __generalChatInstance: any;
  }
}
if (typeof window !== "undefined") {
  if (!window.__pageResources) {
    window.__pageResources = {};
  }
  if (!window.__pageCleanupInProgress) {
    window.__pageCleanupInProgress = {};
  }
  if (window.__pendingPageSwitch === undefined) {
    window.__pendingPageSwitch = null;
  }
  if (window.__pageSwitchLock === undefined) {
    window.__pageSwitchLock = false;
  }
}
/**
 * Page type constants - all destroyable pages
 */
const PAGE_TYPES = {
  GENERAL_CHAT: "generalChat",
  CHART_CHAT: "chartChat",
  MAP_CHAT: "mapChat",
  CODE_EDITOR: "codeEditorChat",
  VIDEO_EDITOR: "videoEditor",
  SANDBOX_3D: "sandbox3d",
  SKILLS_MANAGER: "skillsManager",
  SCHEDULED_TASKS: "scheduledTasks",
  USER_PROFILE: "userProfile",
  TASK_QUEUE: "taskQueue",
  WORKSPACE: "workspace",
  WORKSPACE_CONFIG: "workspaceConfig",
  LOGS: "logs",
  STORAGE: "storage",
  SETTINGS: "settings",
  ENGINE_GROUP: "engine_group",
} as const;
type PageType = (typeof PAGE_TYPES)[keyof typeof PAGE_TYPES];
/**
 * All subsystem page keys that should be destroyed on switch
 */
const SUBSYSTEM_PAGES: PageType[] = [PAGE_TYPES.GENERAL_CHAT, PAGE_TYPES.CHART_CHAT, PAGE_TYPES.MAP_CHAT, PAGE_TYPES.CODE_EDITOR, PAGE_TYPES.VIDEO_EDITOR, PAGE_TYPES.SANDBOX_3D];
/**
 * Cleanup function for a specific page type
 * Each subsystem should define its own cleanup logic here
 */
function cleanupPageResources(pageKey: PageType): void {
  console.log(`[CLEANUP] Cleaning up page: ${pageKey}`);
  try {
    switch (pageKey) {
      case PAGE_TYPES.CHART_CHAT:
        // Cleanup chart instance
        if (window.__chartInstance) {
          try {
            window.__chartInstance.destroy?.();
          } catch (e) {
            console.warn("[CLEANUP] Chart destroy error:", e);
          }
          window.__chartInstance = null;
        }
        if (window.__chartStateManager) {
          try {
            window.__chartStateManager.clear?.();
          } catch (e) {
            console.warn("[CLEANUP] Chart state manager clear error:", e);
          }
          window.__chartStateManager = null;
        }
        window.__chartDataCache = null;
        break;
      case PAGE_TYPES.MAP_CHAT:
        // Cleanup map instance
        if (window.__mapInstance) {
          try {
            window.__mapInstance.destroy?.();
          } catch (e) {
            console.warn("[CLEANUP] Map destroy error:", e);
          }
          window.__mapInstance = null;
        }
        break;
      case PAGE_TYPES.CODE_EDITOR:
        // Cleanup code editor instance
        if (window.__codeEditorInstance) {
          try {
            window.__codeEditorInstance.destroy?.();
          } catch (e) {
            console.warn("[CLEANUP] Code editor destroy error:", e);
          }
          window.__codeEditorInstance = null;
        }
        break;
      case PAGE_TYPES.VIDEO_EDITOR:
        // Cleanup video editor instance
        if (window.__videoEditorInstance) {
          try {
            window.__videoEditorInstance.destroy?.();
          } catch (e) {
            console.warn("[CLEANUP] Video editor destroy error:", e);
          }
          window.__videoEditorInstance = null;
        }
        break;
      case PAGE_TYPES.SANDBOX_3D:
        // Cleanup sandbox3d instance
        if (window.__sandbox3dInstance) {
          try {
            window.__sandbox3dInstance.destroy?.();
          } catch (e) {
            console.warn("[CLEANUP] Sandbox3d destroy error:", e);
          }
          window.__sandbox3dInstance = null;
        }
        break;
      case PAGE_TYPES.GENERAL_CHAT:
        // Cleanup general chat instance
        if (window.__generalChatInstance) {
          try {
            window.__generalChatInstance.destroy?.();
          } catch (e) {
            console.warn("[CLEANUP] General chat destroy error:", e);
          }
          window.__generalChatInstance = null;
        }
        break;
      default:
        // Generic cleanup for other pages
        break;
    }
  } catch (error) {
    console.error(`[CLEANUP] Error cleaning up ${pageKey}:`, error);
  }
}
/**
 * Force destroy a page and clean up all its resources
 */
export const forceDestroyPage = (pageKey: string): void => {
  if (window.__pageCleanupInProgress?.[pageKey]) {
    return;
  }
  if (window.__pageCleanupInProgress) {
    window.__pageCleanupInProgress[pageKey] = true;
  }
  // First, run the specific cleanup for this page type
  if (SUBSYSTEM_PAGES.includes(pageKey as PageType)) {
    cleanupPageResources(pageKey as PageType);
  }
  const resources = window.__pageResources?.[pageKey];
  if (!resources) {
    if (window.__pageCleanupInProgress) {
      delete window.__pageCleanupInProgress[pageKey];
    }
    return;
  }
  resources.destroyStartTime = Date.now();
  resources.isDestroying = true;
  try {
    // Close all WebSocket connections
    if (resources.wsConnections && resources.wsConnections.length > 0) {
      resources.wsConnections.forEach((ws, index) => {
        try {
          if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
            ws.close(1000, "Page destroyed");
            ws.onmessage = null;
            ws.onopen = null;
            ws.onclose = null;
            ws.onerror = null;
          }
        } catch (e) {
          console.warn(`[DESTROY] Failed to close WebSocket ${index}:`, e);
        }
      });
      resources.wsConnections = [];
    }
    // Clear all timers
    if (resources.timers && resources.timers.length > 0) {
      resources.timers.forEach((timer) => {
        try {
          if (typeof timer === "number") {
            clearInterval(timer);
            clearTimeout(timer);
          } else {
            clearInterval(timer as NodeJS.Timeout);
            clearTimeout(timer as NodeJS.Timeout);
          }
        } catch (e) {}
      });
      resources.timers = [];
    }
    // Remove all event listeners
    if (resources.eventListeners && resources.eventListeners.length > 0) {
      resources.eventListeners.forEach(({ target, event, handler }) => {
        try {
          target.removeEventListener(event, handler);
        } catch (e) {}
      });
      resources.eventListeners = [];
    }
    // Destroy all destroyable instances
    if (resources.destroyableInstances && resources.destroyableInstances.length > 0) {
      resources.destroyableInstances.forEach((instance) => {
        try {
          if (instance && instance.destroy) {
            instance.destroy();
          }
        } catch (e) {
          console.warn(`[DESTROY] Failed to destroy instance ${instance.name || "unnamed"}:`, e);
        }
      });
      resources.destroyableInstances = [];
    }
    // Execute all cleanup callbacks
    if (resources.cleanupCallbacks && resources.cleanupCallbacks.length > 0) {
      resources.cleanupCallbacks.forEach((callback) => {
        try {
          callback();
        } catch (e) {
          console.warn(`[DESTROY] Cleanup callback error:`, e);
        }
      });
      resources.cleanupCallbacks = [];
    }
    // Dispatch destroy events
    try {
      window.dispatchEvent(new CustomEvent(`__page_destroy_${pageKey}`));
      window.dispatchEvent(new CustomEvent("__page_destroy", { detail: { pageKey } }));
    } catch (e) {}
    delete window.__pageResources[pageKey];
  } catch (error) {
    console.error(`[DESTROY] Error during destruction of ${pageKey}:`, error);
  } finally {
    if (window.__pageCleanupInProgress) {
      delete window.__pageCleanupInProgress[pageKey];
    }
    window.__pageSwitchLock = false;
  }
};
/**
 * Register page resources for cleanup tracking
 */
export const registerPageResources = (
  pageKey: string,
  resources: {
    wsConnections?: WebSocket[];
    timers?: (number | NodeJS.Timeout)[];
    eventListeners?: Array<{ target: EventTarget; event: string; handler: EventListenerOrEventListenerObject }>;
    destroyableInstances?: Array<{ destroy: () => void; name?: string }>;
    cleanupCallbacks?: Array<() => void>;
  },
): (() => void) => {
  if (window.__pageCleanupInProgress?.[pageKey]) {
    console.warn(`[REGISTER] Page ${pageKey} is being destroyed, rejecting registration`);
    return () => {};
  }
  if (!window.__pageResources) {
    window.__pageResources = {};
  }
  if (!window.__pageResources[pageKey]) {
    window.__pageResources[pageKey] = {
      wsConnections: [],
      timers: [],
      eventListeners: [],
      destroyableInstances: [],
      cleanupCallbacks: [],
      isDestroying: false,
      destroyStartTime: 0,
    };
  }
  const target = window.__pageResources[pageKey];
  if (resources.wsConnections) {
    target.wsConnections.push(...resources.wsConnections);
  }
  if (resources.timers) {
    target.timers.push(...resources.timers);
  }
  if (resources.eventListeners) {
    target.eventListeners.push(...resources.eventListeners);
  }
  if (resources.destroyableInstances) {
    target.destroyableInstances.push(...resources.destroyableInstances);
  }
  if (resources.cleanupCallbacks) {
    target.cleanupCallbacks.push(...resources.cleanupCallbacks);
  }
  return () => {};
};
interface AppContentProps {
  theme: Theme;
  onToggleTheme: () => void;
  language: Language;
  onToggleLanguage: () => void;
  t: (key: string) => string;
  currentSessionId: string;
  isLoading: boolean;
  onNewSession: () => void;
  onSwitchSession: (sessionId: string) => void;
  onSendMessage: (message: string, sessionId: string, files?: UploadFile[], workflowMode?: string) => void;
  onResetSession: () => void;
  shouldShowWelcome: () => boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  menuPanelView: any;
  settingsSubView: SettingsSubView;
  engineSubView: any;
  menuPanelWidth: number;
  setMenuPanelWidth: (width: number) => void;
  currentContentPanel: ContentPanelView;
  onMenuClick: (view: string, subView?: string) => void;
  onCloseMenuPanel: () => void;
  onCloseContentPanel: () => void;
  onSaveConfig: (config: any) => void;
  initialEngineConfig: any;
  isFilePreviewOpen: boolean;
  previewFile: UploadFile | null;
  onFilePreview: (file: UploadFile) => void;
  onCloseFilePreview: () => void;
  executionLogs: any[];
  onClearLogs: () => void;
  isGlobalDragging: boolean;
  isDraggingOverInput: boolean;
  setIsDraggingOverInput: (value: boolean) => void;
  showDragCursor: boolean;
  layoutSwapMode: "terminal-left" | "chat-left";
  onLayoutSwapModeChange: (mode: "terminal-left" | "chat-left") => void;
  functionPanelPosition: "left" | "right";
  onFunctionPanelPositionChange: (position: "left" | "right") => void;
  onSendSkillMessage: (message: string, files?: UploadFile[]) => void;
  functionPanel: FunctionPanelController;
}
export function AppContent({
  theme,
  onToggleTheme,
  language,
  onToggleLanguage,
  t,
  currentSessionId,
  isLoading,
  onNewSession,
  onSwitchSession,
  onSendMessage,
  onResetSession,
  shouldShowWelcome,
  sidebarCollapsed,
  onToggleSidebar,
  menuPanelView,
  settingsSubView,
  engineSubView,
  menuPanelWidth,
  setMenuPanelWidth,
  currentContentPanel,
  onMenuClick,
  onCloseMenuPanel,
  onCloseContentPanel,
  onSaveConfig,
  initialEngineConfig,
  isFilePreviewOpen,
  previewFile,
  onFilePreview,
  onCloseFilePreview,
  executionLogs,
  onClearLogs,
  isGlobalDragging,
  isDraggingOverInput,
  setIsDraggingOverInput,
  showDragCursor,
  layoutSwapMode,
  onLayoutSwapModeChange,
  functionPanelPosition,
  onFunctionPanelPositionChange,
  onSendSkillMessage,
  functionPanel,
}: AppContentProps) {
  const MENU_PANEL_MIN_WIDTH = 240;
  const showWelcome = shouldShowWelcome();
  // Function panel state
  const [functionPanelWidth, setFunctionPanelWidth] = useState<number>(480);
  const [functionPanelCollapsed, setFunctionPanelCollapsed] = useState<boolean>(false);
  const [isFunctionPanelMaximized, setIsFunctionPanelMaximized] = useState(false);
  const [prevMaximizedState, setPrevMaximizedState] = useState<boolean>(false);
  const [isFuncPanelResizeHover, setIsFuncPanelResizeHover] = useState(false);
  const [isMenuResizeHover, setIsMenuResizeHover] = useState(false);
  // Refs for page switching and resize
  const prevContentPanelRef = useRef<ContentPanelView | null>(null);
  const isFirstRenderRef = useRef<boolean>(true);
  const pendingCleanupRef = useRef<Set<string>>(new Set());
  const isDraggingFunctionPanel = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  /**
   * Handle page switching with immediate cleanup
   * Destroys previous page and all its resources immediately
   */
  const performPageSwitch = useCallback((prevPage: ContentPanelView | null, currentPage: ContentPanelView | null) => {
    window.__pageSwitchLock = true;
    console.log(`[PAGE_SWITCH] Switching from ${prevPage} to ${currentPage}`);
    // 1. Clean up the previous page immediately
    if (prevPage) {
      const prevPageKey = prevPage as string;
      console.log(`[PAGE_SWITCH] Destroying previous page: ${prevPageKey}`);
      forceDestroyPage(prevPageKey);
    }
    // 2. If previous page was a subsystem page, force cleanup global resources
    if (prevPage && SUBSYSTEM_PAGES.includes(prevPage as PageType)) {
      cleanupPageResources(prevPage as PageType);
    }
    // 3. Destroy any other pages that are not the current one
    const allPageKeys = Object.keys(window.__pageResources || {});
    const currentPageKey = currentPage || PAGE_TYPES.GENERAL_CHAT;
    allPageKeys.forEach((pageKey) => {
      if (pageKey !== currentPageKey && !pendingCleanupRef.current.has(pageKey)) {
        pendingCleanupRef.current.add(pageKey);
        setTimeout(() => {
          forceDestroyPage(pageKey);
          pendingCleanupRef.current.delete(pageKey);
        }, 0);
      }
    });
    // 4. Clean up general chat if it's not the current page
    if (prevPage !== PAGE_TYPES.GENERAL_CHAT && currentPage !== PAGE_TYPES.GENERAL_CHAT) {
      forceDestroyPage(PAGE_TYPES.GENERAL_CHAT);
    }
    window.__pageSwitchLock = false;
  }, []);
  /**
   * Monitor page changes and trigger cleanup
   */
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevContentPanelRef.current = currentContentPanel;
      return;
    }
    const prevPage = prevContentPanelRef.current;
    const currentPage = currentContentPanel;
    if (prevPage === currentPage) {
      return;
    }
    // Perform page switch with immediate cleanup
    performPageSwitch(prevPage, currentPage);
    prevContentPanelRef.current = currentPage;
  }, [currentContentPanel, performPageSwitch]);
  /**
   * Toggle function panel maximize state
   */
  const toggleFunctionPanelMaximize = useCallback(() => {
    setIsFunctionPanelMaximized((prev) => !prev);
  }, []);
  /**
   * Save function panel width to localStorage
   */
  const saveFunctionPanelWidth = useCallback((w: number) => {
    localStorage.setItem("hippox-function-panel-width", w.toString());
  }, []);
  /**
   * Save function panel collapsed state to localStorage
   */
  const saveFunctionPanelCollapsed = useCallback((collapsed: boolean) => {
    localStorage.setItem("hippox-function-panel-collapsed", collapsed.toString());
  }, []);
  /**
   * Toggle function panel collapse state
   */
  const toggleFunctionPanelCollapse = useCallback(() => {
    setFunctionPanelCollapsed((prev) => {
      const newState = !prev;
      saveFunctionPanelCollapsed(newState);
      if (newState) {
        setPrevMaximizedState(isFunctionPanelMaximized);
        if (isFunctionPanelMaximized) {
          setIsFunctionPanelMaximized(false);
        }
      } else {
        if (prevMaximizedState) {
          setIsFunctionPanelMaximized(true);
        }
      }
      return newState;
    });
  }, [saveFunctionPanelCollapsed, isFunctionPanelMaximized, prevMaximizedState]);
  /**
   * Handle function panel resize mouse down
   */
  const handleFunctionPanelResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingFunctionPanel.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = functionPanelWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [functionPanelWidth],
  );
  /**
   * Function panel resize mouse move and up handlers
   */
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingFunctionPanel.current) return;
      const delta = e.clientX - dragStartX.current;
      const adjustedDelta = functionPanelPosition === "right" ? -delta : delta;
      const newWidth = Math.min(800, Math.max(320, dragStartWidth.current + adjustedDelta));
      if (newWidth !== functionPanelWidth) {
        setFunctionPanelWidth(newWidth);
        saveFunctionPanelWidth(newWidth);
      }
    };
    const onMouseUp = () => {
      if (isDraggingFunctionPanel.current) {
        isDraggingFunctionPanel.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [functionPanelWidth, saveFunctionPanelWidth, functionPanelPosition]);
  /**
   * Handle maximize toggle from window event
   */
  useEffect(() => {
    const handleToggleMaximize = () => {
      setIsFunctionPanelMaximized((prev) => !prev);
    };
    window.addEventListener("toggle-function-panel-maximize", handleToggleMaximize);
    return () => {
      window.removeEventListener("toggle-function-panel-maximize", handleToggleMaximize);
    };
  }, []);
  /**
   * Restore function panel state from localStorage
   */
  useEffect(() => {
    const saved = localStorage.getItem("hippox-function-panel-width");
    if (saved) {
      const w = parseFloat(saved);
      if (!isNaN(w) && w > 0) setFunctionPanelWidth(w);
    }
    const savedCollapsed = localStorage.getItem("hippox-function-panel-collapsed");
    if (savedCollapsed) {
      setFunctionPanelCollapsed(savedCollapsed === "true");
    }
  }, []);
  /**
   * Handle session switch - minimize function panel
   */
  useEffect(() => {
    const handleSessionSwitch = () => {
      if (isFunctionPanelMaximized) {
        setIsFunctionPanelMaximized(false);
        setFunctionPanelWidth((prev) => prev);
      }
    };
    window.addEventListener("session-created", handleSessionSwitch);
    return () => {
      window.removeEventListener("session-created", handleSessionSwitch);
    };
  }, [isFunctionPanelMaximized]);
  /**
   * Minimize function panel when content panel changes
   */
  useEffect(() => {
    if (isFunctionPanelMaximized) {
      setIsFunctionPanelMaximized(false);
    }
  }, [currentContentPanel]);
  /**
   * Handle file click - preview file and open function panel
   */
  const handleFileClick = (file: UploadFile) => {
    onFilePreview(file);
    functionPanel.openPreview(file);
  };
  /**
   * Render engine configuration panel based on subview
   */
  const renderEngineConfig = () => {
    switch (engineSubView) {
      case "engine_database":
        return <EngineDatabasePanel t={t} initialConfig={initialEngineConfig} onSave={onSaveConfig} />;
      case "engine_network":
        return <EngineNetworkPanel t={t} initialConfig={initialEngineConfig} onSave={onSaveConfig} />;
      case "engine_container":
        return <EngineContainerPanel t={t} initialConfig={initialEngineConfig} onSave={onSaveConfig} />;
      case "engine_notification":
        return <EngineNotificationPanel t={t} initialConfig={initialEngineConfig} onSave={onSaveConfig} />;
      default:
        return null;
    }
  };
  // Styles
  const styles = {
    mainLayout: {
      display: "flex" as const,
      flex: 1,
      overflow: "hidden" as const,
    },
    contentArea: {
      flex: 1,
      overflow: "hidden" as const,
      display: "flex" as const,
      flexDirection: "column" as const,
    },
    handleLine: {
      position: "absolute" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "2px",
      height: "40px",
      background: "var(--text-muted)",
      borderRadius: "2px",
      opacity: 0.5,
      zIndex: 11,
    },
    functionPanelResizeHandle: {
      width: "1px",
      background: "var(--border-color)",
      cursor: "col-resize" as const,
      flexShrink: 0,
      position: "relative" as const,
      transition: "width 0.15s, background 0.15s",
    },
    functionPanelResizeHandleLine: {
      position: "absolute" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "2px",
      height: "40px",
      background: "var(--text-muted)",
      borderRadius: "2px",
      opacity: 0.5,
      zIndex: 11,
    },
  };
  /**
   * Render a subsystem page with a key that forces React to unmount on change
   * This ensures React destroys the component tree completely
   */
  const renderSubsystemPage = (pageKey: PageType, element: React.ReactNode): React.ReactNode => {
    return (
      <div key={pageKey} data-page-key={pageKey} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        {element}
      </div>
    );
  };
  /**
   * Render the main layout content
   */
  const renderMainLayout = () => {
    const isChatPage = !currentContentPanel || currentContentPanel === "generalChat";
    const isMapPage = currentContentPanel === "mapChat";
    const isChartPage = currentContentPanel === "chartChat";
    const isCodeEditorChat = currentContentPanel === "codeEditorChat";
    const isVideoEditor = currentContentPanel === "videoEditor";
    const isSandbox3d = currentContentPanel === "sandbox3d";
    let contentElement: React.ReactNode;
    if (isChatPage) {
      if (showWelcome && !currentContentPanel) {
        contentElement = (
          <WelcomePage
            onSendMessage={(msg, files, workflowMode) => onSendMessage(msg, currentSessionId, files, workflowMode)}
            t={t}
            onDragOverInputChange={setIsDraggingOverInput}
            onNavigateTo={(pageId) => {
              onMenuClick(pageId);
            }}
          />
        );
      } else {
        contentElement = renderSubsystemPage(
          PAGE_TYPES.GENERAL_CHAT,
          <GeneralChatPage
            layoutMode="horizontal"
            onLayoutModeChange={() => {}}
            leftTitle={t("chat.title") || "Chat"}
            rightTitle={t("terminal.title") || "Terminal"}
            isFunctionPanelMaximized={functionPanel.isOpen ? isFunctionPanelMaximized : false}
            currentSessionId={currentSessionId}
            onSwitchSession={(sessionId) => {
              onSwitchSession(sessionId);
            }}
            onCloseSkillsManager={onCloseContentPanel}
            t={t}
            onSendMessage={onSendMessage}
            onFileClick={handleFileClick}
            language={language}
            onDragOverInputChange={setIsDraggingOverInput}
            executionLogs={executionLogs}
            onClearLogs={onClearLogs}
          />,
        );
      }
    } else if (isMapPage) {
      contentElement = renderSubsystemPage(
        PAGE_TYPES.MAP_CHAT,
        <MapsPage
          layoutMode="horizontal"
          onLayoutModeChange={() => {}}
          leftTitle={t("chat.title") || "Chat"}
          rightTitle="Map"
          leftIcon={<MessageSquare size={18} />}
          rightIcon={<MapPin size={18} />}
          isFunctionPanelMaximized={functionPanel.isOpen ? isFunctionPanelMaximized : false}
          onCloseSkillsManager={onCloseContentPanel}
          t={t}
          theme={theme === "dark" ? "dark" : "light"}
          i18n={language === "zh" ? "zh-cn" : "en"}
          onFileClick={handleFileClick}
          language={language}
          onDragOverInputChange={setIsDraggingOverInput}
          executionLogs={executionLogs}
          onClearLogs={onClearLogs}
        />,
      );
    } else if (isChartPage) {
      contentElement = renderSubsystemPage(
        PAGE_TYPES.CHART_CHAT,
        <ChartPage
          layoutMode="horizontal"
          onLayoutModeChange={() => {}}
          leftTitle={t("chat.title") || "Chat"}
          rightTitle="Chart"
          leftIcon={<MessageSquare size={18} />}
          rightIcon={<BarChart3 size={18} />}
          isFunctionPanelMaximized={functionPanel.isOpen ? isFunctionPanelMaximized : false}
          t={t}
          theme={theme === "dark" ? "dark" : "light"}
          i18n={language === "zh" ? "zh-cn" : "en"}
          onFileClick={handleFileClick}
          language={language}
          onDragOverInputChange={setIsDraggingOverInput}
          executionLogs={executionLogs}
          onClearLogs={onClearLogs}
        />,
      );
    } else if (isCodeEditorChat) {
      contentElement = renderSubsystemPage(
        PAGE_TYPES.CODE_EDITOR,
        <CodeEditorPage
          layoutMode="horizontal"
          onLayoutModeChange={() => {}}
          leftTitle={t("chat.title") || "Chat"}
          rightTitle={t("codeEditor.title") || "Code Editor"}
          isFunctionPanelMaximized={functionPanel.isOpen ? isFunctionPanelMaximized : false}
          onCloseSkillsManager={onCloseContentPanel}
          t={t}
          theme={theme === "dark" ? "dark" : "light"}
          i18n={language === "zh" ? "zh-cn" : "en"}
          onFileClick={handleFileClick}
          language={language}
          onDragOverInputChange={setIsDraggingOverInput}
          executionLogs={executionLogs}
          onClearLogs={onClearLogs}
        />,
      );
    } else if (isVideoEditor) {
      contentElement = renderSubsystemPage(PAGE_TYPES.VIDEO_EDITOR, <VideoEditorPage t={t} theme={theme === "dark" ? "dark" : "light"} i18n={language === "zh" ? "zh-cn" : "en"} />);
    } else if (isSandbox3d) {
      contentElement = renderSubsystemPage(PAGE_TYPES.SANDBOX_3D, <SandBox3DPage t={t} theme={theme === "dark" ? "dark" : "light"} i18n={language === "zh" ? "zh-cn" : "en"} />);
    } else {
      // Other non-subsystem panels
      switch (currentContentPanel) {
        case "taskQueue":
          contentElement = <TaskQueuePanel t={t} />;
          break;
        case "workspace":
          contentElement = <WorkspacePanel t={t} />;
          break;
        case "workspaceConfig":
          contentElement = <WorkspaceConfig t={t} onSaveWorkspace={onSaveConfig} />;
          break;
        case "logs":
          contentElement = <LogsPanel t={t} onClose={onCloseContentPanel} />;
          break;
        case "storage":
          contentElement = <StorageConfig t={t} onSave={onSaveConfig} />;
          break;
        case "settings":
          contentElement = <SettingsPanel subView={settingsSubView || "llmModel"} t={t} onSave={onSaveConfig} theme={theme} language={language} onThemeChange={onToggleTheme} onLanguageChange={onToggleLanguage} isInitializing={false} />;
          break;
        case "engine_group":
          contentElement = renderEngineConfig();
          break;
        case "skillsManager":
          contentElement = <SkillsManager t={t} onClose={onCloseContentPanel} currentSessionId={currentSessionId} onSendSkillMessage={onSendSkillMessage} />;
          break;
        case "scheduledTasks":
          contentElement = <ScheduledTasksManager t={t} onClose={onCloseContentPanel} currentSessionId={currentSessionId} />;
          break;
        case "userProfile":
          contentElement = <UserProfile t={t} onClose={onCloseContentPanel} currentSessionId={currentSessionId} />;
          break;
        default:
          contentElement = null;
      }
    }
    /**
     * Render the resize handle between content and function panel
     */
    const renderResizeHandle = () => (
      <div
        className="resize-handle resize-handle-vertical"
        onMouseDown={handleFunctionPanelResizeMouseDown}
        style={{
          ...styles.functionPanelResizeHandle,
          width: "3px",
          background: isFuncPanelResizeHover ? "var(--scrollbar-thumb)" : "var(--border-color)",
        }}
        onMouseEnter={() => setIsFuncPanelResizeHover(true)}
        onMouseLeave={() => setIsFuncPanelResizeHover(false)}
      >
        {isFuncPanelResizeHover && <div style={styles.functionPanelResizeHandleLine} className="function-panel-handle-line" />}
      </div>
    );
    /**
     * Render the function panel component
     */
    const renderFunctionPanelComponent = (collapsed: boolean) => (
      <FunctionPanel
        controller={functionPanel}
        theme={theme}
        i18n={language === "zh" ? "zh-cn" : "en"}
        t={t}
        currentSessionId={currentSessionId}
        onSendSkillMessage={onSendSkillMessage}
        width={isFunctionPanelMaximized ? "100%" : functionPanelWidth}
        isCollapsed={collapsed}
        onToggleCollapse={toggleFunctionPanelCollapse}
        functionPanelPosition={functionPanelPosition}
        isMaximized={isFunctionPanelMaximized}
        onToggleMaximize={toggleFunctionPanelMaximize}
      />
    );
    // If function panel is not open, render only content
    if (!functionPanel.isOpen) {
      if (isFunctionPanelMaximized) {
        setIsFunctionPanelMaximized(false);
      }
      return <div style={styles.contentArea}>{contentElement}</div>;
    }
    // If function panel is maximized, render only function panel
    if (isFunctionPanelMaximized) {
      return <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>{renderFunctionPanelComponent(functionPanelCollapsed)}</div>;
    }
    const functionPanelElement = renderFunctionPanelComponent(functionPanelCollapsed);
    const resizeHandle = functionPanelCollapsed ? null : renderResizeHandle();
    // Render based on function panel position
    if (functionPanelPosition === "left") {
      return (
        <>
          {functionPanelElement}
          {resizeHandle}
          <div style={styles.contentArea}>{contentElement}</div>
        </>
      );
    } else {
      return (
        <>
          <div style={styles.contentArea}>{contentElement}</div>
          {resizeHandle}
          {functionPanelElement}
        </>
      );
    }
  };
  /**
   * Cleanup all page resources on unmount
   */
  useEffect(() => {
    return () => {
      const allPageKeys = Object.keys(window.__pageResources || {});
      allPageKeys.forEach((pageKey) => {
        forceDestroyPage(pageKey);
      });
    };
  }, []);
  return (
    <div className="App">
      <style>{`
        .menu-panel-resize-handle {
          position: relative;
          z-index: 1;
        }
        .menu-panel-resize-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
        .resize-handle-vertical {
          position: relative;
          z-index: 1;
        }
        .resize-handle-vertical::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
      `}</style>
      <CustomDragCursor isDragging={showDragCursor} />
      <GlobalDragOverlay isDragging={isGlobalDragging && !isDraggingOverInput} />
      <Toast />
      <Dialog />
      <TopBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={onToggleSidebar}
        onNewSession={onNewSession}
        currentTheme={theme}
        onToggleTheme={onToggleTheme}
        currentLanguage={language}
        onToggleLanguage={onToggleLanguage}
        t={t}
        layoutSwapMode={layoutSwapMode}
        functionPanelPosition={functionPanelPosition}
        onFunctionPanelPositionChange={onFunctionPanelPositionChange}
        onSwitchSession={onSwitchSession}
        currentSessionId={currentSessionId}
        onFileClick={handleFileClick}
      />
      <div style={styles.mainLayout}>
        {!sidebarCollapsed && <Sidebar collapsed={sidebarCollapsed} onResetSession={onResetSession} onClearLogs={onClearLogs} onMenuClick={onMenuClick} onNewSession={onNewSession} currentSessionId={currentSessionId} onSwitchSession={onSwitchSession} t={t} />}
        {menuPanelView && (
          <>
            <div className="menu-panel-left" style={{ width: menuPanelWidth }}>
              <MenuPanel
                currentView={menuPanelView}
                settingsSubView={settingsSubView}
                engineSubView={engineSubView}
                onClose={onCloseMenuPanel}
                onSaveConfig={onSaveConfig}
                t={t}
                theme={theme}
                language={language}
                onThemeChange={onToggleTheme}
                onLanguageChange={onToggleLanguage}
                isInitializing={false}
                currentSessionId={currentSessionId}
                onSwitchSession={onSwitchSession}
                initialEngineConfig={initialEngineConfig}
                onCloseSkillsManager={onCloseContentPanel}
                onSendSkillMessage={onSendSkillMessage}
                layoutSwapMode={layoutSwapMode}
                onLayoutSwapModeChange={onLayoutSwapModeChange}
                functionPanelPosition={functionPanelPosition}
                onFunctionPanelPositionChange={onFunctionPanelPositionChange}
                onFileClick={handleFileClick}
              />
            </div>
            <div
              className="menu-panel-resize-handle"
              style={{
                width: "3px",
                background: isMenuResizeHover ? "var(--scrollbar-thumb)" : "var(--border-color)",
                cursor: "col-resize",
                flexShrink: 0,
                position: "relative",
                transition: "width 0.15s, background 0.15s",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = menuPanelWidth;
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const newWidth = startWidth + (moveEvent.clientX - startX);
                  if (newWidth >= MENU_PANEL_MIN_WIDTH && newWidth <= 300) {
                    setMenuPanelWidth(newWidth);
                  }
                };
                const onMouseUp = () => {
                  document.removeEventListener("mousemove", onMouseMove);
                  document.removeEventListener("mouseup", onMouseUp);
                  document.body.style.cursor = "";
                  document.body.style.userSelect = "";
                };
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
              }}
              onMouseEnter={() => setIsMenuResizeHover(true)}
              onMouseLeave={() => setIsMenuResizeHover(false)}
            >
              {isMenuResizeHover && <div style={styles.handleLine} className="handle-line" />}
            </div>
          </>
        )}
        {renderMainLayout()}
      </div>
      <BottomBar t={t} />
    </div>
  );
}
