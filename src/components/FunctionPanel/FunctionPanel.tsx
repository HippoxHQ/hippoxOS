import React, {
  useRef,
  useMemo,
  useCallback,
  useState,
  useEffect,
} from "react";
import PreviewContent from "./integrations/IntegratedPreviewContent/IntegratedPreviewContent";
import IntegratedCandleView from "./integrations/IntegratedCandleView";
import IntegratedEarthView from "./integrations/IntegratedEarthView";
import { ModuleTabs } from "./ModuleTabs";
import { ModuleContent } from "./ModuleContent";
import { FunctionPanelController } from "./hooks/useFunctionPanelController";

interface FunctionPanelProps {
  controller: FunctionPanelController;
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
  onSendSkillMessage?: (message: string, files?: any[]) => void;
  width?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  functionPanelPosition?: "left" | "right";
}

const FunctionPanel: React.FC<FunctionPanelProps> = ({
  controller,
  theme,
  i18n,
  t,
  currentSessionId,
  onSendSkillMessage,
  width = 480,
  isCollapsed = false,
  onToggleCollapse,
  functionPanelPosition = "right",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef(controller);
  const itemsRef = useRef(controller.items);
  const activeItemIdRef = useRef(controller.activeItemId);

  useEffect(() => {
    controllerRef.current = controller;
    itemsRef.current = controller.items;
    activeItemIdRef.current = controller.activeItemId;
  }, [controller, controller.items, controller.activeItemId]);

  const renderItemContent = useCallback(
    (item: any) => {
      if (!item) return null;
      switch (item.type) {
        case "preview":
          return (
            <PreviewContent
              key={item.id}
              file={item.data}
              onClose={() => controller.closeItem(item.id)}
              onSendSkillMessage={onSendSkillMessage}
              t={t}
            />
          );
        case "map":
          return (
            <IntegratedEarthView
              key={item.id}
              theme={theme}
              i18n={i18n}
              taskId={item.data?.taskId}
              mapData={item.data?.mapData}
            />
          );
        case "chart":
          return (
            <IntegratedCandleView
              key={item.id}
              theme={theme}
              i18n={i18n}
              currentSessionId={currentSessionId}
              taskId={item.data?.taskId}
              chartData={item.data?.chartData}
            />
          );
        default:
          return null;
      }
    },
    [theme, i18n, currentSessionId, onSendSkillMessage, t, controller],
  );

  const renderItemContentRef = useRef(renderItemContent);

  useEffect(() => {
    renderItemContentRef.current = renderItemContent;
  }, [renderItemContent]);

  const activeItem = useMemo(() => {
    return controller.getActiveItem?.() || null;
  }, [controller.getActiveItem, controller.items, controller.activeItemId]);

  const activeContent = useMemo(() => {
    return activeItem ? renderItemContentRef.current(activeItem) : null;
  }, [activeItem]);

  if (!controller.isOpen || controller.items.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width: isCollapsed ? 48 : width,
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
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 14 }}>
            {t("functionArea.noModule") || "No module open"}
          </div>
        </div>
      </div>
    );
  }

  if (isCollapsed) {
    const expandIcon = functionPanelPosition === "left" ? "≫" : "≪";
    return (
      <div
        ref={containerRef}
        style={{
          width: "45px",
          flexShrink: 0,
          overflow: "hidden",
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          height: "100%",
          position: "relative",
        }}
      >
        <div
          style={{
            borderBottom: "1px solid var(--border-color)",
            padding: "4px 0px",
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={onToggleCollapse}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "15px",
              padding: "6px",
              borderRadius: "6px",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            title={t("functionArea.expand") || "Expand"}
          >
            {expandIcon}
          </button>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            fontSize: "10px",
            color: "var(--text-tertiary)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "16px" }}>📂</span>
        </div>
        <CollapsedTabList
          items={controller.items}
          activeItemId={controller.activeItemId}
          onSwitch={(id) => {
            controller.switchTo(id);
            if (onToggleCollapse) onToggleCollapse();
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width,
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
      <ModuleTabs
        items={controller.items}
        activeItemId={controller.activeItemId}
        onSwitch={controller.switchTo}
        onClose={controller.closeItem}
        onClosePanel={controller.closePanel}
        onToggleCollapse={onToggleCollapse}
        t={t}
        functionPanelPosition={functionPanelPosition}
      />
      <ModuleContent content={activeContent} isEmpty={!activeContent} t={t} />
      <style>{`
        .function-panel-content::-webkit-scrollbar {
          width: 6px;
        }
        .function-panel-content::-webkit-scrollbar-track {
          background: var(--bg-secondary);
          border-radius: 3px;
        }
        .function-panel-content::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }
        .function-panel-content::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
};

interface CollapsedTabListProps {
  items: any[];
  activeItemId: string | null;
  onSwitch: (id: string) => void;
  functionPanelPosition?: "left" | "right";
}

const CollapsedTabList: React.FC<CollapsedTabListProps> = ({
  items,
  activeItemId,
  onSwitch,
  functionPanelPosition = "right",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(false);
  const expandIcon = functionPanelPosition === "left" ? "≫" : "≪";

  const checkScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const canScrollUp = scrollTop > 0;
    const canScrollDown = scrollTop + clientHeight < scrollHeight - 1;
    setShowUp(canScrollUp);
    setShowDown(canScrollDown);
  }, []);

  const updateScrollButtons = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollHeight, clientHeight } = containerRef.current;
    const canScroll = scrollHeight > clientHeight;
    if (canScroll) {
      requestAnimationFrame(() => {
        checkScroll();
      });
    } else {
      setShowUp(false);
      setShowDown(false);
    }
  }, [checkScroll]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      const resizeObserver = new ResizeObserver(() => {
        updateScrollButtons();
      });
      resizeObserver.observe(el);
      setTimeout(updateScrollButtons, 50);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        resizeObserver.disconnect();
      };
    }
  }, [checkScroll, updateScrollButtons]);

  useEffect(() => {
    setTimeout(updateScrollButtons, 100);
  }, [items, updateScrollButtons]);

  const scrollUp = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: -200, behavior: "smooth" });
    }
  };

  const scrollDown = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: 200, behavior: "smooth" });
    }
  };

  const scrollButtonStyle: React.CSSProperties = {
    width: "32px",
    height: "24px",
    borderRadius: "4px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    flexShrink: 0,
    transition: "all 0.2s",
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        minHeight: 0,
        position: "relative",
      }}
    >
      {showUp && (
        <button
          onClick={scrollUp}
          style={scrollButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title="Scroll Up"
        >
          ▲
        </button>
      )}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          width: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          padding: "4px 2px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          minHeight: 0,
        }}
        className="collapsed-tab-list"
      >
        {items.map((item) => {
          const isActive = item.id === activeItemId;
          return (
            <button
              key={item.id}
              onClick={() => onSwitch(item.id)}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                border: isActive
                  ? "1px solid var(--accent-color)"
                  : "1px solid var(--border-color)",
                background: isActive
                  ? "var(--accent-glow)"
                  : "var(--bg-tertiary)",
                color: isActive
                  ? "var(--accent-color)"
                  : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
              title={item.title}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
                e.currentTarget.style.borderColor = "var(--accent-color)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }
              }}
            >
              {item.icon}
            </button>
          );
        })}
      </div>
      {showDown && (
        <button
          onClick={scrollDown}
          style={scrollButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title="Scroll Down"
        >
          ▼
        </button>
      )}
      <style>{`
        .collapsed-tab-list::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default React.memo(FunctionPanel);
