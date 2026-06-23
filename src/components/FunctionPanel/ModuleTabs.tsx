import React, { useRef, useEffect, useState } from "react";
import { FunctionPanelItem } from "./hooks/useFunctionPanelController";

interface ModuleTabsProps {
  items: FunctionPanelItem[];
  activeItemId: string | null;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
  onClosePanel: () => void;
  onToggleCollapse?: () => void;
  t: (key: string) => string;
  functionPanelPosition?: "left" | "right";
}

export const ModuleTabs: React.FC<ModuleTabsProps> = ({
  items,
  activeItemId,
  onSwitch,
  onClose,
  onClosePanel,
  onToggleCollapse,
  t,
  functionPanelPosition = "right",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const collapseIcon = functionPanelPosition === "left" ? "≪" : "≫";
  const expandIcon = functionPanelPosition === "left" ? "≫" : "≪";

  const checkScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setShowLeft(scrollLeft > 0);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      checkScroll();
      return () => el.removeEventListener("scroll", checkScroll);
    }
  }, [items]);

  useEffect(() => {
    setTimeout(checkScroll, 50);
  }, [items]);

  const scroll = (dir: "left" | "right") => {
    if (!containerRef.current) return;
    const amount = 200;
    containerRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 200);
  };

  const scrollButtonStyle: React.CSSProperties = {
    flexShrink: 0,
    width: 24,
    height: 28,
    borderRadius: 4,
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0px 5px",
        borderBottom: "1px solid var(--border-color)",
        flexShrink: 0,
        gap: 8,
        background: "var(--bg-secondary)",
        minHeight: 40,
      }}
    >
      {showLeft && (
        <button onClick={() => scroll("left")} style={scrollButtonStyle}>
          ◀
        </button>
      )}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: "flex",
          gap: 4,
          overflowX: "auto",
          overflowY: "hidden",
          minHeight: 30,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          padding: "0 2px",
          marginTop: "10px",
        }}
        className="hide-scrollbar"
      >
        {items.map((item) => {
          const isActive = activeItemId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onSwitch(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 8px 0 14px",
                background: isActive ? "var(--bg-tertiary)" : "transparent",
                borderRadius: "8px 8px 0 0",
                color: isActive
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                borderBottom: isActive
                  ? "2px solid var(--accent-color)"
                  : "2px solid transparent",
                marginBottom: -1,
                whiteSpace: "nowrap",
                flexShrink: 0,
                height: 30,
                // transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--hover-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <span>{item.icon}</span>
              <span
                style={{
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.title}
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(item.id);
                }}
                style={{
                  marginLeft: 4,
                  fontSize: 12,
                  opacity: 0.7,
                  cursor: "pointer",
                  padding: "2px 4px",
                  borderRadius: 2,
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  e.currentTarget.style.background = "var(--bg-secondary)";
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.opacity = "0.7";
                }}
              >
                ✕
              </span>
            </div>
          );
        })}
      </div>
      {showRight && (
        <button onClick={() => scroll("right")} style={scrollButtonStyle}>
          ▶
        </button>
      )}
      <button
        onClick={onClosePanel}
        style={{
          width: 28,
          height: 28,
          borderRadius: 4,
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-color)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: 14,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--hover-bg)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--bg-tertiary)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
        title={t("functionArea.closePanel") || "Close Panel"}
      >
        ✕
      </button>
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 14,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title={t("functionArea.collapse") || "Collapse"}
        >
          {collapseIcon}
        </button>
      )}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};
