import React, { useRef, useEffect } from "react";
import { FunctionTab, FunctionTabConfig } from "./types";

interface TabBarProps {
  tabs: FunctionTabConfig[];
  activeTab: FunctionTab;
  onTabChange: (tab: FunctionTab) => void;
  onClose: () => void;
  t: (key: string, params?: any) => string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  onClose,
  t,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = React.useState(false);
  const [showRightScroll, setShowRightScroll] = React.useState(false);

  const checkScrollPosition = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const scrollAmount = 200;
      const newScrollLeft =
        containerRef.current.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);
      containerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      });
      setTimeout(checkScrollPosition, 200);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollPosition);
      checkScrollPosition();
      return () => container.removeEventListener("scroll", checkScrollPosition);
    }
  }, []);

  useEffect(() => {
    setTimeout(checkScrollPosition, 50);
  }, [tabs]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px 0 12px",
        borderBottom: "1px solid var(--border-color)",
        flexShrink: 0,
        gap: "8px",
        background: "var(--bg-secondary)",
      }}
    >
      {showLeftScroll && (
        <button
          onClick={() => handleScroll("left")}
          style={{
            flexShrink: 0,
            width: "24px",
            height: "28px",
            borderRadius: "4px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            marginTop: "-10px",
          }}
        >
          ◀
        </button>
      )}

      <div
        ref={containerRef}
        onScroll={checkScrollPosition}
        style={{
          flex: 1,
          display: "flex",
          gap: "4px",
          overflowX: "auto",
          overflowY: "hidden",
          minHeight: "30px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className="hide-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "0px 14px 0px 14px",
                background: isActive ? "var(--bg-tertiary)" : "transparent",
                borderRadius: "8px 8px 0 0",
                color: isActive
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: isActive ? 500 : 400,
                transition: "all 0.2s ease",
                borderBottom: isActive
                  ? "2px solid var(--accent-color)"
                  : "2px solid transparent",
                marginBottom: "-1px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                border: "none",
                height: "30px",
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
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: "4px",
          flexShrink: 0,
          marginTop: "-10px",
        }}
      >
        {showRightScroll && (
          <button
            onClick={() => handleScroll("right")}
            style={{
              width: "24px",
              height: "28px",
              borderRadius: "4px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
            }}
          >
            ▶
          </button>
        )}

        <button
          onClick={onClose}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "4px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
          }}
          title={t("functionArea.closePanel") || "Close"}
        >
          ✕
        </button>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};
