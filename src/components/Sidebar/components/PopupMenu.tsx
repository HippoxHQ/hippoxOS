import React, { useState, useEffect, useRef, JSX } from "react";
import { PopupMenuProps, MenuItemWithSection } from "../types";

export const PopupMenu: React.FC<PopupMenuProps> = ({
  items,
  activeId,
  activeSubId,
  activeSubSubId,
  onMenuClick,
  onClose,
  position,
  t,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const initOpen = (menuItems: MenuItemWithSection[]) => {
      menuItems.forEach((item) => {
        if (item.children && item.children.length > 0) {
          initial[item.id] = true;
          initOpen(item.children);
        }
      });
    };
    initOpen(items);
    return initial;
  });

  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 8;
      let { top, left } = position;
      if (left + rect.width > viewportWidth - gap) {
        left = viewportWidth - rect.width - gap;
      }
      if (left < gap) {
        left = gap;
      }
      if (top + rect.height > viewportHeight - gap) {
        top = viewportHeight - rect.height - gap;
      }
      if (top < gap) {
        top = gap;
      }
      setAdjustedPosition({ top, left });
    }
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderMenuItems = (menuItems: MenuItemWithSection[]) => {
    const result: JSX.Element[] = [];

    const processItem = (item: MenuItemWithSection, isInsideSettings = false) => {
      const hasChildren = item.children && item.children.length > 0;
      const isActive = activeId === item.id;
      const isOpen = openGroups[item.id] || false;

      if (hasChildren) {
        result.push(
          <div key={item.id}>
            <div className="popup-menu-item has-children" onClick={(e) => toggleGroup(item.id, e)}>
              <span className="popup-menu-label">{t(item.label)}</span>
              <span className={`popup-chevron ${isOpen ? "open" : ""}`}>▶</span>
            </div>
            {isOpen && (
              <div className="popup-sub-menu">
                {item.children!.map((child) => {
                  const hasGrandChildren = child.children && child.children.length > 0;

                  if (hasGrandChildren) {
                    const isGrandOpen = openGroups[child.id] || false;
                    return (
                      <div key={child.id}>
                        <div
                          className="popup-sub-item"
                          style={{ justifyContent: "space-between" }}
                          onClick={(e) => toggleGroup(child.id, e)}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span>{t(child.label)}</span>
                          </span>
                          <span className={`popup-chevron ${isGrandOpen ? "open" : ""}`}>▶</span>
                        </div>
                        {isGrandOpen && (
                          <div className="popup-sub-sub-menu">
                            {child.children!.map((grandChild) => (
                              <div
                                key={grandChild.id}
                                className={`popup-sub-sub-item ${activeSubSubId === grandChild.id ? "active" : ""}`}
                                onClick={() => {
                                  onMenuClick("settings", grandChild.id);
                                  onClose();
                                }}
                              >
                                <span>{t(grandChild.label)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={child.id}
                      className={`popup-sub-item ${activeSubId === child.id || activeId === child.id ? "active" : ""}`}
                      onClick={() => {
                        if (
                          child.id === "llmModel" ||
                          child.id === "atomicSkills" ||
                          child.id === "interface" ||
                          child.id === "workspaceConfig" ||
                          child.id === "storage"
                        ) {
                          onMenuClick("settings", child.id);
                        } else if (child.id === "skillMarket" || child.id === "skills") {
                          onMenuClick(child.id);
                        } else if (child.id === "scheduledTasks" || child.id === "taskQueue") {
                          onMenuClick(child.id);
                        } else {
                          onMenuClick(child.id);
                        }
                        onClose();
                      }}
                    >
                      <span>{t(child.label)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      } else {
        result.push(
          <div
            key={item.id}
            className={`popup-menu-item ${isActive ? "active" : ""}`}
            onClick={() => {
              if (
                item.id === "llmModel" ||
                item.id === "atomicSkills" ||
                item.id === "interface" ||
                item.id === "workspaceConfig" ||
                item.id === "storage"
              ) {
                onMenuClick("settings", item.id);
              } else if (
                item.id === "engine_database" ||
                item.id === "engine_network" ||
                item.id === "engine_container" ||
                item.id === "engine_notification"
              ) {
                onMenuClick("settings", item.id);
              } else if (item.id === "workspace") {
                onMenuClick(item.id);
              } else if (item.id === "history" || item.id === "favorites") {
                onMenuClick(item.id);
              } else if (item.id === "skillMarket" || item.id === "skills") {
                onMenuClick(item.id);
              } else if (item.id === "scheduledTasks" || item.id === "taskQueue") {
                onMenuClick(item.id);
              } else if (item.id === "logs") {
                onMenuClick(item.id);
              } else {
                onMenuClick(item.id);
              }
              onClose();
            }}
          >
            <span className="popup-menu-label">{t(item.label)}</span>
            {item.badge && <span className="popup-menu-badge">{item.badge}</span>}
          </div>
        );
      }
    };

    menuItems.forEach((item) => processItem(item));
    return result;
  };

  return (
    <div ref={popupRef} className="menu-popup" style={{ top: adjustedPosition.top, left: adjustedPosition.left }}>
      {renderMenuItems(items)}
    </div>
  );
};