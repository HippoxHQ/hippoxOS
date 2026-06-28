import React, { useEffect, useRef } from "react";

export interface TabContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

export interface TabContextMenuDivider {
  divider: true;
}

export type TabContextMenuItemType = TabContextMenuItem | TabContextMenuDivider;

interface TabContextMenuProps {
  x: number;
  y: number;
  items: TabContextMenuItemType[];
  onClose: () => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  x,
  y,
  items,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const getMenuPosition = () => {
    const menuWidth = 180;
    const menuHeight = Math.min(items.length * 32 + 20, 300);
    const padding = 10;
    let left = x;
    let top = y;
    if (x + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }
    if (y + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding;
    }
    return { left, top };
  };

  const isDivider = (
    item: TabContextMenuItemType,
  ): item is TabContextMenuDivider => {
    return "divider" in item && item.divider === true;
  };

  const position = getMenuPosition();

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: position.left,
        top: position.top,
        minWidth: "180px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "5px",
        boxShadow: "0 0px 5px rgba(0,0,0,0.2)",
        padding: "4px 0",
        zIndex: 9999,
        fontSize: "13px",
        color: "var(--text-primary)",
        userSelect: "none",
      }}
    >
      {items.map((item, index) => {
        if (isDivider(item)) {
          return (
            <div
              key={`divider-${index}`}
              style={{
                height: "1px",
                background: "var(--border-color)",
                margin: "4px 0",
                width: "100%",
              }}
            />
          );
        }

        return (
          <div
            key={index}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            style={{
              padding: "6px 16px",
              cursor: item.disabled ? "default" : "pointer",
              color: item.disabled
                ? "var(--text-muted)"
                : "var(--text-primary)",
              opacity: item.disabled ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "background 0.1s ease",
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.background = "var(--hover-bg)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

