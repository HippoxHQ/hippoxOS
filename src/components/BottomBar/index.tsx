import React, { useState, useEffect, useRef } from "react";
import NotificationCenter from "./NotificationCenter";
import ModelSelector from "./ModelSelector";
import { LlmInstance } from "../../api/llm";
import { configCommands } from "../../api/config";
import { systemNotificationService } from "../../services/Notification";

interface IconProps {
  className?: string;
  size?: number;
}

const ModelIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="9" x2="15" y2="15" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const BellIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const BellDotIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <circle cx="19" cy="5" r="2.5" fill="red" stroke="red" />
  </svg>
);

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
  
  .version-info {
    font-size: 11px;
    color: var(--text-tertiary);
    margin-right: 4px;
  }
  
  .health-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-tertiary);
    margin-right: 4px;
  }
  
  .status-dot-small {
    width: 6px;
    height: 6px;
    background: #22c55e;
    border-radius: 50%;
    animation: pulse 2s infinite;
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
  
  .bottom-bar-btn {
    position: relative;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
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

interface BottomBarProps {
  t: (key: string, params?: Record<string, any>) => string;
}

const BottomBar: React.FC<BottomBarProps> = ({ t }) => {
  const version = "v2026.3.8";
  const [modelPopupVisible, setModelPopupVisible] = useState(false);
  const [notificationCenterVisible, setNotificationCenterVisible] =
    useState(false);
  const [llmInstances, setLlmInstances] = useState<LlmInstance[]>([]);
  const [defaultInstanceId, setDefaultInstanceId] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(0);
  const modelButtonRef = useRef<HTMLButtonElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loadLlmInstances = async () => {
      try {
        const instances = await configCommands.getLlmInstances();
        const instancesList = Object.values(instances) as LlmInstance[];
        setLlmInstances(instancesList);
        const defaultId = await configCommands.getDefaultLlmInstanceId();
        setDefaultInstanceId(defaultId);
      } catch (error) {
        console.error("Failed to load LLM instances:", error);
      }
    };
    loadLlmInstances();
  }, []);

  useEffect(() => {
    setUnreadCount(systemNotificationService.getUnreadCount());
    const handleCountUpdate = (e: CustomEvent) => {
      setUnreadCount(e.detail.count);
    };
    window.addEventListener(
      "system-notification-count-update",
      handleCountUpdate as EventListener,
    );
    return () => {
      window.removeEventListener(
        "system-notification-count-update",
        handleCountUpdate as EventListener,
      );
    };
  }, []);

  const modelPopupRef = useRef<HTMLDivElement>(null);
  const notificationPopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isAnyBottomBarBtn = target.closest(".bottom-bar-btn");
      if (isAnyBottomBarBtn) {
        return;
      }
      const isModelPopup = modelPopupRef.current?.contains(target);
      const isNotificationPopup =
        notificationPopupRef.current?.contains(target);
      if (!isModelPopup && modelPopupVisible) {
        setModelPopupVisible(false);
      }
      if (!isNotificationPopup && notificationCenterVisible) {
        setNotificationCenterVisible(false);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, [modelPopupVisible, notificationCenterVisible]);

  const handleSetDefaultModel = async (instanceId: string) => {
    try {
      await configCommands.setDefaultLlmInstance(instanceId);
      setDefaultInstanceId(instanceId);
      systemNotificationService.addSuccess(
        t("llmModel.defaultSuccess", {
          name: llmInstances.find((i) => i.id === instanceId)?.name,
        }),
        "",
      );
    } catch (error) {
      console.error("Failed to set default model:", error);
    }
  };

  const getDefaultInstance = () => {
    if (defaultInstanceId) {
      return llmInstances.find((i) => i.id === defaultInstanceId);
    }
    return llmInstances[0];
  };

  const defaultInstance = getDefaultInstance();

  return (
    <>
      <div className="bottom-bar">
        <div className="bottom-bar-left">
          <button
            ref={modelButtonRef}
            className={`bottom-bar-btn ${modelPopupVisible ? "bottom-bar-active" : ""}`}
            onClick={() => setModelPopupVisible(!modelPopupVisible)}
            title={t("bottomBar.model")}
          >
            <ModelIcon size={14} />
            <span>{defaultInstance?.name || t("bottomBar.model")}</span>
          </button>
        </div>

        <div className="bottom-bar-right">
          <span className="version-info">{version}</span>
          <span className="health-status">
            <span className="status-dot-small"></span>
            {t("status.healthy")}
          </span>
          <button
            ref={notificationButtonRef}
            className={`bottom-bar-btn ${notificationCenterVisible ? "bottom-bar-active" : ""}`}
            onClick={() =>
              setNotificationCenterVisible(!notificationCenterVisible)
            }
            title={t("bottomBar.notifications")}
          >
            {unreadCount > 0 ? (
              <BellDotIcon size={14} />
            ) : (
              <BellIcon size={14} />
            )}
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
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
    </>
  );
};

export default BottomBar;
