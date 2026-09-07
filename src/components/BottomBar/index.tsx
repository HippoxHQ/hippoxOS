import React, { useState, useEffect, useRef } from "react";
import NotificationCenter from "./NotificationCenter";
import ModelSelector from "./ModelSelector";
import ScheduledTasksStatus from "./ScheduledTasksStatus";
import { showToast, ToastType } from "../Toast";
import { BotIcon2 } from "../../icons";
import { configCommands } from "../../command/config";
import { LlmInstance } from "../../command/llm";
import { systemNotificationService } from "../../core/NotificationManager";
import { basisCommands } from "../../command/basis";
import { healthCommands, HealthCheckResult } from "../../command/health";
import SystemResourceMonitor from "./SystemResourceMonitor";
import { Bell, BellDot, Clock } from "lucide-react";
interface BottomBarProps {
  t: (key: string, params?: Record<string, any>) => string;
}
type StatusDotState = "online" | "offline" | "checking";
const bottomBarStyles = `
  .bottom-bar {
    height: 30px;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    flex-shrink: 0;
  }
  .bottom-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .bottom-bar-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .bottom-bar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 24px;
    padding: 0 8px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 450;
    color: var(--text-secondary);
    transition: all 0.15s ease;
    position: relative;
  }
  .bottom-bar-btn svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 1.75;
    fill: none;
  }
  .bottom-bar-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  .bottom-bar-active {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  .status-dot {
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid var(--bg-secondary);
    transition: background-color 0.3s ease;
  }
  .status-dot.online {
    background: #22c55e;
    animation: pulse-dot 2s infinite;
  }
  .status-dot.offline {
    background: #ef4444;
    animation: none;
  }
  .status-dot.checking {
    background: #f59e0b;
    animation: pulse-dot 0.8s infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .version-info {
    font-size: 11px;
    color: var(--text-tertiary);
    margin-right: 4px;
  }
  .notification-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 14px;
    height: 14px;
    padding: 0 3px;
    background: #ef4444;
    color: white;
    font-size: 9px;
    font-weight: 600;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
if (typeof document !== "undefined") {
  const styleId = "bottom-bar-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = bottomBarStyles;
    document.head.appendChild(style);
  }
}
const BottomBar: React.FC<BottomBarProps> = ({ t }) => {
  const [hippoxVersion, setHippoxVersion] = useState<string>("");
  const [modelPopupVisible, setModelPopupVisible] = useState(false);
  const [notificationCenterVisible, setNotificationCenterVisible] = useState(false);
  const [scheduledTasksVisible, setScheduledTasksVisible] = useState(false);
  const [llmInstances, setLlmInstances] = useState<LlmInstance[]>([]);
  const [defaultInstanceId, setDefaultInstanceId] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [statusDot, setStatusDot] = useState<StatusDotState>("checking");
  const modelButtonRef = useRef<HTMLButtonElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const scheduledTasksButtonRef = useRef<HTMLButtonElement>(null);
  const modelPopupRef = useRef<HTMLDivElement>(null);
  const notificationPopupRef = useRef<HTMLDivElement>(null);
  const scheduledTasksPopupRef = useRef<HTMLDivElement>(null);
  // Load LLM instances and update state
  const loadLlmInstances = async () => {
    try {
      const instances = await configCommands.getLlmInstances();
      const instancesList = Object.values(instances) as LlmInstance[];
      setLlmInstances(instancesList);
      const defaultId = await configCommands.getDefaultLlmInstanceId();
      setDefaultInstanceId(defaultId);
      await checkLlmHealth(instancesList);
      return instancesList;
    } catch (error) {
      showToast(ToastType.ERROR, "Failed to load LLM instances: " + error);
      setStatusDot("offline");
      return [];
    }
  };
  // Check health status of LLM instances
  const checkLlmHealth = async (instances: LlmInstance[]) => {
    if (instances.length === 0) {
      setStatusDot("offline");
      return;
    }
    try {
      setStatusDot("checking");
      const results = await healthCommands.checkAllLlmHealth();
      const defaultId = await configCommands.getDefaultLlmInstanceId();
      const targetId = defaultId || instances[0]?.id;
      const targetResult = results.find((r: HealthCheckResult) => r.instance_id === targetId);
      setStatusDot(targetResult?.status === "online" ? "online" : "offline");
    } catch (error) {
      console.error("Failed to check LLM health:", error);
      setStatusDot("offline");
    }
  };
  // Load version on mount
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const result = await basisCommands.getHippoxVersions();
        const version = result?.["hippox"];
        if (version && version !== "unknown") {
          setHippoxVersion(`v${version}`);
        }
      } catch (error) {
        console.error("Failed to fetch hippox version:", error);
      }
    };
    loadVersion();
  }, []);
  // Load LLM instances on mount
  useEffect(() => {
    loadLlmInstances();
  }, []);
  // Load unread count from notification manager
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        await systemNotificationService.initialize();
        const count = await systemNotificationService.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        showToast(ToastType.ERROR, "Failed to load unread count: " + error);
        setUnreadCount(0);
      }
    };
    loadUnreadCount();
    const handleCountUpdate = (e: CustomEvent) => {
      setUnreadCount(e.detail.count);
    };
    window.addEventListener("system-notification-count-update", handleCountUpdate as EventListener);
    return () => {
      window.removeEventListener("system-notification-count-update", handleCountUpdate as EventListener);
    };
  }, []);
  // Handle click outside to close popups
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isModelButton = modelButtonRef.current?.contains(target);
      const isNotificationButton = notificationButtonRef.current?.contains(target);
      const isScheduledTasksButton = scheduledTasksButtonRef.current?.contains(target);
      if (isModelButton || isNotificationButton || isScheduledTasksButton) {
        return;
      }
      const isModelPopup = modelPopupRef.current?.contains(target);
      const isNotificationPopup = notificationPopupRef.current?.contains(target);
      const isScheduledTasksPopup = scheduledTasksPopupRef.current?.contains(target);
      if (!isModelPopup && modelPopupVisible) {
        setModelPopupVisible(false);
      }
      if (!isNotificationPopup && notificationCenterVisible) {
        setNotificationCenterVisible(false);
      }
      if (!isScheduledTasksPopup && scheduledTasksVisible) {
        setScheduledTasksVisible(false);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, [modelPopupVisible, notificationCenterVisible, scheduledTasksVisible]);
  // Handle setting default model - reload instances to reflect changes
  const handleSetDefaultModel = async (instanceId: string) => {
    try {
      await configCommands.setDefaultLlmInstance(instanceId);
      setDefaultInstanceId(instanceId);
      // Reload LLM instances to get updated state from backend
      const instances = await configCommands.getLlmInstances();
      const instancesList = Object.values(instances) as LlmInstance[];
      setLlmInstances(instancesList);
      await checkLlmHealth(instancesList);
      systemNotificationService.addSuccess(
        t("llmModel.defaultSuccess", {
          name: instancesList.find((i) => i.id === instanceId)?.name,
        }),
        "",
      );
    } catch (error) {
      showToast(ToastType.ERROR, "Failed to set default model: " + error);
    }
  };
  // Handle opening model selector - refresh instances
  const handleOpenModelSelector = async () => {
    setModelPopupVisible(!modelPopupVisible);
    if (!modelPopupVisible) {
      // Refresh instances when opening the popup
      await loadLlmInstances();
    }
  };
  // Get the default instance for display
  const getDefaultInstance = () => {
    let instance;
    if (defaultInstanceId) {
      instance = llmInstances.find((i) => i.id === defaultInstanceId);
    } else {
      instance = llmInstances[0];
    }
    if (instance) {
      instance = {
        ...instance,
        name: instance.name.replace(/Instance/gi, "").trim() || instance.name,
      };
    }
    return instance;
  };
  const defaultInstance = getDefaultInstance();
  return (
    <>
      <div className="bottom-bar">
        <div className="bottom-bar-left">
          <button
            ref={modelButtonRef}
            className={`bottom-bar-btn ${modelPopupVisible ? "bottom-bar-active" : ""}`}
            onClick={handleOpenModelSelector}
            title={t("bottomBar.model")}
          >
            <div style={{ position: "relative", display: "inline-flex" }}>
              <BotIcon2 size={19} />
              <span className={`status-dot ${statusDot}`} />
            </div>
            <span>{defaultInstance?.name || t("bottomBar.model")}</span>
          </button>
        </div>
        <div className="bottom-bar-right">
          {/* System resource monitoring */}
          <SystemResourceMonitor t={t} />
          {!hippoxVersion ? (
            <span className="version-info">{t("common.loading")}</span>
          ) : (
            <span className="version-info">
              {t("bottomBar.engine")} {hippoxVersion}
            </span>
          )}
          <button
            ref={scheduledTasksButtonRef}
            className={`bottom-bar-btn ${scheduledTasksVisible ? "bottom-bar-active" : ""}`}
            onClick={() => {
              setNotificationCenterVisible(false);
              setScheduledTasksVisible(!scheduledTasksVisible);
            }}
            title={t("scheduled.tasks")}
          >
            <Clock size={14} />
          </button>
          <button
            ref={notificationButtonRef}
            className={`bottom-bar-btn ${notificationCenterVisible ? "bottom-bar-active" : ""}`}
            onClick={() => {
              setScheduledTasksVisible(false);
              setNotificationCenterVisible(!notificationCenterVisible);
            }}
            title={t("bottomBar.notifications")}
          >
            {unreadCount > 0 ? <BellDot size={14} /> : <Bell size={14} />}
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </button>
        </div>
      </div>
      <ModelSelector
        isOpen={modelPopupVisible}
        onClose={() => setModelPopupVisible(false)}
        llmInstances={llmInstances}
        defaultInstanceId={defaultInstanceId}
        onSetDefaultModel={handleSetDefaultModel}
        t={t}
        anchorRef={modelButtonRef as React.RefObject<HTMLElement>}
        popupRef={modelPopupRef}
      />
      <NotificationCenter
        isOpen={notificationCenterVisible}
        onClose={() => setNotificationCenterVisible(false)}
        anchorRef={notificationButtonRef as React.RefObject<HTMLElement>}
        t={t}
        popupRef={notificationPopupRef}
      />
      <ScheduledTasksStatus
        isOpen={scheduledTasksVisible}
        onClose={() => setScheduledTasksVisible(false)}
        anchorRef={scheduledTasksButtonRef as React.RefObject<HTMLElement>}
        t={t}
        popupRef={scheduledTasksPopupRef}
      />
    </>
  );
};
export default BottomBar;