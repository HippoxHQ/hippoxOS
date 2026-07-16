import React, { useState, useEffect, useRef } from "react";
import { showToast, ToastType } from "../Toast";
import { DriverInfo, driversCommands } from "../../command/drivers";
import { configCommands } from "../../command/config";
import { CategoryIcon, SearchIcon } from "../../icons";
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
  const [disabledDrivers, setDisabledDrivers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCategoryBubble, setShowCategoryBubble] = useState(false);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadDrivers();
  }, []);
  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) || driver.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || driver.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const filteredCategories = Array.from(new Set(filteredDrivers.map((s) => s.category)));
  useEffect(() => {
    checkScrollButtons();
    window.addEventListener("resize", checkScrollButtons);
    return () => window.removeEventListener("resize", checkScrollButtons);
  }, [categories, filteredCategories]);
  useEffect(() => {
    setTimeout(checkScrollButtons, 100);
  }, [categories, filteredCategories]);
  useEffect(() => {
    setTimeout(checkScrollButtons, 50);
  }, [activeTab]);
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const currentCategoryHasDrivers = filteredDrivers.some((s) => s.category === activeTab);
      if (!currentCategoryHasDrivers || !activeTab) {
        setActiveTab(filteredCategories[0]);
      }
    }
  }, [filteredDrivers, filteredCategories, activeTab]);
  const loadDisabledDriversConfig = async (): Promise<Set<string>> => {
    try {
      const disabled = await configCommands.getDisabledDrivers();
      return new Set(disabled);
    } catch (error) {
      console.warn("Failed to load disabled drivers config, using empty set:", error);
      return new Set();
    }
  };
  const saveDisabledDriversConfig = async (disabled: Set<string>): Promise<void> => {
    try {
      await configCommands.setDisabledDrivers(Array.from(disabled));
    } catch (error) {
      console.error("Failed to save disabled drivers config:", error);
      throw error;
    }
  };
  const loadDrivers = async () => {
    try {
      setLoading(true);
      const driversData = (await driversCommands.getDrivers()) as DriverInfo[];
      const disabled = await loadDisabledDriversConfig();
      setDisabledDrivers(disabled);
      const driversWithEnabled = driversData.map((driver) => ({
        ...driver,
        enabled: !disabled.has(driver.name),
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
  const handleToggleDriver = async (driverName: string, enabled: boolean) => {
    setDrivers((prev) => prev.map((driver) => (driver.name === driverName ? { ...driver, enabled } : driver)));
    const newDisabled = new Set(disabledDrivers);
    if (enabled) {
      newDisabled.delete(driverName);
    } else {
      newDisabled.add(driverName);
    }
    setDisabledDrivers(newDisabled);
    try {
      await saveDisabledDriversConfig(newDisabled);
      const actionText = enabled ? "enable" : "disable";
      showToast(
        ToastType.INFO,
        t("drivers.driverToggled", {
          name: driverName,
          action: t(`drivers.${actionText}`),
        }),
      );
    } catch (error) {
      setDrivers((prev) => prev.map((driver) => (driver.name === driverName ? { ...driver, enabled: !enabled } : driver)));
      setDisabledDrivers(disabledDrivers);
      showToast(ToastType.ERROR, t("drivers.saveFailed"));
    }
  };
  const handleToggleAllInTab = async (category: string, enabled: boolean) => {
    const categoryDrivers = drivers.filter((s) => s.category === category);
    const driverNames = categoryDrivers.map((s) => s.name);
    setDrivers((prev) => prev.map((driver) => (driver.category === category ? { ...driver, enabled } : driver)));
    const newDisabled = new Set(disabledDrivers);
    if (enabled) {
      driverNames.forEach((name) => newDisabled.delete(name));
    } else {
      driverNames.forEach((name) => newDisabled.add(name));
    }
    setDisabledDrivers(newDisabled);
    try {
      await saveDisabledDriversConfig(newDisabled);
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
    } catch (error) {
      setDrivers((prev) => prev.map((driver) => (driver.category === category ? { ...driver, enabled: !enabled } : driver)));
      setDisabledDrivers(disabledDrivers);
      showToast(ToastType.ERROR, t("drivers.saveFailed"));
    }
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
      const newScrollLeft = tabsRef.current.scrollLeft + (direction === "left" ? -scrollAmount : scrollAmount);
      tabsRef.current.scrollTo({ left: newScrollLeft, behavior: "smooth" });
    }
  };
  const checkScrollButtons = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollWidth > clientWidth && scrollLeft + clientWidth < scrollWidth - 5);
    }
  };
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setShowCategoryBubble(false);
    if (category === "all") {
      if (categories.length > 0 && !activeTab) {
        setActiveTab(categories[0]);
      }
    } else {
      setActiveTab(category);
    }
    setTimeout(checkScrollButtons, 100);
  };
  const handleCategoryButtonMouseEnter = () => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
    setShowCategoryBubble(true);
  };
  const handleCategoryButtonMouseLeave = () => {
    bubbleTimerRef.current = setTimeout(() => {
      setShowCategoryBubble(false);
    }, 200);
  };
  const handleBubbleMouseEnter = () => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
  };
  const handleBubbleMouseLeave = () => {
    setShowCategoryBubble(false);
  };
  const handleClearSearch = () => {
    setSearchTerm("");
  };
  const ellipsisStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "5px 10px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "5px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    cursor: "pointer",
    flexShrink: 0,
  };
  const driverCardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    borderRadius: "0px",
    padding: "10px",
    marginBottom: "0px",
    borderBottom: "1px solid var(--border-color)",
    overflow: "hidden",
  };
  const toggleSwitchStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-block",
    width: "40px",
    height: "20px",
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
    height: "15px",
    width: "15px",
    left: "3px",
    bottom: "2px",
    backgroundColor: "white",
    borderRadius: "50%",
  };
  const toggleKnobCheckedStyle: React.CSSProperties = {
    transform: "translateX(18px)",
  };
  const styles: Record<string, React.CSSProperties> = {
    searchInputWrapper: {
      flex: 1,
      minWidth: 0,
      position: "relative" as const,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "4px 12px",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      overflow: "hidden",
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      background: "transparent",
      border: "none",
      outline: "none",
      color: "var(--text-primary)",
      fontSize: "13px",
      padding: "4px 0",
    },
    searchIcon: {
      flexShrink: 0,
      color: "var(--text-tertiary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    categoryBtn: {
      width: "28px",
      height: "28px",
      padding: "0",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "5px",
      color: "var(--text-primary)",
      fontSize: "16px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      position: "relative" as const,
    },
    searchRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      minWidth: 0,
    },
    header: {
      padding: "10px",
      borderBottom: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
      flexShrink: 0,
      overflow: "hidden",
    },
    clearBtn: {
      background: "transparent",
      border: "none",
      color: "var(--text-tertiary)",
      cursor: "pointer",
      fontSize: "14px",
      padding: "2px 6px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    bubbleContainer: {
      position: "absolute" as const,
      left: "10px",
      top: "40px",
      minWidth: "200px",
      maxWidth: "235px",
      background: "var(--bg-secondary, #1e1e1e)",
      border: "1px solid var(--border-color, #333)",
      borderRadius: "5px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      overflow: "hidden",
      zIndex: 100,
      pointerEvents: "auto" as const,
    },
    bubbleHeader: {
      padding: "10px 12px",
      borderBottom: "1px solid var(--border-color, #333)",
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-secondary, #aaa)",
      background: "var(--bg-tertiary, #252525)",
      ...ellipsisStyle,
    },
    bubbleContent: {
      maxHeight: "300px",
      overflowY: "auto" as const,
      padding: "4px 0",
    },
    bubbleItem: {
      padding: "8px 12px",
      fontSize: "12px",
      cursor: "pointer",
      borderLeft: "2px solid transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      minWidth: 0,
    },
    bubbleItemActive: {
      background: "var(--hover-bg, #2a2a2a)",
      borderLeftColor: "#0066cc",
    },
    bubbleItemText: {
      flex: 1,
      color: "var(--text-primary, #fff)",
      ...ellipsisStyle,
      minWidth: 0,
    },
    bubbleItemCount: {
      fontSize: "10px",
      color: "var(--text-tertiary, #888)",
      flexShrink: 0,
    },
  };
  const globalStyles = `
    .driver-tabs-container {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 0px;
      flex-shrink: 0;
      background: var(--bg-secondary);
      overflow: hidden;
    }
    .driver-tabs-scroll {
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
      min-width: 0;
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
      border-radius: 6px 6px 0 0;
      white-space: nowrap;
      user-select: none;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
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
    .driver-search-input-wrapper {
      flex: 1;
      min-width: 0;
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 1.5px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 5px;
      overflow: hidden;
    }
    .driver-search-input-wrapper:focus-within {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }
    .driver-search-input-wrapper svg {
      flex-shrink: 0;
      color: var(--text-tertiary);
    }
    .driver-search-input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 13px;
      padding: 4px 0;
    }
    .driver-search-clear {
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      font-size: 14px;
      padding: 2px 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .driver-search-clear:hover {
      color: var(--text-primary);
      background: var(--hover-bg);
    }
    .driver-list-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      margin: 0;
      min-height: 0;
    }
  `;
  if (typeof document !== "undefined") {
    const styleId = "driver-panel-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = globalStyles;
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
  const currentCategoryDrivers = filteredDrivers.filter((s) => s.category === activeTab);
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
        position: "relative",
        userSelect: "none",
      }}
    >
      <div style={styles.header}>
        <div style={styles.searchRow}>
          <button
            ref={categoryButtonRef}
            style={styles.categoryBtn}
            onMouseEnter={handleCategoryButtonMouseEnter}
            onMouseLeave={handleCategoryButtonMouseLeave}
            title={t("drivers.filterByCategory") || "Filter by category"}
          >
            <CategoryIcon size={16} />
          </button>
          <div className="driver-search-input-wrapper">
            <SearchIcon />
            <input type="text" className="driver-search-input" placeholder={t("drivers.searchPlaceholder") || "Search drivers..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="driver-search-clear" onClick={handleClearSearch} title={t("drivers.clearSearch") || "Clear search"}>
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
      {showCategoryBubble && categories.length > 0 && (
        <div ref={bubbleRef} style={styles.bubbleContainer} onMouseEnter={handleBubbleMouseEnter} onMouseLeave={handleBubbleMouseLeave}>
          <div style={styles.bubbleHeader}>{t("drivers.selectCategory") || "Select category"}</div>
          <div style={styles.bubbleContent}>
            <div
              style={{
                ...styles.bubbleItem,
                ...(selectedCategory === "all" ? styles.bubbleItemActive : {}),
              }}
              onClick={() => handleCategorySelect("all")}
            >
              <span style={styles.bubbleItemText}>{t("drivers.all") || "All"}</span>
              <span style={styles.bubbleItemCount}>({drivers.length})</span>
            </div>
            {categories.map((cat) => {
              const count = drivers.filter((s) => s.category === cat).length;
              return (
                <div
                  key={cat}
                  style={{
                    ...styles.bubbleItem,
                    ...(selectedCategory === cat ? styles.bubbleItemActive : {}),
                  }}
                  onClick={() => handleCategorySelect(cat)}
                >
                  <span style={styles.bubbleItemText}>{cat}</span>
                  <span style={styles.bubbleItemCount}>({count})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="driver-tabs-container" style={{ padding: "0px", margin: 0 }}>
        {showLeftArrow && (
          <button className="driver-tab-scroll-btn" onClick={() => scrollTabs("left")}>
            ◀
          </button>
        )}
        <div className="driver-tabs-scroll" ref={tabsRef} onScroll={checkScrollButtons}>
          <div className="driver-tabs">
            {filteredCategories.map((category) => (
              <button key={category} className={`driver-tab ${activeTab === category ? "active" : ""}`} onClick={() => setActiveTab(category)}>
                {getCategoryName(category)}
              </button>
            ))}
          </div>
        </div>
        {showRightArrow && (
          <button className="driver-tab-scroll-btn" onClick={() => scrollTabs("right")}>
            ▶
          </button>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0px",
          padding: "8px 14px",
          flexShrink: 0,
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            ...ellipsisStyle,
            minWidth: 0,
          }}
        >
          {t("drivers.stats", {
            total: totalCount,
            enabled: enabledCount,
          })}
        </div>
        <button style={buttonStyle} onClick={() => handleToggleAllInTab(activeTab, !isFullyEnabled)}>
          {isFullyEnabled ? t("drivers.disableAll") : t("drivers.enableAll")}
        </button>
      </div>
      <div className="driver-list-container">
        {currentCategoryDrivers.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-muted)",
              ...ellipsisStyle,
            }}
          >
            {searchTerm ? t("drivers.noSearchResults") || "No matching drivers found" : t("drivers.empty")}
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
                  minWidth: 0,
                }}
              >
                <div style={{ ...ellipsisStyle, minWidth: 0, flexShrink: 1 }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      ...ellipsisStyle,
                    }}
                  >
                    {driver.name}
                  </span>
                </div>
                <label style={toggleSwitchStyle}>
                  <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} checked={driver.enabled} onChange={(e) => handleToggleDriver(driver.name, e.target.checked)} />
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
                  ...ellipsisStyle,
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
