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
          if (item.id === "settings_group") {
            item.children.forEach((child) => {
              if (child.children && child.children.length > 0) {
                initial[child.id] = true;
              }
            });
          }
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

  const isOnlySettingsGroup = (): boolean => {
    return items.length === 1 && items[0]?.id === "settings_group";
  };

  const renderMenuItems = (menuItems: MenuItemWithSection[]) => {
    const result: JSX.Element[] = [];
    const processItem = (item: MenuItemWithSection, isRoot: boolean = true) => {
      const hasChildren = item.children && item.children.length > 0;
      const isActive = activeId === item.id;
      const isOpen = openGroups[item.id] || false;
      if (item.id === "settings_group" && isRoot) {
        if (hasChildren) {
          item.children!.forEach((child) => {
            processItem(child, false);
          });
        }
        return;
      }
      if (hasChildren) {
        const isSystemGroup = item.id === "system_group";
        result.push(
          <div key={item.id}>
            <div
              className={`popup-menu-item has-children ${isSystemGroup ? "popup-sub-item" : ""}`}
              onClick={(e) => toggleGroup(item.id, e)}
              style={
                isSystemGroup
                  ? {
                      paddingLeft: "10px",
                      fontSize: "12px",
                      borderBottom: "none",
                    }
                  : {}
              }
            >
              <span className="popup-menu-label">{t(item.label)}</span>
              <span className={`popup-chevron ${isOpen ? "open" : ""}`}>▶</span>
            </div>
            {isOpen && (
              <div
                className={`${isSystemGroup ? "popup-sub-menu" : "popup-sub-menu"}`}
              >
                {item.children!.map((child) => {
                  const hasGrandChildren =
                    child.children && child.children.length > 0;

                  if (hasGrandChildren) {
                    const isGrandOpen = openGroups[child.id] || false;
                    return (
                      <div key={child.id}>
                        <div
                          className="popup-sub-item"
                          style={{ justifyContent: "space-between" }}
                          onClick={(e) => toggleGroup(child.id, e)}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <span>{t(child.label)}</span>
                          </span>
                          <span
                            className={`popup-chevron ${isGrandOpen ? "open" : ""}`}
                          >
                            ▶
                          </span>
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
                        onMenuClick("settings", child.id);
                        onClose();
                      }}
                    >
                      <span>{t(child.label)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>,
        );
      } else {
        const isSettingsChild =
          item.id === "llmModel" ||
          item.id === "drivers" ||
          item.id === "universal" ||
          item.id === "workspaceConfig" ||
          item.id === "storage";
        result.push(
          <div
            key={item.id}
            className={`popup-menu-item ${isActive ? "active" : ""} ${isSettingsChild ? "popup-sub-item" : ""}`}
            style={isSettingsChild ? { paddingLeft: "10px" } : {}}
            onClick={() => {
              if (
                item.id === "llmModel" ||
                item.id === "drivers" ||
                item.id === "universal" ||
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
              } else if (
                item.id === "scheduledTasks" ||
                item.id === "taskQueue"
              ) {
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
            {item.badge && (
              <span className="popup-menu-badge">{item.badge}</span>
            )}
          </div>,
        );
      }
    };
    if (isOnlySettingsGroup()) {
      const settingsItem = items[0];
      if (settingsItem && settingsItem.children) {
        settingsItem.children.forEach((child) => {
          processItem(child, false);
        });
        return result;
      }
    }
    menuItems.forEach((item) => processItem(item, true));
    return result;
  };
  return (
    <div
      ref={popupRef}
      className="menu-popup"
      style={{ top: adjustedPosition.top, left: adjustedPosition.left }}
    >
      {renderMenuItems(items)}
    </div>
  );
};
