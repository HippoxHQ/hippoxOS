import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { showToast, ToastType } from "../Toast";
import { DriverInfo, driversCommands } from "../../command/drivers";

interface DriversPanelPanelProps {
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
}

const DriversPanelPanel: React.FC<DriversPanelPanelProps> = ({ t, onSave }) => {
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const driversData = (await driversCommands.getDrivers()) as DriverInfo[];
      const driversWithEnabled = driversData.map((driver) => ({
        ...driver,
        enabled: true,
      }));
      setDrivers(driversWithEnabled);
      const cats = Array.from(new Set(driversData.map((s) => s.category)));
      setCategories(cats);
      if (cats.length > 0) {
        setActiveTab(cats[0]);
      }
    } catch (error) {
      console.error("Failed to load drivers:", error);
      showToast(ToastType.ERROR, t("drivers.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDriver = (driverName: string, enabled: boolean) => {
    setDrivers((prev) =>
      prev.map((driver) =>
        driver.name === driverName ? { ...driver, enabled } : driver,
      ),
    );
    const actionText = enabled ? "enable" : "disable";
    showToast(
      ToastType.INFO,
      t("drivers.driverToggled", {
        name: driverName,
        action: t(`drivers.${actionText}`),
      }),
    );
  };

  const handleToggleAllInTab = (category: string, enabled: boolean) => {
    const categoryDrivers = drivers.filter((s) => s.category === category);
    setDrivers((prev) =>
      prev.map((driver) =>
        driver.category === category ? { ...driver, enabled } : driver,
      ),
    );
    const categoryName = getCategoryName(category);
    const actionText = enabled ? "enable" : "disable";
    const enabledCount = categoryDrivers.length;
    showToast(
      ToastType.SUCCESS,
      t("drivers.categoryToggled", {
        category: categoryName,
        action: t(`drivers.${actionText}`),
        count: enabledCount,
      }),
    );
  };

  const handleSave = () => {
    const enabledDrivers = drivers.filter((s) => s.enabled).map((s) => s.name);
    const disabledDrivers = drivers
      .filter((s) => !s.enabled)
      .map((s) => s.name);
    const config = {
      enabled_drivers: enabledDrivers,
      disabled_drivers: disabledDrivers,
      all_drivers: drivers,
    };
    if (onSave) {
      onSave(config);
    }
    showToast(ToastType.SUCCESS, t("drivers.saveSuccess"));
  };

  const getCategoryName = (category: string) => {
    const categoryKeyMap: Record<string, string> = {
      file: "drivers.category.fileSystem",
      net: "drivers.category.network",
      system: "drivers.category.system",
      db: "drivers.category.database",
      math: "drivers.category.math",
      time: "drivers.category.time",
      devops: "drivers.category.devops",
      document: "drivers.category.document",
      message: "drivers.category.message",
      task: "drivers.category.task",
      general: "drivers.category.general",
    };
    const key = categoryKeyMap[category];
    return key ? t(key) : category;
  };

  const getCategoryDrivers = (category: string) => {
    return drivers.filter((s) => s.category === category);
  };

  const getCategoryEnabledCount = (category: string) => {
    const categoryDrivers = drivers.filter((s) => s.category === category);
    const enabledCount = categoryDrivers.filter((s) => s.enabled).length;
    return { enabledCount, totalCount: categoryDrivers.length };
  };

  const isCategoryFullyEnabled = (category: string) => {
    const { enabledCount, totalCount } = getCategoryEnabledCount(category);
    return enabledCount === totalCount && totalCount > 0;
  };

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      const newScrollLeft =
        tabsRef.current.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);
      tabsRef.current.scrollTo({ left: newScrollLeft, behavior: "smooth" });
    }
  };

  const checkScrollButtons = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(
        scrollWidth > clientWidth && scrollLeft + clientWidth < scrollWidth - 5,
      );
    }
  };

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener("resize", checkScrollButtons);
    return () => window.removeEventListener("resize", checkScrollButtons);
  }, [categories]);

  useEffect(() => {
    setTimeout(checkScrollButtons, 0);
  }, [categories]);

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-primary)",
    minWidth: "100px",
    flexShrink: 0,
    userSelect: "none",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "6px 16px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    cursor: "pointer",
    // transition: "all 0.2s",
  };

  const driverCardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "12px",
    border: "1px solid var(--border-color)",
  };

  const toggleSwitchStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-block",
    width: "44px",
    height: "24px",
    flexShrink: 0,
  };

  const toggleSliderStyle: React.CSSProperties = {
    position: "absolute",
    cursor: "pointer",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "var(--bg-tertiary)",
    // transition: "0.3s",
    borderRadius: "24px",
    border: "1px solid var(--border-color)",
  };

  const toggleSliderCheckedStyle: React.CSSProperties = {
    backgroundColor: "var(--accent-color, #0066cc)",
    borderColor: "var(--accent-color, #0066cc)",
  };

  const toggleKnobStyle: React.CSSProperties = {
    position: "absolute",
    content: '""',
    height: "18px",
    width: "18px",
    left: "3px",
    bottom: "2px",
    backgroundColor: "white",
    // transition: "0.3s",
    borderRadius: "50%",
  };

  const toggleKnobCheckedStyle: React.CSSProperties = {
    transform: "translateX(20px)",
  };

  const tabsStyles = `
        .driver-tabs-container {
            position: relative;
            display: flex;
            align-items: center;
            margin-bottom: 0px;
        }
        .driver-tabs-scroll {
            flex: 1;
            overflow-x: auto;
            overflow-y: hidden;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }
        .driver-tabs-scroll::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
        }
        .driver-tabs {
            display: flex;
            gap: 4px;
            border-bottom: 1px solid var(--border-color);
            min-width: max-content;
        }
        .driver-tab {
            padding: 8px 16px;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 13px;
            cursor: pointer;
            // transition: all 0.2s;
            border-radius: 6px 6px 0 0;
            white-space: nowrap;
            user-select: none;
        }
        .driver-tab:hover {
            color: var(--text-primary);
            background: var(--hover-bg);
        }
        .driver-tab.active {
            color: var(--accent-color, #0066cc);
            border-bottom: 2px solid var(--accent-color, #0066cc);
        }
        .driver-tab-scroll-btn {
            width: 28px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            color: var(--text-secondary);
            font-size: 16px;
            // transition: all 0.2s;
            flex-shrink: 0;
            margin: 0 4px;
            user-select: none;
        }
        .driver-tab-scroll-btn:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
        }
        .driver-tab-scroll-btn.disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .driver-tab-scroll-btn.disabled:hover {
            background: var(--bg-secondary);
            color: var(--text-secondary);
        }
    `;

  if (typeof document !== "undefined") {
    const styleId = "driver-tabs-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = tabsStyles;
      document.head.appendChild(style);
    }
  }

  if (loading) {
    return (
      <div
        className="settings-container"
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
          margin: 0,
          gap: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
          }}
        >
          {t("drivers.loading")}
        </div>
      </div>
    );
  }

  const currentCategoryDrivers = getCategoryDrivers(activeTab);
  const { enabledCount, totalCount } = getCategoryEnabledCount(activeTab);
  const isFullyEnabled = isCategoryFullyEnabled(activeTab);

  return (
    <div
      className="settings-container"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 0,
        margin: 0,
        gap: 0,
      }}
    >
      <div
        className="driver-tabs-container"
        style={{ padding: "0px", margin: 0 }}
      >
        {showLeftArrow && (
          <button
            className="driver-tab-scroll-btn"
            onClick={() => scrollTabs("left")}
          >
            ◀
          </button>
        )}
        <div
          className="driver-tabs-scroll"
          ref={tabsRef}
          onScroll={checkScrollButtons}
        >
          <div className="driver-tabs">
            {categories.map((category) => (
              <button
                key={category}
                className={`driver-tab ${activeTab === category ? "active" : ""}`}
                onClick={() => setActiveTab(category)}
              >
                {getCategoryName(category)}
              </button>
            ))}
          </div>
        </div>
        {showRightArrow && (
          <button
            className="driver-tab-scroll-btn"
            onClick={() => scrollTabs("right")}
          >
            ▶
          </button>
        )}
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 10px",
          margin: 0,
          paddingTop: "10px",
          paddingBottom: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
            padding: "0 4px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
            }}
          >
            {t("drivers.stats", {
              total: totalCount,
              enabled: enabledCount,
            })}
          </div>
          <button
            style={buttonStyle}
            onClick={() => handleToggleAllInTab(activeTab, !isFullyEnabled)}
          >
            {isFullyEnabled ? t("drivers.disableAll") : t("drivers.enableAll")}
          </button>
        </div>
        {currentCategoryDrivers.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-muted)",
            }}
          >
            {t("drivers.empty")}
          </div>
        ) : (
          currentCategoryDrivers.map((driver) => (
            <div key={driver.name} style={driverCardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {driver.name}
                  </span>
                </div>
                <label style={toggleSwitchStyle}>
                  <input
                    type="checkbox"
                    style={{ opacity: 0, width: 0, height: 0 }}
                    checked={driver.enabled}
                    onChange={(e) =>
                      handleToggleDriver(driver.name, e.target.checked)
                    }
                  />
                  <span
                    style={{
                      ...toggleSliderStyle,
                      ...(driver.enabled ? toggleSliderCheckedStyle : {}),
                    }}
                  >
                    <span
                      style={{
                        ...toggleKnobStyle,
                        ...(driver.enabled ? toggleKnobCheckedStyle : {}),
                      }}
                    />
                  </span>
                </label>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                }}
              >
                {driver.description}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DriversPanelPanel;
